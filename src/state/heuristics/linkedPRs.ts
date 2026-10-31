import type { RawPullRequest, TimelineItem } from '../../data/github/types';
import type { LinkedPR } from '../types';

function toLinkedPR(pr: RawPullRequest): LinkedPR {
  return {
    number: pr.number,
    state: pr.state,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? null,
    updatedAt: pr.updatedAt,
    isDraft: pr.isDraft,
  };
}

export function deriveLinkedPRs(
  items: TimelineItem[],
  repoNameWithOwner: string,
  closingPRs: RawPullRequest[] = [],
): LinkedPR[] {
  const repo = repoNameWithOwner.toLowerCase();
  const byNumber = new Map<number, LinkedPR>();
  const add = (pr: RawPullRequest) => {
    if (pr.repository.nameWithOwner.toLowerCase() === repo) {
      byNumber.set(pr.number, toLinkedPR(pr));
    }
  };
  for (const item of items) {
    if (item.__typename === 'CrossReferencedEvent' && item.source.__typename === 'PullRequest') {
      add(item.source);
    }
  }
  closingPRs.forEach(add);
  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}

export function deriveLastReporterActivity(
  items: TimelineItem[],
  reporterLogin: string | null,
  issueCreatedAt: string,
): string | null {
  if (reporterLogin == null) return null;
  let latest = issueCreatedAt;
  for (const item of items) {
    if (item.__typename !== 'IssueComment') continue;
    if (item.author?.login !== reporterLogin) continue;
    if (Date.parse(item.createdAt) > Date.parse(latest)) {
      latest = item.createdAt;
    }
  }
  return latest;
}
