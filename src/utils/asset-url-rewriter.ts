// Relative src/href/data in fetched XML resolve against the PAGE's URL by
// default, not the fetch() URL — so they must be rewritten to absolute
// before handing the XML to the item player. `data` covers <object
// data="..."> (e.g. a drawing interaction's embedded image) — left
// unrewritten, a relative path here resolves against the app's own origin,
// 404s, and (if the dev server SPA-falls-back) embeds the whole app.

function isAbsoluteUrl(value: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/|\/|data:)/i.test(value);
}

/**
 * Rewrite relative src/href/data attributes to absolute, resolved against
 * baseUrl. Already-absolute values are left untouched.
 */
export function rewriteRelativeUrls(xml: string, baseUrl: string): string {
  return xml.replace(/\b(src|href|data)=(["'])(.*?)\2/g, (match, attr, quote, value) => {
    if (!value || isAbsoluteUrl(value)) return match;
    const resolved = new URL(value, baseUrl).toString();
    return `${attr}=${quote}${resolved}${quote}`;
  });
}