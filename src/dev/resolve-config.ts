import sampleConfig from './sample-config';
import { buildRunnerConfig } from '@/config/build-runner-config';
import type { QtiContentMetadata } from '@/config/build-runner-config';
import type { RunnerConfig } from '@/types';

interface ContentReadBody {
  result: { content: QtiContentMetadata };
}

function writeBackDerivedMetadata(identifier: string, timeLimitSeconds: number | null | undefined, maxAttempts: number | null | undefined): void {
  if (timeLimitSeconds == null && maxAttempts == null) return;
  fetch(`/content/v4/system/update/${encodeURIComponent(identifier)}`, {
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
  }).catch((error) => console.warn('[resolveConfig] metadata write-back failed for "%s"', identifier, error));
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
  if (!/^[A-Za-z0-9_-]+$/.test(identifier)) {
    throw new Error(`[resolveConfig] invalid identifier: "${identifier}"`);
  }

  const response = await fetch(`/content/v4/read/${encodeURIComponent(identifier)}`);
  if (!response.ok) {
    throw new Error(`[resolveConfig] content read failed for "${identifier}": ${response.status}`);
  }
  const body = (await response.json()) as ContentReadBody;
  const cfg = await buildRunnerConfig(identifier, body.result.content);
  if (cfg.derivedMetadata) {
    writeBackDerivedMetadata(identifier, cfg.derivedMetadata.timeLimitSeconds, cfg.derivedMetadata.maxAttempts);
  }

  // content/v4/read never carries real part/section/item order (ingestion
  // only reads imsmanifest.xml — see test-xml-parser.ts), but buildRunnerConfig
  // already fetches+walks the test XML when a test package exists.
  const context = { uid: 'dev-user', sid: 'dev-session', channel: 'dev', host: '', contentId: identifier };
  return { ...cfg, context };
}
