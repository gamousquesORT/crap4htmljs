import { describe, expect, it } from 'vitest';
import { JavaScriptParseError, parseJavaScript } from '../../../src/parsing/parseJavaScript.js';

describe('parseJavaScript', () => {
  it('parses valid JavaScript into a Program AST', () => {
    const result = parseJavaScript('file.js', 'function f() { return 1; }');

    expect(result.sourcePath).toBe('file.js');
    expect(result.code).toBe('function f() { return 1; }');
    expect(result.ast.type).toBe('Program');
    expect(result.ast.body).toHaveLength(1);
  });

  it('parses ES module syntax', () => {
    const result = parseJavaScript('file.mjs', 'export const x = 1;');

    expect(result.ast.type).toBe('Program');
  });

  it('records source locations on AST nodes', () => {
    const result = parseJavaScript('file.js', 'function f() {}');

    const [node] = result.ast.body;
    expect(node!.loc?.start.line).toBe(1);
  });

  it('throws a JavaScriptParseError with path, line and column on invalid syntax', () => {
    expect(() => parseJavaScript('broken.js', 'function (] {')).toThrowError(JavaScriptParseError);

    try {
      parseJavaScript('broken.js', 'function (] {');
      expect.unreachable('parseJavaScript should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(JavaScriptParseError);
      const parseError = error as JavaScriptParseError;
      expect(parseError.sourcePath).toBe('broken.js');
      expect(parseError.line).toBeGreaterThanOrEqual(1);
      expect(parseError.column).toBeGreaterThanOrEqual(1);
      expect(parseError.message.length).toBeGreaterThan(0);
    }
  });
});
