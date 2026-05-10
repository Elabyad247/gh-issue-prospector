import { describe, it, expect, beforeEach } from 'vitest';
import { saveIssues, loadIssues, getRepoMeta } from './issues';
import type { Issue } from '../../state/types';
import { resetDB } from './db';

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
  resetDB();
  const dbs = await indexedDB.databases();
  for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
});

describe('issues store', () => {
  it('round-trips issues for a repo', async () => {
    await saveIssues('o/r', [mk(1), mk(2)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number).sort()).toEqual([1, 2]);
  });

  it('does not return issues from other repos', async () => {
    await saveIssues('o/r', [mk(1)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    await saveIssues('o2/r2', [mk(99)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number)).toEqual([1]);
  });

  it('saveIssues replaces previous data for the repo', async () => {
    await saveIssues('o/r', [mk(1), mk(2), mk(3)], { fetchedAt: 't1', partial: false });
    await saveIssues('o/r', [mk(4)], { fetchedAt: 't2', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number)).toEqual([4]);
  });

  it('getRepoMeta returns last fetched info', async () => {
    await saveIssues('o/r', [mk(1)], { fetchedAt: '2026-05-10T00:00:00Z', partial: true });
    const meta = await getRepoMeta('o/r');
    expect(meta).toEqual({ repoKey: 'o/r', fetchedAt: '2026-05-10T00:00:00Z', partial: true });
  });

  it('getRepoMeta returns null for unknown repo', async () => {
    expect(await getRepoMeta('unknown/repo')).toBeNull();
  });
});
