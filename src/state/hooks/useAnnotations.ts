import { useCallback, useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationStatus, RepoKey } from '../types';
import { loadAnnotations, saveAnnotation } from '../../data/cache/annotations';

export type UseAnnotations = {
  annotations: Map<number, Annotation>;
  setStatus: (issueNumber: number, status: AnnotationStatus) => Promise<void>;
  setNotes: (issueNumber: number, notes: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useAnnotations(repoKey: string | null): UseAnnotations {
  const [annotations, setAnnotations] = useState<Map<number, Annotation>>(new Map());
  const latest = useRef(annotations);

  const publish = useCallback((next: Map<number, Annotation>) => {
    latest.current = next;
    setAnnotations(next);
  }, []);

  const reload = useCallback(async () => {
    publish(repoKey ? await loadAnnotations(repoKey) : new Map());
  }, [repoKey, publish]);

  useEffect(() => {
    publish(new Map());
    if (!repoKey) return;
    let cancelled = false;
    loadAnnotations(repoKey).then((m) => {
      if (!cancelled) publish(m);
    });
    return () => {
      cancelled = true;
    };
  }, [repoKey, publish]);

  const upsert = useCallback(
    async (issueNumber: number, patch: Partial<Annotation>) => {
      if (!repoKey) return;
      const existing = latest.current.get(issueNumber);
      const next: Annotation = {
        repoKey: repoKey as RepoKey,
        issueNumber,
        status: existing?.status ?? null,
        notes: existing?.notes ?? '',
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      publish(new Map(latest.current).set(issueNumber, next));
      await saveAnnotation(next);
    },
    [repoKey, publish],
  );

  const setStatus = useCallback(
    (issueNumber: number, status: AnnotationStatus) => upsert(issueNumber, { status }),
    [upsert],
  );

  const setNotes = useCallback(
    (issueNumber: number, notes: string) => upsert(issueNumber, { notes }),
    [upsert],
  );

  return { annotations, setStatus, setNotes, reload };
}
