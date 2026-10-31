export type GitHubFailureKind = 'offline' | 'rate-limit' | 'auth' | 'not-found' | 'generic';

export type GitHubFailure = {
  kind: GitHubFailureKind;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  resetAt?: string;
};

type ResponseShape = {
  status?: number;
  errors?: { type?: string; message?: string }[];
  headers?: { get?: (name: string) => string | null };
};

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

export function classifyError(e: unknown): GitHubFailure {
  const response = (e as { response?: ResponseShape } | null)?.response;
  if (!response) return classifyTransportError(e);

  const status = response.status ?? 0;
  const types = (response.errors ?? []).map((err) => err.type);

  if (status === 401) {
    return {
      kind: 'auth',
      message: 'GitHub rejected this token. Sign out in Settings and paste a new one.',
      retryable: false,
    };
  }
  if (types.includes('NOT_FOUND')) {
    return {
      kind: 'not-found',
      message: "Repository not found, or this token can't see it.",
      retryable: false,
    };
  }

  const retryAfter = Number(response.headers?.get?.('retry-after'));
  if (status === 403 || status === 429 || types.includes('RATE_LIMITED')) {
    const reset = Number(response.headers?.get?.('x-ratelimit-reset'));
    return {
      kind: 'rate-limit',
      message: 'GitHub rate limit reached.',
      retryable: retryAfter > 0 && retryAfter <= 60,
      ...(retryAfter > 0 ? { retryAfterMs: retryAfter * 1000 } : {}),
      ...(reset > 0 ? { resetAt: new Date(reset * 1000).toISOString() } : {}),
    };
  }
  if (status >= 500 || (response.errors?.length ?? 0) > 0) {
    return {
      kind: 'generic',
      message: `GitHub could not complete the request (${status || 'query error'}).`,
      retryable: status >= 500 || types.every((type) => type === undefined),
    };
  }
  return { kind: 'generic', message: `GitHub returned status ${status}.`, retryable: false };
}

function classifyTransportError(e: unknown): GitHubFailure {
  if (e instanceof TypeError) {
    return { kind: 'offline', message: "Couldn't reach GitHub.", retryable: true };
  }
  return {
    kind: 'generic',
    message: e instanceof Error ? e.message : 'Unknown error',
    retryable: false,
  };
}
