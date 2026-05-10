import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Issue, Annotation } from '../../state/types';

export const DB_NAME = 'gh-issue-prospector';
export const DB_VERSION = 1;

export type RepoMeta = {
  repoKey: string;
  fetchedAt: string;
  partial: boolean;
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
      upgrade(db) {
        const issues = db.createObjectStore('issues', { keyPath: ['repoKey', 'number'] });
        issues.createIndex('by-repo', 'repoKey');
        db.createObjectStore('repoMeta', { keyPath: 'repoKey' });
        const ann = db.createObjectStore('annotations', { keyPath: ['repoKey', 'issueNumber'] });
        ann.createIndex('by-repo', 'repoKey');
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
