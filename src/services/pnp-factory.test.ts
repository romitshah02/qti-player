import { describe, expect, it } from 'vitest';
import { PnpFactory } from './pnp-factory';

describe('PnpFactory', () => {
  it('converts a colorStyle constant to its QTI color-theme name', () => {
    const pnp = new PnpFactory();
    pnp.setColorStyle(pnp.constants.COLOR_BLACK_WHITE);
    expect(pnp.convertColorStyleToTheme()).toBe('high-contrast');
  });

  it('evaluatePnpEvent flips glossaryOnScreen only on an actual change', () => {
    const pnp = new PnpFactory();
    expect(pnp.getGlossaryOnScreen()).toBe(true);
    expect(pnp.evaluatePnpEvent(pnp.constants.GLOSSARY_ON)).toBe(false); // already on, no change
    expect(pnp.evaluatePnpEvent(pnp.constants.GLOSSARY_OFF)).toBe(true);
    expect(pnp.getGlossaryOnScreen()).toBe(false);
  });

  it('getProhibitSet reflects glossary-off as a prohibited AfA feature', () => {
    const pnp = new PnpFactory();
    expect(pnp.getProhibitSet()).toBeNull();
    pnp.setGlossaryOnScreen(false);
    expect(pnp.getProhibitSet()).toEqual({ 'glossary-on-screen': 'active' });
  });
});