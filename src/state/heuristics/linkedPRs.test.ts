import { describe, it, expect } from 'vitest';
import { deriveLinkedPRs, deriveLastReporterActivity } from './linkedPRs';
import type { TimelineItem } from '../../data/github/types';

describe('deriveLinkedPRs', () => {
  it('returns empty for no timeline items', () => {
    expect(deriveLinkedPRs([], 'o/r')).toEqual([]);
  });

  it('extracts cross-references where source is a PR in the same repo', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'OPEN',
          repository: { nameWithOwner: 'o/r' },
        },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([{ number: 42, state: 'OPEN' }]);
  });

  it('ignores cross-references to issues', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: { __typename: 'Issue', number: 99 },
      } as TimelineItem,
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([]);
  });

  it('ignores cross-references to PRs in other repos', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'OPEN',
          repository: { nameWithOwner: 'other/repo' },
        },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([]);
  });

  it('dedupes by PR number, keeping the latest seen state', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'OPEN',
          repository: { nameWithOwner: 'o/r' },
        },
      },
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'CLOSED',
          repository: { nameWithOwner: 'o/r' },
        },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([{ number: 42, state: 'CLOSED' }]);
  });
});

describe('deriveLastReporterActivity', () => {
  it('returns issue createdAt if no comments by reporter', () => {
    expect(deriveLastReporterActivity([], 'alice', '2026-04-10T00:00:00Z')).toBe(
      '2026-04-10T00:00:00Z',
    );
  });

  it('returns max of createdAt and reporter comments', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'IssueComment',
        author: { login: 'alice' },
        createdAt: '2026-04-15T00:00:00Z',
      },
      {
        __typename: 'IssueComment',
        author: { login: 'bob' },
        createdAt: '2026-04-20T00:00:00Z',
      },
    ];
    expect(deriveLastReporterActivity(items, 'alice', '2026-04-10T00:00:00Z')).toBe(
      '2026-04-15T00:00:00Z',
    );
  });

  it('returns null if reporter is null', () => {
    expect(deriveLastReporterActivity([], null, '2026-04-10T00:00:00Z')).toBe(null);
  });
});
