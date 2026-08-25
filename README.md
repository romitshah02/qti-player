# test-qti-player-web-component-react

QTI 3 assessment test runner: item navigation, review, section intros,
submit/restart, shared-stimulus docking, Sunbird telemetry. Built as a React
app, shipped as a framework-agnostic web component.

Renders items through `@longsightgroup/qti3-player`'s
`<qti-assessment-item-player>` element. Shared stimuli render through
`qti3-stimulus-player`, a Vue 2 component with no framework-neutral
equivalent — mounted as an isolated "Vue island" so the rest of the app stays
Vue-free (see [src/services/stimulus-player-mount.ts](src/services/stimulus-player-mount.ts)).

## Requirements

Node `^20.19.0 || >=22.12.0`.

```bash
npm install
```

## Development

```bash
npm run dev
```
Opens the dev harness ([src/App.tsx](src/App.tsx))

The dev harness is not part of the web-component build; it exists to run the
runner standalone while developing.

## Testing

```bash
npm test              # vitest, watch mode
npm run test:coverage
npm run type-check     # tsc --noEmit
```

## Building

```bash
npm run build
```

Runs `tsc -b`, `vite build` (a single IIFE bundle from the web-component
entry, not `main.tsx`), then [scripts/build-wc.js](scripts/build-wc.js), which:

1. Embeds the built CSS into the JS bundle as a `BUNDLED_CSS` constant (injected into the shadow root — no runtime fetch)
2. Writes a host-safe `styles.css` containing **only** `@font-face` rules — the full reset/component CSS stays inside `BUNDLED_CSS` so it never leaks into a host page that links this file
3. Copies both, plus an example `index.html`, to `dist-wc/assets/qti-player/`
4. Generates `dist-wc/package.json` (name `test-qti-player-web-component-react`, version taken from this project's `package.json`) so CI can `npm publish ./dist-wc` with no committed, drift-prone copy

## Using the web component

```html
<script src="qti3-test-runner.js"></script>
<link rel="stylesheet" href="styles.css">
<qti3-test-runner runner-config='{ "items": [...] }'></qti3-test-runner>
```

The element mounts React inside an open shadow root and bridges runner
output as `CustomEvent`s: `playerEvent`, `navEvent`, `telemetryEvent`. See
[src/web-component/element-registration.tsx](src/web-component/element-registration.tsx).

### `runner-config`

The single prop the runner takes — see [`RunnerConfig`](src/types/index.ts) for the full shape:

| Field | Description |
|---|---|
| `items` | Required. Each item carries `xml` (used as-is) or `href` (fetched via `previewUrl`). |
| `title`, `sections` | Test title and section tree (for the sidebar/nav-by-section UI). |
| `submissionMode` | `'simultaneous'` (default) or `'individual'`; overridable per item via `sessionControl.submissionMode`. |
| `sessionControl` | `allow_review`, `allow_skipping`, `max_attempts`, `show_feedback`, `time_limits`, `validate_responses`, etc. |
| `stimulusList`, `previewUrl` | Shared-stimulus resolution — see [src/services/content-loader.ts](src/services/content-loader.ts). |
| `context` | Sunbird `TelemetryContext` (`uid`, `sid`, `channel`, `pdata`, `host`, ...). Omit to skip telemetry entirely. |
| `showSectionIntro` | Whether to show a section-intro screen before each section's first item. |
| `showAssessmentIntro` | Whether to show an assessment-intro screen before the first item. |
| `timeLimitSeconds` | Test-level time limit. |
| `derivedMetadata` | `{ timeLimitSeconds?, maxAttempts? }` — set when these were derived from the test XML rather than supplied directly; the web component re-emits them as a `derived-metadata` `playerEvent` so a host can write them back to its own content metadata. |

## Architecture

- [src/context/QtiRunnerContext.tsx](src/context/QtiRunnerContext.tsx) — rendered UI/data state (reducer): current panel, item index, transient UI.
- [src/context/useQtiRunnerOrchestration.ts](src/context/useQtiRunnerOrchestration.ts) — navigation and the endAttempt/suspend round-trip, kept together because they're mutually-recursive. Everything else split into its own hook: [useSectionTimer.ts](src/context/useSectionTimer.ts) / [useTestTimer.ts](src/context/useTestTimer.ts) (timers), [useStimulusDocking.ts](src/context/useStimulusDocking.ts), [useItemLoading.ts](src/context/useItemLoading.ts), [useAssessmentLifecycle.ts](src/context/useAssessmentLifecycle.ts), [useReview.ts](src/context/useReview.ts), and [orchestration-selectors.ts](src/context/orchestration-selectors.ts) (pure getters) — see that file's header comment for the full dependency rationale.
- [src/services/](src/services/) — content loading, navigation decisions, telemetry, and adapters between this app's config/state shapes and the underlying engine's.
- [src/config/](src/config/) — `buildRunnerConfig`, a standalone content-metadata → `RunnerConfig` helper built as its own bundle (see below), separate from the web-component build.
- [src/components/TestRunner/](src/components/TestRunner/) — the root component; wires the orchestration hook to `<qti-assessment-item-player>` and its DOM events.
- [src/web-component/element-registration.tsx](src/web-component/element-registration.tsx) — the custom-element entry point used by the production build.

## Config helpers (`dist-lib`)

`npm run build:config` (via [vite.lib.config.ts](vite.lib.config.ts)) builds [src/config/index.ts](src/config/index.ts) as a plain-ESM bundle to `dist-lib/index.js` (+ `.d.ts`) — gitignored build output, not committed, so run this before a consumer imports from it. Unlike `dist-wc`, no `package.json` is generated for it yet, so a consumer (e.g. a content-node backend) currently pulls in `dist-lib/index.js` directly rather than via a published subpath import:

```ts
import { buildRunnerConfig } from './dist-lib/index.js';

const runnerConfig = await buildRunnerConfig(identifier, contentMetadata);
```

`buildRunnerConfig` fetches and walks the test XML (via `parseAssessmentTest`/`flattenSections`/`flattenItemRefs`, also exported here) when a test package exists, deriving `timeLimitSeconds`/`max_attempts` from it when the caller's metadata doesn't already have them — surfaced back as `derivedMetadata` (see the `runner-config` table above). [src/dev/resolve-config.ts](src/dev/resolve-config.ts) is the dev-harness caller of this same function.

Telemetry integrates the real Sunbird SDK
(`@project-sunbird/telemetry-sdk` + `@project-sunbird/client-services`) via
two delivery paths — a host-injected `window.EkTelemetry` bridge, and the
`CsTelemetryModule` v3 envelope — both fed by the same `log*` calls in
[src/services/telemetry-service.ts](src/services/telemetry-service.ts).