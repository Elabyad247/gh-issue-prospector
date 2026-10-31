import { useEffect, useState } from 'react';
import { makeClient } from '../../data/github/client';
import { classifyError, isAbortError } from '../../data/github/errors';
import { ISSUE_COMMENTS_QUERY } from '../../data/github/queries';
import type { IssueCommentNode, IssueCommentsPage } from '../../data/github/types';

export type IssueComments = {
  comments: IssueCommentNode[] | null;
  error: string | null;
};

const cache = new Map<string, IssueCommentNode[]>();

export function useIssueComments(
  token: string | null,
  repoKey: string | null,
  issueNumber: number,
  updatedAt: string,
  commentCount: number,
): IssueComments {
  const cacheKey = `${repoKey}#${issueNumber}@${updatedAt}`;
  const [loaded, setLoaded] = useState<{ key: string; result: IssueComments } | null>(null);

  useEffect(() => {
    if (!token || !repoKey || commentCount === 0 || cache.has(cacheKey)) return;
    const [owner, name] = repoKey.split('/');
    const controller = new AbortController();
    makeClient(token)
      .request<IssueCommentsPage>(
        ISSUE_COMMENTS_QUERY,
        { owner, name, number: issueNumber },
        controller.signal,
      )
      .then((data) => {
        const comments = data.repository.issue?.comments.nodes ?? [];
        cache.set(cacheKey, comments);
        setLoaded({ key: cacheKey, result: { comments, error: null } });
      })
      .catch((e) => {
        if (isAbortError(e)) return;
        setLoaded({ key: cacheKey, result: { comments: null, error: classifyError(e).message } });
      });
    return () => controller.abort();
  }, [token, repoKey, issueNumber, commentCount, cacheKey]);

  if (commentCount === 0) return { comments: [], error: null };
  const cached = cache.get(cacheKey);
  if (cached) return { comments: cached, error: null };
  return loaded?.key === cacheKey ? loaded.result : { comments: null, error: null };
}
