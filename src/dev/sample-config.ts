// Sample config for local dev smoke-testing (`npm run dev`) — one item per
// interaction type, see ./sample-items.ts. Not shipped in the web-component
// build — dev harness only.
import sampleItems from './sample-items';
import type { RunnerConfig } from '@/types';

const sampleConfig: RunnerConfig = {
  title: 'Sample Test',
  submissionMode: 'simultaneous',
  sessionControl: { show_feedback: true },
  context: { uid: 'dev-user', sid: 'dev-session', channel: 'dev', host: '' },
  stimulusList: [{ identifier: 'sample-stimulus', href: '/qti-assets/sample-stimulus.xml' }],
  items: sampleItems,
};

export default sampleConfig;
