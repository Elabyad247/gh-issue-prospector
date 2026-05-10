import type { FilterPreset, FilterState } from './types';

export const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    name: 'Pristine unclaimed',
    builtIn: true,
    filters: { noComments: true, noLinkedPR: true, noAssignee: true },
  },
  {
    name: 'Active discussion',
    builtIn: true,
    filters: { reporterActiveWithinDays: 30 },
  },
  {
    name: 'Likely abandoned trap',
    builtIn: true,
    filters: { closedPRMode: 'only' },
  },
  {
    name: 'Good first look',
    builtIn: true,
    filters: { noAssignee: true, requireReproSteps: true, ageDays: { min: 30, max: 365 } },
  },
];

export function applyPreset(current: FilterState, preset: FilterPreset): FilterState {
  return { ...current, ...preset.filters };
}
