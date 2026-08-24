/**
 * Web Component — Custom HTML Element Registration.
 *
 * Enables: <qti3-test-runner runner-config='{...}'></qti3-test-runner>
 *
 * 1. Parse config from the `runner-config` HTML attribute.
 * 2. Mount React (TestRunner) inside an open shadow root.
 * 3. Inject the bundled player CSS into the shadow root (external
 *    stylesheets do not pierce shadow DOM).
 * 4. Bridge TestRunner's onPlayerEvent/onNavEvent, and the telemetry queue,
 *    as composed CustomEvents.
 * 5. Clean up (unmount React, unsubscribe telemetry) on disconnect.
 */
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { TestRunner } from '../components/TestRunner/TestRunner';
import { subscribeTelemetry } from '../services/telemetry-service';
import { installStylesheetPatch } from '../services/stylesheet-patcher';
import type { NavEvent, PlayerEvent, RunnerConfig } from '../types';
import '../styles/global.scss';

// Embedded by the post-build step (scripts/build-wc.js) as a top-level
// constant; undefined during dev, where styles load normally.
declare const BUNDLED_CSS: string | undefined;

installStylesheetPatch();

function patchInlineChoiceFocusOut(shadow: ShadowRoot): () => void {
  const handler = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const wrapper = target.closest('.qti3-inline-choice-control');
    if (!wrapper) return;

    event.stopPropagation();

    window.setTimeout(() => {
      if (wrapper.contains(shadow.activeElement)) return;
      const listbox = wrapper.querySelector<HTMLElement>('.qti3-inline-choice-listbox');
      const trigger = wrapper.querySelector<HTMLElement>('.qti3-inline-choice-trigger');
      if (listbox && !listbox.hidden) {
        listbox.hidden = true;
        trigger?.setAttribute('aria-expanded', 'false');
      }
    });
  };

  shadow.addEventListener('focusout', handler, true);
  return () => shadow.removeEventListener('focusout', handler, true);
}

class Qti3TestRunnerElement extends HTMLElement {
  private shadow: ShadowRoot;
  private root: Root | null = null;
  private unsubscribeTelemetry: (() => void) | null = null;
  private unpatchInlineChoiceFocusOut: (() => void) | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    try {
      const configAttr = this.getAttribute('runner-config');
      const config: RunnerConfig = configAttr ? (JSON.parse(configAttr) as RunnerConfig) : { items: [] };

      const container = document.createElement('div');
      container.style.height = '100%';
      this.shadow.appendChild(container);

      const hostStyle = document.createElement('style');
      hostStyle.textContent = `
        :host {
          /* all:initial resets inherited properties (including font-family) to
             browser defaults — re-declare font here, via the same portal-bridge
             var _portal-bridge.scss defines on :host, or text falls back to serif. */
          all: initial;
          display: block;
          height: 100%;
          box-sizing: border-box;
          font-family: var(--qtr-font-sans, "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }
      `;
      this.shadow.insertBefore(hostStyle, container);
      this.injectStyles(container);

      this.unsubscribeTelemetry = subscribeTelemetry((event) => this.dispatch('telemetryEvent', event));
      this.unpatchInlineChoiceFocusOut = patchInlineChoiceFocusOut(this.shadow);

      this.root = createRoot(container);
      this.root.render(
        <TestRunner
          config={config}
          onPlayerEvent={(event: PlayerEvent) => this.dispatch('playerEvent', event)}
          onNavEvent={(event: NavEvent) => this.dispatch('navEvent', event)}
        />,
      );
    } catch (error) {
      console.error('[Qti3TestRunnerElement] Initialization error:', error);
      const now = Date.now();
      this.dispatch('telemetryEvent', { eid: 'ERROR', edata: { err: 'LOAD', errtype: 'content', stacktrace: String(error) }, timestamp: now, ets: now });
      this.showError('Failed to load test runner');
    }
  }

  disconnectedCallback(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.unsubscribeTelemetry) {
      this.unsubscribeTelemetry();
      this.unsubscribeTelemetry = null;
    }
    if (this.unpatchInlineChoiceFocusOut) {
      this.unpatchInlineChoiceFocusOut();
      this.unpatchInlineChoiceFocusOut = null;
    }
  }

  private showError(message: string): void {
    this.shadow.innerHTML = `
      <style>:host { display: block; }</style>
      <div style="color:#c0392b;padding:20px;font-family:sans-serif;">${message}</div>
    `;
  }

  private dispatch(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private injectStyles(container: Element): void {
    const styleEl = document.createElement('style');
    styleEl.textContent = typeof BUNDLED_CSS !== 'undefined' ? BUNDLED_CSS : '';
    this.shadow.insertBefore(styleEl, container);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('qti3-test-runner')) {
  customElements.define('qti3-test-runner', Qti3TestRunnerElement);
}

export default Qti3TestRunnerElement;
