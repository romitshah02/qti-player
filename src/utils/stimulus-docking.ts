function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect an authored docking div inside an item's qti-item-body:
 *   <div class="qti-shared-stimulus" data-stimulus-idref="X"></div>
 * Item authors use this to place a shared stimulus inside their own layout
 * (e.g. a two-column qti-layout-row) instead of leaving placement to the host.
 */
export function hasDockingDiv(itemXml: string, identifier: string): boolean {
  const escapedIdentifier = escapeForRegex(identifier);
  // Lookaheads so class= and data-stimulus-idref= can appear in either order.
  const dockingPattern = new RegExp(
    `<div\\b(?=[^>]*\\bclass=["'][^"']*qti-shared-stimulus)(?=[^>]*\\bdata-stimulus-idref=["']${escapedIdentifier}["'])[^>]*>`,
  );
  return dockingPattern.test(itemXml);
}

/**
 * Find that same docking div in the rendered item DOM, once the item player
 * has mounted the item.
 */
export function findDockingElement(root: Element | null, identifier: string): Element | null {
  if (!root) return null;
  return root.querySelector(`.qti-shared-stimulus[data-stimulus-idref="${identifier}"]`);
}