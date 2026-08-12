import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsScreen } from './ResultsScreen';
import type { ItemSummaryEntry } from '@/types';

const SUMMARY: ItemSummaryEntry[] = [
  { identifier: 'item1', index: 0, answered: true },
  { identifier: 'item2', index: 1, answered: false },
];

describe('ResultsScreen', () => {
  it('counts answered vs unanswered from the summary', () => {
    render(<ResultsScreen summary={SUMMARY} onNavigateItem={vi.fn()} onRestart={vi.fn()} />);
    // Both the answered and unanswered counts happen to be 1 for this fixture.
    expect(screen.getByText('Answered').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Unanswered').nextElementSibling).toHaveTextContent('1');
  });

  it('fires onNavigateItem with the clicked item and onRestart from Retake', () => {
    const onNavigateItem = vi.fn();
    const onRestart = vi.fn();
    render(<ResultsScreen summary={SUMMARY} onNavigateItem={onNavigateItem} onRestart={onRestart} />);

    fireEvent.click(screen.getByText('2')); // chip for item2 (index 1 -> label "2")
    expect(onNavigateItem).toHaveBeenCalledWith(SUMMARY[1]);

    fireEvent.click(screen.getByText('Retake'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
