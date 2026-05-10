import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRepoSync } from './useRepoSync';
import type { Issue } from '../types';
import { resetDB, DB_NAME } from '../../data/cache/db';

vi.mock('../../data/github/fetcher', () => ({
  fetchAllIssues: vi.fn(),
}));
vi.mock('../../data/github/client', () => ({
  makeClient: vi.fn(() => ({})),
}));

import { fetchAllIssues } from '../../data/github/fetcher';

const mk = (n: number): Issue => ({
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
});

beforeEach(async () => {
  await resetDB();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  vi.mocked(fetchAllIssues).mockReset();
});

describe('useRepoSync', () => {
  it('fetches issues when no cache exists', async () => {
    vi.mocked(fetchAllIssues).mockResolvedValue({
      issues: [mk(1), mk(2)],
      rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      partial: false,
    });
    const { result } = renderHook(() => useRepoSync('token', { owner: 'o', repo: 'r' }));
    await waitFor(() => expect(result.current.issues).toHaveLength(2));
    expect(result.current.status).toBe('idle');
    expect(result.current.fetchedAt).not.toBeNull();
  });

  it('refresh re-fetches', async () => {
    vi.mocked(fetchAllIssues)
      .mockResolvedValueOnce({
        issues: [mk(1)],
        rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
        partial: false,
      })
      .mockResolvedValueOnce({
        issues: [mk(1), mk(2)],
        rateLimit: { remaining: 4980, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
        partial: false,
      });
    const { result } = renderHook(() => useRepoSync('token', { owner: 'o', repo: 'r' }));
    await waitFor(() => expect(result.current.issues).toHaveLength(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.issues).toHaveLength(2);
  });
});
