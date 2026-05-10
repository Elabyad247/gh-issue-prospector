import type { Issue, Annotation } from '../state/types';
import { ageInDays } from '../lib/time';

export type IssueCardProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onClick: () => void;
};

export function IssueCard({ issue, annotation, onClick }: IssueCardProps) {
  const days = ageInDays(issue.createdAt);
  const ageStr =
    days < 1 ? 'today' : days < 60 ? `${days} days ago` : `${Math.floor(days / 30)} months ago`;
  const unclaimed = issue.assignees.length === 0 && issue.linkedPRs.length === 0;
  const hasClosedPR = issue.linkedPRs.some((pr) => pr.state === 'CLOSED');

  return (
    <button className="issue-card" onClick={onClick} aria-label={`Issue #${issue.number}`}>
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
      </div>
      <div className="issue-card-line3 small">
        {unclaimed && <span className="pill pill-good">unclaimed</span>}
        {issue.hasReproSteps && <span className="pill">has repro</span>}
        {hasClosedPR && <span className="pill pill-warn">closed PR linked</span>}
        {annotation?.status === 'interested' && <span className="pill pill-star">★ interested</span>}
        {annotation?.status === 'skipped' && <span className="pill pill-mute">skipped</span>}
        {annotation?.status === 'working' && <span className="pill pill-good">working on</span>}
      </div>
    </button>
  );
}
