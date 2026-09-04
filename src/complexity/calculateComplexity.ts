import { base as defaultBase, simple, type RecursiveVisitors, type SimpleVisitors } from 'acorn-walk';
import type { Function as AcornFunction, LogicalExpression, SwitchCase } from 'acorn';

// Nested functions are discovered and scored independently (see functions/discoverFunctions.ts),
// so a decision point belonging to a nested function must not inflate its enclosing function's
// complexity. Overriding these three types to a no-op stops the walk from descending into them.
function stopAtNestedFunction(): void {
  // Intentionally does not call the walk's `next` callback, so the walker never
  // descends into this nested function's own params/body.
}

const nestedFunctionBoundary: RecursiveVisitors<void> = {
  ...defaultBase,
  FunctionDeclaration: stopAtNestedFunction,
  FunctionExpression: stopAtNestedFunction,
  ArrowFunctionExpression: stopAtNestedFunction,
};

export function calculateCyclomaticComplexity(fn: AcornFunction): number {
  let complexity = 1;

  const countDecision = () => {
    complexity += 1;
  };

  const visitors: SimpleVisitors<void> = {
    IfStatement: countDecision,
    ForStatement: countDecision,
    ForInStatement: countDecision,
    ForOfStatement: countDecision,
    WhileStatement: countDecision,
    DoWhileStatement: countDecision,
    CatchClause: countDecision,
    ConditionalExpression: countDecision,
    // A `default:` clause has no `test` and is not a decision point per spec section 8,
    // which counts "case" clauses specifically.
    SwitchCase: (node) => {
      if ((node as SwitchCase).test !== null) countDecision();
    },
    LogicalExpression: (node) => {
      const operator = (node as LogicalExpression).operator;
      if (operator === '&&' || operator === '||') countDecision();
    },
  };

  for (const param of fn.params) {
    simple(param, visitors, nestedFunctionBoundary);
  }
  simple(fn.body, visitors, nestedFunctionBoundary);

  return complexity;
}
