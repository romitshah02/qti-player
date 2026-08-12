import styles from './QuestionNavBar.module.scss';

export interface QuestionNavBarProps {
  currentItem: number;
  maxItems: number;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  showExit?: boolean;
  exitLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onExit: () => void;
}

export function QuestionNavBar({
  currentItem,
  maxItems,
  isPreviousDisabled = false,
  isNextDisabled = false,
  showExit = false,
  exitLabel = 'Exit',
  onPrevious,
  onNext,
  onFinish,
  onExit,
}: QuestionNavBarProps) {
  const isLastItem = currentItem + 1 === maxItems;

  return (
    <div className={styles.qnav}>
      <button type="button" className={styles.btn} disabled={isPreviousDisabled} onClick={onPrevious}>
        Previous
      </button>

      <span className={styles.counter}>Question {currentItem + 1} of {maxItems}</span>

      {!isLastItem ? (
        <button type="button" className={styles.btn} disabled={isNextDisabled} onClick={onNext}>
          Next
        </button>
      ) : !showExit ? (
        <button type="button" className={styles.btn} disabled={isNextDisabled} onClick={onFinish}>
          Finish
        </button>
      ) : null}
      {showExit && (
        <button type="button" className={styles.btn} onClick={onExit}>
          {exitLabel}
        </button>
      )}
    </div>
  );
}