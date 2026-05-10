import { describe, it, expect } from 'vitest';
import { hasReproSteps } from './reproSteps';
import { POSITIVE, NEGATIVE } from '../../test/fixtures/repro-corpus';

describe('hasReproSteps', () => {
  it.each(POSITIVE)('positive case detects: %s', (body) => {
    expect(hasReproSteps(body)).toBe(true);
  });

  it.each(NEGATIVE)('negative case rejects: %s', (body) => {
    expect(hasReproSteps(body)).toBe(false);
  });
});
