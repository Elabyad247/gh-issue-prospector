import { GraphQLClient } from 'graphql-request';
import { VIEWER_QUERY } from './queries';

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
  } catch {
    throw new AuthError();
  }
}
