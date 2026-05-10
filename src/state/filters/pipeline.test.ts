import { describe, it, expect } from 'vitest';
import type { Issue, FilterState, Annotation, RepoKey } from '../types';
import { defaultFilterState } from '../types';
import { applyFilters, computeFilterCounts } from './pipeline';

const mkIssue = (n: number, p: Partial<Issue> = {}): Issue => ({
  number: n,
  title: `Issue ${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: [],
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: '2026-04-10T00:00:00Z',
  hasReproSteps: false,
  url: '',
  ...p,
});

const repoKey: RepoKey = 'o/r';

describe('applyFilters', () => {
  it('returns all issues with default filters (sorted newest)', () => {
    const issues = [mkIssue(1), mkIssue(2), mkIssue(3)];
    const result = applyFilters(issues, defaultFilterState, new Map());
    expect(result).toHaveLength(3);
  });

  it('AND-combines filters', () => {
    const issues = [
      mkIssue(1, { commentCount: 0, linkedPRs: [] }),
      mkIssue(2, { commentCount: 5, linkedPRs: [] }),
      mkIssue(3, { commentCount: 0, linkedPRs: [{ number: 9, state: 'OPEN' }] }),
      mkIssue(4, { commentCount: 5, linkedPRs: [{ number: 9, state: 'OPEN' }] }),
    ];
    const state: FilterState = { ...defaultFilterState, noComments: true, noLinkedPR: true };
    const result = applyFilters(issues, state, new Map());
    expect(result.map((i) => i.number)).toEqual([1]);
  });

  it('uses annotation map keyed by issueNumber', () => {
    const issues = [mkIssue(1), mkIssue(2)];
    const ann: Annotation = {
      repoKey,
      issueNumber: 1,
      status: 'skipped',
      notes: '',
      updatedAt: '2026-05-01T00:00:00Z',
    };
    const annMap = new Map<number, Annotation>([[1, ann]]);
    const state: FilterState = { ...defaultFilterState, annotation: 'hide-skipped' };
    const result = applyFilters(issues, state, annMap);
    expect(result.map((i) => i.number)).toEqual([2]);
  });
});

describe('computeFilterCounts', () => {
  it('returns count if each filter were toggled on', () => {
    const issues = [
      mkIssue(1, { commentCount: 0 }),
      mkIssue(2, { commentCount: 5 }),
      mkIssue(3, { commentCount: 0, assignees: ['x'] }),
    ];
    const state = defaultFilterState;
    const counts = computeFilterCounts(issues, state, new Map());
    expect(counts.noComments).toBe(2);
    expect(counts.noAssignee).toBe(2);
    expect(counts.total).toBe(3);
  });
});
