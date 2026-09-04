# crap4htmljs V1 Specification

## 1. Purpose

`crap4htmljs` analyzes JavaScript code, including JavaScript embedded in HTML, and reports CRAP scores for discovered functions.

The tool shall:

- discover JavaScript and HTML source files;
- parse JavaScript using an AST-based parser;
- identify functions and calculate their cyclomatic complexity;
- run the coverage command for the project if configured, or use an existing coverage report, or exit with `N/A` scores if no coverage is available;
- read the resulting coverage report;
- attribute coverage to analyzed functions;
- calculate CRAP scores;
- print a report sorted by the worst score first; and
- optionally fail when a CRAP score exceeds a configured threshold.

V1 is intended for JavaScript projects that can produce an Istanbul-compatible coverage report. Istanbul is the reference coverage format and tool family, but the implementation may support another open-source coverage tool through an adapter when it provides equivalent function-level coverage and source locations.

## 2. V1 Scope

### 2.1 Supported inputs

V1 shall support:

- JavaScript files: `.js`, `.mjs`, and `.cjs`;
- HTML files: `.html` and `.htm`;
- external scripts referenced by HTML using `<script src="...">`;
- executable inline `<script>` elements; and
- JavaScript modules using `type="module"`.

V1 shall not be required to support TypeScript, JSX, template engines, JavaScript in event-handler attributes, or dynamically generated scripts.

### 2.2 Exclusions

Unless explicitly selected by a path or include rule, the following directories shall be excluded:

- `node_modules/`;
- `dist/`;
- `build/`;
- `coverage/`;
- `vendor/`; and
- hidden directories.

Minified and generated files may be excluded using configurable patterns.

### 2.3 Out of scope for V1

V1 does not define:

- transpilation or bundler integration;
- test-framework-specific behavior;
- dynamic script discovery;
- automatic installation of coverage tools;
- coverage generation without a user-provided command; or
- a graphical user interface.

## 3. Terminology

- **Project root**: the directory from which the analysis is started, unless overridden by an option.
- **Source file**: a JavaScript or HTML file selected for analysis.
- **Function**: a JavaScript function declaration, function expression, arrow function, class method, constructor, getter, setter, or object-literal method.
- **Inline script**: executable JavaScript contained in an HTML `<script>` element.
- **Virtual source path**: a stable identifier for inline JavaScript, such as `index.html#script[2]`.
- **Function coverage**: the fraction of discovered functions that have a positive execution count in the coverage report.
- **Coverage unavailable**: the state where no usable coverage entry can be attributed to a function.

## 4. Command-Line Interface

### 4.1 Supported forms

```text
crap4htmljs
crap4htmljs --changed
crap4htmljs <path...>
crap4htmljs --help
```

### 4.2 Options

```text
--coverage <path>       Read an existing coverage report or coverage directory.
--coverage-format <id>  Select a coverage adapter; default: istanbul.
--threshold <number>    Maximum allowed CRAP score; default: 8.0.
--format <table|json>   Output format; default: table.
--output <path>         Write the report to a file instead of stdout.
--source-root <path>    Source root; default: <project-root>/src.
--no-threshold          Do not fail based on the threshold.
--help                  Print usage information.
```

`--run` shall be executed from the project root. The command's exit status shall be checked. A non-zero status shall produce an analysis error and shall not be treated as a valid coverage result.


### 4.3 Mode semantics

- No positional paths: analyze files under the configured source root.
- `--changed`: analyze changed, added, and untracked supported files reported by Git.
- A file path: analyze that file directly.
- A directory path: recursively analyze supported files below that directory.

Each source file shall be analyzed at most once after path normalization.

### 4.4 Invalid usage

The tool shall exit with code `1` for invalid options, missing option values, invalid threshold values, or nonexistent explicit paths. It shall print usage information to stderr.

## 5. Source Discovery

### 5.1 Default discovery

The default source root is:

```text
<project-root>/src/**
```

The source root shall be configurable with `--source-root`.

### 5.2 Changed-file discovery

In `--changed` mode, the tool shall inspect Git status and include supported files that are modified, added, staged, or untracked. Deleted files shall be ignored. Renamed files shall be analyzed at their current path.

If the directory is not a Git worktree, the tool shall exit with a Git/filesystem error.

### 5.3 HTML script discovery

For each selected HTML file:

- resolve relative external script paths relative to the HTML file;
- parse each executable inline script independently;
- assign inline scripts virtual source paths using one-based document order; and
- preserve source line and column information where possible.

An external script referenced by a selected HTML file shall be analyzed even if it is outside the default source root, provided it is inside the project root and is not excluded.

## 6. JavaScript Parsing

The implementation shall use a maintained, open-source JavaScript parser that produces an AST and supports the selected ECMAScript syntax.

Parsing shall not rely on regular expressions for function discovery or complexity calculation.

For each parse failure, the tool shall report the source path, line, column, and parser error. By default, any parse failure shall cause exit code `3`.

