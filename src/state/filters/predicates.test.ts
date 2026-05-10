import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Issue, Annotation } from '../types';
import * as P from './predicates';

const baseIssue: Issue = {
  number: 1,
  title: 'Test issue',
  bodyPreview: 'No repro here',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: ['bug', 'client'],
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: '2026-04-10T00:00:00Z',
  hasReproSteps: false,
  url: 'https://github.com/o/r/issues/1',
};

describe('text predicate', () => {
  it('matches case-insensitively in title', () => {
    expect(P.matchesText(baseIssue, 'TEST')).toBe(true);
  });
  it('matches in bodyPreview', () => {
    expect(P.matchesText(baseIssue, 'repro')).toBe(true);
  });
  it('returns true for empty query', () => {
    expect(P.matchesText(baseIssue, '')).toBe(true);
  });
  it('returns false on miss', () => {
    expect(P.matchesText(baseIssue, 'nonsense')).toBe(false);
  });
});

describe('labels predicate', () => {
  it('AND requires all labels', () => {
    expect(P.matchesLabels(baseIssue, ['bug', 'client'], 'AND')).toBe(true);
    expect(P.matchesLabels(baseIssue, ['bug', 'server'], 'AND')).toBe(false);
  });
  it('OR requires any label', () => {
    expect(P.matchesLabels(baseIssue, ['bug', 'server'], 'OR')).toBe(true);
    expect(P.matchesLabels(baseIssue, ['server'], 'OR')).toBe(false);
  });
  it('empty filter list matches everything', () => {
    expect(P.matchesLabels(baseIssue, [], 'OR')).toBe(true);
    expect(P.matchesLabels(baseIssue, [], 'AND')).toBe(true);
  });
});

describe('author predicate', () => {
  it('matches login', () => {
    expect(P.matchesAuthor(baseIssue, 'alice')).toBe(true);
    expect(P.matchesAuthor(baseIssue, 'bob')).toBe(false);
  });
  it('null author always matches', () => {
    expect(P.matchesAuthor(baseIssue, null)).toBe(true);
  });
});

describe('assignee predicate', () => {
  it('any matches all', () => {
    expect(P.matchesAssignee(baseIssue, 'any')).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, 'any')).toBe(true);
  });
  it('none matches only unassigned', () => {
    expect(P.matchesAssignee(baseIssue, 'none')).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, 'none')).toBe(false);
  });
  it('login matches specific assignee', () => {
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, { login: 'x' })).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['y'] }, { login: 'x' })).toBe(false);
  });
});

describe('numeric/flag predicates', () => {
  it('noComments', () => {
    expect(P.passesNoComments(baseIssue, true)).toBe(true);
    expect(P.passesNoComments({ ...baseIssue, commentCount: 1 }, true)).toBe(false);
    expect(P.passesNoComments({ ...baseIssue, commentCount: 5 }, false)).toBe(true);
  });
  it('noLinkedPR', () => {
    expect(P.passesNoLinkedPR(baseIssue, true)).toBe(true);
    expect(
      P.passesNoLinkedPR({ ...baseIssue, linkedPRs: [{ number: 9, state: 'OPEN' }] }, true),
    ).toBe(false);
  });
  it('noAssignee', () => {
    expect(P.passesNoAssignee(baseIssue, true)).toBe(true);
    expect(P.passesNoAssignee({ ...baseIssue, assignees: ['x'] }, true)).toBe(false);
  });
});

