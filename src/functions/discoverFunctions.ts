import { ancestor } from 'acorn-walk';
import type {
  AnyNode,
  Function as AcornFunction,
  FunctionDeclaration,
  MethodDefinition,
  Position,
  Program,
  Property,
} from 'acorn';
import type { FunctionInfo, FunctionKind, SourceLocation } from '../model/types.js';

export interface DiscoveredFunction extends FunctionInfo {
  readonly node: AcornFunction;
}

export function discoverFunctions(ast: Program, sourcePath: string): DiscoveredFunction[] {
  const discovered: DiscoveredFunction[] = [];

  ancestor(ast, {
    Function(node, _state, ancestors) {
      const parent = ancestors[ancestors.length - 2];
      const { name, kind } = describe(node, parent);
      discovered.push({
        sourcePath,
        name,
        kind,
        start: toLocation(node.loc!.start),
        end: toLocation(node.loc!.end),
        node,
      });
    },
  });

  return discovered;
}

function describe(node: AcornFunction, parent: AnyNode | undefined): { name: string; kind: FunctionKind } {
  if (node.type === 'FunctionDeclaration') {
    return { name: (node as FunctionDeclaration).id.name, kind: 'function-declaration' };
  }

  if (parent?.type === 'MethodDefinition') {
    return { name: memberName(parent), kind: methodDefinitionKind(parent) };
  }

  if (parent?.type === 'Property' && (parent.method || parent.kind === 'get' || parent.kind === 'set')) {
    return { name: memberName(parent), kind: propertyKind(parent) };
  }

  if (node.type === 'FunctionExpression' && node.id) {
    return { name: node.id.name, kind: 'function-expression' };
  }

  const kind: FunctionKind = node.type === 'ArrowFunctionExpression' ? 'arrow-function' : 'function-expression';
  const inferredName = inferBindingName(parent);
  if (inferredName) {
    return { name: inferredName, kind };
  }

  return { name: `<anonymous>@${node.loc!.start.line}:${node.loc!.start.column + 1}`, kind };
}

function methodDefinitionKind(node: MethodDefinition): FunctionKind {
  switch (node.kind) {
    case 'constructor':
      return 'constructor';
    case 'get':
      return 'getter';
    case 'set':
      return 'setter';
    default:
      return 'method';
  }
}

function propertyKind(node: Property): FunctionKind {
  if (node.kind === 'get') return 'getter';
  if (node.kind === 'set') return 'setter';
  return 'object-method';
}

function memberName(node: MethodDefinition | Property): string {
  if (node.computed) return '<computed>';
  const key = node.key;
  if (key.type === 'PrivateIdentifier') return key.name;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal') return String(key.value);
  return '<computed>';
}

function inferBindingName(parent: AnyNode | undefined): string | undefined {
  if (!parent) return undefined;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
  if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return parent.left.name;
  }
  if (parent.type === 'Property' && parent.key.type === 'Identifier') {
    return parent.key.name;
  }
  return undefined;
}

function toLocation(position: Position): SourceLocation {
  return { line: position.line, column: position.column + 1 };
}
