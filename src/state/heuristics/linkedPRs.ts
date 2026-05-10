import type { TimelineItem } from '../../data/github/types';
import type { LinkedPR } from '../types';

export function deriveLinkedPRs(items: TimelineItem[], repoNameWithOwner: string): LinkedPR[] {
  const byNumber = new Map<number, LinkedPR>();
  for (const item of items) {
    if (item.__typename !== 'CrossReferencedEvent') continue;
    const src = item.source;
    if (src.__typename !== 'PullRequest') continue;
    if (src.repository.nameWithOwner !== repoNameWithOwner) continue;
    byNumber.set(src.number, { number: src.number, state: src.state });
  }
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
