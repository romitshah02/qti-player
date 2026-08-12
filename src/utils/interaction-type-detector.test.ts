import { describe, expect, it } from 'vitest';
import { detectInteractionType, findUnsupportedInteraction, isAdaptiveItem } from './interaction-type-detector';

describe('interaction-type-detector', () => {
  it('detects the most specific matching tag (graphic-gap-match before gap-match)', () => {
    expect(detectInteractionType('<qti-graphic-gap-match-interaction/>')).toBe('Graphic Gap Match');
    expect(detectInteractionType('<qti-choice-interaction/>')).toBe('Multiple Choice');
    expect(detectInteractionType('<div/>')).toBeNull();
  });

  it('flags adaptive="true" items', () => {
    expect(isAdaptiveItem('<qti-assessment-item identifier="x" adaptive="true">')).toBe(true);
    expect(isAdaptiveItem('<qti-assessment-item identifier="x">')).toBe(false);
  });

  it('finds an interaction tag missing from the supported set', () => {
    expect(findUnsupportedInteraction('<qti-choice-interaction/><qti-made-up-interaction/>')).toBe('qti-made-up-interaction');
    expect(findUnsupportedInteraction('<qti-choice-interaction/><qti-slider-interaction/>')).toBeNull();
  });
});