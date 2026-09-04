import { describe, expect, it } from 'vitest';
import { parseJavaScript } from '../../../src/parsing/parseJavaScript.js';
import { discoverFunctions } from '../../../src/functions/discoverFunctions.js';

function discover(code: string) {
  const { ast } = parseJavaScript('file.js', code);
  return discoverFunctions(ast, 'file.js');
}

describe('discoverFunctions', () => {
  it('names a function declaration by its declared name', () => {
    const [fn] = discover('function declared() {}');

    expect(fn).toMatchObject({
      sourcePath: 'file.js',
      name: 'declared',
      kind: 'function-declaration',
    });
  });

  it('names a named function expression by its own id, ignoring the binding', () => {
    const [fn] = discover('const expr = function namedExpression() {};');

    expect(fn).toMatchObject({ name: 'namedExpression', kind: 'function-expression' });
  });

  it('infers the name of an anonymous function expression from its variable binding', () => {
    const [fn] = discover('const inferred = function () {};');

    expect(fn).toMatchObject({ name: 'inferred', kind: 'function-expression' });
  });

  it('infers the name of an arrow function from its variable binding', () => {
    const [fn] = discover('const arrow = () => 1;');

    expect(fn).toMatchObject({ name: 'arrow', kind: 'arrow-function' });
  });

  it('infers the name of a function assigned via a plain assignment expression', () => {
    const [fn] = discover('let handler; handler = function () {};');

    expect(fn).toMatchObject({ name: 'handler', kind: 'function-expression' });
  });

  it('generates a stable location-based name for a fully anonymous function', () => {
    const [fn] = discover('setTimeout(function () {}, 0);');

    expect(fn!.name).toBe('<anonymous>@1:12');
    expect(fn!.kind).toBe('function-expression');
  });

  it('generates a stable location-based name for a fully anonymous arrow function', () => {
    const [fn] = discover('setTimeout(() => {}, 0);');

    expect(fn!.name).toBe('<anonymous>@1:12');
    expect(fn!.kind).toBe('arrow-function');
  });

  it('names a class constructor, method, getter and setter', () => {
    const functions = discover(`
      class Thing {
        constructor() {}
        method() {}
        get value() { return 1; }
        set value(v) {}
      }
    `);

    expect(functions).toContainEqual(
      expect.objectContaining({ name: 'constructor', kind: 'constructor' }),
    );
    expect(functions).toContainEqual(expect.objectContaining({ name: 'method', kind: 'method' }));
    expect(functions).toContainEqual(expect.objectContaining({ name: 'value', kind: 'getter' }));
    expect(functions).toContainEqual(expect.objectContaining({ name: 'value', kind: 'setter' }));
  });

  it('names a method declared with a string-literal key', () => {
    const [fn] = discover('class Thing { "literal-name"() {} }');

    expect(fn).toMatchObject({ name: 'literal-name', kind: 'method' });
  });

  it('names a private class method by its private name', () => {
    const [fn] = discover('class Thing { #method() {} }');

    expect(fn).toMatchObject({ name: 'method', kind: 'method' });
  });

  it('falls back to a computed placeholder name for a computed method key', () => {
    const [fn] = discover('const key = "dynamic"; class Thing { [key]() {} }');

    expect(fn).toMatchObject({ name: '<computed>', kind: 'method' });
  });

  it('names an object-literal shorthand method as object-method', () => {
    const [fn] = discover('const container = { objectMethod() {} };');

    expect(fn).toMatchObject({ name: 'objectMethod', kind: 'object-method' });
  });

  it('names an object-literal getter and setter', () => {
    const functions = discover('const container = { get x() { return 1; }, set x(v) {} };');

    expect(functions).toContainEqual(expect.objectContaining({ name: 'x', kind: 'getter' }));
    expect(functions).toContainEqual(expect.objectContaining({ name: 'x', kind: 'setter' }));
  });

  it('keeps a plain arrow-valued object property as an arrow-function named after its key', () => {
    const [fn] = discover('const container = { handler: () => 1 };');

    expect(fn).toMatchObject({ name: 'handler', kind: 'arrow-function' });
  });

  it('reports nested functions separately from their enclosing function', () => {
    const functions = discover(`
      function outer() {
        function inner() {}
        return inner;
      }
    `);

    expect(functions).toHaveLength(2);
    expect(functions).toContainEqual(expect.objectContaining({ name: 'outer' }));
    expect(functions).toContainEqual(expect.objectContaining({ name: 'inner' }));
  });

  it('reports 1-based start and end locations', () => {
    const [fn] = discover('function f() {\n  return 1;\n}');

    expect(fn!.start).toEqual({ line: 1, column: 1 });
    expect(fn!.end).toEqual({ line: 3, column: 2 });
  });

  it('keeps a reference to the underlying AST node for later complexity analysis', () => {
    const [fn] = discover('function f() {}');

    expect(fn!.node.type).toBe('FunctionDeclaration');
  });
});
