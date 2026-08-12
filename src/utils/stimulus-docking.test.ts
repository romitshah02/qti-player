import { describe, expect, it } from 'vitest';
import { findDockingElement, hasDockingDiv } from './stimulus-docking';

describe('stimulus-docking', () => {
  it('detects an authored docking div regardless of attribute order', () => {
    const a = '<div class="qti-shared-stimulus" data-stimulus-idref="mars-passage"></div>';
    const b = '<div data-stimulus-idref="mars-passage" class="foo qti-shared-stimulus bar"></div>';
    expect(hasDockingDiv(a, 'mars-passage')).toBe(true);
    expect(hasDockingDiv(b, 'mars-passage')).toBe(true);
    expect(hasDockingDiv(a, 'other-id')).toBe(false);
  });

  it('finds the docking element in a rendered root, or null if absent', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="qti-shared-stimulus" data-stimulus-idref="mars-passage"></div>';
    expect(findDockingElement(root, 'mars-passage')).not.toBeNull();
    expect(findDockingElement(root, 'missing')).toBeNull();
    expect(findDockingElement(null, 'mars-passage')).toBeNull();
  });
});