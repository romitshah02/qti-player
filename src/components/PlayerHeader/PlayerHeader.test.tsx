import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerHeader } from './PlayerHeader';
import type { Section } from '@/types';

const SECTIONS: Section[] = [
  { identifier: 'sec1', name: 'A' },
  { identifier: 'sec2', name: 'B' },
];

describe('PlayerHeader', () => {
  it('shows the current item counter and disables Review until enabled', () => {
    render(<PlayerHeader currentItem={2} maxItems={5} onReview={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('3 of 5')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeDisabled();
  });

  it('enables Review when reviewEnabled is true and fires onReview', () => {
    const onReview = vi.fn();
    render(<PlayerHeader currentItem={0} maxItems={5} reviewEnabled onReview={onReview} onSubmit={vi.fn()} />);
    const btn = screen.getByText('Review');
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('fires onSectionJump with the clicked section from the step rail', () => {
    const onSectionJump = vi.fn();
    render(
      <PlayerHeader
        currentItem={0}
        maxItems={5}
        sections={SECTIONS}
        currentSectionId="sec1"
        onSectionJump={onSectionJump}
        onReview={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('B'));
    expect(onSectionJump).toHaveBeenCalledWith(SECTIONS[1]);
  });
});