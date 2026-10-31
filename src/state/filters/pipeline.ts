import type { Issue, FilterState, Annotation } from '../types';
import * as P from './predicates';
import { sortIssues } from './sort';

export function applyFilters(
  issues: Issue[],
  state: FilterState,
  annotations: Map<number, Annotation>,
): Issue[] {
  const filtered = issues.filter((issue) => passesAll(issue, state, annotations.get(issue.number)));
  return sortIssues(filtered, state.sort);
}

function passesAll(issue: Issue, state: FilterState, ann: Annotation | undefined): boolean {
  return (
    P.passesNoComments(issue, state.noComments) &&
    P.passesNoLinkedPR(issue, state.noLinkedPR) &&
    P.passesNoOpenPR(issue, state.noOpenPR, state.ignoreIdlePRs) &&
    P.passesNoAssignee(issue, state.noAssignee) &&
    P.passesReproSteps(issue, state.requireReproSteps) &&
    P.passesClosedPRMode(issue, state.closedPRMode) &&
    P.passesAnnotation(ann, state.annotation) &&
    P.matchesLabels(issue, state.labels, state.labelMode) &&
    P.passesExcludedLabels(issue, state.excludedLabels) &&
    P.passesAgeDays(issue, state.ageDays) &&
    P.passesReporterActive(issue, state.reporterActiveWithinDays) &&
    P.matchesText(issue, state.text)
  );
}

export type FilterCounts = {
  total: number;
  noComments: number;
  noLinkedPR: number;
  noOpenPR: number;
  noAssignee: number;
  hasRepro: number;
  labels: Record<string, number>;
};

export function computeFilterCounts(issues: Issue[], ignoreIdlePRs: boolean): FilterCounts {
  const labels: Record<string, number> = {};
  for (const issue of issues) {
    for (const label of issue.labels) labels[label] = (labels[label] ?? 0) + 1;
  }
  return {
    total: issues.length,
    noComments: issues.filter((i) => i.commentCount === 0).length,
    noLinkedPR: issues.filter((i) => i.linkedPRs.length === 0).length,
    noOpenPR: issues.filter((i) => P.passesNoOpenPR(i, true, ignoreIdlePRs)).length,
    noAssignee: issues.filter((i) => i.assignees.length === 0).length,
    hasRepro: issues.filter((i) => i.hasReproSteps).length,
    labels,
  };
}
