import { useContext } from 'react';
import { QtiRunnerContext } from './QtiRunnerContext';
import type { QtiRunnerContextValue } from './QtiRunnerContext';

export function useQtiRunner(): QtiRunnerContextValue {
  const context = useContext(QtiRunnerContext);
  if (!context) {
    throw new Error('useQtiRunner must be used within QtiRunnerProvider');
  }
  return context;
}