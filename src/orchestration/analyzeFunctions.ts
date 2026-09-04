import type { Program } from 'acorn';
import { discoverFunctions } from '../functions/discoverFunctions.js';
import { calculateCyclomaticComplexity } from '../complexity/calculateComplexity.js';
import type { FunctionInfo } from '../model/types.js';

export interface AnalyzedFunction extends FunctionInfo {
  readonly complexity: number;
}

export function analyzeFunctions(ast: Program, sourcePath: string): AnalyzedFunction[] {
  return discoverFunctions(ast, sourcePath).map(({ node, ...info }) => ({
    ...info,
    complexity: calculateCyclomaticComplexity(node),
  }));
}
