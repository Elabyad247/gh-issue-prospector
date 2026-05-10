import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueDrawer } from './IssueDrawer';
import type { Issue } from '../state/types';

const issue: Issue = {
  number: 4421,
  title: 'Fix crash in resource manager',
  bodyPreview: 'A bug occurs when...',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-08T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: 'https://github.com/o/r/issues/4421',
};

describe('IssueDrawer', () => {
  it('renders title, body and external link', () => {
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={vi.fn()}
        onSetNotes={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Fix crash in resource manager/)).toBeInTheDocument();
    expect(screen.getByText(/A bug occurs/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open on github/i })).toHaveAttribute(
      'href',
      issue.url,
    );
  });

  it('changes annotation status via dropdown', async () => {
    const onSetStatus = vi.fn();
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={onSetStatus}
        onSetNotes={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'interested');
    expect(onSetStatus).toHaveBeenCalledWith('interested');
  });

  it('persists notes on blur', async () => {
    const onSetNotes = vi.fn();
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={vi.fn()}
        onSetNotes={onSetNotes}
        onClose={vi.fn()}
      />,
    );
    const textarea = screen.getByLabelText(/notes/i);
    await userEvent.type(textarea, 'looks good');
    expect(onSetNotes).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onSetNotes).toHaveBeenCalledWith('looks good');
  });
});
