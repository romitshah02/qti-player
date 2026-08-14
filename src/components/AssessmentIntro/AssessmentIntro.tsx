import type { Section } from '@/types';
import styles from './AssessmentIntro.module.scss';

export interface AssessmentIntroProps {
  title: string;
  totalQuestions: number;
  sections: Section[];
  timeLimitSeconds?: number;
  maxAttempts?: number;
  onBegin: () => void;
  onSectionSelect: (section: Section) => void;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}:${String(seconds % 60).padStart(2, '0')}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function AssessmentIntro({ title, totalQuestions, sections, timeLimitSeconds, maxAttempts, onBegin, onSectionSelect }: AssessmentIntroProps) {
  return (
    <div className={styles.assessmentIntro}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title || 'Assessment'}</h1>
          <div className={styles.decoCards} aria-hidden="true">
            <span className={`${styles.decoCard} ${styles.decoWave}`} />
            <span className={`${styles.decoCard} ${styles.decoGinger}`} />
            <span className={`${styles.decoCard} ${styles.decoPrimary}`} />
          </div>
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="6" y="4" width="12" height="17" rx="2" />
                <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <dt className={styles.statLabel}>Questions</dt>
              <dd className={styles.statValue}>{totalQuestions}</dd>
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <dt className={styles.statLabel}>Minutes</dt>
              <dd className={styles.statValue}>{timeLimitSeconds ? formatDuration(timeLimitSeconds) : 'No Limit'}</dd>
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <div>
              <dt className={styles.statLabel}>Sections</dt>
              <dd className={styles.statValue}>{sections.length}</dd>
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M12 8v8M8 12h8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <dt className={styles.statLabel}>Attempts</dt>
              <dd className={styles.statValue}>{maxAttempts === 0 ? 'Unlimited' : maxAttempts ?? 1}</dd>
            </div>
          </div>
        </dl>

        <h2 className={styles.sectionsHeading}>Assessment sections</h2>
        <p className={styles.sectionsSubtitle}>Here&rsquo;s what you&rsquo;ll be covering in this assessment.</p>

        <div className={styles.grid}>
          {sections.map((section, index) => {
            const letter = String.fromCharCode(65 + (index % 26));
            const name = section.name || `Section ${letter}`;
            const count = section.total ?? 0;
            return (
              <button
                key={section.identifier}
                type="button"
                className={`${styles.sectionCard} ${index === 0 ? styles.current : ''}`}
                onClick={() => onSectionSelect(section)}
              >
                <div className={styles.sectionCardHeader}>
                  <span className={styles.badge} aria-hidden="true">{letter}</span>
                  <p className={styles.sectionName}>{name}</p>
                  <span className={styles.chevron} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <p className={styles.sectionCount}>{count} {count === 1 ? 'question' : 'questions'}</p>
                {section.blurb && <p className={styles.sectionBlurb}>{section.blurb}</p>}
              </button>
            );
          })}
        </div>

        <button type="button" className={styles.startBtn} onClick={() => onBegin()}>
          Start assessment <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}