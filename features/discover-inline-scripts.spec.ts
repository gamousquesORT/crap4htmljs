import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { analyzeHtmlSource } from '../src/orchestration/analyzeHtmlSource.js';
import type { AnalyzedFunction } from '../src/orchestration/analyzeFunctions.js';

const feature = await loadFeature('./features/discover-inline-scripts.feature');

describeFeature(feature, ({ Scenario }) => {
  const scenarios = [
    'An HTML file with two inline scripts',
    'An HTML file with a non-executable inline script',
  ];

  for (const scenarioName of scenarios) {
    Scenario(scenarioName, ({ Given, When, Then, And }) => {
      let sourcePath: string;
      let html: string;
      let discovered: AnalyzedFunction[];

      Given(
        'an HTML file {string} with the following content:',
        (_ctx, path: string, content: string) => {
          sourcePath = path;
          html = content;
        },
      );

      When('I analyze the file', () => {
        discovered = analyzeHtmlSource(sourcePath, html);
      });

      Then('the analysis should discover {int} functions', (_ctx, count: number) => {
        expect(discovered).toHaveLength(count);
      });

      And(
        'the discovered functions should include:',
        (
          _ctx,
          rows: Array<{ name: string; kind: string; sourcePath: string; complexity: string }>,
        ) => {
          for (const row of rows) {
            expect(discovered).toContainEqual(
              expect.objectContaining({
                name: row.name,
                kind: row.kind,
                sourcePath: row.sourcePath,
                complexity: Number(row.complexity),
              }),
            );
          }
        },
      );
    });
  }
});
