# AGENT.md — `crap4htmljs` project guide

This file is the entry point for any agent (or human) picking up work on this
project. It documents context, architecture, and process so work can continue
without re-deriving decisions already made. **The full behavioral spec is
`spec.md`** — it is the source of truth for CLI options, exit codes, complexity
rules, coverage attribution, the CRAP formula, and report format. This file
covers *process and architecture*, not behavior; keep them in sync, don't
duplicate.

## What this project is

`crap4htmljs` is a Node.js/TypeScript CLI that computes CRAP (Change Risk
Anti-Patterns) scores for JavaScript, including JS embedded in HTML. CRAP
combines cyclomatic complexity with test coverage per function:

```
CRAP = CC² × (1 − coverage)³ + CC
```

See `spec.md` for the complete V1 specification.

## Reference target project — READ ONLY, NEVER EXECUTE

`/Users/gastonmousques/workspace/DAxInClassGrading` is a real HTML/ESM-JS
project that motivated this tool and is used as a mental model for realistic
inputs (no `switch` statements, heavy ternary/`&&`/`||` use, one HTML file
with a single `<script type="module" src="...">` and zero inline scripts,
Cucumber+Playwright+monocart(Istanbul-based) coverage tooling).

**Rules:**
- Never modify, `git commit` to, or write any file inside that repository.
- Never invoke `--run`/any coverage or test command *inside* that repository
  from this tool or its tests (it would write to its `coverage/`/`reports/`
  dirs).
- All automated tests use **synthetic fixtures** created under
  `test/fixtures/` in *this* repo. That repo may only be used for read-only
  manual smoke-checks (see "Verification" below), never in the automated
  suite.

## Process requirements (from the project owner)

- TypeScript on Node.js.
- Strict TDD, **outside-in**: acceptance-level Gherkin scenarios define *what*
  the tool does; unit-level TDD defines *how* each module works.
- Vitest for all unit tests.
- Coverage gate: **≥ 90% statements and ≥ 90% branches** on this project's own
  test suite (enforced via Vitest coverage thresholds — see
  `vitest.config.ts`).
- Modules with low coupling / high cohesion (see module map below).

**Gherkin tooling decision:** `.feature` files run *inside* Vitest via
`@amiceli/vitest-cucumber`, not a standalone `@cucumber/cucumber` process.
One test runner, one coverage report, acceptance scenarios count toward the
same coverage gate as unit tests.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript, strict mode | type safety |
| Test runner | Vitest | mandated |
| Gherkin/BDD | `@amiceli/vitest-cucumber` | runs `.feature` files as Vitest tests |
| Coverage provider | `@vitest/coverage-v8`, thresholds statements/branches ≥ 90 (functions/lines also ≥ 90) | native to Vitest |
| JS AST parsing | `acorn` + `acorn-walk` | small, maintained, ESTree-compatible, modern ESM support |
| HTML parsing | `parse5` | maintained, gives source locations for inline-script virtual paths and external `<script src>` resolution |
| Git status (`--changed`) | thin wrapper over `child_process` (`git status --porcelain=v1`) in its own module | easy to fake in tests, avoids a heavy dependency |
| CLI argument parsing | hand-rolled | spec dictates exact validation errors/exit codes/`--help` text; full control beats fighting a library |
| Coverage format | Istanbul `coverage-final.json` shape (per-file `fnMap` + `f` counts) as the V1 reference adapter, behind an `Adapter` interface | matches spec §9; future formats plug in without touching callers |
| Table rendering | hand-rolled column formatter | report format is simple; keeps deps small |

## Module map

Dependency direction is strictly downward through this list — e.g. `report/`
never imports from `discovery/`. `orchestration/` is the only module allowed
to import broadly, to wire everything together. `errors/` is a leaf every
module may depend on.

