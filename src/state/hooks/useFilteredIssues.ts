import { useMemo } from 'react';
import type { Annotation, FilterState, Issue } from '../types';
import { applyFilters, computeFilterCounts, type FilterCounts } from '../filters/pipeline';

export type UseFilteredIssues = {
  filtered: Issue[];
  counts: FilterCounts;
  totalShown: number;
  totalAvailable: number;
};

export function useFilteredIssues(
  issues: Issue[],
  state: FilterState,
  annotations: Map<number, Annotation>,
): UseFilteredIssues {
  return useMemo(() => {
    const filtered = applyFilters(issues, state, annotations);
    const counts = computeFilterCounts(issues, state, annotations);
    return {
      filtered,
      counts,
      totalShown: filtered.length,
      totalAvailable: issues.length,
    };
  }, [issues, state, annotations]);
}
