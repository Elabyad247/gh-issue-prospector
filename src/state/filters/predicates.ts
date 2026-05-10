import type { Issue, Annotation, FilterState } from '../types';
import { ageInDays, withinDays } from '../../lib/time';

export function matchesText(issue: Issue, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return issue.title.toLowerCase().includes(q) || issue.bodyPreview.toLowerCase().includes(q);
}

export function matchesLabels(issue: Issue, wanted: string[], mode: 'AND' | 'OR'): boolean {
  if (wanted.length === 0) return true;
  const have = new Set(issue.labels);
  return mode === 'AND' ? wanted.every((l) => have.has(l)) : wanted.some((l) => have.has(l));
}

export function matchesAuthor(issue: Issue, author: string | null): boolean {
  if (author == null) return true;
  return issue.author?.login === author;
}

export function matchesAssignee(issue: Issue, filter: FilterState['assignee']): boolean {
  if (filter === 'any') return true;
  if (filter === 'none') return issue.assignees.length === 0;
  return issue.assignees.includes(filter.login);
}

export function passesNoComments(issue: Issue, on: boolean): boolean {
  return on ? issue.commentCount === 0 : true;
}

export function passesNoLinkedPR(issue: Issue, on: boolean): boolean {
  return on ? issue.linkedPRs.length === 0 : true;
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

export function inDateRange(
  iso: string,
  bounds: { min: string | null; max: string | null },
): boolean {
  const ts = Date.parse(iso);
  if (bounds.min != null && ts < Date.parse(bounds.min)) return false;
  if (bounds.max != null && ts > Date.parse(bounds.max + 'T23:59:59Z')) return false;
  return true;
}

export function passesAnnotation(
  ann: Annotation | undefined,
  filter: FilterState['annotation'],
): boolean {
  if (filter === 'any') return true;
  if (filter === 'untriaged') return ann == null || ann.status == null;
  if (filter === 'interested') return ann?.status === 'interested';
  return ann?.status !== 'skipped';
}
