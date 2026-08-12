import { describe, expect, it } from 'vitest';
import { rewriteRelativeUrls } from './asset-url-rewriter';

describe('rewriteRelativeUrls', () => {
  it('rewrites relative src/href/data to absolute, leaves absolute values untouched', () => {
    // A leading-slash href is root-relative to the current origin already —
    // treated as absolute, left untouched (matches isAbsoluteUrl's intent).
    const xml = '<img src="mars.png"/><a href="/abs/path.xml"/><object data="fig.png"/><img src="https://cdn.example.com/x.png"/>';
    const result = rewriteRelativeUrls(xml, 'https://example.com/content/items/1/index.xml');
    expect(result).toContain('src="https://example.com/content/items/1/mars.png"');
    expect(result).toContain('href="/abs/path.xml"');
    expect(result).toContain('data="https://example.com/content/items/1/fig.png"');
    expect(result).toContain('src="https://cdn.example.com/x.png"');
  });
});
