import type { StimulusDescriptor, TestItem } from '@/types';
import { rewriteRelativeUrls } from '@/utils/asset-url-rewriter';
import { fixGraphicInteractionImgTags, flattenPictureTags, fixNarrowStaticContentAllowlist } from './longsight-interaction-compat';

export interface ResolvedStimulus {
  identifier: string;
  xml: string;
}

/**
 * Resolves item descriptors into ready-to-render QTI item XML. Items either
 * carry xml directly (dev/sample data) or a href fetched from previewUrl.
 * Stimuli referenced via item.stimulusRefs are fetched once (cached) and
 * returned as full XML docs for the stimulus player to render itself.
 * Relative src/href in fetched XML is rewritten to absolute, since the
 * browser resolves them against the page URL, not the fetch() URL.
 */
export class ContentLoader {
  previewUrl: string;
  // identifier -> full <qti-assessment-stimulus> XML doc, asset URLs rewritten
  stimulusCache = new Map<string, string>();

  constructor(previewUrl: string) {
    this.previewUrl = previewUrl;
  }

  resolveUrl(href: string): string {
    const base = (this.previewUrl || '').replace(/\/$/, '');
    const path = href.replace(/^\//, '');
    return `${base}/${path}`;
  }

  async fetchText(href: string): Promise<string> {
    const url = this.resolveUrl(href);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[ContentLoader] Failed to fetch ${url}: ${response.status}`);
    }
    return response.text();
  }

  /** Fetch (or reuse cached) a stimulus's full XML doc. */
  async getStimulusXml(descriptor: StimulusDescriptor): Promise<string> {
    if (this.stimulusCache.has(descriptor.identifier)) {
      return this.stimulusCache.get(descriptor.identifier)!;
    }
    const xml = await this.fetchText(descriptor.href);
    const absoluteXml = rewriteRelativeUrls(xml, this.resolveUrl(descriptor.href));
    this.stimulusCache.set(descriptor.identifier, absoluteXml);
    return absoluteXml;
  }

  /** Resolve every stimulus an item references. */
  async getStimulusXmlList(item: TestItem, stimulusList: StimulusDescriptor[]): Promise<ResolvedStimulus[]> {
    const stimulusRefs = item.stimulusRefs || [];
    const stimuli: ResolvedStimulus[] = [];
    for (const identifier of stimulusRefs) {
      const descriptor = (stimulusList || []).find((s) => s.identifier === identifier);
      if (!descriptor) {
        console.warn(`[ContentLoader] Item "${item.identifier}" references stimulus "${identifier}" not found in stimulusList`);
        continue;
      }
      const xml = await this.getStimulusXml(descriptor);
      stimuli.push({ identifier, xml });
    }
    return stimuli;
  }

  /** Resolve one item to ready-to-render XML. */
  async resolveItemXml(item: TestItem): Promise<string> {
    let xml = item.xml;

    if (typeof xml === 'undefined') {
      if (!item.href) {
        throw new Error(`[ContentLoader] Item "${item.identifier}" has neither xml nor href`);
      }
      xml = await this.fetchText(item.href);
      xml = rewriteRelativeUrls(xml, this.resolveUrl(item.href));
    }

    return fixNarrowStaticContentAllowlist(fixGraphicInteractionImgTags(flattenPictureTags(xml)));
  }
}