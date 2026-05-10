export type RepoKey = `${string}/${string}`;

export type LinkedPR = {
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
};

export type Issue = {
  number: number;
  title: string;
  bodyPreview: string;
  state: 'OPEN' | 'CLOSED';
  author: { login: string } | null;
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
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
  | 'recently-updated';

export type FilterState = {
  text: string;
  labels: string[];
  labelMode: 'AND' | 'OR';
  author: string | null;
  assignee: 'any' | 'none' | { login: string };
  createdRange: { min: string | null; max: string | null };
  updatedRange: { min: string | null; max: string | null };
  noComments: boolean;
  noLinkedPR: boolean;
  noAssignee: boolean;
  closedPRMode: 'include' | 'exclude' | 'only';
  reporterActiveWithinDays: number | null;
  ageDays: { min: number | null; max: number | null };
  requireReproSteps: boolean | null;
  annotation: 'any' | 'untriaged' | 'interested' | 'hide-skipped';
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
  labelMode: 'OR',
  author: null,
  assignee: 'any',
  createdRange: { min: null, max: null },
  updatedRange: { min: null, max: null },
  noComments: false,
  noLinkedPR: false,
  noAssignee: false,
  closedPRMode: 'include',
  reporterActiveWithinDays: null,
  ageDays: { min: null, max: null },
  requireReproSteps: null,
  annotation: 'any',
  sort: 'newest',
};
