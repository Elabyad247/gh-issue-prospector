import { useEffect, useRef, useState } from 'react';
import { parseRepoUrl, type RepoRef } from '../lib/parseRepoUrl';
import type { FetchProgress } from '../data/github/fetcher';
import type { SyncStatus } from '../state/hooks/useRepoSync';
import type { RateLimit } from '../state/types';
import { useNow } from '../state/hooks/useNow';
import { timeAgo } from '../lib/time';
import { RateLimitBadge } from './RateLimitBadge';
import { Spinner } from './Spinner';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../state/hooks/useTheme';

export type RepoBarProps = {
  value: RepoRef | null;
  onChange: (ref: RepoRef) => void;
  onRefresh: () => void;
  fetchedAt: string | null;
  status: SyncStatus;
  progress: FetchProgress | null;
  totalIssues: number | null;
  rateLimit: RateLimit | null;
  onOpenSettings: () => void;
  theme: Theme;
  onToggleTheme: () => void;
};

export type RepoBarHandle = { focusInput: () => void };

export function RepoBar(props: RepoBarProps) {
  const [draft, setDraft] = useState(props.value ? `${props.value.owner}/${props.value.repo}` : '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useNow(15_000);

  const busy = props.status === 'syncing' || props.status === 'loading';

  useEffect(() => {
    if (props.value) setDraft(`${props.value.owner}/${props.value.repo}`);
  }, [props.value]);

  function submit() {
    const parsed = parseRepoUrl(draft);
    if (!parsed) {
      setError('Use owner/repo or a github.com URL.');
      return;
    }
    setError(null);
    if (parsed.owner === props.value?.owner && parsed.repo === props.value?.repo) return;
    props.onChange(parsed);
  }

  function handleRefresh() {
    if (busy) return;
    props.onRefresh();
  }

  const fetchedAgeLabel = props.fetchedAt ? timeAgo(props.fetchedAt) : null;
  const isStale = props.fetchedAt && Date.now() - Date.parse(props.fetchedAt) > 60 * 60 * 1000;

  return (
    <header className="repo-bar">
      <input
        ref={inputRef}
        type="text"
        spellCheck={false}
        placeholder="owner/repo or github.com/owner/repo"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        aria-label="Repository"
      />
      <button onClick={() => submit()} disabled={!draft.trim()}>
        Load
      </button>
      <button
        className="refresh-btn"
        onClick={handleRefresh}
        disabled={!props.value || busy}
        aria-label="Refresh"
      >
        {busy ? <Spinner size={12} label="Syncing" /> : <span aria-hidden="true">⟳</span>}
        <span>{busy ? 'Syncing…' : 'Refresh'}</span>
      </button>

      {props.status === 'syncing' && props.progress && (
        <span className="muted small" aria-live="polite">
          {props.progress.fetched} of {props.progress.total} issues
        </span>
      )}
      {props.status !== 'syncing' && fetchedAgeLabel && (
        <span className={`muted small ${isStale ? 'stale-indicator' : ''}`}>
          fetched {fetchedAgeLabel}
          {isStale && <span className="stale-dot" title="Cache expired — click refresh" />}
        </span>
      )}
      {props.totalIssues != null && props.status !== 'syncing' && (
        <span className="muted small">• {props.totalIssues} issues</span>
      )}

      <div className="repo-bar-right">
        <RateLimitBadge rateLimit={props.rateLimit} />
        <ThemeToggle theme={props.theme} onToggle={props.onToggleTheme} />
        <button className="settings" onClick={props.onOpenSettings} aria-label="Settings">
          ⚙
        </button>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
    </header>
  );
}
