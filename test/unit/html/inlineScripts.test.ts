import { describe, expect, it } from 'vitest';
import { discoverInlineScripts, translateLocation } from '../../../src/html/inlineScripts.js';

describe('discoverInlineScripts', () => {
  it('extracts a single inline script with its virtual path and raw text', () => {
    const html = '<html><body><script>\nconst x = 1;\n</script></body></html>';

    const [script] = discoverInlineScripts('page.html', html);

    expect(script).toMatchObject({
      virtualPath: 'page.html#script[1]',
      code: '\nconst x = 1;\n',
    });
  });

  it('numbers multiple inline scripts in one-based document order', () => {
    const html = '<script>a();</script><script>b();</script>';

    const scripts = discoverInlineScripts('page.html', html);

    expect(scripts.map((s) => s.virtualPath)).toEqual([
      'page.html#script[1]',
      'page.html#script[2]',
    ]);
  });

  it('treats a script with no type attribute as executable JavaScript', () => {
    const scripts = discoverInlineScripts('page.html', '<script>a();</script>');
    expect(scripts).toHaveLength(1);
  });

  it('treats type="module" as executable JavaScript', () => {
    const scripts = discoverInlineScripts(
      'page.html',
      '<script type="module">a();</script>',
    );
    expect(scripts).toHaveLength(1);
  });

  it('treats type="text/javascript" and type="application/javascript" as executable', () => {
    const scripts = discoverInlineScripts(
      'page.html',
      '<script type="text/javascript">a();</script><script type="application/javascript">b();</script>',
    );
    expect(scripts).toHaveLength(2);
  });

  it('skips a script with a non-JavaScript type without emitting it', () => {
    const scripts = discoverInlineScripts(
      'page.html',
      '<script type="application/json">{}</script>',
    );
    expect(scripts).toHaveLength(0);
  });

  it('skips an external script referenced by src', () => {
    const scripts = discoverInlineScripts('page.html', '<script src="app.js"></script>');
    expect(scripts).toHaveLength(0);
  });

  it('skips an empty inline script', () => {
    const scripts = discoverInlineScripts('page.html', '<script></script>');
    expect(scripts).toHaveLength(0);
  });

  it('keeps virtual-path numbering stable across a skipped script', () => {
    const html =
      '<script type="application/json">{}</script><script>real();</script>';

    const [script] = discoverInlineScripts('page.html', html);

    expect(script).toMatchObject({ virtualPath: 'page.html#script[2]' });
  });

  it('reports the document line and column where the script text begins', () => {
    const html = '<html>\n<body>\n  <script>\nconst x = 1;\n</script>\n</body>\n</html>';

    const [script] = discoverInlineScripts('page.html', html);

    expect(script).toMatchObject({ startLine: 3, startColumn: 11 });
  });
});

describe('translateLocation', () => {
  const script = { virtualPath: 'page.html#script[1]', code: '', startLine: 5, startColumn: 11 };

  it('offsets a location on the snippet\'s first line by the script start column', () => {
    expect(translateLocation(script, { line: 1, column: 1 })).toEqual({ line: 5, column: 11 });
    expect(translateLocation(script, { line: 1, column: 7 })).toEqual({ line: 5, column: 17 });
  });

  it('offsets a location on a later line by only the line number, keeping its own column', () => {
    expect(translateLocation(script, { line: 3, column: 4 })).toEqual({ line: 7, column: 4 });
  });
});
