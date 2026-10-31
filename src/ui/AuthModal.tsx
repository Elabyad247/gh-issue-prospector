import { useState } from 'react';
import { AuthError } from '../data/github/client';
import { classifyError } from '../data/github/errors';
import { Spinner } from './Spinner';

const PAT_URL = 'https://github.com/settings/tokens/new?description=gh-issue-prospector';

export type AuthModalProps = {
  onSubmit: (token: string) => Promise<void>;
};

export function AuthModal({ onSubmit }: AuthModalProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = token.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } catch (e) {
      setError(
        e instanceof AuthError ? 'Invalid token. Please try again.' : classifyError(e).message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="auth-title">
      <form className="modal" onSubmit={handleSubmit}>
        <h2 id="auth-title">Sign in</h2>
        <p>
          Paste a GitHub Personal Access Token. Public repos need no scopes, so leave every box
          unticked (tick <code>repo</code> only for private repos).{' '}
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
        <button type="submit" disabled={busy || !token.trim()}>
          {busy ? (
            <span className="btn-with-spinner">
              <Spinner size={12} label="Validating" />
              <span>Validating with GitHub…</span>
            </span>
          ) : (
            'Sign in'
          )}
        </button>
        <p className="muted small">
          The token is kept in this browser's <code>localStorage</code> and is only sent to
          api.github.com.
        </p>
      </form>
    </div>
  );
}
