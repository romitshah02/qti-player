import { useState } from 'react';
import type { Section } from '@/types';
import { formatDuration } from '@/utils/format-duration';
import styles from './PlayerHeader.module.scss';

export interface PlayerHeaderProps {
  brandName?: string;
  sections?: Section[];
  currentSectionId?: string | null;
  currentItem: number;
  maxItems: number;
  reviewEnabled?: boolean;
  testTimeRemaining?: number | null;
  sectionTimeRemaining?: number | null;
  sectionTimeOverrun?: boolean;
  onMenuToggle?: () => void;
  onBrandClick?: () => void;
  onSectionJump?: (section: Section) => void;
  onReview: () => void;
  onSubmit: () => void;
}

function TimerBadge({ label, remaining, overrun = false }: { label: string; remaining: number; overrun?: boolean }) {
  return (
    <div
      className={`${styles.timer} ${overrun ? styles.timerOverrun : remaining <= 60 ? styles.timerLow : ''}`}
      role="timer"
      aria-live="polite"
      aria-label={`${label} time remaining`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={styles.timerIcon}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={styles.timerLabel}>{label}</span>
      <span className={styles.timerValue}>{overrun ? 'Overtime' : formatDuration(remaining)}</span>
    </div>
  );
}

export function PlayerHeader({
  brandName = 'Sunbird Assessment',
  sections = [],
  currentSectionId = null,
  currentItem,
  maxItems,
  reviewEnabled = false,
  testTimeRemaining = null,
  sectionTimeRemaining = null,
  sectionTimeOverrun = false,
  onMenuToggle,
  onBrandClick,
  onSectionJump,
  onReview,
  onSubmit,
}: PlayerHeaderProps) {
  const [showLegend, setShowLegend] = useState(false);
  const brandInitial = (brandName || 'Q').charAt(0).toUpperCase();
  const currentSectionIndex = sections.findIndex((s) => s.identifier === currentSectionId);

  function stepStatusClass(index: number): string {
    if (index === currentSectionIndex) return styles.active;
    if (index < currentSectionIndex) return styles.completed;
    return styles.upcoming;
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.menuBtn} aria-label="Open sections menu" onClick={onMenuToggle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>

        <button type="button" className={styles.brand} onClick={onBrandClick}>
          <span className={styles.brandBadge}>{brandInitial}</span>
          <span className={styles.brandName}>{brandName}</span>
        </button>

        {sections.length > 0 && (
          <ol className={styles.steps}>
            {sections.map((section, index) => (
              <li key={section.identifier} className={`${styles.step} ${stepStatusClass(index)}`}>
                <button type="button" className={styles.stepDot} onClick={() => onSectionJump?.(section)}>
                  {String.fromCharCode(65 + (index % 26))}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className={styles.center}>
        {testTimeRemaining !== null && <TimerBadge label="Test" remaining={testTimeRemaining} />}
        {sectionTimeRemaining !== null && <TimerBadge label="Section" remaining={sectionTimeRemaining} overrun={sectionTimeOverrun} />}
      </div>

      <div className={styles.right}>
        {sections.length > 0 && (
          <div className={styles.helpWrap}>
            <button
              type="button"
              className={styles.help}
              aria-label="Section markers"
              aria-expanded={showLegend}
              onClick={() => setShowLegend((s) => !s)}
            >
              ?
            </button>

            {showLegend && (
              <>
                <div className={styles.legendBackdrop} onClick={() => setShowLegend(false)} />
                <div className={styles.legend} role="dialog" aria-label="Section markers">
                  <p className={styles.legendTitle}>Section markers</p>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.active}`} aria-hidden="true">A</span>
                    <span>Current section</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.completed}`} aria-hidden="true">A</span>
                    <span>Completed section</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.upcoming}`} aria-hidden="true">B</span>
                    <span>Upcoming section</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendMark} ${styles.answered}`} aria-hidden="true">●</span>
                    <span>Answered</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendMark} ${styles.unanswered}`} aria-hidden="true">○</span>
                    <span>Unanswered</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <span className={styles.counter}>{currentItem + 1} of {maxItems}</span>

        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={!reviewEnabled} onClick={onReview}>
          Review
        </button>

        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSubmit}>
          Submit
        </button>
      </div>
    </header>
  );
}