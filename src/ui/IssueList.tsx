import type { Issue, Annotation, FilterState, SortKey } from '../state/types';
import { IssueCard } from './IssueCard';
import { IssueCardSkeleton } from './IssueCardSkeleton';
import { EmptyState } from './EmptyState';

export type IssueListPhase = 'no-repo' | 'first-load' | 'ready';

export type IssueListProps = {
  issues: Issue[];
  annotations: Map<number, Annotation>;
  totalShown: number;
  totalAvailable: number;
  sort: SortKey;
  phase: IssueListPhase;
  filtersActive: boolean;
  onSortChange: (s: SortKey) => void;
  onSelectIssue: (issue: Issue) => void;
  onClearFilters: () => void;
  onPickRepo?: () => void;
};

export function IssueList(p: IssueListProps) {
  if (p.phase === 'no-repo') {
    return (
      <main className="issue-list">
        <EmptyState
          title="Pick a repository"
          description={
            <>
              Type <code>owner/repo</code> in the bar above and press <kbd>Enter</kbd> to load all
              open issues. The first sync can take 30–60 seconds for a large repo.
            </>
          }
          {...(p.onPickRepo ? { action: { label: 'Focus repo input', onClick: p.onPickRepo } } : {})}
        />
      </main>
    );
  }

  if (p.phase === 'first-load') {
    return (
      <main className="issue-list">
        <div className="issue-list-header">
          <span className="muted">Loading issues…</span>
        </div>
        <ul aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <IssueCardSkeleton />
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="issue-list">
      <div className="issue-list-header">
        <span>
          Showing <strong>{p.totalShown}</strong> of {p.totalAvailable}
        </span>
        <select
          value={p.sort}
          onChange={(e) => p.onSortChange(e.target.value as FilterState['sort'])}
          aria-label="Sort"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-commented">Most commented</option>
          <option value="least-commented">Least commented</option>
          <option value="recently-updated">Recently updated</option>
        </select>
      </div>
      {p.issues.length === 0 ? (
        p.totalAvailable === 0 ? (
          <EmptyState
            title="No open issues in this repo"
            description="Lucky maintainers. Try a different repo above."
          />
        ) : p.filtersActive ? (
          <EmptyState
            title="No issues match these filters"
            description={`${p.totalAvailable} issues are loaded, but none pass the active filters.`}
            action={{ label: 'Clear all filters', onClick: p.onClearFilters }}
          />
        ) : (
          <EmptyState title="No issues to show" />
        )
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
