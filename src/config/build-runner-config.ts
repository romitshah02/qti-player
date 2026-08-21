import { ContentLoader } from '@/services/content-loader';
import { parseAssessmentTest, flattenSections, flattenItemRefs } from '@/utils/test-xml-parser';
import type { RunnerConfig } from '@/types';

export interface QtiContentMetadata {
  name?: string;
  previewUrl?: string;
  stimulusList?: { identifier: string; href: string }[];
  itemList?: { identifier: string; href?: string; stimulusRefs?: string[] }[];
  testList?: { href: string }[];
  timeLimits?: { min?: number; max?: number };
  maxAttempts?: number;
}

export async function buildRunnerConfig(identifier: string, content: QtiContentMetadata): Promise<RunnerConfig> {
  const stimulusList = content.stimulusList || [];
  const itemMetaByIdentifier = new Map((content.itemList || []).map((item) => [item.identifier, item]));

  const testEntry = (content.testList || [])[0];
  if (!testEntry) {
    return {
      title: content.name || identifier,
      submissionMode: 'simultaneous',
      previewUrl: content.previewUrl,
      stimulusList,
      sessionControl: { show_feedback: true },
      items: (content.itemList || []).map((item) => ({
        identifier: item.identifier,
        guid: item.identifier,
        href: item.href,
        stimulusRefs: item.stimulusRefs || [],
      })),
    };
  }

  const contentLoader = new ContentLoader(content.previewUrl!);
  const rawTestXml = await contentLoader.fetchText(testEntry.href);
  const parsedTest = parseAssessmentTest(rawTestXml);
  const itemRefs = flattenItemRefs(parsedTest);
  const timeLimitSeconds = content.timeLimits?.max ?? parsedTest.timeLimits?.maxSeconds ?? undefined;
  const maxAttempts = content.maxAttempts ?? parsedTest.parts[0]?.maxAttempts ?? undefined;

  return {
    title: parsedTest.title || content.name || identifier,
    submissionMode: parsedTest.parts[0]?.submissionMode || 'simultaneous',
    previewUrl: content.previewUrl,
    stimulusList,
    timeLimitSeconds,
    sessionControl: { show_feedback: true, ...(maxAttempts != null && { max_attempts: maxAttempts }) },
    sections: flattenSections(parsedTest).map((s) => ({
      identifier: s.identifier as string,
      name: s.name as string,
      blurb: s.blurb,
      itemIdentifiers: s.itemIdentifiers as string[],
      timeLimitSeconds: s.timeLimitSeconds ?? undefined,
      allowLateSubmission: s.allowLateSubmission,
    })),
    items: itemRefs.map((ref) => {
      const meta = itemMetaByIdentifier.get(ref.identifier as string);
      return {
        identifier: ref.identifier as string,
        guid: ref.identifier as string,
        href: ref.href || meta?.href,
        stimulusRefs: meta?.stimulusRefs || [],
      };
    }),
  };
}