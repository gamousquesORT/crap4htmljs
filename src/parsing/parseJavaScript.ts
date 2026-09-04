import { parse, type Program } from 'acorn';

export interface ParsedJavaScript {
  readonly sourcePath: string;
  readonly code: string;
  readonly ast: Program;
}

interface AcornSyntaxError extends SyntaxError {
  loc: { line: number; column: number };
}

export class JavaScriptParseError extends Error {
  constructor(
    public readonly sourcePath: string,
    public readonly line: number,
    public readonly column: number,
    message: string,
  ) {
    super(message);
    this.name = 'JavaScriptParseError';
  }
}

export function parseJavaScript(sourcePath: string, code: string): ParsedJavaScript {
  try {
    const ast = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
    return { sourcePath, code, ast };
  } catch (error) {
    const syntaxError = error as AcornSyntaxError;
    throw new JavaScriptParseError(
      sourcePath,
      syntaxError.loc.line,
      syntaxError.loc.column + 1,
      syntaxError.message,
    );
  }
}
