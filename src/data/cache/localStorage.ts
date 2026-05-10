import type { FilterPreset, FilterState } from '../../state/types';

const KEYS = {
  token: 'ghip.token',
  lastRepo: 'ghip.lastRepo',
  presets: 'ghip.presets',
  filterState: 'ghip.filterState',
} as const;

export function getToken(): string | null {
  return localStorage.getItem(KEYS.token);
}
export function setToken(t: string): void {
  localStorage.setItem(KEYS.token, t);
}
export function clearToken(): void {
  localStorage.removeItem(KEYS.token);
}

export function getLastRepo(): string | null {
  return localStorage.getItem(KEYS.lastRepo);
}
export function setLastRepo(r: string): void {
  localStorage.setItem(KEYS.lastRepo, r);
}

export function getUserPresets(): FilterPreset[] {
  const raw = localStorage.getItem(KEYS.presets);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function setUserPresets(p: FilterPreset[]): void {
  localStorage.setItem(KEYS.presets, JSON.stringify(p));
}

export function getStoredFilterState(): Partial<FilterState> | null {
  const raw = localStorage.getItem(KEYS.filterState);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export function setStoredFilterState(s: Partial<FilterState>): void {
  localStorage.setItem(KEYS.filterState, JSON.stringify(s));
}
