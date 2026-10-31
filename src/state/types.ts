export type RepoKey = `${string}/${string}`;

export type LinkedPR = {
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  title: string;
  url: string;
  author: string | null;
  updatedAt: string;
  isDraft: boolean;
};

export type Issue = {
  number: number;
  title: string;
  body: string;
  state: 'OPEN' | 'CLOSED';
  author: { login: string } | null;
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  reactionCount: number;
  linkedPRs: LinkedPR[];
  lastReporterActivityAt: string | null;
  hasReproSteps: boolean;
  url: string;
};

export type AnnotationStatus = 'interested' | 'skipped' | 'working' | null;

export type Annotation = {
  repoKey: RepoKey;
  issueNumber: number;
  status: AnnotationStatus;
  notes: string;
  updatedAt: string;
};

export type SortKey =
  | 'newest'
  | 'oldest'
  | 'most-commented'
  | 'least-commented'
  | 'recently-updated'
  | 'least-recently-updated'
  | 'most-reactions';

export type FilterState = {
  text: string;
  labels: string[];
  excludedLabels: string[];
  labelMode: 'AND' | 'OR';
  noComments: boolean;
  noLinkedPR: boolean;
  noOpenPR: boolean;
  ignoreIdlePRs: boolean;
  noAssignee: boolean;
  closedPRMode: 'include' | 'exclude' | 'only';
  reporterActiveWithinDays: number | null;
  ageDays: { min: number | null; max: number | null };
  requireReproSteps: boolean | null;
  annotation: 'any' | 'untriaged' | 'interested' | 'working' | 'skipped' | 'hide-skipped';
  sort: SortKey;
};

export type FilterPreset = {
  name: string;
  filters: Partial<FilterState>;
  builtIn: boolean;
};

export type RateLimit = {
  remaining: number;
  resetAt: string;
  cost: number;
};

export const defaultFilterState: FilterState = {
  text: '',
  labels: [],
  excludedLabels: [],
  labelMode: 'OR',
  noComments: false,
  noLinkedPR: false,
  noOpenPR: false,
  ignoreIdlePRs: false,
  noAssignee: false,
  closedPRMode: 'include',
  reporterActiveWithinDays: null,
  ageDays: { min: null, max: null },
  requireReproSteps: null,
  annotation: 'any',
  sort: 'newest',
};

export function normalizeFilters(partial: Partial<FilterState> | null): FilterState {
  const known = Object.keys(defaultFilterState).filter((key) => partial && key in partial);
  const picked = Object.fromEntries(known.map((key) => [key, partial?.[key as keyof FilterState]]));
  return { ...defaultFilterState, ...picked };
}
