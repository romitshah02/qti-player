// Real Sunbird telemetry SDK integration. A module singleton (plain exported
// functions + module-level state), not a class — window.EkTelemetry and
// CsTelemetryModule.instance are inherently global (the SDKs attach
// themselves to window/a module-level singleton), so per-caller state would
// only fragment queues/listeners across multiple callers for no benefit.
//
// Two independent delivery paths, both fed by the same log* calls:
// - window.EkTelemetry/logEvent bridge — for hosts that inject their own SDK
//   object (e.g. mobile WebView).
// - CsTelemetryModule — the real Sunbird v3 telemetry envelope + batching +
//   POST to the telemetry endpoint. Backed by @project-sunbird/telemetry-sdk
//   (loaded below) as its window.EkTelemetry engine.
//
// The legacy engine's IIFE does `this.telemetry = ...`, relying on
// sloppy-mode `this === window` — a plain `import '@project-sunbird/telemetry-sdk'`
// would run it as a strict-mode module (`this` is `undefined` there) and
// throw immediately. Fix: pull its source in as a raw string (Vite's `?raw`
// import) and inject it as a REAL <script> element at runtime — a <script>
// tag's own execution context is a classic non-module global script, so
// `this` resolves to `window`.
import telemetrySdkSource from '@project-sunbird/telemetry-sdk/index.js?raw';
import { CsTelemetryModule } from '@project-sunbird/client-services/telemetry';
import jQuery from 'jquery';

interface TelemetryContext {
  cdata?: Array<{ id: string; type: string }>;
  pdata?: { id: string; ver: string };
  contentId?: string;
  pkgVersion?: string | number;
  objectRollup?: Record<string, unknown>;
  channel?: string;
  sid?: string;
  uid?: string;
  contextRollup?: Record<string, unknown>;
  did?: string;
  authToken?: string;
  mode?: string;
  host?: string;
  apislug?: string;
  endpoint?: string;
  tags?: string[];
}

interface TelemetryEvent {
  eid: string;
  edata: Record<string, unknown>;
  timestamp: number;
  ets: number;
}

interface EkTelemetrySdk {
  logEvent?: (event: TelemetryEvent) => void;
  initialize?: (context: TelemetryContext) => void;
}

declare global {
  interface Window {
    EkTelemetry?: EkTelemetrySdk;
    jQuery?: typeof jQuery;
    $?: typeof jQuery;
  }
}

function generateID(): string {
  return crypto.randomUUID();
}

let legacyTelemetrySdkLoaded = false;

function loadLegacyTelemetrySdk(): void {
  if (legacyTelemetrySdkLoaded || typeof document === 'undefined') return;
  if (window.EkTelemetry) {
    legacyTelemetrySdkLoaded = true;
    return;
  }
  // The legacy SDK's actual network dispatch calls the bare global
  // `jQuery.ajax(...)` (not an import) — it expects jQuery pre-loaded as a
  // global <script>. Without this, init succeeds silently but every batch
  // flush throws "jQuery is not defined" the first time enough events
  // accumulate to actually dispatch.
  if (!window.jQuery) {
    window.jQuery = jQuery;
    window.$ = window.$ ?? jQuery;
  }
  const script = document.createElement('script');
  // sourceURL gives DevTools a real file name for this dynamically-injected
  // script instead of an anonymous VM<n> entry — debuggability only.
  script.textContent = `${telemetrySdkSource}\n//# sourceURL=telemetry-sdk.js`;
  document.head.appendChild(script);
  legacyTelemetrySdkLoaded = true;
}

let telemetrySDK: EkTelemetrySdk | null = null;
let eventQueue: TelemetryEvent[] = [];

/**
 * Sunbird v3 telemetry object/context envelope, built once per
 * initializeTelemetry call and reused by every log* call. null when no (or
 * an empty) context was provided.
 */
let csEventOptions: { object: Record<string, unknown>; context: Record<string, unknown> } | null = null;

// Guards against concurrent CsTelemetryModule.instance.init({}) calls.
// isInitialised only flips true once .init() RESOLVES, so two
// initializeTelemetry calls in the same tick would otherwise both see
// isInitialised === false and both start .init({}). Reset on failure so a
// later call can still retry.
let csSdkInitInFlight = false;

function isEmptyContext(context: TelemetryContext | undefined | null): boolean {
  return !context || Object.keys(context).length === 0;
}

type TelemetryListener = (event: TelemetryEvent) => void;
const listeners = new Set<TelemetryListener>();

