import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders the message and calls onClose after duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast type="error" message="Something broke" duration={1000} onClose={onClose} />);

    expect(screen.getByRole('status')).toHaveTextContent('Something broke');
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});