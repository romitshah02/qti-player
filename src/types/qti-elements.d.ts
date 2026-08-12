// Declares <qti-assessment-item-player> as a valid JSX intrinsic element so
// TSX can render it directly. The element itself is defined at runtime by
// defineQtiAssessmentItemPlayer() from @longsightgroup/qti3-player — this file
// only satisfies the type checker, it registers nothing.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'qti-assessment-item-player': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}