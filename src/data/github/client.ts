import { VIEWER_QUERY } from './queries';
import { classifyError } from './errors';

export const ENDPOINT = 'https://api.github.com/graphql';

export type GitHubClient = {
  request: <T>(
    query: string,
    variables?: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<T>;
};

export class GitHubRequestError extends Error {
  constructor(
    readonly response: {
      status: number;
      errors?: { type?: string; message?: string }[];
      headers: Headers;
    },
  ) {
    super(`GitHub request failed with status ${response.status}`);
  }
}

export function makeClient(token: string): GitHubClient {
  return {
    async request<T>(query: string, variables?: Record<string, unknown>, signal?: AbortSignal) {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        ...(signal ? { signal } : {}),
      });
      const { status, headers } = response;
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.data || json.errors) {
        throw new GitHubRequestError({ status, headers, errors: json?.errors });
      }
      return json.data as T;
    },
  };
}

export class AuthError extends Error {
  constructor() {
    super('Bad token');
  }
}

export async function validateToken(token: string): Promise<{ login: string }> {
  try {
    const data = await makeClient(token).request<{ viewer: { login: string } }>(VIEWER_QUERY);
    return data.viewer;
  } catch (e) {
    if (classifyError(e).kind === 'auth') throw new AuthError();
    throw e;
  }
}
