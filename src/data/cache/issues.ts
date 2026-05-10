import type { Issue } from '../../state/types';
import { getDB, type RepoMeta } from './db';

export async function saveIssues(
  repoKey: string,
  issues: Issue[],
  meta: { fetchedAt: string; partial: boolean },
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['issues', 'repoMeta'], 'readwrite');
  const store = tx.objectStore('issues');
  const existing = await store.index('by-repo').getAllKeys(repoKey);
  for (const key of existing) await store.delete(key);
  for (const issue of issues) {
    await store.put({ ...issue, repoKey });
  }
  await tx.objectStore('repoMeta').put({ repoKey, ...meta });
  await tx.done;
}

export async function loadIssues(repoKey: string): Promise<Issue[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('issues', 'by-repo', repoKey);
  return records.map(({ repoKey: _r, ...issue }) => issue as Issue);
}

export async function getRepoMeta(repoKey: string): Promise<RepoMeta | null> {
  const db = await getDB();
  const meta = await db.get('repoMeta', repoKey);
  return meta ?? null;
}