export function subscribeTelemetry(listener: TelemetryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(event: TelemetryEvent): void {
  listeners.forEach((listener) => listener(event));
}

function initializeCsSdk(context: TelemetryContext): void {
  loadLegacyTelemetrySdk();
  const contentSessionId = generateID();
  const playSessionId = generateID();
  const cdata = (Array.isArray(context.cdata) ? context.cdata : []).concat([
    { id: contentSessionId, type: 'ContentSession' },
    { id: playSessionId, type: 'PlaySession' },
    { id: '2.0', type: 'PlayerVersion' },
  ]);
  // The legacy engine's own dispatch reads Telemetry.config.pdata.id
  // unconditionally, with no null guard — default defensively in case a
  // host doesn't send one.
  const pdata = context.pdata || { id: '', ver: '1.0' };

  csEventOptions = {
    object: {
      // Portal's telemetryContextBuilder names this field contentId, not identifier.
      id: context.contentId || '',
      type: 'Content',
      ver: context.pkgVersion != null ? String(context.pkgVersion) : '',
      rollup: context.objectRollup || {},
    },
    context: {
      channel: context.channel || '',
      pdata,
      env: 'contentplayer',
      sid: context.sid,
      uid: context.uid,
      cdata,
      // Portal's telemetryContextBuilder names this field contextRollup, not rollup.
      rollup: context.contextRollup || {},
    },
  };

  if (!CsTelemetryModule.instance.isInitialised && !csSdkInitInFlight) {
    csSdkInitInFlight = true;
    const telemetryConfig = {
      pdata,
      env: 'contentplayer',
      channel: context.channel,
      did: context.did,
      authtoken: context.authToken || '',
      uid: context.uid || '',
      sid: context.sid,
      batchsize: 20,
      mode: context.mode,
      host: context.host || '',
      // The legacy engine builds its request URL as host + apislug +
      // endpoint; its own built-in default for apislug is '/action'. Passing
      // apislug: '' here (even as a fallback) would still overwrite that
      // default via Object.assign(_defaultValue, config), since the key
      // would always be present — so omit it entirely unless the host
      // explicitly provides one.
      ...(context.apislug ? { apislug: context.apislug } : {}),
      endpoint: context.endpoint || '/data/v3/telemetry',
      tags: context.tags,
      cdata,
    };

    CsTelemetryModule.instance
      .init({})
      .then(() => {
        CsTelemetryModule.instance.telemetryService.initTelemetry({
          config: telemetryConfig,
          userOrgDetails: {},
        });
      })
      .catch((error: unknown) => {
        csSdkInitInFlight = false;
        console.warn('[TelemetryService] CS SDK init failed', error);
      });
  }
}

/** Initialize the telemetry SDK(s) — both the host-injected bridge and the CS SDK. */
export function initializeTelemetry(context: TelemetryContext): void {
  const usingCsSdk = !isEmptyContext(context);
  if (usingCsSdk) {
    initializeCsSdk(context);
  } else {
    csEventOptions = null;
  }

  const sdk = typeof window !== 'undefined' ? window.EkTelemetry : undefined;
  telemetrySDK = sdk ?? null;
  if (sdk) {
    // initializeCsSdk above already drives the same underlying engine via
    // CsTelemetryModule...initTelemetry(...) with a complete, correctly
    // defaulted config. Calling the legacy engine's bare init() too would
    // race it with only the raw context (no pdata/apislug/etc) — whichever
    // finishes first wins for the rest of the page's lifetime.
    if (!usingCsSdk && typeof sdk.initialize === 'function') {
      sdk.initialize(context);
    }
  } else {
    console.warn('[TelemetryService] Sunbird SDK not available');
  }
}

/**
 * Deliver an event to the global SDK if — and only if — it exposes a usable
 * logEvent. Many hosts don't: they consume telemetry via subscribeTelemetry
 * and their SDK has no logEvent. Calling it blindly throws, so feature-detect
 * first.
 */
function sendToSdk(event: TelemetryEvent): void {
  if (telemetrySDK && typeof telemetrySDK.logEvent === 'function') {
    telemetrySDK.logEvent(event);
    return;
  }
  // Queue ONLY while no SDK is present yet — it may initialize later and
  // flush. If an SDK IS present but has no logEvent, never queue: the queue
  // could never drain and would grow unbounded.
  if (!telemetrySDK) {
    eventQueue.push(event);
  }
}

export function flushQueuedEvents(): void {
  if (telemetrySDK && typeof telemetrySDK.logEvent === 'function' && eventQueue.length > 0) {
    eventQueue.forEach((event) => telemetrySDK!.logEvent!(event));
    eventQueue = [];
  }
}

function build(eid: string, edata: Record<string, unknown>): TelemetryEvent {
  const now = Date.now();
  return { eid, edata, timestamp: now, ets: now };
}

function dispatch(event: TelemetryEvent): TelemetryEvent {
  sendToSdk(event);
  emit(event);
  return event;
}

export function logPageViewed(pageId: string, pageIndex?: number): void {
  const event = build('IMPRESSION', {
    pageId,
    type: 'workflow',
    subtype: '',
    uri: '',
    pageid: pageIndex != null ? String(pageIndex) : '',
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseImpressionTelemetry({ options: csEventOptions, edata: event.edata });
  }
}

export function logAssessmentStart(durationMs: number): void {
  const event = build('START', {
    type: 'content',
    mode: 'play',
    pageid: '',
    duration: Number((durationMs / 1e3).toFixed(2)),
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseStartTelemetry({ options: csEventOptions, edata: event.edata });
  }
}

export function logInteraction(id: string, pageIndex?: number): void {
  const event = build('INTERACT', {
    type: 'TOUCH',
    subtype: '',
    id,
    pageid: pageIndex != null ? String(pageIndex) : '',
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseInteractTelemetry({ options: csEventOptions, edata: event.edata });
  }
}

interface AnswerSubmittedItem {
  identifier: string;
  title?: string;
  qType?: string;
}

// maxScore defaults to 1 when the item declares no MAXSCORE outcome (QTI 3
// built-in, spec-defined alongside SCORE but not required) — see
// computeTotalMaxScore in navigation-service.ts for the test-level aggregate.
export function logAnswerSubmitted(
  item: AnswerSubmittedItem,
  index: number,
  resvalues: unknown,
  score: number,
  maxScore = 1,
  options: { sectionId?: string; durationSec?: number } = {},
): void {
  const event = build('ASSESS', {
    item: {
      id: item.identifier,
      title: item.title || item.identifier,
      type: (item.qType || '').toLowerCase(),
      maxscore: maxScore,
      ...(options.sectionId ? { sectionId: options.sectionId } : {}),
    },
    index,
    pass: score >= maxScore ? 'Yes' : 'No',
    score,
    resvalues,
    duration: options.durationSec ?? 0,
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseAssesTelemetry(event.edata, csEventOptions);
  }
}

export function logResponse(questionId: string, qType: string | undefined, option: unknown): void {
  const event = build('RESPONSE', {
    target: { id: questionId, ver: '1.0', type: qType || '' },
    type: 'CHOOSE',
    values: [{ option }],
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseResponseTelemetry(event.edata, csEventOptions);
  }
}

export function logAssessmentEnd(currentIndex: number, totalItems: number, durationMs: number, score: number, maxScore: number): void {
  const event = build('END', {
    type: 'content',
    mode: 'play',
    pageid: 'sunbird-player-Endpage',
    summary: [
      { progress: totalItems > 0 ? Number(((currentIndex / totalItems) * 100).toFixed(0)) : 0 },
      { totalNoofQuestions: totalItems },
      { visitedQuestions: currentIndex },
      { endpageseen: true },
      { score },
      { maxScore },
    ],
    duration: Number((durationMs / 1e3).toFixed(2)),
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseEndTelemetry({ options: csEventOptions, edata: event.edata });
  }
}

interface SummaryStats {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  partial: number;
  skipped: number;
}

interface SummaryMeta {
  starttime: number;
  totalQuestions: number;
  currentQuestionIndex: number;
}

export function logSummary(summary: SummaryStats, meta: SummaryMeta): void {
  const endtime = Date.now();
  const event = build('SUMMARY', {
    type: 'content',
    mode: 'play',
    starttime: meta.starttime,
    endtime,
    timespent: Number(((endtime - meta.starttime) / 1000).toFixed(2)),
    pageviews: meta.totalQuestions,
    interactions: summary.correct + summary.wrong + summary.partial,
    extra: [
      { id: 'progress', value: meta.totalQuestions > 0 ? String(((meta.currentQuestionIndex / meta.totalQuestions) * 100).toFixed(0)) : '0' },
      { id: 'endpageseen', value: 'true' },
      { id: 'score', value: String(summary.score) },
      { id: 'maxScore', value: String(summary.maxScore) },
      { id: 'correct', value: String(summary.correct) },
      { id: 'incorrect', value: String(summary.wrong) },
      { id: 'partial', value: String(summary.partial) },
      { id: 'skipped', value: String(summary.skipped) },
    ],
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseSummaryTelemetry(event.edata, csEventOptions);
  }
}

export function logError(error: unknown): void {
  const event = build('ERROR', {
    err: 'LOAD',
    errtype: 'content',
    stacktrace: error ? String(error) : '',
  });
  dispatch(event);
  if (csEventOptions) {
    CsTelemetryModule.instance.telemetryService.raiseErrorTelemetry({ options: csEventOptions, edata: event.edata });
  }
}