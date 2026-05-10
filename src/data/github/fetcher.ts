import type { GraphQLClient } from 'graphql-request';
import type { Issue, RateLimit } from '../../state/types';
import type { IssuePage } from './types';
import { ISSUES_PAGE_QUERY } from './queries';
import { mapRawIssue } from './mapper';

export type FetchProgress = { page: number; fetched: number };

export type FetchResult = {
  issues: Issue[];
  rateLimit: RateLimit | null;
  partial: boolean;
};

export async function fetchAllIssues(
  client: GraphQLClient,
  owner: string,
  repo: string,
  onProgress: (p: FetchProgress) => void,
): Promise<FetchResult> {
  const repoKey = `${owner}/${repo}`;
  const issues: Issue[] = [];
  let cursor: string | null = null;
  let page = 0;
  let rateLimit: RateLimit | null = null;
  let partial = false;

  while (true) {
    page += 1;
    const data: IssuePage = await client.request<IssuePage>(ISSUES_PAGE_QUERY, {
      owner,
      name: repo,
      cursor,
    });
    rateLimit = data.rateLimit;
    for (const raw of data.repository.issues.nodes) {
      issues.push(mapRawIssue(raw, repoKey));
    }
    onProgress({ page, fetched: issues.length });

    const info = data.repository.issues.pageInfo;
    if (!info.hasNextPage) break;
    cursor = info.endCursor;

    if (rateLimit !== null && rateLimit.remaining < rateLimit.cost) {
      partial = true;
      break;
    }
  }

  return { issues, rateLimit, partial };
}
