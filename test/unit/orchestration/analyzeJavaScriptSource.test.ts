import { describe, expect, it } from 'vitest';
import { analyzeJavaScriptSource } from '../../../src/orchestration/analyzeJavaScriptSource.js';

describe('analyzeJavaScriptSource', () => {
  it('discovers functions and attaches their cyclomatic complexity', () => {
    const result = analyzeJavaScriptSource(
      'file.js',
      'function f(x) { if (x) return 1; return 0; }',
    );

    expect(result).toEqual([
      {
        sourcePath: 'file.js',
        name: 'f',
        kind: 'function-declaration',
        start: { line: 1, column: 1 },
        end: { line: 1, column: 45 },
        complexity: 2,
      },
    ]);
  });

  it('does not leak the underlying AST node in the result', () => {
    const [result] = analyzeJavaScriptSource('file.js', 'function f() {}');

    expect(result).not.toHaveProperty('node');
  });

  it('returns an empty array for a file with no functions', () => {
    expect(analyzeJavaScriptSource('file.js', 'const x = 1;')).toEqual([]);
  });
});
