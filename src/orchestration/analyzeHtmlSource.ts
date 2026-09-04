import { parseJavaScript } from '../parsing/parseJavaScript.js';
import { discoverInlineScripts, translateLocation } from '../html/inlineScripts.js';
import { analyzeFunctions, type AnalyzedFunction } from './analyzeFunctions.js';

export type { AnalyzedFunction };

export function analyzeHtmlSource(htmlSourcePath: string, html: string): AnalyzedFunction[] {
  return discoverInlineScripts(htmlSourcePath, html).flatMap((script) => {
    const { ast } = parseJavaScript(script.virtualPath, script.code);

    return analyzeFunctions(ast, script.virtualPath).map((fn) => ({
      ...fn,
      start: translateLocation(script, fn.start),
      end: translateLocation(script, fn.end),
    }));
  });
}
