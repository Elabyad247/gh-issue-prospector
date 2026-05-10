import { useEffect, useMemo, useState } from 'react';
import { AuthModal } from './ui/AuthModal';
import { SettingsModal } from './ui/SettingsModal';
import { RepoBar } from './ui/RepoBar';
import { FilterSidebar } from './ui/FilterSidebar';
import { PresetDropdown } from './ui/PresetDropdown';
import { IssueList } from './ui/IssueList';
import { IssueDrawer } from './ui/IssueDrawer';
import { ErrorBanner } from './ui/ErrorBanner';
import { RateLimitBadge } from './ui/RateLimitBadge';
import { useAuth } from './state/hooks/useAuth';
import { useRepoSync } from './state/hooks/useRepoSync';
import { useFilterState } from './state/hooks/useFilterState';
import { useFilteredIssues } from './state/hooks/useFilteredIssues';
import { useAnnotations } from './state/hooks/useAnnotations';
import { applyPreset } from './state/presets';
import type { Issue, FilterPreset } from './state/types';
import {
  getLastRepo,
  setLastRepo,
  getUserPresets,
  setUserPresets,
} from './data/cache/localStorage';
import { parseRepoUrl, type RepoRef } from './lib/parseRepoUrl';

export function App() {
  const auth = useAuth();
  const [repo, setRepo] = useState<RepoRef | null>(() => {
    const last = getLastRepo();
    return last ? parseRepoUrl(last) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [userPresets, setUserPresetsState] = useState<FilterPreset[]>(() => getUserPresets());

  const repoKey = repo ? `${repo.owner}/${repo.repo}` : null;

  const { issues, status, error, fetchedAt, partial, rateLimit, refresh } = useRepoSync(
    auth.status === 'authenticated' ? auth.token : null,
    repo,
  );
  const {
    state: filterState,
    set: setFilter,
    reset: resetFilters,
    replace: replaceFilters,
  } = useFilterState();
  const { annotations, setStatus, setNotes } = useAnnotations(repoKey);
  const { filtered, counts, totalShown, totalAvailable } = useFilteredIssues(
    issues,
    filterState,
    annotations,
  );

  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    for (const i of issues) for (const l of i.labels) set.add(l);
    return [...set].sort();
  }, [issues]);

  useEffect(() => {
    if (repo) setLastRepo(`${repo.owner}/${repo.repo}`);
  }, [repo]);

  if (auth.status === 'loading') {
    return <div className="centered">Loading…</div>;
  }
  if (auth.status === 'unauthenticated') {
    return <AuthModal onSubmit={auth.signIn} />;
  }

  return (
    <div className="app-shell">
      <RepoBar
        value={repo}
        onChange={setRepo}
        onRefresh={refresh}
        fetchedAt={fetchedAt}
        loading={status === 'syncing'}
        totalIssues={totalAvailable || null}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <RateLimitBadge rateLimit={rateLimit} />
      {error && <ErrorBanner kind="generic" message={error} />}
      {partial && (
        <ErrorBanner
          kind="partial"
          message={`Partial cache: showing ${issues.length} issues. Try refresh after rate limit resets.`}
          {...(rateLimit ? { resetAt: rateLimit.resetAt } : {})}
        />
      )}
      <div className="main-row">
        <FilterSidebar
          state={filterState}
          availableLabels={availableLabels}
          counts={counts}
          onSet={setFilter}
          onReset={resetFilters}
        />
        <section className="list-and-toolbar">
          <div className="list-toolbar">
            <PresetDropdown
              userPresets={userPresets}
              onApply={(preset) => replaceFilters(applyPreset(filterState, preset))}
              onSaveCurrent={(name) => {
                const next = [...userPresets, { name, builtIn: false, filters: filterState }];
                setUserPresetsState(next);
                setUserPresets(next);
              }}
            />
          </div>
          <IssueList
            issues={filtered}
            annotations={annotations}
            totalShown={totalShown}
            totalAvailable={totalAvailable}
            sort={filterState.sort}
            onSortChange={(s) => setFilter('sort', s)}
            onSelectIssue={setSelected}
            onClearFilters={resetFilters}
          />
        </section>
        {selected && (
          <IssueDrawer
            issue={selected}
            annotation={annotations.get(selected.number)}
            onSetStatus={(s) => setStatus(selected.number, s)}
            onSetNotes={(n) => setNotes(selected.number, n)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {settingsOpen && auth.status === 'authenticated' && auth.token && (
        <SettingsModal
          token={auth.token}
          login={auth.login}
          onSignOut={auth.signOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
