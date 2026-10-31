import type { LinkedPR } from '../state/types';

const STATE_ORDER: Record<LinkedPR['state'], number> = { OPEN: 0, MERGED: 1, CLOSED: 2 };

const PILL_CLASS: Record<LinkedPR['state'], string> = {
  OPEN: 'pill pill-warn',
  MERGED: 'pill pill-good',
  CLOSED: 'pill pill-mute',
};

export function LinkedPRList({ prs }: { prs: LinkedPR[] }) {
  if (prs.length === 0) return null;
  const ordered = [...prs].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
  return (
    <section>
      <h4>Linked PRs</h4>
      <ul className="linked-prs">
        {ordered.map((pr) => (
          <li key={pr.number} className="linked-pr small">
            <span className={PILL_CLASS[pr.state]}>
              {pr.isDraft && pr.state === 'OPEN' ? 'draft' : pr.state.toLowerCase()}
            </span>
            <a href={pr.url} target="_blank" rel="noreferrer">
              #{pr.number} {pr.title}
            </a>
            <span className="muted">
              {pr.author ?? 'unknown'} · updated {new Date(pr.updatedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
