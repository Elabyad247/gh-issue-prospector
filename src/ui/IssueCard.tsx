import { memo } from 'react';
import type { Issue, Annotation } from '../state/types';
import { ageInDays } from '../lib/time';

export type IssueCardProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onSelect: (issue: Issue) => void;
};

export const IssueCard = memo(function IssueCard({ issue, annotation, onSelect }: IssueCardProps) {
  const days = ageInDays(issue.createdAt);
  const ageStr =
    days < 1 ? 'today' : days < 60 ? `${days} days ago` : `${Math.floor(days / 30)} months ago`;
  const openPRs = issue.linkedPRs.filter((pr) => pr.state === 'OPEN');
  const unclaimed = issue.assignees.length === 0 && openPRs.length === 0;
  const hasClosedPR = issue.linkedPRs.some((pr) => pr.state === 'CLOSED');

  return (
    <button
      className="issue-card"
      onClick={() => onSelect(issue)}
      aria-label={`Issue #${issue.number}`}
    >
      <div className="issue-card-line1">
        <span className="issue-num">#{issue.number}</span>
        <span className="issue-title">{issue.title}</span>
      </div>
      <div className="issue-card-line2 muted small">
        {issue.labels.slice(0, 4).map((l) => (
          <span key={l} className="label-pill">
            {l}
          </span>
        ))}
        <span>· {ageStr}</span>
        <span>· {issue.commentCount} comments</span>
        {issue.reactionCount > 0 && <span>· {issue.reactionCount} reactions</span>}
      </div>
      <div className="issue-card-line3 small">
        {unclaimed && <span className="pill pill-good">unclaimed</span>}
        {openPRs.map((pr) => (
          <span key={pr.number} className="pill pill-warn">
            {pr.isDraft ? 'draft' : 'open'} PR #{pr.number}
          </span>
        ))}
        {issue.hasReproSteps && <span className="pill">has repro</span>}
        {hasClosedPR && <span className="pill pill-warn">closed PR linked</span>}
        {annotation?.status === 'interested' && (
          <span className="pill pill-star">★ interested</span>
        )}
        {annotation?.status === 'skipped' && <span className="pill pill-mute">skipped</span>}
        {annotation?.status === 'working' && <span className="pill pill-good">working on</span>}
      </div>
    </button>
  );
});
