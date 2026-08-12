import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentLoader } from './content-loader';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContentLoader.resolveItemXml', () => {
  it('returns inline xml as-is (through the compat pipeline) when the item carries it directly', async () => {
    const loader = new ContentLoader('https://example.com');
    const xml = await loader.resolveItemXml({ identifier: 'item1', guid: 'g1', xml: '<qti-item-body/>' });
    expect(xml).toBe('<qti-item-body/>');
  });

  it('fetches, rewrites relative URLs, and runs the compat pipeline when the item carries an href', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => '<qti-item-body><img src="a.png"/></qti-item-body>',
    })));

    const loader = new ContentLoader('https://example.com');
    const xml = await loader.resolveItemXml({ identifier: 'item1', guid: 'g1', href: '/content/items/item1.xml' });
    expect(xml).toContain('src="https://example.com/content/items/a.png"');
  });

  it('throws when an item has neither xml nor href', async () => {
    const loader = new ContentLoader('https://example.com');
    await expect(loader.resolveItemXml({ identifier: 'item1', guid: 'g1' })).rejects.toThrow();
  });
});

describe('ContentLoader.getStimulusXml', () => {
  it('caches by identifier so a repeated request skips the fetch', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '<qti-assessment-stimulus/>' }));
    vi.stubGlobal('fetch', fetchMock);

    const loader = new ContentLoader('https://example.com');
    const descriptor = { identifier: 'mars-passage', href: '/content/stimuli/mars.xml' };
    await loader.getStimulusXml(descriptor);
    await loader.getStimulusXml(descriptor);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});