## 7. Function Discovery and Naming

Each discovered function shall have:

- source path or virtual source path;
- display name;
- function kind;
- start line and column;
- end line and column; and
- cyclomatic complexity.

Named functions shall use their declared name. Anonymous functions shall use a stable generated name, such as `<anonymous>@42:5`. Nested functions shall be reported separately.

The complexity of a parent function shall not include decision points belonging to nested functions.

## 8. Cyclomatic Complexity

Every concrete function shall have a base complexity of `1`.

V1 shall add one complexity point for each of the following within that function:

- `if` statement;
- `for`, `for...in`, and `for...of` loop;
- `while` and `do...while` loop;
- `catch` clause;
- `case` clause in a `switch` statement;
- conditional (`?:`) expression;
- logical `&&` operator; and
- logical `||` operator.

The implementation shall document any additional supported decision nodes. Complexity shall be an integer greater than or equal to `1`.

## 9. Coverage Pipeline

### 9.1 Coverage command

When `--run` is supplied, the tool shall execute the user-provided command and then read the generated coverage report. The tool shall not assume a particular package manager, test runner, or project layout.

The command may use Istanbul-based tooling, such as a project-configured Istanbul/NYC workflow, or another supported open-source coverage tool.

### 9.2 Coverage format

The reference V1 format is Istanbul JSON coverage data containing source paths, function locations, and execution counts.

Other formats may be supported through named adapters. An adapter shall provide, for each covered function where possible:

- normalized source path;
- start and end location; and
- execution count.

Malformed or unsupported coverage data shall cause exit code `4` when coverage was explicitly requested.

### 9.3 Coverage discovery

If no explicit coverage file is supplied, the implementation may search documented conventional locations. The search order shall be deterministic and documented.

Coverage paths shall be normalized before matching, including relative paths, separators, and project-root prefixes.

## 10. Coverage Attribution

Coverage shall be attributed using the following priority order:

1. exact source path and function start location;
2. exact source path with a coverage function range containing the discovered function start;
3. source-map-backed mapping, if supported; and
4. no attribution, resulting in `N/A`.

The tool shall not assign coverage using an unrelated or merely “nearest” function.

For an attributed function:

```text
coverage = 1.0  if execution count > 0
coverage = 0.0  otherwise
```

If no coverage report is available and coverage was not explicitly requested, coverage and CRAP shall be reported as `N/A`. If `--coverage` or `--run` was explicitly supplied and coverage cannot be read, the tool shall exit with code `4`.

## 11. CRAP Calculation

For functions with known coverage:

```text
CRAP = CC² × (1 − coverage)³ + CC
```

Where:

- `CC` is cyclomatic complexity;
- `coverage` is `0.0` or `1.0` in V1; and
- the result is calculated using floating-point arithmetic.

Functions without usable coverage shall have `coverage = N/A` and `CRAP = N/A`.

Threshold comparisons shall use the unrounded CRAP value. Displayed values shall be rounded to two decimal places.

## 12. Report

The default table report shall include:

- source path;
- line and column;
- function name;
- function kind;
- cyclomatic complexity;
- coverage percentage or `N/A`; and
- CRAP score or `N/A`.

Rows shall be sorted by:

1. numeric CRAP descending;
2. complexity descending;
3. source path ascending; and
4. line ascending.

Rows with `N/A` CRAP shall appear after numeric rows.

The report shall include a summary containing the number of functions analyzed, functions with coverage, functions without coverage, maximum CRAP, and threshold.

When `--format json` is selected, the output shall contain equivalent row and summary data and shall be valid JSON.

## 13. Threshold

The default threshold is `8.0`. It may be changed with `--threshold` or disabled with `--no-threshold`.

The maximum is the largest numeric CRAP value. If no numeric CRAP values exist, the maximum is treated as `0.0`.

If the maximum numeric CRAP value is greater than the threshold, the tool shall:

- print a diagnostic to stderr; and
- exit with code `2`.

The threshold shall not be considered exceeded when there are no numeric CRAP values.

## 14. Exit Codes

```text
0  Analysis completed and threshold was not exceeded.
1  Invalid command-line usage.
2  CRAP threshold exceeded.
3  One or more source files could not be parsed.
4  Explicitly requested coverage was missing, invalid, or unsupported.
5  Git, filesystem, or coverage-command execution failure.
```

## 15. Determinism and Safety

The tool shall:

- produce deterministic ordering;
- avoid modifying source files;
- avoid modifying the user's coverage files;
- run coverage commands from the project root;
- report command failures without hiding their exit status; and
- use normalized paths consistently across operating systems.

## 16. V1 Acceptance Examples

The implementation shall include tests covering at least:

- a JavaScript file containing multiple function types;
- nested functions;
- each supported complexity construct;
- an HTML file with multiple inline scripts;
- an HTML file referencing an external script;
- missing and malformed coverage data;
- exact and unmatched coverage attribution;
- changed-file selection;
- threshold pass and threshold failure; and
- table and JSON output.