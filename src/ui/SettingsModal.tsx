import { useState } from 'react';
import { importAnnotations, loadAllAnnotations } from '../data/cache/annotations';
import { plural } from '../lib/time';

export type SettingsModalProps = {
  token: string;
  login: string;
  onSignOut: () => void;
  onClose: () => void;
  onAnnotationsImported: () => void;
};

async function exportAnnotations(): Promise<number> {
  const annotations = await loadAllAnnotations();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(annotations, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `gh-issue-prospector-notes-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return annotations.length;
}

export function SettingsModal(p: SettingsModalProps) {
  const [message, setMessage] = useState<string | null>(null);
  const masked = p.token.slice(0, 4) + '•••' + p.token.slice(-3);

  async function handleImport(file: File) {
    try {
      const imported = await importAnnotations(JSON.parse(await file.text()));
      setMessage(`Imported ${plural(imported, 'note')}.`);
      p.onAnnotationsImported();
    } catch (e) {
      setMessage(e instanceof SyntaxError ? 'This file is not valid JSON.' : (e as Error).message);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="settings-title">
      <div className="modal">
        <h2 id="settings-title">Settings</h2>
        <p>
          Signed in as <strong>{p.login}</strong>
        </p>
        <p className="muted small">
          Token: <code>{masked}</code>
        </p>
        <p className="muted small">
          The token is kept in this browser's <code>localStorage</code> and is only sent to
          api.github.com.
        </p>
        <h3 className="settings-heading">Notes backup</h3>
        <p className="muted small">
          Notes and statuses live only in this browser, so keep a backup or move them between
          browsers here.
        </p>
        <div className="settings-actions">
          <button
            onClick={async () =>
              setMessage(`Exported ${plural(await exportAnnotations(), 'note')}.`)
            }
          >
            Export notes
          </button>
          <label className="file-button">
            Import notes
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {message && (
          <p role="status" className="small">
            {message}
          </p>
        )}
        <div className="settings-actions">
          <button
            onClick={() => {
              p.onSignOut();
              p.onClose();
            }}
          >
            Sign out
          </button>
          <button onClick={p.onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
