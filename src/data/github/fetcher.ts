import type { GraphQLClient } from 'graphql-request';
import type { Issue, RateLimit } from '../../state/types';
import type { IssuePage } from './types';
import { ISSUES_PAGE_QUERY } from './queries';
import { mapRawIssue } from './mapper';
import { classifyError, isAbortError } from './errors';

const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 1000;

export type FetchProgress = { page: number; fetched: number };

export type FetchResult = {
  issues: Issue[];
  rateLimit: RateLimit | null;
  partial: boolean;
  warning: string | null;
};

export type FetchOptions = {
  signal?: AbortSignal;
  retryBaseMs?: number;
};

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function requestPage(
  client: GraphQLClient,
  variables: { owner: string; name: string; cursor: string | null },
  { signal, retryBaseMs = RETRY_BASE_MS }: FetchOptions,
): Promise<IssuePage> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await client.request<IssuePage>({
        document: ISSUES_PAGE_QUERY,
        variables,
        ...(signal ? { signal } : {}),
      });
    } catch (e) {
      if (isAbortError(e)) throw e;
      const failure = classifyError(e);
      if (!failure.retryable || attempt === MAX_ATTEMPTS) throw e;
      await wait(failure.retryAfterMs ?? retryBaseMs * 2 ** (attempt - 1), signal);
    }
  }
}

export async function fetchAllIssues(
  client: GraphQLClient,
  owner: string,
  repo: string,
  onProgress: (p: FetchProgress) => void,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const repoKey = `${owner}/${repo}`;
  const issues: Issue[] = [];
  let cursor: string | null = null;
  let page = 0;
  let rateLimit: RateLimit | null = null;

  while (true) {
    page += 1;
    let data: IssuePage;
    try {
      data = await requestPage(client, { owner, name: repo, cursor }, options);
    } catch (e) {
      if (isAbortError(e) || issues.length === 0) throw e;
      const failure = classifyError(e);
      if (failure.kind === 'auth' || failure.kind === 'not-found') throw e;
      return { issues, rateLimit, partial: true, warning: failure.message };
    }

    rateLimit = data.rateLimit;
    for (const raw of data.repository.issues.nodes) {
      issues.push(mapRawIssue(raw, repoKey));
    }
    onProgress({ page, fetched: issues.length });

    const info = data.repository.issues.pageInfo;
    if (!info.hasNextPage) return { issues, rateLimit, partial: false, warning: null };
    cursor = info.endCursor;

    if (rateLimit.remaining < rateLimit.cost) {
      return { issues, rateLimit, partial: true, warning: null };
    }
  }
}
