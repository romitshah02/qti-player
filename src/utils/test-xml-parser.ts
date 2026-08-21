export interface TimeLimits {
  /** Seconds, parsed from the ISO 8601 duration in max-time (e.g. "PT45M"). Null if absent/unparseable. */
  maxSeconds: number | null;
  allowLateSubmission: boolean;
}

export interface ItemRef {
  identifier: string | null;
  href: string | null;
  timeLimits: TimeLimits | null;
}

interface ParsedSection {
  identifier: string | null;
  title: string | null;
  itemRefs: ItemRef[];
  rubricBlockText: string;
  timeLimits: TimeLimits | null;
}

interface ParsedTestPart {
  identifier: string | null;
  submissionMode: string;
  sections: ParsedSection[];
  timeLimits: TimeLimits | null;
  maxAttempts: number | null;
}

export interface ParsedTest {
  title: string;
  parts: ParsedTestPart[];
  timeLimits: TimeLimits | null;
}

/** Parses an ISO 8601 time-only duration (e.g. "PT45M", "PT1H30M", "PT90S") into seconds. */
export function parseIso8601Duration(value: string): number | null {
  const match = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const hours = parseFloat(match[1] || '0');
  const minutes = parseFloat(match[2] || '0');
  const seconds = parseFloat(match[3] || '0');
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

/** Reads a direct <qti-time-limits> child, if present, at any of the four structural levels. */
function parseTimeLimits(el: Element): TimeLimits | null {
  const timeLimitsEl = Array.from(el.children).find((child) => child.tagName === 'qti-time-limits');
  if (!timeLimitsEl) return null;
  const maxTime = timeLimitsEl.getAttribute('max-time');
  return {
    maxSeconds: maxTime ? parseIso8601Duration(maxTime) : null,
    allowLateSubmission: timeLimitsEl.getAttribute('allow-late-submission') === 'true',
  };
}

function parseMaxAttempts(el: Element): number | null {
  const sessionControlEl = Array.from(el.children).find((child) => child.tagName === 'qti-item-session-control');
  if (!sessionControlEl) return null;
  const maxAttempts = sessionControlEl.getAttribute('max-attempts');
  if (maxAttempts === null) return null;
  const parsed = parseInt(maxAttempts, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export interface FlattenedSection {
  identifier: string | null;
  name: string | null;
  blurb: string;
  itemIdentifiers: (string | null)[];
  timeLimitSeconds: number | null;
  allowLateSubmission: boolean;
}

function parseItemRef(el: Element): ItemRef {
  return {
    identifier: el.getAttribute('identifier'),
    href: el.getAttribute('href'),
    timeLimits: parseTimeLimits(el),
  };
}

function parseSection(el: Element): ParsedSection {
  const itemRefs: ItemRef[] = [];
  const rubricBlockText: string[] = [];

  for (const child of Array.from(el.children)) {
    if (child.tagName === 'qti-assessment-item-ref') itemRefs.push(parseItemRef(child));
    // Sidebar's blurb is plain text (not rendered as HTML), so textContent only.
    else if (child.tagName === 'qti-rubric-block') rubricBlockText.push((child.textContent || '').trim());
  }

  return {
    identifier: el.getAttribute('identifier'),
    title: el.getAttribute('title') || el.getAttribute('identifier'),
    itemRefs,
    rubricBlockText: rubricBlockText.join(' '),
    timeLimits: parseTimeLimits(el),
  };
}

function parseTestPart(el: Element): ParsedTestPart {
  const sections = Array.from(el.children)
    .filter((child) => child.tagName === 'qti-assessment-section')
    .map(parseSection);

  return {
    identifier: el.getAttribute('identifier'),
    submissionMode: el.getAttribute('submission-mode') || 'individual',
    sections,
    timeLimits: parseTimeLimits(el),
    maxAttempts: parseMaxAttempts(el),
  };
}

/** Parse a qti-assessment-test into its part/section tree, in document order. */
export function parseAssessmentTest(xmlText: string): ParsedTest {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`[TestXmlParser] Failed to parse test XML: ${parseError.textContent}`);
  }

  const testEl = doc.documentElement;
  const parts = Array.from(testEl.children)
    .filter((child) => child.tagName === 'qti-test-part')
    .map(parseTestPart);

  return { title: testEl.getAttribute('title') || '', parts, timeLimits: parseTimeLimits(testEl) };
}

/**
 * Flatten a parsed test's sections into TestRunner's config.sections shape —
 * multiple test-parts flatten into one list.
 */
export function flattenSections(parsedTest: ParsedTest): FlattenedSection[] {
  const sections: FlattenedSection[] = [];
  for (const part of parsedTest.parts) {
    for (const section of part.sections) {
      sections.push({
        identifier: section.identifier,
        name: section.title,
        blurb: section.rubricBlockText,
        itemIdentifiers: section.itemRefs.map((ref) => ref.identifier),
        timeLimitSeconds: section.timeLimits?.maxSeconds ?? null,
        allowLateSubmission: section.timeLimits?.allowLateSubmission ?? false,
      });
    }
  }
  return sections;
}

/**
 * Flatten a parsed test's item refs into one ordered list — document order
 * is the navigable step order (currentItem/Next/Previous).
 */
export function flattenItemRefs(parsedTest: ParsedTest): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const part of parsedTest.parts) {
    for (const section of part.sections) {
      refs.push(...section.itemRefs);
    }
  }
  return refs;
}