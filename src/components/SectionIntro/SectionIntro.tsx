import type { Section } from '@/types';
import { formatDuration } from '@/utils/format-duration';
import styles from './SectionIntro.module.scss';

const DEFAULT_INSTRUCTIONS = "All questions are mandatory. Choose the response you believe is correct — you can revisit any question before submitting.";

export interface SectionIntroProps {
  section: Section;
  sectionIndex: number;
  onBegin: () => void;
}

export function SectionIntro({ section, sectionIndex, onBegin }: SectionIntroProps) {
  const letter = String.fromCharCode(65 + (sectionIndex % 26));
  const name = section.name || `Section ${letter}`;
  const questionCount = section.itemIdentifiers ? section.itemIdentifiers.length : 0;
  const questionLabel = `${questionCount} ${questionCount === 1 ? 'Question' : 'Questions'}`;
  // blurb comes from the section's authored rubric-block text (TestXmlParser)
  // when real content supplies one; otherwise fall back to a generic note.
  const instructions = section.blurb || DEFAULT_INSTRUCTIONS;

  return (
    <div className={styles.sectionIntro}>
      <article className={styles.card}>
        <div className={styles.banner}>
          <span className={styles.badge} aria-hidden="true">{letter}</span>
          <div className={styles.bannerText}>
            <p className={styles.eyebrow}>{name}</p>
            <h1 className={styles.title}>{questionLabel}</h1>
          </div>
          <span className={styles.bannerDeco} aria-hidden="true" />
          {!!section.timeLimitSeconds && (
            <div className={styles.timeLimitBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{formatDuration(section.timeLimitSeconds)}</span>
            </div>
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.instructions}>
            <h2 className={styles.instructionsHeading}>Instructions</h2>
            <div className={styles.instructionsBody}>{instructions}</div>
          </div>
          <button type="button" className={styles.startBtn} onClick={onBegin}>
            Start section {name} <span aria-hidden="true">→</span>
          </button>
        </div>
      </article>
    </div>
  );
}