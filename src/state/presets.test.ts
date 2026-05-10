import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, applyPreset } from './presets';
import { defaultFilterState } from './types';

describe('presets', () => {
  it('Pristine unclaimed sets noComments + noLinkedPR + noAssignee', () => {
    const p = BUILT_IN_PRESETS.find((p) => p.name === 'Pristine unclaimed')!;
    expect(p.filters.noComments).toBe(true);
    expect(p.filters.noLinkedPR).toBe(true);
    expect(p.filters.noAssignee).toBe(true);
  });

  it('applyPreset overrides only specified fields', () => {
    const next = applyPreset(defaultFilterState, BUILT_IN_PRESETS[0]!);
    expect(next.noComments).toBe(true);
    expect(next.text).toBe(defaultFilterState.text);
  });

  it('Likely abandoned trap sets closedPRMode = only', () => {
    const p = BUILT_IN_PRESETS.find((p) => p.name === 'Likely abandoned trap')!;
    expect(p.filters.closedPRMode).toBe('only');
  });
});
