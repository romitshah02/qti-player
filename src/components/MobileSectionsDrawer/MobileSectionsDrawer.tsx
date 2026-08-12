import type { Section } from '@/types';
import { Sidebar } from '../Sidebar/Sidebar';
import styles from './MobileSectionsDrawer.module.scss';

export interface MobileSectionsDrawerProps {
  open?: boolean;
  sections: Section[];
  currentSectionId?: string | null;
  onSectionJump: (section: Section) => void;
  onClose: () => void;
}

export function MobileSectionsDrawer({ open = false, sections, currentSectionId = null, onSectionJump, onClose }: MobileSectionsDrawerProps) {
  if (!open) return null;

  const handleSectionJump = (section: Section) => {
    onSectionJump(section);
    onClose();
  };

  return (
    <div className={styles.drawer}>
      <div className={styles.scrim} onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Sections"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>Sections</span>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.sidebarSlot}>
          <Sidebar sections={sections} currentSectionId={currentSectionId} onSectionJump={handleSectionJump} />
        </div>
      </div>
    </div>
  );
}