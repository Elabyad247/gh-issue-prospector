import type { Issue } from '../../state/types';
import type { RawIssue } from './types';
import { hasReproSteps } from '../../state/heuristics/reproSteps';
import { deriveLinkedPRs, deriveLastReporterActivity } from '../../state/heuristics/linkedPRs';

export function mapRawIssue(raw: RawIssue, repoNameWithOwner: string): Issue {
  const body = raw.body ?? '';
  const reporterLogin = raw.author?.login ?? null;
  const timeline = raw.timelineItems.nodes;
  return {
    number: raw.number,
    title: raw.title,
    body,
    state: raw.state,
    author: raw.author,
    assignees: raw.assignees.nodes.map((n) => n.login),
    labels: raw.labels.nodes.map((n) => n.name),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    commentCount: raw.comments.totalCount,
    reactionCount: raw.reactions.totalCount,
    linkedPRs: deriveLinkedPRs(
      timeline,
      repoNameWithOwner,
      raw.closedByPullRequestsReferences.nodes,
    ),
    lastReporterActivityAt: deriveLastReporterActivity(timeline, reporterLogin, raw.createdAt),
    hasReproSteps: hasReproSteps(body),
    url: raw.url,
  };
}
