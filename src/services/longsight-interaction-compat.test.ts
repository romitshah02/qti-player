import { describe, expect, it } from 'vitest';
import {
  fixGraphicInteractionImgTags,
  fixNarrowStaticContentAllowlist,
  flattenPictureTags,
} from './longsight-interaction-compat';

describe('fixGraphicInteractionImgTags', () => {
  it('renames <img> to <object> only inside affected interactions', () => {
    const xml = '<qti-hotspot-interaction><img src="a.png" alt="A"/></qti-hotspot-interaction><p><img src="b.png"/></p>';
    const result = fixGraphicInteractionImgTags(xml);
    expect(result).toContain('<object src="a.png" alt="A"></object>');
    expect(result).toContain('<img src="b.png"/>');
  });
});

describe('flattenPictureTags', () => {
  it('flattens <picture> to a single <object> using the fallback <img> attributes', () => {
    const xml = '<qti-graphic-order-interaction><picture><source srcset="a.webp"/><img src="a.png" alt="A" width="100" height="50"/></picture></qti-graphic-order-interaction>';
    const result = flattenPictureTags(xml);
    expect(result).toContain('<object src="a.png" alt="A" width="100" height="50"></object>');
    expect(result).not.toContain('<picture>');
  });
});

describe('fixNarrowStaticContentAllowlist', () => {
  it('wraps blockquote in a div inside the affected interactions', () => {
    const xml = '<qti-hottext-interaction><blockquote>Quote</blockquote></qti-hottext-interaction>';
    const result = fixNarrowStaticContentAllowlist(xml);
    expect(result).toBe('<qti-hottext-interaction><div><blockquote>Quote</blockquote></div></qti-hottext-interaction>');
  });

  it('leaves blockquote outside affected interactions untouched', () => {
    const xml = '<qti-item-body><blockquote>Quote</blockquote></qti-item-body>';
    expect(fixNarrowStaticContentAllowlist(xml)).toBe(xml);
  });
});