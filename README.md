# qti3-test-runner-react

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

Opens the dev harness ([src/App.tsx](src/App.tsx)), which loads config one of two ways:

- No query string — [src/dev/sample-config.ts](src/dev/sample-config.ts), a fixture built from [src/dev/sample-items.ts](src/dev/sample-items.ts)
- `?identifier=<id>` — fetches real content from `/content/v4/read/<id>` and resolves it into a `RunnerConfig` (see [src/dev/resolve-config.ts](src/dev/resolve-config.ts))

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

Runs `tsc -b`, `vite build`, then [scripts/build-wc.js](scripts/build-wc.js), which:

1. Embeds the built CSS into the JS bundle as a `BUNDLED_CSS` constant (so the shadow root is styled with no runtime fetch)
2. Copies the self-contained bundle to `dist-wc/qti3-test-runner.js`
3. Writes an example `dist-wc/index.html`

## Using the web component

```html
<script src="qti3-test-runner.js"></script>
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

## Architecture

- [src/context/QtiRunnerContext.tsx](src/context/QtiRunnerContext.tsx) — rendered UI/data state (reducer): current panel, item index, transient UI.
- [src/context/useQtiRunnerOrchestration.ts](src/context/useQtiRunnerOrchestration.ts) — the orchestrator: navigation, section intros, submit/restart, stimulus docking. One hook (not several) because these concerns are tightly mutually-recursive.
- [src/services/](src/services/) — content loading, navigation decisions, telemetry, and adapters between this app's config/state shapes and the underlying engine's.
- [src/components/TestRunner/](src/components/TestRunner/) — the root component; wires the orchestration hook to `<qti-assessment-item-player>` and its DOM events.
- [src/web-component/element-registration.tsx](src/web-component/element-registration.tsx) — the custom-element entry point used by the production build.

Telemetry integrates the real Sunbird SDK
(`@project-sunbird/telemetry-sdk` + `@project-sunbird/client-services`) via
two delivery paths — a host-injected `window.EkTelemetry` bridge, and the
`CsTelemetryModule` v3 envelope — both fed by the same `log*` calls in
[src/services/telemetry-service.ts](src/services/telemetry-service.ts).