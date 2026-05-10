import { useCallback, useState, useEffect } from 'react';
import type { FilterState } from '../types';
import { defaultFilterState } from '../types';
import { getStoredFilterState, setStoredFilterState } from '../../data/cache/localStorage';

export type UseFilterState = {
  state: FilterState;
  set: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  reset: () => void;
  replace: (next: FilterState) => void;
};

export function useFilterState(): UseFilterState {
  const [state, setState] = useState<FilterState>(() => ({
    ...defaultFilterState,
    ...(getStoredFilterState() ?? {}),
  }));

  useEffect(() => {
    setStoredFilterState(state);
  }, [state]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setState(defaultFilterState), []);
  const replace = useCallback((next: FilterState) => setState(next), []);

  return { state, set, reset, replace };
}
