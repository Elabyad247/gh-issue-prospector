import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';

describe('SettingsModal', () => {
  it('shows masked token and login', () => {
    render(
      <SettingsModal token="ghp_secret123" login="alice" onSignOut={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/ghp_•••/)).toBeInTheDocument();
  });

  it('calls onSignOut and onClose when Sign out clicked', async () => {
    const onSignOut = vi.fn();
    const onClose = vi.fn();
    render(
      <SettingsModal token="ghp_secret123" login="alice" onSignOut={onSignOut} onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
