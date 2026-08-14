import type { SummaryBreakdown } from '@/services/navigation-service';
import { formatDuration } from '@/utils/format-duration';
import styles from './ResultsScreen.module.scss';

export interface ResultsScreenProps {
  breakdown: SummaryBreakdown;
  timeTakenSeconds?: number | null;
  attemptsRemaining?: number | null;
  onRestart: () => void;
}

export function ResultsScreen({ breakdown, timeTakenSeconds = null, attemptsRemaining = null, onRestart }: ResultsScreenProps) {
  const canRetake = attemptsRemaining === null || attemptsRemaining > 0;

  return (
    <section className={styles.results} aria-label="Your Results">
      <div className={styles.card}>
        <h1 className={styles.title}>Your Results</h1>

        <section className={styles.scoreboard} aria-label="Quiz Summary">
          <h2 className={styles.scoreboardHeading}>Quiz Summary</h2>

          <dl className={styles.stats}>
            <div className={`${styles.stat} ${styles.correct}`}>
              <dt className={styles.statLabel}>Correct</dt>
              <dd className={styles.statValue}>{breakdown.correct}</dd>
            </div>
            <div className={`${styles.stat} ${styles.incorrect}`}>
              <dt className={styles.statLabel}>Incorrect</dt>
              <dd className={styles.statValue}>{breakdown.wrong}</dd>
            </div>
            <div className={`${styles.stat} ${styles.partial}`}>
              <dt className={styles.statLabel}>Partial</dt>
              <dd className={styles.statValue}>{breakdown.partial}</dd>
            </div>
            <div className={`${styles.stat} ${styles.skipped}`}>
              <dt className={styles.statLabel}>Skipped</dt>
              <dd className={styles.statValue}>{breakdown.skipped}</dd>
            </div>
          </dl>

          <p className={styles.score}>Score: <strong>{breakdown.score}</strong></p>
          {timeTakenSeconds !== null && (
            <p className={styles.timeTaken}>Time taken: <strong>{formatDuration(timeTakenSeconds)}</strong></p>
          )}
        </section>

        {canRetake && (
          <div className={styles.actions}>
            <button type="button" className={styles.retakeBtn} onClick={onRestart}>
              Retake
            </button>
          </div>
        )}
      </div>
    </section>
  );
}