import { describe, expect, it } from 'vitest';
import { parseJavaScript } from '../../../src/parsing/parseJavaScript.js';
import { discoverFunctions } from '../../../src/functions/discoverFunctions.js';
import { calculateCyclomaticComplexity } from '../../../src/complexity/calculateComplexity.js';

function complexityOf(code: string, index = 0): number {
  const { ast } = parseJavaScript('file.js', code);
  const [fn] = discoverFunctions(ast, 'file.js').slice(index);
  return calculateCyclomaticComplexity(fn!.node);
}

describe('calculateCyclomaticComplexity', () => {
  it('is 1 for a function with no decision points', () => {
    expect(complexityOf('function f() { return 1; }')).toBe(1);
  });

  it('is 1 for an arrow function with no decision points', () => {
    expect(complexityOf('const f = () => 1;')).toBe(1);
  });

  it('is 1 for a class method with no decision points', () => {
    expect(complexityOf('class C { method() { return 1; } }')).toBe(1);
  });

  it('adds one for an if statement', () => {
    expect(complexityOf('function f(x) { if (x) return 1; return 0; }')).toBe(2);
  });

  it('adds one for a for statement', () => {
    expect(complexityOf('function f() { for (let i = 0; i < 1; i++) {} }')).toBe(2);
  });

  it('adds one for a for-in statement', () => {
    expect(complexityOf('function f(o) { for (const k in o) {} }')).toBe(2);
  });

  it('adds one for a for-of statement', () => {
    expect(complexityOf('function f(xs) { for (const x of xs) {} }')).toBe(2);
  });

  it('adds one for a while statement', () => {
    expect(complexityOf('function f(x) { while (x) { x--; } }')).toBe(2);
  });

  it('adds one for a do-while statement', () => {
    expect(complexityOf('function f(x) { do { x--; } while (x); }')).toBe(2);
  });

  it('adds one for a catch clause', () => {
    expect(complexityOf('function f() { try {} catch (e) {} }')).toBe(2);
  });

  it('adds one for each case clause but not for default', () => {
    expect(
      complexityOf(
        'function f(x) { switch (x) { case 1: break; case 2: break; default: break; } }',
      ),
    ).toBe(3);
  });

  it('adds one for a conditional (ternary) expression', () => {
    expect(complexityOf('function f(x) { return x ? 1 : 0; }')).toBe(2);
  });

  it('adds one for a logical && operator', () => {
    expect(complexityOf('function f(a, b) { return a && b; }')).toBe(2);
  });

  it('adds one for a logical || operator', () => {
    expect(complexityOf('function f(a, b) { return a || b; }')).toBe(2);
  });

  it('adds one for each operator in a chain of logical operators', () => {
    expect(complexityOf('function f(a, b, c) { return a && b && c; }')).toBe(3);
  });

  it('sums multiple distinct decision points in the same function', () => {
    expect(
      complexityOf('function f(x, y) { if (x) { for (const i of y) {} } return x ? 1 : 0; }'),
    ).toBe(4);
  });

  it('excludes decision points that belong to a nested function', () => {
    const code = `
      function outer(x) {
        if (x) return 1;
        function inner(y) {
          if (y) return 2;
          return 0;
        }
        return inner(x);
      }
    `;
    const { ast } = parseJavaScript('file.js', code);
    const [outer, inner] = discoverFunctions(ast, 'file.js');

    expect(calculateCyclomaticComplexity(outer!.node)).toBe(2);
    expect(calculateCyclomaticComplexity(inner!.node)).toBe(2);
  });

  it('excludes decision points belonging to a nested function expression', () => {
    const code = `
      function outer(x) {
        if (x) return 1;
        const inner = function (y) {
          if (y) return 2;
        };
        return inner(x);
      }
    `;
    const { ast } = parseJavaScript('file.js', code);
    const [outer] = discoverFunctions(ast, 'file.js');

    expect(calculateCyclomaticComplexity(outer!.node)).toBe(2);
  });

  it('excludes decision points belonging to a nested arrow function', () => {
    const code = `
      function outer(x) {
        if (x) return 1;
        const inner = (y) => (y ? 2 : 0);
        return inner(x);
      }
    `;
    const { ast } = parseJavaScript('file.js', code);
    const [outer] = discoverFunctions(ast, 'file.js');

    expect(calculateCyclomaticComplexity(outer!.node)).toBe(2);
  });
});
