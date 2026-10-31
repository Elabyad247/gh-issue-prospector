import { useEffect } from 'react';
import type { Issue, Annotation, AnnotationStatus } from '../state/types';
import { AnnotationEditor } from './AnnotationEditor';
import { LinkedPRList } from './LinkedPRList';

export type IssueDrawerProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
  onClose: () => void;
};

export function IssueDrawer(p: IssueDrawerProps) {
  const { onClose } = p;
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div className="drawer-backdrop" onClick={p.onClose} aria-hidden="true" />
      <aside className="issue-drawer" role="dialog" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <h2 id="drawer-title">
            <span className="issue-num">#{p.issue.number}</span> {p.issue.title}
          </h2>
          <button className="drawer-close" onClick={p.onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="drawer-body">
          <p className="drawer-meta muted small">
            <span>{p.issue.author?.login ?? 'unknown'}</span>
            <span>·</span>
            <span>created {new Date(p.issue.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>{p.issue.commentCount} comments</span>
            {p.issue.assignees.length > 0 && (
              <>
                <span>·</span>
                <span>assigned to {p.issue.assignees.join(', ')}</span>
              </>
            )}
          </p>
          <LinkedPRList prs={p.issue.linkedPRs} />
          <pre className="issue-body">{p.issue.body}</pre>
          <a className="drawer-link" href={p.issue.url} target="_blank" rel="noreferrer">
            Open on GitHub ↗
          </a>
          <AnnotationEditor
            key={p.issue.number}
            annotation={p.annotation}
            onSetStatus={p.onSetStatus}
            onSetNotes={p.onSetNotes}
          />
        </div>
      </aside>
    </>
  );
}
