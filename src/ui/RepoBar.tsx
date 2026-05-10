import { useState } from 'react';
import { parseRepoUrl, type RepoRef } from '../lib/parseRepoUrl';

export type RepoBarProps = {
  value: RepoRef | null;
  onChange: (ref: RepoRef) => void;
  onRefresh: () => void;
  fetchedAt: string | null;
  loading: boolean;
  totalIssues: number | null;
  onOpenSettings: () => void;
};

export function RepoBar(props: RepoBarProps) {
  const [draft, setDraft] = useState(props.value ? `${props.value.owner}/${props.value.repo}` : '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = parseRepoUrl(draft);
    if (!parsed) {
      setError('Use owner/repo or a github.com URL.');
      return;
    }
    setError(null);
    props.onChange(parsed);
  }

  return (
    <header className="repo-bar">
      <input
        type="text"
        placeholder="owner/repo or github.com/owner/repo"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        aria-label="Repository"
      />
      <button onClick={() => submit()}>Load</button>
      <button onClick={props.onRefresh} disabled={!props.value || props.loading} aria-label="Refresh">
        {props.loading ? '…' : '⟳'} Refresh
      </button>
      {props.fetchedAt && (
        <span className="muted small">fetched {relativeTime(props.fetchedAt)} ago</span>
      )}
      {props.totalIssues != null && (
        <span className="muted small">• {props.totalIssues} issues</span>
      )}
      <button className="settings" onClick={props.onOpenSettings} aria-label="Settings">
        ⚙
      </button>
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
