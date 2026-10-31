import { useCallback, useEffect, useRef, useState } from 'react';
import type { Issue, RateLimit } from '../types';
import { makeClient } from '../../data/github/client';
import { classifyError, type GitHubFailure } from '../../data/github/errors';
import { fetchAllIssues, type FetchProgress } from '../../data/github/fetcher';
import { saveIssues, loadIssues, getRepoMeta } from '../../data/cache/issues';

const TTL_MS = 60 * 60 * 1000;

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export type UseRepoSync = {
  issues: Issue[];
  status: SyncStatus;
  error: GitHubFailure | null;
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
  const [error, setError] = useState<GitHubFailure | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);

  const activeFetch = useRef<AbortController | null>(null);
  const owner = ref?.owner ?? null;
  const repo = ref?.repo ?? null;
  const repoKey = owner && repo ? `${owner}/${repo}` : null;

  const doFetch = useCallback(async () => {
    if (!token || !owner || !repo || !repoKey) return;
    if (activeFetch.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    activeFetch.current = controller;
    setStatus('syncing');
    setError(null);
    try {
      const result = await fetchAllIssues(
        makeClient(token),
        owner,
        repo,
        (p) => {
          if (!signal.aborted) setProgress(p);
        },
        { signal },
      );
      const now = new Date().toISOString();
      await saveIssues(repoKey, result.issues, {
        fetchedAt: now,
        partial: result.partial,
        rateLimit: result.rateLimit,
      });
      const latest = result.partial ? await loadIssues(repoKey) : result.issues;
      if (signal.aborted) return;
      setIssues(latest);
      setFetchedAt(now);
      setPartial(result.partial);
      setRateLimit(result.rateLimit);
      setStatus('idle');
    } catch (e) {
      if (signal.aborted) return;
      setError(classifyError(e));
      setStatus('error');
    } finally {
      if (activeFetch.current === controller) {
        activeFetch.current = null;
        setProgress(null);
      }
    }
  }, [token, owner, repo, repoKey]);

  useEffect(() => {
    setIssues([]);
    setFetchedAt(null);
    setPartial(false);
    setRateLimit(null);
    setError(null);
    setProgress(null);
    if (!repoKey || !token) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const cached = await loadIssues(repoKey);
        const meta = await getRepoMeta(repoKey);
        if (cancelled) return;
        setIssues(cached);
        setFetchedAt(meta?.fetchedAt ?? null);
        setPartial(meta?.partial ?? false);
        setRateLimit(meta?.rateLimit ?? null);
        setStatus('idle');
        const stale =
          !meta || Date.now() - Date.parse(meta.fetchedAt) > TTL_MS || cached.length === 0;
        if (stale) await doFetch();
      } catch (e) {
        if (cancelled) return;
        setError(classifyError(e));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      activeFetch.current?.abort();
      activeFetch.current = null;
    };
  }, [repoKey, token, doFetch]);

  return { issues, status, error, fetchedAt, partial, rateLimit, progress, refresh: doFetch };
}
