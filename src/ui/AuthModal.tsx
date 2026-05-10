import { useState } from 'react';

const PAT_URL =
  'https://github.com/settings/tokens/new?description=gh-issue-prospector&scopes=public_repo';

export type AuthModalProps = {
  onSubmit: (token: string) => Promise<void>;
};

export function AuthModal({ onSubmit }: AuthModalProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(token.trim());
    } catch {
      setError('Invalid token. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="auth-title">
      <form className="modal" onSubmit={handleSubmit}>
        <h2 id="auth-title">Sign in</h2>
        <p>
          Paste a GitHub Personal Access Token. Only <code>public_repo</code> scope is required (use{' '}
          <code>repo</code> for private repos).{' '}
          <a href={PAT_URL} target="_blank" rel="noreferrer">
            Create a personal access token →
          </a>
        </p>
        <label>
          Personal Access Token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={busy}
            required
          />
        </label>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <button type="submit" disabled={busy || !token}>
          {busy ? 'Validating…' : 'Sign in'}
        </button>
        <p className="muted small">
          The token is stored in this browser only. Don't paste this app's URL into anything you
          don't trust.
        </p>
      </form>
    </div>
  );
}
