import { useEffect, useState } from 'react';
import { TestRunner } from './components/TestRunner/TestRunner';
import { resolveConfig } from './dev/resolve-config';
import { subscribeTelemetry } from './services/telemetry-service';
import type { RunnerConfig } from './types';

function log(label: string, payload: unknown) {
  console.log(`[${label}]`, payload);
}

// Dev harness: ?identifier=<id> fetches real content, else falls back to
// sample-config.ts (see dev/resolve-config.ts). Not part of the
// web-component build — see web-component/element-registration.tsx for that
// entry point instead.
export function App() {
  const [config, setConfig] = useState<RunnerConfig | null>(null);

  useEffect(() => {
    resolveConfig().then(setConfig);
    return subscribeTelemetry((event) => log('telemetry-event', event));
  }, []);

  if (!config) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading…</p>;

  return (
    <div id="dev-harness" style={{ height: '100%' }}>
      <TestRunner
        config={config}
        onPlayerEvent={(event) => log('player-event', event)}
        onNavEvent={(event) => log('nav-event', event)}
      />
    </div>
  );
}
