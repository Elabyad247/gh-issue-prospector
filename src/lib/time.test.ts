import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daysSince, withinDays, ageInDays } from './time';

describe('time helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('daysSince returns whole days from ISO timestamp to now', () => {
    expect(daysSince('2026-05-09T12:00:00Z')).toBe(1);
    expect(daysSince('2026-05-08T12:00:00Z')).toBe(2);
    expect(daysSince('2026-05-10T11:59:00Z')).toBe(0);
  });

  it('daysSince returns Infinity for null', () => {
    expect(daysSince(null)).toBe(Infinity);
  });

  it('withinDays returns true if iso is within N days', () => {
    expect(withinDays('2026-05-08T12:00:00Z', 3)).toBe(true);
    expect(withinDays('2026-04-01T12:00:00Z', 3)).toBe(false);
    expect(withinDays(null, 3)).toBe(false);
  });

  it('ageInDays computes (now - createdAt)', () => {
    expect(ageInDays('2026-04-10T12:00:00Z')).toBe(30);
  });
});
