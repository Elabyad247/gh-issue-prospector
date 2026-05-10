import { describe, it, expect } from 'vitest';
import type { Issue } from '../types';
import { sortIssues } from './sort';

const mk = (n: number, p: Partial<Issue> = {}): Issue => ({
  number: n,
  title: `t${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: '',
  ...p,
});

describe('sortIssues', () => {
  const issues: Issue[] = [
    mk(1, { createdAt: '2026-01-01T00:00:00Z', commentCount: 5, updatedAt: '2026-03-01T00:00:00Z' }),
    mk(2, { createdAt: '2026-02-01T00:00:00Z', commentCount: 1, updatedAt: '2026-04-01T00:00:00Z' }),
    mk(3, { createdAt: '2026-03-01T00:00:00Z', commentCount: 0, updatedAt: '2026-02-01T00:00:00Z' }),
  ];

  it('newest first', () => {
    expect(sortIssues(issues, 'newest').map((i) => i.number)).toEqual([3, 2, 1]);
  });
  it('oldest first', () => {
    expect(sortIssues(issues, 'oldest').map((i) => i.number)).toEqual([1, 2, 3]);
  });
  it('most-commented first', () => {
    expect(sortIssues(issues, 'most-commented').map((i) => i.number)).toEqual([1, 2, 3]);
  });
  it('least-commented first', () => {
    expect(sortIssues(issues, 'least-commented').map((i) => i.number)).toEqual([3, 2, 1]);
  });
  it('recently-updated first', () => {
    expect(sortIssues(issues, 'recently-updated').map((i) => i.number)).toEqual([2, 1, 3]);
  });
  it('returns a new array', () => {
    const sorted = sortIssues(issues, 'newest');
    expect(sorted).not.toBe(issues);
  });
});
