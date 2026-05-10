import { useEffect, useState, useCallback } from 'react';
import { validateToken } from '../../data/github/client';
import { getToken, setToken, clearToken } from '../../data/cache/localStorage';

export type AuthState =
  | { status: 'loading'; login: null }
  | { status: 'authenticated'; login: string }
  | { status: 'unauthenticated'; login: null };

export type UseAuth = AuthState & {
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  token: string | null;
};

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>(() =>
    getToken() ? { status: 'loading', login: null } : { status: 'unauthenticated', login: null },
  );
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    let cancelled = false;
    validateToken(t)
      .then(({ login }) => {
        if (!cancelled) setState({ status: 'authenticated', login });
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setTokenState(null);
          setState({ status: 'unauthenticated', login: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (newToken: string) => {
    const { login } = await validateToken(newToken);
    setToken(newToken);
    setTokenState(newToken);
    setState({ status: 'authenticated', login });
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setTokenState(null);
    setState({ status: 'unauthenticated', login: null });
  }, []);

  return { ...state, signIn, signOut, token };
}
