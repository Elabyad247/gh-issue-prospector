import type { Annotation } from '../../state/types';
import { getDB } from './db';

export async function saveAnnotation(ann: Annotation): Promise<void> {
  const db = await getDB();
  await db.put('annotations', ann);
}

export async function loadAnnotations(repoKey: string): Promise<Map<number, Annotation>> {
  const db = await getDB();
  const records = await db.getAllFromIndex('annotations', 'by-repo', repoKey);
  return new Map(records.map((a) => [a.issueNumber, a]));
}

export async function loadAllAnnotations(): Promise<Annotation[]> {
  const db = await getDB();
  return db.getAll('annotations');
}

function isAnnotation(value: unknown): value is Annotation {
  const a = value as Annotation | null;
  return (
    typeof a?.repoKey === 'string' &&
    typeof a.issueNumber === 'number' &&
    typeof a.notes === 'string' &&
    typeof a.updatedAt === 'string' &&
    [null, 'interested', 'working', 'skipped'].includes(a.status)
  );
}

export async function importAnnotations(values: unknown): Promise<number> {
  if (!Array.isArray(values) || !values.every(isAnnotation)) {
    throw new Error('This file is not an annotations backup.');
  }
  const db = await getDB();
  const tx = db.transaction('annotations', 'readwrite');
  let imported = 0;
  for (const annotation of values) {
    const repoKey = annotation.repoKey.toLowerCase() as Annotation['repoKey'];
    const existing = await tx.store.get([repoKey, annotation.issueNumber]);
    if (existing && existing.updatedAt >= annotation.updatedAt) continue;
    await tx.store.put({ ...annotation, repoKey });
    imported += 1;
  }
  await tx.done;
  return imported;
}
