import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoBar } from './RepoBar';

const baseProps = {
  fetchedAt: null,
  status: 'idle' as const,
  progress: null,
  totalIssues: null,
  theme: 'light' as const,
  onToggleTheme: vi.fn(),
  onOpenSettings: vi.fn(),
  onRefresh: vi.fn(),
};

describe('RepoBar', () => {
  it('calls onChange with parsed owner/repo on submit', async () => {
    const onChange = vi.fn();
    render(<RepoBar {...baseProps} value={null} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/owner\/repo/i);
    await userEvent.type(input, 'multitheftauto/mtasa-blue');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith({ owner: 'multitheftauto', repo: 'mtasa-blue' });
  });

  it('shows inline error on invalid input', async () => {
    const onChange = vi.fn();
    render(<RepoBar {...baseProps} value={null} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/owner\/repo/i), 'garbage');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows fetchedAt and total when present', () => {
    render(
      <RepoBar
        {...baseProps}
        value={{ owner: 'o', repo: 'r' }}
        onChange={vi.fn()}
        fetchedAt={new Date(Date.now() - 4 * 60 * 1000).toISOString()}
        totalIssues={712}
      />,
    );
    expect(screen.getByText(/712 issues/)).toBeInTheDocument();
    expect(screen.getByText(/fetched.*ago/i)).toBeInTheDocument();
  });

  it('refresh button calls onRefresh', async () => {
    const onRefresh = vi.fn();
    render(
      <RepoBar
        {...baseProps}
        value={{ owner: 'o', repo: 'r' }}
        onChange={vi.fn()}
        onRefresh={onRefresh}
        fetchedAt="2026-05-10T00:00:00Z"
        totalIssues={1}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('disables refresh and Load while syncing (prevents double-fetch)', async () => {
    const onRefresh = vi.fn();
    const onChange = vi.fn();
    render(
      <RepoBar
        {...baseProps}
        value={{ owner: 'o', repo: 'r' }}
        onChange={onChange}
        onRefresh={onRefresh}
        status="syncing"
        progress={{ page: 2, fetched: 130 }}
        totalIssues={null}
      />,
    );
    const refresh = screen.getByRole('button', { name: /refresh/i });
    expect(refresh).toBeDisabled();
    await userEvent.click(refresh);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByText(/page 2.*130 fetched/i)).toBeInTheDocument();
  });

  it('does not re-fire onChange when submitting the same repo', async () => {
    const onChange = vi.fn();
    render(<RepoBar {...baseProps} value={{ owner: 'o', repo: 'r' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^load$/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles theme via theme-toggle button', async () => {
    const onToggleTheme = vi.fn();
    render(<RepoBar {...baseProps} value={null} onChange={vi.fn()} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(onToggleTheme).toHaveBeenCalled();
  });
});
