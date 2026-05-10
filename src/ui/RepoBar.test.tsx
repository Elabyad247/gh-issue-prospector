import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoBar } from './RepoBar';

describe('RepoBar', () => {
  it('calls onChange with parsed owner/repo on submit', async () => {
    const onChange = vi.fn();
    render(
      <RepoBar
        value={null}
        onChange={onChange}
        onRefresh={vi.fn()}
        fetchedAt={null}
        loading={false}
        totalIssues={null}
        onOpenSettings={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText(/owner\/repo/i);
    await userEvent.type(input, 'multitheftauto/mtasa-blue');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith({ owner: 'multitheftauto', repo: 'mtasa-blue' });
  });

  it('shows inline error on invalid input', async () => {
    const onChange = vi.fn();
    render(
      <RepoBar
        value={null}
        onChange={onChange}
        onRefresh={vi.fn()}
        fetchedAt={null}
        loading={false}
        totalIssues={null}
        onOpenSettings={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText(/owner\/repo/i), 'garbage');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows fetchedAt and total when present', () => {
    render(
      <RepoBar
        value={{ owner: 'o', repo: 'r' }}
        onChange={vi.fn()}
        onRefresh={vi.fn()}
        fetchedAt={new Date(Date.now() - 4 * 60 * 1000).toISOString()}
        loading={false}
        totalIssues={712}
        onOpenSettings={vi.fn()}
      />,
    );
    expect(screen.getByText(/712 issues/)).toBeInTheDocument();
    expect(screen.getByText(/fetched.*ago/i)).toBeInTheDocument();
  });

  it('refresh button calls onRefresh', async () => {
    const onRefresh = vi.fn();
    render(
      <RepoBar
        value={{ owner: 'o', repo: 'r' }}
        onChange={vi.fn()}
        onRefresh={onRefresh}
        fetchedAt="2026-05-10T00:00:00Z"
        loading={false}
        totalIssues={1}
        onOpenSettings={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