describe('closedPRMode predicate', () => {
  const withClosed: Issue = { ...baseIssue, linkedPRs: [{ number: 9, state: 'CLOSED' }] };
  const withMerged: Issue = { ...baseIssue, linkedPRs: [{ number: 9, state: 'MERGED' }] };
  it('include lets all through', () => {
    expect(P.passesClosedPRMode(baseIssue, 'include')).toBe(true);
    expect(P.passesClosedPRMode(withClosed, 'include')).toBe(true);
  });
  it('exclude rejects issues with any CLOSED linked PR', () => {
    expect(P.passesClosedPRMode(withClosed, 'exclude')).toBe(false);
    expect(P.passesClosedPRMode(withMerged, 'exclude')).toBe(true);
    expect(P.passesClosedPRMode(baseIssue, 'exclude')).toBe(true);
  });
  it('only keeps only issues with CLOSED linked PR', () => {
    expect(P.passesClosedPRMode(withClosed, 'only')).toBe(true);
    expect(P.passesClosedPRMode(baseIssue, 'only')).toBe(false);
    expect(P.passesClosedPRMode(withMerged, 'only')).toBe(false);
  });
});

describe('reporterActiveWithinDays predicate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('null disables filter', () => {
    expect(P.passesReporterActive(baseIssue, null)).toBe(true);
  });
  it('returns true when last activity within window', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: '2026-05-08T00:00:00Z' };
    expect(P.passesReporterActive(i, 7)).toBe(true);
  });
  it('returns false when last activity outside window', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: '2026-04-01T00:00:00Z' };
    expect(P.passesReporterActive(i, 7)).toBe(false);
  });
  it('returns false when null lastReporterActivityAt and filter set', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: null };
    expect(P.passesReporterActive(i, 7)).toBe(false);
  });
});

describe('ageDays predicate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('null bounds disable filter', () => {
    expect(P.passesAgeDays(baseIssue, { min: null, max: null })).toBe(true);
  });
  it('min only', () => {
    expect(P.passesAgeDays(baseIssue, { min: 10, max: null })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: 60, max: null })).toBe(false);
  });
  it('max only', () => {
    expect(P.passesAgeDays(baseIssue, { min: null, max: 60 })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: null, max: 10 })).toBe(false);
  });
  it('both bounds', () => {
    expect(P.passesAgeDays(baseIssue, { min: 10, max: 60 })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: 40, max: 60 })).toBe(false);
  });
});

describe('requireReproSteps predicate', () => {
  it('null = either', () => {
    expect(P.passesReproSteps(baseIssue, null)).toBe(true);
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, null)).toBe(true);
  });
  it('true requires repro', () => {
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, true)).toBe(true);
    expect(P.passesReproSteps(baseIssue, true)).toBe(false);
  });
  it('false forbids repro', () => {
    expect(P.passesReproSteps(baseIssue, false)).toBe(true);
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, false)).toBe(false);
  });
});

describe('createdRange / updatedRange predicates', () => {
  it('null bounds disable', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: null, max: null })).toBe(true);
  });
  it('min only', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: '2026-04-01', max: null })).toBe(true);
    expect(P.inDateRange('2026-03-10T00:00:00Z', { min: '2026-04-01', max: null })).toBe(false);
  });
  it('max only', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: null, max: '2026-05-01' })).toBe(true);
    expect(P.inDateRange('2026-06-10T00:00:00Z', { min: null, max: '2026-05-01' })).toBe(false);
  });
});

describe('annotation predicate', () => {
  const ann = (status: Annotation['status']): Annotation => ({
    repoKey: 'o/r',
    issueNumber: 1,
    status,
    notes: '',
    updatedAt: '2026-05-10T00:00:00Z',
  });

  it('any matches', () => {
    expect(P.passesAnnotation(undefined, 'any')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'any')).toBe(true);
  });
  it('untriaged: no annotation or null status', () => {
    expect(P.passesAnnotation(undefined, 'untriaged')).toBe(true);
    expect(P.passesAnnotation(ann(null), 'untriaged')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'untriaged')).toBe(false);
  });
  it('interested: only interested', () => {
    expect(P.passesAnnotation(ann('interested'), 'interested')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'interested')).toBe(false);
    expect(P.passesAnnotation(undefined, 'interested')).toBe(false);
  });
  it('hide-skipped: everything except skipped', () => {
    expect(P.passesAnnotation(undefined, 'hide-skipped')).toBe(true);
    expect(P.passesAnnotation(ann('interested'), 'hide-skipped')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'hide-skipped')).toBe(false);
  });
});
