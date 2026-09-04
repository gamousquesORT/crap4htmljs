import { parseJavaScript } from '../parsing/parseJavaScript.js';
import { discoverFunctions } from '../functions/discoverFunctions.js';
import { calculateCyclomaticComplexity } from '../complexity/calculateComplexity.js';
import type { FunctionInfo } from '../model/types.js';

export interface AnalyzedFunction extends FunctionInfo {
  readonly complexity: number;
}

export function analyzeJavaScriptSource(sourcePath: string, code: string): AnalyzedFunction[] {
  const { ast } = parseJavaScript(sourcePath, code);

  return discoverFunctions(ast, sourcePath).map(({ node, ...info }) => ({
    ...info,
    complexity: calculateCyclomaticComplexity(node),
  }));
}
