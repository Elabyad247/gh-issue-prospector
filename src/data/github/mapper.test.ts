import { describe, it, expect } from 'vitest';
import { mapRawIssue } from './mapper';
import type { RawIssue } from './types';

const baseRaw: RawIssue = {
  number: 100,
  title: 'Bug: foo',
  body: 'long body '.repeat(200),
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: { nodes: [] },
  labels: { nodes: [{ name: 'bug' }, { name: 'client' }] },
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  comments: { totalCount: 3 },
  timelineItems: { nodes: [] },
  url: 'https://github.com/o/r/issues/100',
};

describe('mapRawIssue', () => {
  it('maps basic fields', () => {
    const i = mapRawIssue(baseRaw, 'o/r');
    expect(i.number).toBe(100);
    expect(i.title).toBe('Bug: foo');
    expect(i.state).toBe('OPEN');
    expect(i.author).toEqual({ login: 'alice' });
    expect(i.labels).toEqual(['bug', 'client']);
    expect(i.commentCount).toBe(3);
    expect(i.url).toBe('https://github.com/o/r/issues/100');
  });

  it('truncates bodyPreview to 1000 chars', () => {
    const i = mapRawIssue(baseRaw, 'o/r');
    expect(i.bodyPreview.length).toBeLessThanOrEqual(1000);
  });

  it('flattens assignee logins', () => {
    const raw = { ...baseRaw, assignees: { nodes: [{ login: 'x' }, { login: 'y' }] } };
    expect(mapRawIssue(raw, 'o/r').assignees).toEqual(['x', 'y']);
  });

  it('derives linkedPRs from timeline cross-references', () => {
    const raw: RawIssue = {
      ...baseRaw,
      timelineItems: {
        nodes: [
          {
            __typename: 'CrossReferencedEvent',
            source: {
              __typename: 'PullRequest',
              number: 7,
              state: 'OPEN',
              repository: { nameWithOwner: 'o/r' },
            },
          },
        ],
      },
    };
    expect(mapRawIssue(raw, 'o/r').linkedPRs).toEqual([{ number: 7, state: 'OPEN' }]);
  });

  it('handles null author', () => {
    expect(mapRawIssue({ ...baseRaw, author: null }, 'o/r').author).toBeNull();
    expect(mapRawIssue({ ...baseRaw, author: null }, 'o/r').lastReporterActivityAt).toBeNull();
  });

  it('sets hasReproSteps from body content', () => {
    const raw = { ...baseRaw, body: 'Steps to reproduce:\n1. open\n2. crash' };
    expect(mapRawIssue(raw, 'o/r').hasReproSteps).toBe(true);
  });
});
