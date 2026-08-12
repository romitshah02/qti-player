import { useEffect, useState } from 'react';
import styles from './Toast.module.scss';

export interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ type = 'info', message, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
    // Mount-only, matching the original: a later duration/onClose change
    // shouldn't restart or redirect an already-running timer.
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="status">
      {message}
    </div>
  );
}