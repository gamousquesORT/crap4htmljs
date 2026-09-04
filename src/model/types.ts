export type FunctionKind =
  | 'function-declaration'
  | 'function-expression'
  | 'arrow-function'
  | 'method'
  | 'constructor'
  | 'getter'
  | 'setter'
  | 'object-method';

export interface SourceLocation {
  readonly line: number;
  readonly column: number;
}

export interface FunctionInfo {
  readonly sourcePath: string;
  readonly name: string;
  readonly kind: FunctionKind;
  readonly start: SourceLocation;
  readonly end: SourceLocation;
}
