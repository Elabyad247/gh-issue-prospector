import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';

describe('AuthModal', () => {
  it('shows the help link to mint a PAT', () => {
    render(<AuthModal onSubmit={vi.fn()} />);
    const link = screen.getByRole('link', { name: /create a personal access token/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com/settings/tokens'));
  });

  it('calls onSubmit with the entered token', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AuthModal onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/personal access token/i), 'ghp_xxx');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith('ghp_xxx');
  });

  it('shows error message on failed signIn', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('bad'));
    render(<AuthModal onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/personal access token/i), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i);
  });
});
