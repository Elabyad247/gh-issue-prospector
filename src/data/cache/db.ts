import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Issue, Annotation, RateLimit } from '../../state/types';

export const DB_NAME = 'gh-issue-prospector';
export const DB_VERSION = 3;

export type RepoMeta = {
  repoKey: string;
  fetchedAt: string;
  partial: boolean;
  rateLimit?: RateLimit | null;
};

export interface Schema extends DBSchema {
  issues: {
    key: [string, number];
    value: Issue & { repoKey: string };
    indexes: { 'by-repo': string };
  };
  repoMeta: {
    key: string;
    value: RepoMeta;
  };
  annotations: {
    key: [string, number];
    value: Annotation;
    indexes: { 'by-repo': string };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

export function getDB(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const issues = db.createObjectStore('issues', { keyPath: ['repoKey', 'number'] });
          issues.createIndex('by-repo', 'repoKey');
          db.createObjectStore('repoMeta', { keyPath: 'repoKey' });
          const ann = db.createObjectStore('annotations', { keyPath: ['repoKey', 'issueNumber'] });
          ann.createIndex('by-repo', 'repoKey');
          return;
        }
        await tx.objectStore('issues').clear();
        await tx.objectStore('repoMeta').clear();
        const annotations = tx.objectStore('annotations');
        for (const annotation of await annotations.getAll()) {
          const repoKey = annotation.repoKey.toLowerCase() as Annotation['repoKey'];
          if (repoKey === annotation.repoKey) continue;
          await annotations.delete([annotation.repoKey, annotation.issueNumber]);
          await annotations.put({ ...annotation, repoKey });
        }
      },
      blocking() {
        void resetDB();
      },
    });
  }
  return dbPromise;
}

export async function resetDB(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}
