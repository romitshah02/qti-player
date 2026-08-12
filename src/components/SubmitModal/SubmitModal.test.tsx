import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubmitModal } from './SubmitModal';

describe('SubmitModal', () => {
  it('renders nothing when closed', () => {
    render(<SubmitModal open={false} answeredCount={2} totalCount={5} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows answered/unanswered counts and fires callbacks', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<SubmitModal open answeredCount={2} totalCount={5} onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // unanswered = total - answered

    fireEvent.click(screen.getByText('Submit'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});