import type { ItemSummaryEntry } from '@/types';
import styles from './ResultsScreen.module.scss';

export interface ResultsScreenProps {
  summary: ItemSummaryEntry[];
  attemptsRemaining?: number | null;
  onNavigateItem: (item: ItemSummaryEntry) => void;
  onRestart: () => void;
}

export function ResultsScreen({ summary, attemptsRemaining = null, onNavigateItem, onRestart }: ResultsScreenProps) {
  const canRetake = attemptsRemaining === null || attemptsRemaining > 0;
  const answeredCount = summary.filter((item) => item.answered).length;

  return (
    <section className={styles.results} aria-label="Your Results">
      <div className={styles.card}>
        <h1 className={styles.title}>Your Results</h1>

        <section className={styles.scoreboard} aria-label="Quiz Summary">
          <h2 className={styles.scoreboardHeading}>Quiz Summary</h2>

          <dl className={styles.stats}>
            <div className={`${styles.stat} ${styles.answered}`}>
              <dt className={styles.statLabel}>Answered</dt>
              <dd className={styles.statValue}>{answeredCount}</dd>
            </div>
            <div className={`${styles.stat} ${styles.unanswered}`}>
              <dt className={styles.statLabel}>Unanswered</dt>
              <dd className={styles.statValue}>{summary.length - answeredCount}</dd>
            </div>
          </dl>
        </section>

        <ol className={styles.grid}>
          {summary.map((item) => (
            <li
              key={item.identifier}
              className={`${styles.chip} ${item.answered ? styles.answered : styles.unanswered}`}
            >
              <button type="button" className={styles.chipBtn} onClick={() => onNavigateItem(item)}>
                {item.index + 1}
              </button>
            </li>
          ))}
        </ol>

        {canRetake && (
          <div className={styles.actions}>
            <button type="button" className={styles.retakeBtn} onClick={onRestart}>
              Retake{attemptsRemaining !== null ? ` (${attemptsRemaining} left)` : ''}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}