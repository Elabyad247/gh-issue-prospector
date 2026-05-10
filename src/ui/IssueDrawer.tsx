import type { Issue, Annotation, AnnotationStatus } from '../state/types';
import { AnnotationEditor } from './AnnotationEditor';

export type IssueDrawerProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
  onClose: () => void;
};

export function IssueDrawer(p: IssueDrawerProps) {
  return (
    <aside className="issue-drawer" role="dialog" aria-labelledby="drawer-title">
      <header className="drawer-header">
        <h2 id="drawer-title">
          #{p.issue.number} {p.issue.title}
        </h2>
        <button onClick={p.onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="drawer-body">
        <p className="muted small">
          {p.issue.author?.login ?? 'unknown'} · created{' '}
          {new Date(p.issue.createdAt).toLocaleDateString()}
        </p>
        <pre className="issue-body">{p.issue.bodyPreview}</pre>
        <a href={p.issue.url} target="_blank" rel="noreferrer">
          Open on GitHub ↗
        </a>
        <AnnotationEditor
          annotation={p.annotation}
          onSetStatus={p.onSetStatus}
          onSetNotes={p.onSetNotes}
        />
      </div>
    </aside>
  );
}
