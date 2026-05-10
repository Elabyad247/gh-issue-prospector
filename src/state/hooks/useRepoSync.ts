import { useCallback, useEffect, useRef, useState } from 'react';
import type { Issue, RateLimit } from '../types';
import { makeClient } from '../../data/github/client';
import { fetchAllIssues, type FetchProgress } from '../../data/github/fetcher';
import { saveIssues, loadIssues, getRepoMeta } from '../../data/cache/issues';

const TTL_MS = 60 * 60 * 1000;

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export type UseRepoSync = {
  issues: Issue[];
  status: SyncStatus;
  error: string | null;
  fetchedAt: string | null;
  partial: boolean;
  rateLimit: RateLimit | null;
  progress: FetchProgress | null;
  refresh: () => Promise<void>;
};

export function useRepoSync(
  token: string | null,
  ref: { owner: string; repo: string } | null,
): UseRepoSync {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);

  const fetchInFlight = useRef(false);
  const owner = ref?.owner ?? null;
  const repo = ref?.repo ?? null;
  const repoKey = owner && repo ? `${owner}/${repo}` : null;

  const doFetch = useCallback(async () => {
    if (!token || !owner || !repo || !repoKey) return;
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    setStatus('syncing');
    setError(null);
    try {
      const client = makeClient(token);
      const result = await fetchAllIssues(client, owner, repo, setProgress);
      const now = new Date().toISOString();
      await saveIssues(repoKey, result.issues, { fetchedAt: now, partial: result.partial });
      setIssues(result.issues);
      setFetchedAt(now);
      setPartial(result.partial);
      setRateLimit(result.rateLimit);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    } finally {
      fetchInFlight.current = false;
      setProgress(null);
    }
  }, [token, owner, repo, repoKey]);

  useEffect(() => {
    if (!repoKey || !token) {
      setIssues([]);
      setFetchedAt(null);
      setPartial(false);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const cached = await loadIssues(repoKey);
      const meta = await getRepoMeta(repoKey);
      if (cancelled) return;
      setIssues(cached);
      setFetchedAt(meta?.fetchedAt ?? null);
      setPartial(meta?.partial ?? false);
      setStatus('idle');
      const stale =
        !meta || Date.now() - Date.parse(meta.fetchedAt) > TTL_MS || cached.length === 0;
      if (stale) await doFetch();
    })();
    return () => {
      cancelled = true;
    };
  }, [repoKey, token, doFetch]);

  return { issues, status, error, fetchedAt, partial, rateLimit, progress, refresh: doFetch };
}
