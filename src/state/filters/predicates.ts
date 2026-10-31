import type { Issue, Annotation, FilterState, LinkedPR } from '../types';
import { ageInDays, daysSince, withinDays } from '../../lib/time';

export const IDLE_PR_DAYS = 90;

export function matchesText(issue: Issue, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    `#${issue.number}` === q ||
    issue.title.toLowerCase().includes(q) ||
    issue.body.toLowerCase().includes(q)
  );
}

export function passesExcludedLabels(issue: Issue, excluded: string[]): boolean {
  return !issue.labels.some((l) => excluded.includes(l));
}

export function matchesLabels(issue: Issue, wanted: string[], mode: 'AND' | 'OR'): boolean {
  if (wanted.length === 0) return true;
  const have = new Set(issue.labels);
  return mode === 'AND' ? wanted.every((l) => have.has(l)) : wanted.some((l) => have.has(l));
}

export function passesNoComments(issue: Issue, on: boolean): boolean {
  return on ? issue.commentCount === 0 : true;
}

export function passesNoLinkedPR(issue: Issue, on: boolean): boolean {
  return on ? issue.linkedPRs.length === 0 : true;
}

export function isIdlePR(pr: LinkedPR): boolean {
  return pr.state === 'OPEN' && daysSince(pr.updatedAt) > IDLE_PR_DAYS;
}

export function blockingPRs(issue: Issue, ignoreIdle: boolean): LinkedPR[] {
  return issue.linkedPRs.filter((pr) => pr.state === 'OPEN' && !(ignoreIdle && isIdlePR(pr)));
}

export function passesNoOpenPR(issue: Issue, on: boolean, ignoreIdle: boolean): boolean {
  return on ? blockingPRs(issue, ignoreIdle).length === 0 : true;
}

export function passesNoAssignee(issue: Issue, on: boolean): boolean {
  return on ? issue.assignees.length === 0 : true;
}

export function passesClosedPRMode(issue: Issue, mode: 'include' | 'exclude' | 'only'): boolean {
  const hasClosed = issue.linkedPRs.some((pr) => pr.state === 'CLOSED');
  if (mode === 'include') return true;
  if (mode === 'exclude') return !hasClosed;
  return hasClosed;
}

export function passesReporterActive(issue: Issue, days: number | null): boolean {
  if (days == null) return true;
  return withinDays(issue.lastReporterActivityAt, days);
}

export function passesAgeDays(
  issue: Issue,
  bounds: { min: number | null; max: number | null },
): boolean {
  const age = ageInDays(issue.createdAt);
  if (bounds.min != null && age < bounds.min) return false;
  if (bounds.max != null && age > bounds.max) return false;
  return true;
}

export function passesReproSteps(issue: Issue, required: boolean | null): boolean {
  if (required == null) return true;
  return issue.hasReproSteps === required;
}

export function passesAnnotation(
  ann: Annotation | undefined,
  filter: FilterState['annotation'],
): boolean {
  if (filter === 'any') return true;
  if (filter === 'untriaged') return ann == null || ann.status == null;
  if (filter === 'interested' || filter === 'working' || filter === 'skipped') {
    return ann?.status === filter;
  }
  return ann?.status !== 'skipped';
}
