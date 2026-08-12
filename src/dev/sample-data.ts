import type { ItemSummaryEntry, Section } from '@/types';

export const SAMPLE_SECTIONS: Section[] = [
  { identifier: 'sec1', name: 'Warm-up', blurb: 'Quick review questions.', itemIdentifiers: ['i1', 'i2'], answered: 2, total: 2 },
  { identifier: 'sec2', name: 'Fractions', blurb: 'Word problems involving fractions.', itemIdentifiers: ['i3', 'i4', 'i5'], answered: 1, total: 3 },
  { identifier: 'sec3', name: 'Geometry', itemIdentifiers: ['i6'], answered: 0, total: 1 },
];

export const SAMPLE_SUMMARY: ItemSummaryEntry[] = [
  { identifier: 'i1', index: 0, answered: true },
  { identifier: 'i2', index: 1, answered: true },
  { identifier: 'i3', index: 2, answered: true },
  { identifier: 'i4', index: 3, answered: false },
  { identifier: 'i5', index: 4, answered: false },
  { identifier: 'i6', index: 5, answered: false },
];
