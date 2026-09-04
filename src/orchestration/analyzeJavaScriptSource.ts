import { parseJavaScript } from '../parsing/parseJavaScript.js';
import { analyzeFunctions, type AnalyzedFunction } from './analyzeFunctions.js';

export type { AnalyzedFunction };

export function analyzeJavaScriptSource(sourcePath: string, code: string): AnalyzedFunction[] {
  const { ast } = parseJavaScript(sourcePath, code);
  return analyzeFunctions(ast, sourcePath);
}
