import type { Section } from '@/types';
import styles from './Sidebar.module.scss';

export interface SidebarProps {
  sections: Section[];
  currentSectionId?: string | null;
  onSectionJump: (section: Section) => void;
}

export function Sidebar({ sections, currentSectionId = null, onSectionJump }: SidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Sections">
      <span className={styles.eyebrow}>Sections</span>

      <ul className={styles.list}>
        {sections.map((section, index) => (
          <li
            key={section.identifier}
            className={`${styles.card} ${section.identifier === currentSectionId ? styles.active : ''}`.trim()}
          >
            <button type="button" className={styles.cardBtn} onClick={() => onSectionJump(section)}>
              <span className={styles.badge}>{String.fromCharCode(65 + (index % 26))}</span>
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{section.name}</span>
                {section.blurb && <span className={styles.cardBlurb}>{section.blurb}</span>}
                <span className={styles.cardStatus}>
                  <span className={styles.answered}>● {section.answered ?? 0}</span>
                  <span className={styles.unanswered}>○ {(section.total ?? 0) - (section.answered ?? 0)}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}