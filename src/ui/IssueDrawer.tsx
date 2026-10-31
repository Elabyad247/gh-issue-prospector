import { lazy, Suspense, useEffect, useRef } from 'react';
import type { Issue, Annotation, AnnotationStatus } from '../state/types';
import { useIssueComments } from '../state/hooks/useIssueComments';
import { isTyping } from '../lib/dom';
import { plural, timeAgo } from '../lib/time';
import { AnnotationEditor } from './AnnotationEditor';
import { ErrorBoundary } from './ErrorBoundary';
import { LinkedPRList } from './LinkedPRList';
import { Spinner } from './Spinner';

const Markdown = lazy(() => import('./Markdown'));

function RichText({ text }: { text: string }) {
  const plain = <pre className="plain-text">{text}</pre>;
  return (
    <ErrorBoundary fallback={plain}>
      <Suspense fallback={plain}>
        <Markdown text={text} />
      </Suspense>
    </ErrorBoundary>
  );
}

const STATUS_KEYS: Record<string, AnnotationStatus> = {
  i: 'interested',
  w: 'working',
  s: 'skipped',
  u: null,
};

export type IssueDrawerProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  token: string | null;
  repoKey: string | null;
  position: string | null;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
};

export function IssueDrawer(p: IssueDrawerProps) {
  const { issue, onClose, onPrevious, onNext, onSetStatus } = p;
  const panel = useRef<HTMLElement>(null);
  const { comments, error } = useIssueComments(
    p.token,
    p.repoKey,
    issue.number,
    issue.updatedAt,
    issue.commentCount,
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    panel.current?.querySelector('.drawer-body')?.scrollTo(0, 0);
  }, [issue.number]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'j') onNext?.();
      if (e.key === 'k') onPrevious?.();
      if (e.key in STATUS_KEYS) onSetStatus(STATUS_KEYS[e.key] ?? null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNext, onPrevious, onSetStatus]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        className="issue-drawer"
        role="dialog"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        <header className="drawer-header">
          <h2 id="drawer-title">
            <span className="issue-num">#{issue.number}</span> {issue.title}
          </h2>
          <div className="drawer-actions">
            <button onClick={onPrevious ?? undefined} disabled={!onPrevious} aria-label="Previous">
              ↑
            </button>
            <button onClick={onNext ?? undefined} disabled={!onNext} aria-label="Next">
              ↓
            </button>
            <button className="drawer-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>
        <div className="drawer-body">
          <p className="drawer-meta muted small">
            {p.position && <span>{p.position}</span>}
            {p.position && <span>·</span>}
            <span>{issue.author?.login ?? 'unknown'}</span>
            <span>·</span>
            <span>created {timeAgo(issue.createdAt)}</span>
            <span>·</span>
            <span>updated {timeAgo(issue.updatedAt)}</span>
            {issue.assignees.length > 0 && (
              <>
                <span>·</span>
                <span>assigned to {issue.assignees.join(', ')}</span>
              </>
            )}
          </p>
          <div className="drawer-labels">
            {issue.labels.map((label) => (
              <span key={label} className="label-pill">
                {label}
              </span>
            ))}
            <a className="drawer-link" href={issue.url} target="_blank" rel="noreferrer">
              Open on GitHub ↗
            </a>
          </div>
          <AnnotationEditor
            key={issue.number}
            annotation={p.annotation}
            onSetStatus={p.onSetStatus}
            onSetNotes={p.onSetNotes}
          />
          <LinkedPRList prs={issue.linkedPRs} />
          <section className="issue-body">
            <RichText text={issue.body || '_No description provided._'} />
          </section>
          <section className="issue-comments">
            <h4>{plural(issue.commentCount, 'comment')}</h4>
            {error && <p className="error small">{error}</p>}
            {!comments && !error && <Spinner size={14} label="Loading comments" />}
            {comments?.map((comment) => (
              <article key={comment.id} className="issue-comment">
                <p className="muted small">
                  {comment.author?.login ?? 'unknown'} ·{' '}
                  <a href={comment.url} target="_blank" rel="noreferrer">
                    {timeAgo(comment.createdAt)}
                  </a>
                </p>
                <RichText text={comment.body} />
              </article>
            ))}
          </section>
        </div>
        <footer className="drawer-footer muted small">
          <kbd>j</kbd>/<kbd>k</kbd> next/previous · <kbd>i</kbd> interested · <kbd>w</kbd> working ·{' '}
          <kbd>s</kbd> skip · <kbd>u</kbd> untriaged
        </footer>
      </aside>
    </>
  );
}
