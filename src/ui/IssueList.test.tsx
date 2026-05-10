import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueList } from './IssueList';
import type { Issue } from '../state/types';

const mk = (n: number): Issue => ({
  number: n,
  title: `Issue ${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: '',
});

const baseProps = {
  annotations: new Map(),
  sort: 'newest' as const,
  filtersActive: false,
  onSortChange: vi.fn(),
  onSelectIssue: vi.fn(),
  onClearFilters: vi.fn(),
};

describe('IssueList', () => {
  it('shows pick-a-repository state when phase is no-repo', () => {
    render(
      <IssueList
        {...baseProps}
        issues={[]}
        phase="no-repo"
        totalShown={0}
        totalAvailable={0}
      />,
    );
    expect(screen.getByRole('heading', { name: /pick a repository/i })).toBeInTheDocument();
  });

  it('shows skeleton items while first-loading', () => {
    const { container } = render(
      <IssueList
        {...baseProps}
        issues={[]}
        phase="first-load"
        totalShown={0}
        totalAvailable={0}
      />,
    );
    expect(screen.getByText(/loading issues/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.issue-card.skeleton').length).toBeGreaterThan(0);
  });

  it('shows "no matches" with clear-filters when filters cause empty result', async () => {
    const onClearFilters = vi.fn();
    render(
      <IssueList
        {...baseProps}
        issues={[]}
        phase="ready"
        totalShown={0}
        totalAvailable={42}
        filtersActive={true}
        onClearFilters={onClearFilters}
      />,
    );
    expect(screen.getByRole('heading', { name: /no issues match/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear all filters/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('shows "no open issues" when repo is fully loaded but empty', () => {
    render(
      <IssueList
        {...baseProps}
        issues={[]}
        phase="ready"
        totalShown={0}
        totalAvailable={0}
        filtersActive={false}
      />,
    );
    expect(screen.getByRole('heading', { name: /no open issues/i })).toBeInTheDocument();
  });

  it('renders cards when ready', () => {
    render(
      <IssueList
        {...baseProps}
        issues={[mk(1), mk(2)]}
        phase="ready"
        totalShown={2}
        totalAvailable={2}
      />,
    );
    expect(screen.getByText(/Issue 1/)).toBeInTheDocument();
    expect(screen.getByText(/Issue 2/)).toBeInTheDocument();
  });
});
