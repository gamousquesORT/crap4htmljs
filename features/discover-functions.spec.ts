import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { analyzeJavaScriptSource } from '../src/orchestration/analyzeJavaScriptSource.js';
import type { AnalyzedFunction } from '../src/orchestration/analyzeJavaScriptSource.js';

const feature = await loadFeature('./features/discover-functions.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A file with every supported function kind', ({ Given, When, Then, And }) => {
    let sourcePath: string;
    let sourceCode: string;
    let discovered: AnalyzedFunction[];

    Given(
      'a JavaScript file {string} with the following content:',
      (_ctx, path: string, content: string) => {
        sourcePath = path;
        sourceCode = content;
      },
    );

    When('I analyze the file', () => {
      discovered = analyzeJavaScriptSource(sourcePath, sourceCode);
    });

    Then('the analysis should discover {int} functions', (_ctx, count: number) => {
      expect(discovered).toHaveLength(count);
    });

    And(
      'the discovered functions should include:',
      (_ctx, rows: Array<{ name: string; kind: string; complexity: string }>) => {
        for (const row of rows) {
          expect(discovered).toContainEqual(
            expect.objectContaining({
              name: row.name,
              kind: row.kind,
              complexity: Number(row.complexity),
            }),
          );
        }
      },
    );
  });
});
