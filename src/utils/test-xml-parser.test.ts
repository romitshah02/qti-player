import { describe, expect, it } from 'vitest';
import { flattenItemRefs, flattenSections, parseAssessmentTest } from './test-xml-parser';

const SAMPLE_TEST_XML = `<?xml version="1.0"?>
<qti-assessment-test identifier="test1" title="Sample Test">
  <qti-test-part identifier="part1" submission-mode="individual">
    <qti-assessment-section identifier="sec1" title="Section One">
      <qti-rubric-block>Read carefully.</qti-rubric-block>
      <qti-assessment-item-ref identifier="item1" href="item1.xml"/>
      <qti-assessment-item-ref identifier="item2" href="item2.xml"/>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`;

describe('test-xml-parser', () => {
  it('parses parts/sections/item-refs in document order', () => {
    const parsed = parseAssessmentTest(SAMPLE_TEST_XML);
    expect(parsed.title).toBe('Sample Test');
    expect(parsed.parts).toHaveLength(1);
    expect(parsed.parts[0].sections[0].itemRefs.map((r) => r.identifier)).toEqual(['item1', 'item2']);
  });

  it('flattens sections and item refs', () => {
    const parsed = parseAssessmentTest(SAMPLE_TEST_XML);
    expect(flattenSections(parsed)).toEqual([
      { identifier: 'sec1', name: 'Section One', blurb: 'Read carefully.', itemIdentifiers: ['item1', 'item2'] },
    ]);
    expect(flattenItemRefs(parsed).map((r) => r.href)).toEqual(['item1.xml', 'item2.xml']);
  });

  it('throws on malformed XML', () => {
    expect(() => parseAssessmentTest('<not-closed>')).toThrow();
  });
});