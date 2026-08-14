import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentIntro } from './AssessmentIntro';
import type { Section } from '@/types';

describe('AssessmentIntro', () => {
  it('renders section cards with letters and question counts', () => {
    const sections: Section[] = [
      { identifier: 's1', name: 'Fractions', total: 2 },
      { identifier: 's2', name: 'Geometry', total: 1 },
    ];
    render(<AssessmentIntro title="Math Quiz" totalQuestions={3} sections={sections} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('Math Quiz')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Questions stat
    expect(screen.getByText('2')).toBeInTheDocument(); // Sections stat
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('2 questions')).toBeInTheDocument();
    expect(screen.getByText('1 question')).toBeInTheDocument();
  });

  it('falls back to a lettered name when a section has none', () => {
    const sections: Section[] = [{ identifier: 's1', name: null, total: 4 }];
    render(<AssessmentIntro title="Quiz" totalQuestions={4} sections={sections} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('Section A')).toBeInTheDocument();
  });

  it('fires onBegin when the start button is clicked', () => {
    const onBegin = vi.fn();
    render(<AssessmentIntro title="Quiz" totalQuestions={1} sections={[]} onBegin={onBegin} onSectionSelect={vi.fn()} />);
    fireEvent.click(screen.getByText(/Start assessment/));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it('formats timeLimitSeconds under 60 minutes as mm:ss', () => {
    render(<AssessmentIntro title="Quiz" totalQuestions={1} sections={[]} timeLimitSeconds={900} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('formats timeLimitSeconds of 60+ minutes as Xh Ym', () => {
    render(<AssessmentIntro title="Quiz" totalQuestions={1} sections={[]} timeLimitSeconds={5400} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('formats an exact hour with no leftover minutes as Xh', () => {
    render(<AssessmentIntro title="Quiz" totalQuestions={1} sections={[]} timeLimitSeconds={3600} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('shows "No Limit" when timeLimitSeconds is omitted', () => {
    render(<AssessmentIntro title="Quiz" totalQuestions={1} sections={[]} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('No Limit')).toBeInTheDocument();
  });

  it('shows the configured maxAttempts, defaults to 1 when omitted, and "Unlimited" for explicit 0', () => {
    const { rerender } = render(<AssessmentIntro title="Quiz" totalQuestions={5} sections={[]} maxAttempts={3} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(<AssessmentIntro title="Quiz" totalQuestions={5} sections={[]} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();

    rerender(<AssessmentIntro title="Quiz" totalQuestions={5} sections={[]} maxAttempts={0} onBegin={vi.fn()} onSectionSelect={vi.fn()} />);
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('fires onSectionSelect with the clicked section when a card is clicked', () => {
    const onSectionSelect = vi.fn();
    const sections: Section[] = [
      { identifier: 's1', name: 'Fractions', total: 2 },
      { identifier: 's2', name: 'Geometry', total: 1 },
    ];
    render(<AssessmentIntro title="Math Quiz" totalQuestions={3} sections={sections} onBegin={vi.fn()} onSectionSelect={onSectionSelect} />);
    fireEvent.click(screen.getByText('Geometry'));
    expect(onSectionSelect).toHaveBeenCalledTimes(1);
    expect(onSectionSelect).toHaveBeenCalledWith(sections[1]);
  });
});