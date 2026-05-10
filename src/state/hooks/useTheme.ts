import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
type StoredTheme = Theme | 'system';

const KEY = 'ghip.theme';

function readStored(): StoredTheme {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(stored: StoredTheme): Theme {
  return stored === 'system' ? systemTheme() : stored;
}

export type UseTheme = {
  theme: Theme;
  stored: StoredTheme;
  setTheme: (t: StoredTheme) => void;
  toggle: () => void;
};

export function useTheme(): UseTheme {
  const [stored, setStored] = useState<StoredTheme>(() => readStored());
  const [theme, setActive] = useState<Theme>(() => resolve(readStored()));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (stored !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setActive(systemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [stored]);

  const setTheme = useCallback((next: StoredTheme) => {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
    setStored(next);
    setActive(resolve(next));
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, stored, setTheme, toggle };
}
