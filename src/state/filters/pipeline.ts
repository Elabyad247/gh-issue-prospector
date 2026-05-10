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
    P.passesNoAssignee(issue, state.noAssignee) &&
    P.passesReproSteps(issue, state.requireReproSteps) &&
    P.passesClosedPRMode(issue, state.closedPRMode) &&
    P.matchesAuthor(issue, state.author) &&
    P.matchesAssignee(issue, state.assignee) &&
    P.passesAnnotation(ann, state.annotation) &&
    P.matchesLabels(issue, state.labels, state.labelMode) &&
    P.passesAgeDays(issue, state.ageDays) &&
    P.passesReporterActive(issue, state.reporterActiveWithinDays) &&
    P.inDateRange(issue.createdAt, state.createdRange) &&
    P.inDateRange(issue.updatedAt, state.updatedRange) &&
    P.matchesText(issue, state.text)
  );
}

export type FilterCounts = {
  total: number;
  noComments: number;
  noLinkedPR: number;
  noAssignee: number;
  hasRepro: number;
};

export function computeFilterCounts(
  issues: Issue[],
  _state: FilterState,
  _annotations: Map<number, Annotation>,
): FilterCounts {
  return {
    total: issues.length,
    noComments: issues.filter((i) => i.commentCount === 0).length,
    noLinkedPR: issues.filter((i) => i.linkedPRs.length === 0).length,
    noAssignee: issues.filter((i) => i.assignees.length === 0).length,
    hasRepro: issues.filter((i) => i.hasReproSteps).length,
  };
}
