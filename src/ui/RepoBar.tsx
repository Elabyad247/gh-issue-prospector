import { useEffect, useRef, useState } from 'react';
import { parseRepoUrl, type RepoRef } from '../lib/parseRepoUrl';
import type { FetchProgress } from '../data/github/fetcher';
import type { SyncStatus } from '../state/hooks/useRepoSync';
import { useNow } from '../state/hooks/useNow';
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
    if (busy) return;
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

  const fetchedAgeLabel = props.fetchedAt ? relativeTime(props.fetchedAt) : null;
  const isStale =
    props.fetchedAt && Date.now() - Date.parse(props.fetchedAt) > 60 * 60 * 1000;

  return (
    <header className="repo-bar">
      <input
        ref={inputRef}
        type="text"
        placeholder="owner/repo or github.com/owner/repo"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        aria-label="Repository"
        disabled={busy && !props.value}
      />
      <button onClick={() => submit()} disabled={busy || !draft.trim()}>
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
          page {props.progress.page} · {props.progress.fetched} fetched
        </span>
      )}
      {props.status !== 'syncing' && fetchedAgeLabel && (
        <span className={`muted small ${isStale ? 'stale-indicator' : ''}`}>
          fetched {fetchedAgeLabel} ago
          {isStale && <span className="stale-dot" title="Cache expired — click refresh" />}
        </span>
      )}
      {props.totalIssues != null && props.status !== 'syncing' && (
        <span className="muted small">• {props.totalIssues} issues</span>
      )}

      <div className="repo-bar-right">
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

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
