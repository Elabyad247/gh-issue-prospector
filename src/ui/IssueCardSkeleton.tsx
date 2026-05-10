export function IssueCardSkeleton() {
  return (
    <div className="issue-card skeleton" aria-hidden="true">
      <div className="issue-card-line1">
        <span className="skeleton-bar" style={{ width: 48 }} />
        <span className="skeleton-bar" style={{ width: '60%' }} />
      </div>
      <div className="issue-card-line2">
        <span className="skeleton-bar" style={{ width: 40, height: 14 }} />
        <span className="skeleton-bar" style={{ width: 60, height: 14 }} />
        <span className="skeleton-bar" style={{ width: 80, height: 14 }} />
      </div>
      <div className="issue-card-line3">
        <span className="skeleton-bar" style={{ width: 70, height: 16, borderRadius: 999 }} />
        <span className="skeleton-bar" style={{ width: 70, height: 16, borderRadius: 999 }} />
      </div>
    </div>
  );
}
