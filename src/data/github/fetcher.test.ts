import { describe, it, expect, vi } from 'vitest';
import { fetchAllIssues } from './fetcher';
import type { IssuePage, RawIssue } from './types';

const mkRaw = (n: number): RawIssue => ({
  number: n,
  title: `t${n}`,
  body: '',
  state: 'OPEN',
  author: { login: 'a' },
  assignees: { nodes: [] },
  labels: { nodes: [] },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  comments: { totalCount: 0 },
  timelineItems: { nodes: [] },
  url: '',
});

describe('fetchAllIssues', () => {
  it('paginates until hasNextPage is false', async () => {
    const pages: IssuePage[] = [
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
            nodes: [mkRaw(1), mkRaw(2)],
          },
        },
        rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: false, endCursor: 'cursor2' },
            nodes: [mkRaw(3)],
          },
        },
        rateLimit: { remaining: 4980, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
    ];

    const request = vi.fn().mockResolvedValueOnce(pages[0]).mockResolvedValueOnce(pages[1]);
    const onProgress = vi.fn();
    const result = await fetchAllIssues({ request } as never, 'o', 'r', onProgress);

    expect(result.issues.map((i) => i.number)).toEqual([1, 2, 3]);
    expect(result.rateLimit?.remaining).toBe(4980);
    expect(request).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalled();
  });

  it('stops if estimated cost exceeds remaining', async () => {
    const pages: IssuePage[] = [
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
            nodes: [mkRaw(1)],
          },
        },
        rateLimit: { remaining: 5, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
    ];
    const request = vi.fn().mockResolvedValueOnce(pages[0]);
    const result = await fetchAllIssues({ request } as never, 'o', 'r', () => {});
    expect(result.partial).toBe(true);
    expect(result.issues).toHaveLength(1);
  });
});
