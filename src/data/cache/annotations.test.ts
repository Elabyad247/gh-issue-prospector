import { describe, it, expect, beforeEach } from 'vitest';
import { saveAnnotation, loadAnnotations, deleteAnnotation } from './annotations';
import type { Annotation } from '../../state/types';
import { resetDB, DB_NAME } from './db';

const ann = (n: number, status: Annotation['status'] = 'interested', notes = ''): Annotation => ({
  repoKey: 'o/r',
  issueNumber: n,
  status,
  notes,
  updatedAt: '2026-05-10T00:00:00Z',
});

beforeEach(async () => {
  await resetDB();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe('annotations store', () => {
  it('round-trips an annotation', async () => {
    await saveAnnotation(ann(1, 'interested', 'looks promising'));
    const all = await loadAnnotations('o/r');
    expect(all.size).toBe(1);
    expect(all.get(1)?.status).toBe('interested');
    expect(all.get(1)?.notes).toBe('looks promising');
  });

  it('saveAnnotation overwrites existing', async () => {
    await saveAnnotation(ann(1, 'interested'));
    await saveAnnotation(ann(1, 'skipped'));
    const all = await loadAnnotations('o/r');
    expect(all.get(1)?.status).toBe('skipped');
  });

  it('loadAnnotations is per-repo', async () => {
    await saveAnnotation(ann(1, 'interested'));
    await saveAnnotation({ ...ann(99, 'skipped'), repoKey: 'other/repo' });
    const local = await loadAnnotations('o/r');
    expect(local.size).toBe(1);
    expect(local.has(1)).toBe(true);
    expect(local.has(99)).toBe(false);
  });

  it('deleteAnnotation removes it', async () => {
    await saveAnnotation(ann(1));
    await deleteAnnotation('o/r', 1);
    const all = await loadAnnotations('o/r');
    expect(all.size).toBe(0);
  });
});
