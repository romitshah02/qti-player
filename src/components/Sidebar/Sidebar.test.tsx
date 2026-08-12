import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { Section } from '@/types';

const SECTIONS: Section[] = [
  { identifier: 'sec1', name: 'Section A', blurb: 'Read carefully', answered: 2, total: 3 },
  { identifier: 'sec2', name: 'Section B', answered: 0, total: 2 },
];

describe('Sidebar', () => {
  it('letters sections A, B, ... by position and shows answered/unanswered counts', () => {
    render(<Sidebar sections={SECTIONS} onSectionJump={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('● 2')).toBeInTheDocument();
    expect(screen.getByText('○ 1')).toBeInTheDocument();
  });

  it('fires onSectionJump with the clicked section', () => {
    const onSectionJump = vi.fn();
    render(<Sidebar sections={SECTIONS} onSectionJump={onSectionJump} />);
    fireEvent.click(screen.getByText('Section B'));
    expect(onSectionJump).toHaveBeenCalledWith(SECTIONS[1]);
  });
});