```
src/
  cli/            parse argv -> CliOptions | UsageError; --help text
  discovery/      resolve which source files to analyze
    default.ts      <source-root>/** discovery
    explicit.ts      file/dir path args
    changed.ts        --changed mode (depends on git/)
    exclude.ts          node_modules/dist/build/coverage/vendor/hidden-dir rules
  git/            gitStatus(cwd) -> {modified, added, untracked, renamed...}
  html/           parse5-based: inline <script> discovery (virtual paths, doc
                  order) and external <script src> resolution
  parsing/        acorn-based JS -> AST, parse-error reporting (path/line/col)
  functions/      walk AST -> discovered functions (name, kind, start/end loc);
                  nested-function boundary rules live here
  complexity/     walk a function's AST subtree -> cyclomatic complexity
                  (excludes nested function bodies)
  coverage/
    run.ts          execute --run command from project root, check exit status
    discovery.ts     locate a coverage report in conventional locations
    adapters/
      istanbul.ts     Istanbul coverage-final.json -> normalized CoverageEntry[]
      types.ts         Adapter interface (normalized path, start/end loc, count)
  attribution/    match CoverageEntry[] to functions per priority (exact start
                  loc -> containing range -> N/A)
  crap/           CRAP formula
  report/         sort rows, render table, render JSON, build summary
  threshold/      compare max numeric CRAP vs threshold -> exceeded?
  errors/         typed errors mapped 1:1 to exit codes (1,2,3,4,5)
  orchestration/  composition root: discovery -> parsing -> functions ->
                  complexity -> coverage -> attribution -> crap -> report ->
                  threshold; returns a result + exit code (no process.* here)
  main.ts         thin bin entrypoint: cli/ -> orchestration/ -> stdout/stderr
                  + process.exitCode (the only module allowed to touch process.*)
```

## Outside-in TDD workflow

1. **Acceptance scenario first (red).** Pick the next V1 acceptance example
   from `spec.md` §16 (order below). Write it as a `.feature` file plus
   `@amiceli/vitest-cucumber` step bindings, invoking `orchestration/`'s
   programmatic entry point against a synthetic fixture under
   `test/fixtures/`. It fails — the modules don't exist yet.
2. **Drop to unit level (red-green-refactor).** For each collaborator module
   the scenario needs, write Vitest unit tests describing its contract in
   isolation (fakes/stubs for its own dependencies), implement just enough to
   pass, refactor.
3. **Wire it up.** Compose the new module(s) into `orchestration/`; rerun the
   acceptance scenario until green.
4. **Repeat**, letting later scenarios reuse and extend earlier modules
   rather than duplicating logic.
5. Check coverage thresholds after every module, not just at the end.

### Scenario/implementation order (outside-in, simplest first)

1. Single JS file, multiple function kinds (declaration/expression/arrow/
   method) → `parsing/`, `functions/`, base complexity = 1.
2. Nested functions → parent complexity excludes nested decision points.
3. Each complexity construct individually (`if`, `for`/`for-in`/`for-of`,
   `while`/`do-while`, `catch`, `case`, `?:`, `&&`, `||`) → `complexity/`.
4. HTML file with multiple inline scripts → `html/` inline-script + virtual
   path assignment, feeding the same `parsing/`/`functions/` pipeline.
5. HTML file referencing an external script (incl. one outside source root
   but inside project root) → `html/` external resolution +
   `discovery/exclude.ts` boundary rules.
6. Missing coverage (no `--coverage`/`--run`) → functions report `N/A`/`N/A`.
7. Malformed coverage data explicitly requested → exit code 4.
8. Exact coverage attribution vs. unmatched (→ `N/A`) → `attribution/`
   priority order + `crap/` formula application.
9. `--changed` file selection (modified/added/untracked included, deleted
   ignored, renamed analyzed at current path; non-git dir → exit 5) → `git/`
   + `discovery/changed.ts` against a real temporary git repo created in test
   setup.
10. Threshold pass and threshold failure (default 8.0, `--threshold`,
    `--no-threshold`) → `threshold/` and exit code 2.
11. Table and JSON output formats, including sort order and N/A-last rule →
    `report/`.
12. CLI validation: invalid options/missing values/invalid threshold/
    nonexistent explicit path → exit 1 + usage to stderr; `--help` → usage to
    stdout.

## How to pick up work

- Branch: `feat/crap` (all implementation work happens here).
- Run everything: `npm test` (Vitest — runs unit tests and `.feature`-based
  acceptance scenarios together, and reports coverage).
- Coverage thresholds live in `vitest.config.ts` (`coverage.thresholds`).
- Unit tests live under `test/unit/`, mirroring `src/` structure.
- Fixtures (synthetic JS/HTML/coverage-json files) live under
  `test/fixtures/`.
- `.feature` files and their step bindings live under `features/`.
- Follow the scenario order above; don't jump ahead to a later scenario's
  module before the current one is green and its coverage checked.

## Verification

- `npm test` runs unit + acceptance tests together; coverage thresholds
  (statements/branches ≥ 90%, set in `vitest.config.ts`) fail the run if
  unmet.
- Manual smoke check only, read-only: point the built CLI at files/coverage
  artifacts read from `DAxInClassGrading` without ever writing to or
  executing anything inside that repository.
