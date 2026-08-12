interface ItemRef {
  identifier: string | null;
  href: string | null;
}

interface ParsedSection {
  identifier: string | null;
  title: string | null;
  itemRefs: ItemRef[];
  rubricBlockText: string;
}

interface ParsedTestPart {
  identifier: string | null;
  submissionMode: string;
  sections: ParsedSection[];
}

export interface ParsedTest {
  title: string;
  parts: ParsedTestPart[];
}

export interface FlattenedSection {
  identifier: string | null;
  name: string | null;
  blurb: string;
  itemIdentifiers: (string | null)[];
}

function localName(el: Element): string {
  return el.tagName;
}

function parseItemRef(el: Element): ItemRef {
  return {
    identifier: el.getAttribute('identifier'),
    href: el.getAttribute('href'),
  };
}

function parseSection(el: Element): ParsedSection {
  const itemRefs: ItemRef[] = [];
  const rubricBlockText: string[] = [];

  for (const child of Array.from(el.children)) {
    if (localName(child) === 'qti-assessment-item-ref') itemRefs.push(parseItemRef(child));
    // Sidebar's blurb is plain text (not rendered as HTML), so textContent only.
    else if (localName(child) === 'qti-rubric-block') rubricBlockText.push((child.textContent || '').trim());
  }

  return {
    identifier: el.getAttribute('identifier'),
    title: el.getAttribute('title') || el.getAttribute('identifier'),
    itemRefs,
    rubricBlockText: rubricBlockText.join(' '),
  };
}

function parseTestPart(el: Element): ParsedTestPart {
  const sections = Array.from(el.children)
    .filter((child) => localName(child) === 'qti-assessment-section')
    .map(parseSection);

  return {
    identifier: el.getAttribute('identifier'),
    submissionMode: el.getAttribute('submission-mode') || 'individual',
    sections,
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
    .filter((child) => localName(child) === 'qti-test-part')
    .map(parseTestPart);

  return { title: testEl.getAttribute('title') || '', parts };
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