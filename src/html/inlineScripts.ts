import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import type { SourceLocation } from '../model/types.js';

type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
type TextNode = DefaultTreeAdapterTypes.TextNode;

const EXECUTABLE_SCRIPT_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

export interface InlineScript {
  readonly virtualPath: string;
  readonly code: string;
  readonly startLine: number;
  readonly startColumn: number;
}

export function discoverInlineScripts(htmlSourcePath: string, html: string): InlineScript[] {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const scripts: InlineScript[] = [];
  let scriptTagIndex = 0;

  for (const element of findScriptElements(document)) {
    scriptTagIndex += 1;
    if (!isInlineExecutableScript(element)) continue;

    const text = firstTextChild(element);
    if (!text?.value.trim() || !text.sourceCodeLocation) continue;

    scripts.push({
      virtualPath: `${htmlSourcePath}#script[${scriptTagIndex}]`,
      code: text.value,
      startLine: text.sourceCodeLocation.startLine,
      startColumn: text.sourceCodeLocation.startCol,
    });
  }

  return scripts;
}

export function translateLocation(script: InlineScript, relative: SourceLocation): SourceLocation {
  if (relative.line === 1) {
    return { line: script.startLine, column: script.startColumn + relative.column - 1 };
  }
  return { line: script.startLine + relative.line - 1, column: relative.column };
}

function* findScriptElements(node: Node): Generator<Element> {
  if (isElement(node) && node.nodeName === 'script') {
    yield node;
  }
  for (const child of childrenOf(node)) {
    yield* findScriptElements(child);
  }
}

function childrenOf(node: Node): ChildNode[] {
  return 'childNodes' in node ? node.childNodes : [];
}

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function isInlineExecutableScript(element: Element): boolean {
  const hasSrc = element.attrs.some((attr) => attr.name === 'src');
  if (hasSrc) return false;

  const type = element.attrs.find((attr) => attr.name === 'type')?.value.toLowerCase() ?? '';
  return EXECUTABLE_SCRIPT_TYPES.has(type);
}

function firstTextChild(element: Element): TextNode | undefined {
  return element.childNodes.find((child): child is TextNode => child.nodeName === '#text');
}
