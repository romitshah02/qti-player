const INTERACTIONS_REQUIRING_OBJECT_TAG = [
  'qti-hotspot-interaction',
  'qti-graphic-order-interaction',
  'qti-graphic-associate-interaction',
  'qti-graphic-gap-match-interaction',
];

/**
 * These four interactions' allowlist only accepts <object>, not <img>, as the
 * background-graphic child — inconsistent with sibling interactions
 * (select-point, media, position-object) that explicitly allow img. The
 * parser doesn't care either way (it reads `data ?? src`, `alt`, `width`,
 * `height` identically for both tags), so renaming the tag is side-effect-free.
 */
export function fixGraphicInteractionImgTags(itemXml: string): string {
  let xml = itemXml;
  for (const tag of INTERACTIONS_REQUIRING_OBJECT_TAG) {
    const blockPattern = new RegExp(`(<${tag}\\b[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'g');
    xml = xml.replace(blockPattern, (_match, open, body, close) => {
      const fixedBody = body.replace(/<img\b([^>]*?)\/?>/g, '<object$1></object>');
      return open + fixedBody + close;
    });
  }
  return xml;
}

function extractAttribute(tagSource: string, name: string): string | null {
  const match = tagSource.match(new RegExp(`\\b${name}=["']([^"']*)["']`));
  return match ? match[1] : null;
}

function attr(name: string, value: string | null): string {
  return value !== null ? ` ${name}="${value}"` : '';
}

/**
 * Same interactions, same object-only allowlist — a responsive
 * <picture><source .../><img .../></picture> block hits it too, but the
 * plain-<img> rename trick above doesn't work here: the extractor only
 * reaches into a <picture>'s fallback <img> when the matched node's OWN tag
 * is literally "picture" — renaming or wrapping the outer tag would make it
 * look for data/src on an element that has neither, orphaning the real image
 * instead of fixing anything. Flattening to a single self-contained
 * <object> (using the fallback <img>'s own attributes) sidesteps that —
 * <object> has no responsive-source concept to preserve anyway, so nothing
 * meaningful is lost.
 */
export function flattenPictureTags(itemXml: string): string {
  let xml = itemXml;
  for (const tag of INTERACTIONS_REQUIRING_OBJECT_TAG) {
    const blockPattern = new RegExp(`(<${tag}\\b[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'g');
    xml = xml.replace(blockPattern, (_match, open, body, close) => {
      const fixedBody = body.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g, (pictureMatch: string, inner: string) => {
        const imgMatch = inner.match(/<img\b[^>]*\/?>/);
        if (!imgMatch) return pictureMatch;
        const imgTag = imgMatch[0];
        const src = extractAttribute(imgTag, 'src');
        const alt = extractAttribute(imgTag, 'alt');
        const width = extractAttribute(imgTag, 'width');
        const height = extractAttribute(imgTag, 'height');
        return `<object${attr('src', src)}${attr('alt', alt)}${attr('width', width)}${attr('height', height)}></object>`;
      });
      return open + fixedBody + close;
    });
  }
  return xml;
}

// gapMatch, graphicGapMatch, and hottext all share the same static-content
// allowlist: p, div, span, ul, ol, li, table, tbody, thead, tr, td, th. But
// the engine's own rendering CSS explicitly styles blockquote/figure/pre/dl/
// headings as expected item-body content — they're just missing from this
// one narrower list. Confirmed so far: blockquote. Extend
// BLOCK_TAGS_NEEDING_DIV_WRAP if others turn up.
const INTERACTIONS_WITH_NARROW_STATIC_CONTENT_ALLOWLIST = [
  'qti-gap-match-interaction',
  'qti-graphic-gap-match-interaction',
  'qti-hottext-interaction',
];
const BLOCK_TAGS_NEEDING_DIV_WRAP = ['blockquote'];

/**
 * Wrap an otherwise-disallowed-as-direct-child block tag in a <div> (which
 * the allowlist does accept) so it stops being a "direct child" of the
 * interaction while staying fully intact, still styled normally as a
 * descendant either way.
 */
export function fixNarrowStaticContentAllowlist(itemXml: string): string {
  let xml = itemXml;
  for (const interactionTag of INTERACTIONS_WITH_NARROW_STATIC_CONTENT_ALLOWLIST) {
    const blockPattern = new RegExp(`(<${interactionTag}\\b[^>]*>)([\\s\\S]*?)(</${interactionTag}>)`, 'g');
    xml = xml.replace(blockPattern, (_match, open, body, close) => {
      let fixedBody = body;
      for (const blockTag of BLOCK_TAGS_NEEDING_DIV_WRAP) {
        const tagPattern = new RegExp(`<${blockTag}\\b([^>]*)>([\\s\\S]*?)</${blockTag}>`, 'g');
        fixedBody = fixedBody.replace(tagPattern, (_m: string, attrs: string, inner: string) => `<div><${blockTag}${attrs}>${inner}</${blockTag}></div>`);
      }
      return open + fixedBody + close;
    });
  }
  return xml;
}