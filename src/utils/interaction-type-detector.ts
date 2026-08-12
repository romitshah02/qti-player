// content/v4/read's itemList carries no interaction-type metadata, so the
// label is derived from the resolved XML by matching a known tag. Ordered
// most-specific first (graphic-* before plain counterparts), with
// end-attempt-interaction last since it's usually paired with a primary
// interaction (e.g. a Skip button alongside a choice interaction).
const TAG_LABELS: [string, string][] = [
  ['qti-graphic-gap-match-interaction', 'Graphic Gap Match'],
  ['qti-graphic-associate-interaction', 'Graphic Associate'],
  ['qti-graphic-order-interaction', 'Graphic Order'],
  ['qti-gap-match-interaction', 'Gap Match'],
  ['qti-choice-interaction', 'Multiple Choice'],
  ['qti-order-interaction', 'Order'],
  ['qti-match-interaction', 'Match'],
  ['qti-associate-interaction', 'Associate'],
  ['qti-hottext-interaction', 'Hottext'],
  ['qti-hotspot-interaction', 'Hotspot'],
  ['qti-select-point-interaction', 'Select Point'],
  ['qti-position-object-interaction', 'Position Object'],
  ['qti-inline-choice-interaction', 'Inline Choice'],
  ['qti-text-entry-interaction', 'Text Entry'],
  ['qti-extended-text-interaction', 'Extended Text'],
  ['qti-slider-interaction', 'Slider'],
  ['qti-upload-interaction', 'Upload'],
  ['qti-drawing-interaction', 'Drawing'],
  ['qti-media-interaction', 'Media'],
  ['qti-portable-custom-interaction', 'Custom (PCI)'],
  ['qti-custom-interaction', 'Custom'],
  ['qti-end-attempt-interaction', 'End Attempt'],
];

/**
 * Detect which interaction type an item's resolved XML uses, for display
 * only (e.g. the item card's meta pill) — not used for rendering.
 */
export function detectInteractionType(xml: string): string | null {
  for (const [tag, label] of TAG_LABELS) {
    if (new RegExp(`<${tag}(\\s|>|/)`).test(xml)) return label;
  }
  return null;
}

/** Detect whether an item's root element declares adaptive="true". */
export function isAdaptiveItem(xml: string): boolean {
  return /<qti-assessment-item\b[^>]*\badaptive=["']true["']/i.test(xml);
}

const SUPPORTED_INTERACTION_TAGS = new Set(TAG_LABELS.map(([tag]) => tag));

/**
 * Find the first *-interaction tag in an item's XML that the engine doesn't
 * implement. Unknown custom elements render inertly (no error, no captured
 * response), so this has to be detected up front rather than caught at
 * render time.
 */
export function findUnsupportedInteraction(xml: string): string | null {
  const matches = xml.match(/<qti-[a-z0-9-]*-interaction\b/g) || [];
  for (const match of matches) {
    const tag = match.slice(1);
    if (!SUPPORTED_INTERACTION_TAGS.has(tag)) return tag;
  }
  return null;
}