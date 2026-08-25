import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsScreen } from './ResultsScreen';
import type { SummaryBreakdown } from '@/services/navigation-service';

const BREAKDOWN: SummaryBreakdown = { correct: 1, wrong: 2, partial: 0, skipped: 19, score: 1, maxScore: 22 };

describe('ResultsScreen', () => {
  it('renders the correct/incorrect/partial/skipped/score breakdown', () => {
    render(<ResultsScreen breakdown={BREAKDOWN} onRestart={vi.fn()} />);
    expect(screen.getByText('Correct').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Incorrect').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Partial').nextElementSibling).toHaveTextContent('0');
    expect(screen.getByText('Skipped').nextElementSibling).toHaveTextContent('19');
    expect(screen.getByText('Score:').parentElement).toHaveTextContent('Score: 1');
  });

  it('shows time taken when given, formatted mm:ss', () => {
    render(<ResultsScreen breakdown={BREAKDOWN} timeTakenSeconds={125} onRestart={vi.fn()} />);
    expect(screen.getByText('Time taken:').parentElement).toHaveTextContent('Time taken: 2:05');
  });

  it('omits time taken when not given', () => {
    render(<ResultsScreen breakdown={BREAKDOWN} onRestart={vi.fn()} />);
    expect(screen.queryByText(/Time taken/)).not.toBeInTheDocument();
  });

  it('fires onRestart from Retake', () => {
    const onRestart = vi.fn();
    render(<ResultsScreen breakdown={BREAKDOWN} onRestart={onRestart} />);
    fireEvent.click(screen.getByText('Retake'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('hides Retake once attemptsRemaining is exhausted', () => {
    render(<ResultsScreen breakdown={BREAKDOWN} attemptsRemaining={0} onRestart={vi.fn()} />);
    expect(screen.queryByText(/Retake/)).not.toBeInTheDocument();
  });

  it('shows Retake when attemptsRemaining is unlimited (null) or positive', () => {
    const { rerender } = render(<ResultsScreen breakdown={BREAKDOWN} attemptsRemaining={null} onRestart={vi.fn()} />);
    expect(screen.getByText('Retake')).toBeInTheDocument();

    rerender(<ResultsScreen breakdown={BREAKDOWN} attemptsRemaining={2} onRestart={vi.fn()} />);
    expect(screen.getByText('Retake')).toBeInTheDocument();
  });
});