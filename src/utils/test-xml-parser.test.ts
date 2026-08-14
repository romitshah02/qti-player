import { describe, expect, it } from 'vitest';
import { flattenItemRefs, flattenSections, parseAssessmentTest, parseIso8601Duration } from './test-xml-parser';

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

  it('parses qti-time-limits at all four structural levels', () => {
    const xml = `<?xml version="1.0"?>
<qti-assessment-test identifier="test1" title="Timed Test">
  <qti-time-limits max-time="PT60M"/>
  <qti-test-part identifier="part1" submission-mode="individual">
    <qti-time-limits max-time="PT30M" allow-late-submission="true"/>
    <qti-assessment-section identifier="sec1" title="Section One">
      <qti-time-limits max-time="PT10M"/>
      <qti-assessment-item-ref identifier="item1" href="item1.xml">
        <qti-time-limits max-time="PT90S"/>
      </qti-assessment-item-ref>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`;
    const parsed = parseAssessmentTest(xml);
    expect(parsed.timeLimits).toEqual({ maxSeconds: 3600, allowLateSubmission: false });
    expect(parsed.parts[0].timeLimits).toEqual({ maxSeconds: 1800, allowLateSubmission: true });
    expect(parsed.parts[0].sections[0].timeLimits).toEqual({ maxSeconds: 600, allowLateSubmission: false });
    expect(parsed.parts[0].sections[0].itemRefs[0].timeLimits).toEqual({ maxSeconds: 90, allowLateSubmission: false });
  });

  it('leaves timeLimits null when a level has no qti-time-limits child', () => {
    const parsed = parseAssessmentTest(SAMPLE_TEST_XML);
    expect(parsed.timeLimits).toBeNull();
    expect(parsed.parts[0].timeLimits).toBeNull();
    expect(parsed.parts[0].sections[0].timeLimits).toBeNull();
  });

  it('parses a test-part\'s qti-item-session-control max-attempts', () => {
    const xml = `<?xml version="1.0"?>
<qti-assessment-test identifier="test1" title="Attempts Test">
  <qti-test-part identifier="part1" submission-mode="individual">
    <qti-item-session-control max-attempts="2"/>
    <qti-assessment-section identifier="sec1" title="Section One">
      <qti-assessment-item-ref identifier="item1" href="item1.xml"/>
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`;
    const parsed = parseAssessmentTest(xml);
    expect(parsed.parts[0].maxAttempts).toBe(2);
  });

  it('leaves maxAttempts null when a part has no qti-item-session-control', () => {
    const parsed = parseAssessmentTest(SAMPLE_TEST_XML);
    expect(parsed.parts[0].maxAttempts).toBeNull();
  });
});

describe('parseIso8601Duration', () => {
  it('parses hours/minutes/seconds combinations', () => {
    expect(parseIso8601Duration('PT45M')).toBe(2700);
    expect(parseIso8601Duration('PT1H30M')).toBe(5400);
    expect(parseIso8601Duration('PT90S')).toBe(90);
    expect(parseIso8601Duration('PT1H')).toBe(3600);
  });

  it('returns null for empty or malformed durations', () => {
    expect(parseIso8601Duration('PT')).toBeNull();
    expect(parseIso8601Duration('not-a-duration')).toBeNull();
    expect(parseIso8601Duration('')).toBeNull();
  });
});