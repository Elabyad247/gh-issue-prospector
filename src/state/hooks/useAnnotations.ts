import { useCallback, useEffect, useState } from 'react';
import type { Annotation, AnnotationStatus, RepoKey } from '../types';
import { loadAnnotations, saveAnnotation } from '../../data/cache/annotations';

export type UseAnnotations = {
  annotations: Map<number, Annotation>;
  setStatus: (issueNumber: number, status: AnnotationStatus) => Promise<void>;
  setNotes: (issueNumber: number, notes: string) => Promise<void>;
};

export function useAnnotations(repoKey: string | null): UseAnnotations {
  const [annotations, setAnnotations] = useState<Map<number, Annotation>>(new Map());

  useEffect(() => {
    if (!repoKey) {
      setAnnotations(new Map());
      return;
    }
    let cancelled = false;
    loadAnnotations(repoKey).then((m) => {
      if (!cancelled) setAnnotations(m);
    });
    return () => {
      cancelled = true;
    };
  }, [repoKey]);

  const upsert = useCallback(
    async (issueNumber: number, patch: Partial<Annotation>) => {
      if (!repoKey) return;
      const existing = annotations.get(issueNumber);
      const next: Annotation = {
        repoKey: repoKey as RepoKey,
        issueNumber,
        status: existing?.status ?? null,
        notes: existing?.notes ?? '',
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await saveAnnotation(next);
      setAnnotations((m) => new Map(m).set(issueNumber, next));
    },
    [repoKey, annotations],
  );

  const setStatus = useCallback(
    (issueNumber: number, status: AnnotationStatus) => upsert(issueNumber, { status }),
    [upsert],
  );

  const setNotes = useCallback(
    (issueNumber: number, notes: string) => upsert(issueNumber, { notes }),
    [upsert],
  );

  return { annotations, setStatus, setNotes };
}
