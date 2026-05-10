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

export async function deleteAnnotation(repoKey: string, issueNumber: number): Promise<void> {
  const db = await getDB();
  await db.delete('annotations', [repoKey, issueNumber]);
}
