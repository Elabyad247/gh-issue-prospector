import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AuthModal } from './ui/AuthModal';
import { SettingsModal } from './ui/SettingsModal';
import { RepoBar } from './ui/RepoBar';
import { FilterSidebar } from './ui/FilterSidebar';
import { PresetDropdown } from './ui/PresetDropdown';
import { IssueList, type IssueListPhase } from './ui/IssueList';
import { IssueDrawer } from './ui/IssueDrawer';
import { ErrorBanner } from './ui/ErrorBanner';
import { RateLimitBadge } from './ui/RateLimitBadge';
import { Spinner } from './ui/Spinner';
import { useAuth } from './state/hooks/useAuth';
import { useRepoSync } from './state/hooks/useRepoSync';
import { useFilterState } from './state/hooks/useFilterState';
import { useFilteredIssues } from './state/hooks/useFilteredIssues';
import { useAnnotations } from './state/hooks/useAnnotations';
import { useTheme } from './state/hooks/useTheme';
import { applyPreset } from './state/presets';
import type { Issue, FilterPreset, FilterState } from './state/types';
import { defaultFilterState } from './state/types';
import {
  getLastRepo,
  setLastRepo,
  getUserPresets,
  setUserPresets,
} from './data/cache/localStorage';
import { parseRepoUrl, type RepoRef } from './lib/parseRepoUrl';

function isFiltersActive(state: FilterState): boolean {
  return (
    JSON.stringify({ ...state, sort: defaultFilterState.sort }) !==
    JSON.stringify(defaultFilterState)
  );
}

export function App() {
  const auth = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [repo, setRepo] = useState<RepoRef | null>(() => {
    const last = getLastRepo();
    return last ? parseRepoUrl(last) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [userPresets, setUserPresetsState] = useState<FilterPreset[]>(() => getUserPresets());

  const repoKey = repo ? `${repo.owner}/${repo.repo}` : null;

  const { issues, status, error, fetchedAt, partial, rateLimit, progress, refresh } = useRepoSync(
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
  const deferredFilterState = useDeferredValue(filterState);
  const { filtered, counts, totalShown, totalAvailable } = useFilteredIssues(
    issues,
    deferredFilterState,
    annotations,
  );

  const selected = useMemo(
    () => issues.find((i) => i.number === selectedNumber) ?? null,
    [issues, selectedNumber],
  );
  const selectIssue = useCallback((issue: Issue) => setSelectedNumber(issue.number), []);

  const availableLabels = useMemo(() => {
    const set = new Set<string>(filterState.labels);
    for (const i of issues) for (const l of i.labels) set.add(l);
    return [...set].sort();
  }, [issues, filterState.labels]);

  const changeRepo = useCallback(
    (next: RepoRef) => {
      setSelectedNumber(null);
      setFilter('labels', []);
      setRepo(next);
    },
    [setFilter],
  );

  useEffect(() => {
    if (repo) setLastRepo(`${repo.owner}/${repo.repo}`);
  }, [repo]);

  if (auth.status === 'loading') {
    return (
      <div className="centered" role="status" aria-live="polite">
        <Spinner size={20} />
        <span style={{ marginLeft: 10 }}>Validating saved token…</span>
      </div>
    );
  }
  if (auth.status === 'unauthenticated') {
    return <AuthModal onSubmit={auth.signIn} />;
  }

  const phase: IssueListPhase = !repo
    ? 'no-repo'
    : (status === 'syncing' || status === 'loading') && issues.length === 0
      ? 'first-load'
      : status === 'error' && issues.length === 0
        ? 'load-failed'
        : 'ready';

  const showStaleBanner = status === 'syncing' && issues.length > 0;
  const filtersActive = isFiltersActive(filterState);

  return (
    <div className="app-shell">
      <RepoBar
        value={repo}
        onChange={changeRepo}
        onRefresh={refresh}
        fetchedAt={fetchedAt}
        status={status}
        progress={progress}
        totalIssues={totalAvailable || null}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <RateLimitBadge rateLimit={rateLimit} />
      {showStaleBanner && (
        <div className="info-banner" role="status" aria-live="polite">
          <Spinner size={12} label="Refreshing" />
          <span>
            Showing cached data while refreshing
            {progress ? ` · page ${progress.page} · ${progress.fetched} fetched` : '…'}
          </span>
        </div>
      )}
      {error && (
        <ErrorBanner
          kind={error.kind}
          message={error.message}
          {...(error.resetAt ? { resetAt: error.resetAt } : {})}
        />
      )}
      {partial && (
        <ErrorBanner
          kind="partial"
          message={`Sync stopped early: the newest issues are fresh, older ones are from the last sync. Showing ${issues.length} issues.`}
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
            phase={phase}
            filtersActive={filtersActive}
            onSortChange={(s) => setFilter('sort', s)}
            onSelectIssue={selectIssue}
            onClearFilters={resetFilters}
          />
        </section>
        {selected && (
          <IssueDrawer
            issue={selected}
            annotation={annotations.get(selected.number)}
            onSetStatus={(s) => setStatus(selected.number, s)}
            onSetNotes={(n) => setNotes(selected.number, n)}
            onClose={() => setSelectedNumber(null)}
          />
        )}
      </div>
      {settingsOpen && auth.status === 'authenticated' && auth.token && (
        <SettingsModal
          token={auth.token}
          login={auth.login ?? 'unknown (GitHub unreachable)'}
          onSignOut={auth.signOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
