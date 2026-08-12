// qti-stylesheet content is item-authored and often assumes it owns the
// whole page — `position: fixed` panes sized/placed for a bare viewport
// escape our header/sidebar no matter what containing block we give an
// ancestor (fixed's clipping rect is the viewport, not a box we control,
// and taking the pane out of flow also stops it reserving space, so it
// overlaps whatever we render in its place). Neutralizing it to `static`
// is what the item actually renders correctly as — confirmed by testing
// with the item's CSS removed entirely.
const FIXED_POSITION = /position\s*:\s*fixed\b/gi;

export function neutralizeFixedPositioning(css: string): string {
  return css.replace(FIXED_POSITION, 'position: static');
}

interface PatchedXhr extends XMLHttpRequest {
  __stylesheetPatchUrl?: string;
}

function isStylesheetRequest(xhr: PatchedXhr): boolean {
  if (/\.css(\?|$)/i.test(xhr.__stylesheetPatchUrl || '')) return true;
  const contentType = xhr.getResponseHeader && xhr.getResponseHeader('content-type');
  return !!contentType && contentType.includes('css');
}

function patchGetter(proto: XMLHttpRequest, prop: 'responseText' | 'response'): void {
  const original = Object.getOwnPropertyDescriptor(proto, prop)!.get!;
  Object.defineProperty(proto, prop, {
    configurable: true,
    get(this: PatchedXhr) {
      const value = original.call(this);
      if (typeof value !== 'string' || !isStylesheetRequest(this)) return value;
      return neutralizeFixedPositioning(value);
    },
  });
}

/**
 * Patch every CSS response's body to strip position:fixed, globally, at the
 * XMLHttpRequest level. The item player fetches qti-stylesheet hrefs via a
 * bundled HTTP client that doesn't go through our own fetch/axios imports —
 * XHR is the one thing every such client still goes through.
 */
export function installStylesheetPatch(): void {
  const proto = window.XMLHttpRequest.prototype as PatchedXhr;
  const originalOpen = proto.open;

  proto.open = function (this: PatchedXhr, method: string, url: string, ...rest: unknown[]) {
    this.__stylesheetPatchUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  patchGetter(proto, 'responseText');
  patchGetter(proto, 'response');
}