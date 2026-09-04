import { describe, expect, it } from 'vitest';
import { analyzeHtmlSource } from '../../../src/orchestration/analyzeHtmlSource.js';

describe('analyzeHtmlSource', () => {
  it('discovers functions in an inline script with document-relative locations', () => {
    const html = '<html>\n<body>\n  <script>\nfunction f(x) { if (x) return 1; }\n</script>\n</body>\n</html>';

    const result = analyzeHtmlSource('page.html', html);

    expect(result).toEqual([
      {
        sourcePath: 'page.html#script[1]',
        name: 'f',
        kind: 'function-declaration',
        start: { line: 4, column: 1 },
        end: { line: 4, column: 35 },
        complexity: 2,
      },
    ]);
  });

  it('discovers functions across multiple inline scripts', () => {
    const html = '<script>function a() {}</script><script>function b() {}</script>';

    const result = analyzeHtmlSource('page.html', html);

    expect(result.map((fn) => ({ name: fn.name, sourcePath: fn.sourcePath }))).toEqual([
      { name: 'a', sourcePath: 'page.html#script[1]' },
      { name: 'b', sourcePath: 'page.html#script[2]' },
    ]);
  });

  it('returns an empty array for an HTML file with no inline scripts', () => {
    expect(analyzeHtmlSource('page.html', '<html><body></body></html>')).toEqual([]);
  });
});
