import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../../data/github/client', () => ({
  validateToken: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

import { validateToken } from '../../data/github/client';

beforeEach(() => {
  localStorage.clear();
  vi.mocked(validateToken).mockReset();
});

describe('useAuth', () => {
  it('starts unauthenticated when no token stored', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.login).toBeNull();
  });

  it('signIn validates and persists token', async () => {
    vi.mocked(validateToken).mockResolvedValue({ login: 'alice' });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn('ghp_xxx');
    });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.login).toBe('alice');
    expect(localStorage.getItem('ghip.token')).toBe('ghp_xxx');
  });

  it('signIn surfaces error on bad token', async () => {
    vi.mocked(validateToken).mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.signIn('bad');
      }),
    ).rejects.toThrow();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('signOut clears token', async () => {
    localStorage.setItem('ghip.token', 't');
    vi.mocked(validateToken).mockResolvedValue({ login: 'alice' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    act(() => result.current.signOut());
    expect(result.current.status).toBe('unauthenticated');
    expect(localStorage.getItem('ghip.token')).toBeNull();
  });
});
