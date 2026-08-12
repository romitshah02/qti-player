import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionIntro } from './SectionIntro';
import type { Section } from '@/types';

describe('SectionIntro', () => {
  it('letters by index and pluralizes the question count', () => {
    const section: Section = { identifier: 'sec1', name: 'Fractions', itemIdentifiers: ['i1', 'i2'] };
    render(<SectionIntro section={section} sectionIndex={1} onBegin={vi.fn()} />);
    expect(screen.getByText('B')).toBeInTheDocument(); // index 1 -> letter B
    expect(screen.getByText('2 Questions')).toBeInTheDocument();
  });

  it('falls back to default instructions when the section has no blurb', () => {
    const section: Section = { identifier: 'sec1', name: 'Fractions' };
    render(<SectionIntro section={section} sectionIndex={0} onBegin={vi.fn()} />);
    expect(screen.getByText(/All questions are mandatory/)).toBeInTheDocument();
  });

  it('fires onBegin when the start button is clicked', () => {
    const onBegin = vi.fn();
    const section: Section = { identifier: 'sec1', name: 'Fractions' };
    render(<SectionIntro section={section} sectionIndex={0} onBegin={onBegin} />);
    fireEvent.click(screen.getByText(/Start section Fractions/));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });
});