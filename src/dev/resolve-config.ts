import sampleConfig from './sample-config';
import { ContentLoader } from '@/services/content-loader';
import { parseAssessmentTest, flattenSections, flattenItemRefs } from '@/utils/test-xml-parser';
import type { RunnerConfig } from '@/types';

interface ContentReadItem {
  identifier: string;
  href?: string;
  stimulusRefs?: string[];
}

interface ContentReadBody {
  result: {
    content: {
      name?: string;
      previewUrl?: string;
      stimulusList?: { identifier: string; href: string }[];
      itemList?: ContentReadItem[];
      testList?: { href: string }[];
      timeLimits?: { min?: number; max?: number };
      maxAttempts?: number;
    };
  };
}

function writeBackDerivedMetadata(identifier: string, timeLimitSeconds: number | null | undefined, maxAttempts: number | null | undefined): void {
  if (timeLimitSeconds == null && maxAttempts == null) return;
  fetch(`/content/v4/system/update/${identifier}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        content: {
          ...(timeLimitSeconds != null && { timeLimits: { min: 0, max: timeLimitSeconds } }),
          ...(maxAttempts != null && { maxAttempts }),
        },
      },
    }),
  }).catch((error) => console.warn(`[resolveConfig] metadata write-back failed for "${identifier}"`, error));
}

/**
 * Dev harness mode switch: ?identifier=<id> fetches real content, else falls
 * back to sample-config.ts. Dev harness only, not part of the web-component
 * build.
 */
export async function resolveConfig(): Promise<RunnerConfig> {
  const params = new URLSearchParams(window.location.search);
  const identifier = params.get('identifier');

  if (!identifier) return sampleConfig;

  const response = await fetch(`/content/v4/read/${identifier}`);
  if (!response.ok) {
    throw new Error(`[resolveConfig] content read failed for "${identifier}": ${response.status}`);
  }
  const body = (await response.json()) as ContentReadBody;
  const content = body.result.content;
  const stimulusList = content.stimulusList || [];
  const itemMetaByIdentifier = new Map((content.itemList || []).map((item) => [item.identifier, item]));

  // content/v4/read never carries real part/section/item order (ingestion
  // only reads imsmanifest.xml — see test-xml-parser.ts) — fetch+walk the
  // test XML if a test package exists; else fall back to the flat itemList.
  const context = { uid: 'dev-user', sid: 'dev-session', channel: 'dev', host: '', contentId: identifier };

  const testEntry = (content.testList || [])[0];
  if (!testEntry) {
    return {
      title: content.name || identifier,
      submissionMode: 'simultaneous',
      previewUrl: content.previewUrl,
      stimulusList,
      sessionControl: { show_feedback: true },
      context,
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
  const cachedTimeLimitSeconds = content.timeLimits?.max;
  const cachedMaxAttempts = content.maxAttempts;
  const timeLimitSeconds = cachedTimeLimitSeconds ?? parsedTest.timeLimits?.maxSeconds ?? undefined;
  const maxAttempts = cachedMaxAttempts ?? parsedTest.parts[0]?.maxAttempts ?? undefined;
  if (cachedTimeLimitSeconds == null && cachedMaxAttempts == null) {
    writeBackDerivedMetadata(identifier, timeLimitSeconds, maxAttempts);
  }

  return {
    title: parsedTest.title || content.name || identifier,
    submissionMode: parsedTest.parts[0]?.submissionMode || 'simultaneous',
    previewUrl: content.previewUrl,
    stimulusList,
    timeLimitSeconds,
    sessionControl: { show_feedback: true, ...(maxAttempts != null && { max_attempts: maxAttempts }) },
    context,
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
