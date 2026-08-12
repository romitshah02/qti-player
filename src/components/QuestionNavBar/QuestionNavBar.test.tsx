import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionNavBar } from './QuestionNavBar';

describe('QuestionNavBar', () => {
  it('shows Next (not Finish) before the last item', () => {
    render(<QuestionNavBar currentItem={0} maxItems={3} onPrevious={vi.fn()} onNext={vi.fn()} onFinish={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.queryByText('Finish')).toBeNull();
  });

  it('shows Finish (not Next) on the last item when not exiting', () => {
    render(<QuestionNavBar currentItem={2} maxItems={3} onPrevious={vi.fn()} onNext={vi.fn()} onFinish={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText('Finish')).toBeInTheDocument();
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('shows Exit alongside Next when showExit is true and not the last item', () => {
    render(<QuestionNavBar currentItem={0} maxItems={3} showExit exitLabel="Back to review" onPrevious={vi.fn()} onNext={vi.fn()} onFinish={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Back to review')).toBeInTheDocument();
  });

  it('fires onNext when clicked', () => {
    const onNext = vi.fn();
    render(<QuestionNavBar currentItem={0} maxItems={3} onPrevious={vi.fn()} onNext={onNext} onFinish={vi.fn()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});