import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TestRunner } from './TestRunner';
import type { RunnerConfig } from '@/types';

const CONFIG: RunnerConfig = {
  title: 'Smoke Test Quiz',
  showSectionIntro: false,
  items: [
    {
      identifier: 'i1',
      guid: 'g1',
      xml: '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i1" title="Q1" adaptive="false" time-dependent="false"><qti-item-body><qti-choice-interaction response-identifier="RESPONSE" max-choices="1"><qti-simple-choice identifier="A">A</qti-simple-choice><qti-simple-choice identifier="B">B</qti-simple-choice></qti-choice-interaction></qti-item-body></qti-assessment-item>',
    },
  ],
};

// This exercises the real @longsightgroup/qti3-player custom element (not a
// mock, unlike useQtiRunnerOrchestration's own tests) — just enough to catch
// wiring mistakes (wrong tag name, ref never attaching, event names typoed)
// that a mocked-element test can't see. Deeper navigation/scoring logic is
// already covered against a mock in useQtiRunnerOrchestration.test.tsx.
describe('TestRunner', () => {
  it('renders the shell and mounts the real item-player custom element', async () => {
    render(<TestRunner config={CONFIG} />);

    expect(screen.getAllByText('Smoke Test Quiz').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(document.querySelector('qti-assessment-item-player')).not.toBeNull();
    });
  });
});
