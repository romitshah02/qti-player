import styles from './SubmitModal.module.scss';

export interface SubmitModalProps {
  open?: boolean;
  answeredCount: number;
  totalCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitModal({ open = false, answeredCount, totalCount, onCancel, onConfirm }: SubmitModalProps) {
  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.scrim} onClick={onCancel} />
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Submit assessment" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
        <div className={styles.header}>
          <span className={styles.title}>Submit assessment?</span>
          <button type="button" className={styles.close} aria-label="Close" onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className={styles.body}>Once submitted you won't be able to change your answers.</p>

        <div className={styles.counts}>
          <div className={`${styles.count} ${styles.answered}`}>
            <span className={styles.countValue}>{answeredCount}</span>
            <span className={styles.countLabel}>Answered</span>
          </div>
          <div className={`${styles.count} ${styles.unanswered}`}>
            <span className={styles.countValue}>{totalCount - answeredCount}</span>
            <span className={styles.countLabel}>Unanswered</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onCancel}>Cancel</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConfirm}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}