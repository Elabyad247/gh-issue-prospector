import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueCard } from './IssueCard';
import type { Issue, Annotation } from '../state/types';

const issue: Issue = {
  number: 4421,
  title: 'Fix crash in resource manager',
  bodyPreview: '',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: ['bug', 'client'],
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: true,
  url: 'https://github.com/o/r/issues/4421',
};

describe('IssueCard', () => {
  it('shows title, number, labels, comment count', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/#4421/)).toBeInTheDocument();
    expect(screen.getByText(/Fix crash in resource manager/)).toBeInTheDocument();
    expect(screen.getByText(/bug/)).toBeInTheDocument();
    expect(screen.getByText(/0 comments/)).toBeInTheDocument();
  });

  it('shows unclaimed pill when no PR + no assignee', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/unclaimed/i)).toBeInTheDocument();
  });

  it('shows has repro pill', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/has repro/i)).toBeInTheDocument();
  });

  it('shows annotation status pill', () => {
    const ann: Annotation = {
      repoKey: 'o/r',
      issueNumber: 4421,
      status: 'interested',
      notes: '',
      updatedAt: '2026-05-10T00:00:00Z',
    };
    render(<IssueCard issue={issue} annotation={ann} onClick={vi.fn()} />);
    expect(screen.getByText(/interested/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<IssueCard issue={issue} annotation={undefined} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
