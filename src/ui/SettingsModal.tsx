export type SettingsModalProps = {
  token: string;
  login: string;
  onSignOut: () => void;
  onClose: () => void;
};

export function SettingsModal({ token, login, onSignOut, onClose }: SettingsModalProps) {
  const masked = token.slice(0, 4) + '•••' + token.slice(-3);
  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="settings-title">
      <div className="modal">
        <h2 id="settings-title">Settings</h2>
        <p>
          Signed in as <strong>{login}</strong>
        </p>
        <p className="muted small">
          Token: <code>{masked}</code>
        </p>
        <p className="muted small">
          The token sits in your browser. Don't paste this app's URL into anything you don't trust.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
          >
            Sign out
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
