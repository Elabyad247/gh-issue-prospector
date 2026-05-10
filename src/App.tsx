import { useDeferredValue, useEffect, useMemo, useState } from 'react';
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
  const def = defaultFilterState;
  return (
    state.text !== def.text ||
    state.labels.length > 0 ||
    state.author !== def.author ||
    state.assignee !== def.assignee ||
    state.noComments !== def.noComments ||
    state.noLinkedPR !== def.noLinkedPR ||
    state.noAssignee !== def.noAssignee ||
    state.closedPRMode !== def.closedPRMode ||
    state.reporterActiveWithinDays !== def.reporterActiveWithinDays ||
    state.ageDays.min !== def.ageDays.min ||
    state.ageDays.max !== def.ageDays.max ||
    state.requireReproSteps !== def.requireReproSteps ||
    state.annotation !== def.annotation
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
  const [selected, setSelected] = useState<Issue | null>(null);
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

  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    for (const i of issues) for (const l of i.labels) set.add(l);
    return [...set].sort();
  }, [issues]);

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
      : 'ready';

  const showStaleBanner = status === 'syncing' && issues.length > 0;
  const filtersActive = isFiltersActive(filterState);

  return (
    <div className="app-shell">
      <RepoBar
        value={repo}
        onChange={setRepo}
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
            phase={phase}
            filtersActive={filtersActive}
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
