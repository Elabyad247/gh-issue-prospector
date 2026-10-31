import { memo, useEffect, useRef } from 'react';
import type { Issue, Annotation } from '../state/types';
import { blockingPRs, isIdlePR } from '../state/filters/predicates';
import { plural, timeAgo } from '../lib/time';

export type IssueCardProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  selected: boolean;
  ignoreIdlePRs: boolean;
  onSelect: (issue: Issue) => void;
};

export const IssueCard = memo(function IssueCard({
  issue,
  annotation,
  selected,
  ignoreIdlePRs,
  onSelect,
}: IssueCardProps) {
  const card = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) card.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const openPRs = issue.linkedPRs.filter((pr) => pr.state === 'OPEN');
  const unclaimed = issue.assignees.length === 0 && blockingPRs(issue, ignoreIdlePRs).length === 0;
  const hasClosedPR = issue.linkedPRs.some((pr) => pr.state === 'CLOSED');

  return (
    <button
      ref={card}
      className={`issue-card ${selected ? 'issue-card-selected' : ''}`}
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
        <span>· {timeAgo(issue.createdAt)}</span>
        <span>· {plural(issue.commentCount, 'comment')}</span>
        {issue.reactionCount > 0 && <span>· {plural(issue.reactionCount, 'reaction')}</span>}
      </div>
      <div className="issue-card-line3 small">
        {unclaimed && <span className="pill pill-good">unclaimed</span>}
        {openPRs.map((pr) => (
          <span key={pr.number} className={`pill ${isIdlePR(pr) ? 'pill-mute' : 'pill-warn'}`}>
            {isIdlePR(pr) ? 'idle' : pr.isDraft ? 'draft' : 'open'} PR #{pr.number}
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
