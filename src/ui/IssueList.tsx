import type { Issue, Annotation, FilterState, SortKey } from '../state/types';
import { IssueCard } from './IssueCard';

export type IssueListProps = {
  issues: Issue[];
  annotations: Map<number, Annotation>;
  totalShown: number;
  totalAvailable: number;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onSelectIssue: (issue: Issue) => void;
  onClearFilters: () => void;
};

export function IssueList(p: IssueListProps) {
  return (
    <main className="issue-list">
      <div className="issue-list-header">
        <span>
          Showing {p.totalShown} of {p.totalAvailable}
        </span>
        <select
          value={p.sort}
          onChange={(e) => p.onSortChange(e.target.value as FilterState['sort'])}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-commented">Most commented</option>
          <option value="least-commented">Least commented</option>
          <option value="recently-updated">Recently updated</option>
        </select>
      </div>
      {p.issues.length === 0 ? (
        <div className="empty-state">
          <p>No issues match the current filters.</p>
          <button onClick={p.onClearFilters}>Clear all filters</button>
        </div>
      ) : (
        <ul>
          {p.issues.map((issue) => (
            <li key={issue.number}>
              <IssueCard
                issue={issue}
                annotation={p.annotations.get(issue.number)}
                onClick={() => p.onSelectIssue(issue)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
