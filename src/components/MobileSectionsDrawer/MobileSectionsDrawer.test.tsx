import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileSectionsDrawer } from './MobileSectionsDrawer';
import type { Section } from '@/types';

const SECTIONS: Section[] = [{ identifier: 'sec1', name: 'Section A', answered: 0, total: 1 }];

describe('MobileSectionsDrawer', () => {
  it('renders nothing when closed', () => {
    render(<MobileSectionsDrawer open={false} sections={SECTIONS} onSectionJump={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('jumping to a section both notifies and closes the drawer', () => {
    const onSectionJump = vi.fn();
    const onClose = vi.fn();
    render(<MobileSectionsDrawer open sections={SECTIONS} onSectionJump={onSectionJump} onClose={onClose} />);

    fireEvent.click(screen.getByText('Section A'));
    expect(onSectionJump).toHaveBeenCalledWith(SECTIONS[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});