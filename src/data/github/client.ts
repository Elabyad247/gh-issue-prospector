import { GraphQLClient } from 'graphql-request';
import { VIEWER_QUERY } from './queries';
import { classifyError } from './errors';

export const ENDPOINT = 'https://api.github.com/graphql';

export function makeClient(token: string): GraphQLClient {
  return new GraphQLClient(ENDPOINT, {
    headers: { authorization: `bearer ${token}` },
  });
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
