# gh-issue-prospector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static SPA that pulls all open issues from a user-specified GitHub repo and applies custom filters (no comments, no linked PR, has repro steps, etc.) plus light per-issue annotations stored locally.

**Architecture:** Vite + React + TypeScript SPA, three layers (`data/`, `state/`, `ui/`). GraphQL bulk-fetch with IndexedDB cache and stale-while-revalidate. All filtering runs in-memory over a flat `Issue[]`. PAT in `localStorage`, never leaves the browser.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, React Testing Library, `idb` (IndexedDB wrapper), `fake-indexeddb` (test-only), `graphql-request` (lightweight client).

**Spec:** `docs/superpowers/specs/2026-05-10-gh-issue-prospector-design.md`

---

## File Structure

```
gh-issue-prospector/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── .gitignore
├── index.html
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Top-level layout
│   ├── lib/
│   │   ├── parseRepoUrl.ts               # URL → {owner, repo}
│   │   ├── parseRepoUrl.test.ts
│   │   ├── debounce.ts
│   │   └── time.ts                       # daysAgo, isoToDate helpers
│   ├── data/
│   │   ├── github/
│   │   │   ├── types.ts                  # GraphQL response shapes
│   │   │   ├── client.ts                 # graphql-request wrapper, rateLimit tracking
│   │   │   ├── queries.ts                # GraphQL query strings
│   │   │   ├── mapper.ts                 # Raw GraphQL → internal Issue
│   │   │   ├── mapper.test.ts
│   │   │   ├── fetcher.ts                # Paginated bulk fetch
│   │   │   └── fetcher.test.ts
│   │   └── cache/
│   │       ├── db.ts                     # IndexedDB setup (idb)
│   │       ├── db.test.ts
│   │       ├── issues.ts                 # Issue CRUD
│   │       ├── issues.test.ts
│   │       ├── annotations.ts            # Annotation CRUD
│   │       ├── annotations.test.ts
│   │       └── localStorage.ts           # PAT, last repo, presets
│   ├── state/
│   │   ├── types.ts                      # Issue, Annotation, FilterState, Preset
│   │   ├── filters/
│   │   │   ├── pipeline.ts               # applyFilters(issues, state)
│   │   │   ├── pipeline.test.ts
│   │   │   ├── predicates.ts             # all individual filter predicates
│   │   │   ├── predicates.test.ts
│   │   │   ├── sort.ts
│   │   │   └── sort.test.ts
│   │   ├── heuristics/
│   │   │   ├── reproSteps.ts
│   │   │   ├── reproSteps.test.ts
│   │   │   ├── linkedPRs.ts
│   │   │   └── linkedPRs.test.ts
│   │   ├── presets.ts                    # Built-in + user presets
│   │   ├── presets.test.ts
│   │   └── hooks/
│   │       ├── useAuth.ts
│   │       ├── useRepoSync.ts
│   │       ├── useFilterState.ts
│   │       ├── useFilteredIssues.ts
│   │       └── useAnnotations.ts
│   ├── ui/
│   │   ├── AuthModal.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── RepoBar.tsx
│   │   ├── RateLimitBadge.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── PresetDropdown.tsx
│   │   ├── IssueList.tsx
│   │   ├── IssueCard.tsx
│   │   ├── IssueDrawer.tsx
│   │   ├── AnnotationEditor.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── EmptyState.tsx
│   │   └── styles.css
│   └── test/
│       ├── setup.ts                      # fake-indexeddb, RTL config
│       └── fixtures/
│           ├── mtasa-issues.json         # Captured GraphQL responses
│           └── repro-corpus.ts           # Hand-curated test bodies
└── docs/superpowers/
    ├── specs/2026-05-10-gh-issue-prospector-design.md
    └── plans/2026-05-10-gh-issue-prospector.md  (this file)
```

Each filter predicate lives in `predicates.ts` as a pure function `(issue: Issue, filterValue: T) => boolean`. The pipeline composes them into a single AND'd pass.

---

## Task 1: Project skeleton

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`

- [ ] **Step 1: Initialize npm project + install runtime deps**

```bash
cd C:\Users\elaby\Desktop\OpenSource\gh-issue-prospector
npm init -y
npm install react@18 react-dom@18 graphql-request@6 idb@8
npm install --save-dev vite@5 @vitejs/plugin-react typescript@5 @types/react@18 @types/react-dom@18 vitest@1 @testing-library/react@16 @testing-library/jest-dom@6 @testing-library/user-event@14 jsdom@24 fake-indexeddb@5 prettier@3 eslint@9 @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts` and `vitest.config.ts`**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
});
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 5: Write `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

- [ ] **Step 6: Write `.prettierrc`, `eslint.config.js`, `.gitignore`**

```json
// .prettierrc
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100, "semi": true }
```

```js
// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tsparser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@typescript-eslint': tseslint, react, 'react-hooks': reactHooks },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
    settings: { react: { version: '18' } },
  },
];
```

```
# .gitignore
node_modules
dist
.vite
*.log
.DS_Store
.env
.env.local
```

- [ ] **Step 7: Write `index.html`, `src/main.tsx`, `src/App.tsx`**

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>gh-issue-prospector</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
// src/App.tsx
export function App() {
  return <div>gh-issue-prospector</div>;
}
```

- [ ] **Step 8: Add scripts to `package.json`**

Edit `package.json` to add under `"scripts"`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src",
  "format": "prettier --write src"
}
```

Also set `"type": "module"` at the top level of `package.json`.

- [ ] **Step 9: Verify dev server runs and tests run**

Run: `npm run dev`
Expected: Vite serves on `http://localhost:5173`, page shows "gh-issue-prospector". Stop with Ctrl+C.

Run: `npm test`
Expected: "No test files found" (no failures, just no tests yet).

Run: `npm run build`
Expected: build succeeds, `dist/` created.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest"
```

---

## Task 2: Repo URL parser

**Files:**
- Create: `src/lib/parseRepoUrl.ts`, `src/lib/parseRepoUrl.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/parseRepoUrl.test.ts
import { describe, it, expect } from 'vitest';
import { parseRepoUrl } from './parseRepoUrl';

describe('parseRepoUrl', () => {
  it.each([
    ['owner/repo', { owner: 'owner', repo: 'repo' }],
    ['github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['http://github.com/owner/repo', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo.git', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/issues', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/pulls', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo/issues/123', { owner: 'owner', repo: 'repo' }],
    ['  owner/repo  ', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo?tab=readme', { owner: 'owner', repo: 'repo' }],
    ['https://github.com/owner/repo#section', { owner: 'owner', repo: 'repo' }],
    ['multitheftauto/mtasa-blue', { owner: 'multitheftauto', repo: 'mtasa-blue' }],
  ])('parses %s', (input, expected) => {
    expect(parseRepoUrl(input)).toEqual(expected);
  });

  it.each([
    '',
    'just-one-segment',
    'owner/',
    '/repo',
    'owner//repo',
    'https://gitlab.com/owner/repo',
    'https://github.com/',
  ])('rejects invalid input %s', (input) => {
    expect(parseRepoUrl(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- parseRepoUrl`
Expected: FAIL with "Cannot find module './parseRepoUrl'".

- [ ] **Step 3: Implement `parseRepoUrl`**

```ts
// src/lib/parseRepoUrl.ts
export type RepoRef = { owner: string; repo: string };

export function parseRepoUrl(input: string): RepoRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let stripped = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\.git$/, '')
    .replace(/\/(issues|pulls)(\/.*)?$/, '')
    .replace(/\/+$/, '');

  if (stripped.startsWith('gitlab.com') || stripped.startsWith('bitbucket.org')) {
    return null;
  }

  const parts = stripped.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo) return null;

  return { owner, repo };
}
```

- [ ] **Step 4: Run tests, verify all pass**

Run: `npm test -- parseRepoUrl`
Expected: PASS, 14+ tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseRepoUrl.ts src/lib/parseRepoUrl.test.ts
git commit -m "feat(lib): parseRepoUrl accepts owner/repo, full URL, .git, /issues paths"
```

---

## Task 3: Time helpers + debounce

**Files:**
- Create: `src/lib/time.ts`, `src/lib/time.test.ts`, `src/lib/debounce.ts`, `src/lib/debounce.test.ts`

- [ ] **Step 1: Write failing tests for time helpers**

```ts
// src/lib/time.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daysSince, withinDays, ageInDays } from './time';

describe('time helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('daysSince returns whole days from ISO timestamp to now', () => {
    expect(daysSince('2026-05-09T12:00:00Z')).toBe(1);
    expect(daysSince('2026-05-08T12:00:00Z')).toBe(2);
    expect(daysSince('2026-05-10T11:59:00Z')).toBe(0);
  });

  it('daysSince returns Infinity for null', () => {
    expect(daysSince(null)).toBe(Infinity);
  });

  it('withinDays returns true if iso is within N days', () => {
    expect(withinDays('2026-05-08T12:00:00Z', 3)).toBe(true);
    expect(withinDays('2026-04-01T12:00:00Z', 3)).toBe(false);
    expect(withinDays(null, 3)).toBe(false);
  });

  it('ageInDays computes (now - createdAt)', () => {
    expect(ageInDays('2026-04-10T12:00:00Z')).toBe(30);
  });
});
```

- [ ] **Step 2: Write failing tests for debounce**

```ts
// src/lib/debounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls fn once after delay regardless of call count', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d('a'); d('b'); d('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('cancel() prevents pending fire', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d('a');
    d.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test -- lib/time lib/debounce`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `time.ts`**

```ts
// src/lib/time.ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(iso: string | null): number {
  if (iso == null) return Infinity;
  const ms = Date.now() - Date.parse(iso);
  return Math.floor(ms / MS_PER_DAY);
}

export function withinDays(iso: string | null, days: number): boolean {
  if (iso == null) return false;
  return daysSince(iso) <= days;
}

export function ageInDays(createdAt: string): number {
  return daysSince(createdAt);
}
```

- [ ] **Step 5: Implement `debounce.ts`**

```ts
// src/lib/debounce.ts
export type Debounced<A extends unknown[]> = ((...args: A) => void) & { cancel: () => void };

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = ((...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as Debounced<A>;
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return wrapped;
}
```

- [ ] **Step 6: Run tests, verify pass**

Run: `npm test -- lib/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/time.ts src/lib/time.test.ts src/lib/debounce.ts src/lib/debounce.test.ts
git commit -m "feat(lib): add time helpers and debounce utility"
```

---

## Task 4: Internal types

**Files:**
- Create: `src/state/types.ts`

- [ ] **Step 1: Write the file** (no test — pure types)

```ts
// src/state/types.ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/types.ts
git commit -m "feat(state): add Issue, Annotation, FilterState, Preset types"
```

---

## Task 5: Filter predicates

**Files:**
- Create: `src/state/filters/predicates.ts`, `src/state/filters/predicates.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/state/filters/predicates.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Issue, Annotation } from '../types';
import * as P from './predicates';

const baseIssue: Issue = {
  number: 1,
  title: 'Test issue',
  bodyPreview: 'No repro here',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: ['bug', 'client'],
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: '2026-04-10T00:00:00Z',
  hasReproSteps: false,
  url: 'https://github.com/o/r/issues/1',
};

describe('text predicate', () => {
  it('matches case-insensitively in title', () => {
    expect(P.matchesText(baseIssue, 'TEST')).toBe(true);
  });
  it('matches in bodyPreview', () => {
    expect(P.matchesText(baseIssue, 'repro')).toBe(true);
  });
  it('returns true for empty query', () => {
    expect(P.matchesText(baseIssue, '')).toBe(true);
  });
  it('returns false on miss', () => {
    expect(P.matchesText(baseIssue, 'nonsense')).toBe(false);
  });
});

describe('labels predicate', () => {
  it('AND requires all labels', () => {
    expect(P.matchesLabels(baseIssue, ['bug', 'client'], 'AND')).toBe(true);
    expect(P.matchesLabels(baseIssue, ['bug', 'server'], 'AND')).toBe(false);
  });
  it('OR requires any label', () => {
    expect(P.matchesLabels(baseIssue, ['bug', 'server'], 'OR')).toBe(true);
    expect(P.matchesLabels(baseIssue, ['server'], 'OR')).toBe(false);
  });
  it('empty filter list matches everything', () => {
    expect(P.matchesLabels(baseIssue, [], 'OR')).toBe(true);
    expect(P.matchesLabels(baseIssue, [], 'AND')).toBe(true);
  });
});

describe('author predicate', () => {
  it('matches login', () => {
    expect(P.matchesAuthor(baseIssue, 'alice')).toBe(true);
    expect(P.matchesAuthor(baseIssue, 'bob')).toBe(false);
  });
  it('null author always matches', () => {
    expect(P.matchesAuthor(baseIssue, null)).toBe(true);
  });
});

describe('assignee predicate', () => {
  it('any matches all', () => {
    expect(P.matchesAssignee(baseIssue, 'any')).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, 'any')).toBe(true);
  });
  it('none matches only unassigned', () => {
    expect(P.matchesAssignee(baseIssue, 'none')).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, 'none')).toBe(false);
  });
  it('login matches specific assignee', () => {
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['x'] }, { login: 'x' })).toBe(true);
    expect(P.matchesAssignee({ ...baseIssue, assignees: ['y'] }, { login: 'x' })).toBe(false);
  });
});

describe('numeric/flag predicates', () => {
  it('noComments', () => {
    expect(P.passesNoComments(baseIssue, true)).toBe(true);
    expect(P.passesNoComments({ ...baseIssue, commentCount: 1 }, true)).toBe(false);
    expect(P.passesNoComments({ ...baseIssue, commentCount: 5 }, false)).toBe(true);
  });
  it('noLinkedPR', () => {
    expect(P.passesNoLinkedPR(baseIssue, true)).toBe(true);
    expect(P.passesNoLinkedPR({ ...baseIssue, linkedPRs: [{ number: 9, state: 'OPEN' }] }, true)).toBe(false);
  });
  it('noAssignee', () => {
    expect(P.passesNoAssignee(baseIssue, true)).toBe(true);
    expect(P.passesNoAssignee({ ...baseIssue, assignees: ['x'] }, true)).toBe(false);
  });
});

describe('closedPRMode predicate', () => {
  const withClosed: Issue = { ...baseIssue, linkedPRs: [{ number: 9, state: 'CLOSED' }] };
  const withMerged: Issue = { ...baseIssue, linkedPRs: [{ number: 9, state: 'MERGED' }] };
  it('include lets all through', () => {
    expect(P.passesClosedPRMode(baseIssue, 'include')).toBe(true);
    expect(P.passesClosedPRMode(withClosed, 'include')).toBe(true);
  });
  it('exclude rejects issues with any CLOSED linked PR', () => {
    expect(P.passesClosedPRMode(withClosed, 'exclude')).toBe(false);
    expect(P.passesClosedPRMode(withMerged, 'exclude')).toBe(true);
    expect(P.passesClosedPRMode(baseIssue, 'exclude')).toBe(true);
  });
  it('only keeps only issues with CLOSED linked PR', () => {
    expect(P.passesClosedPRMode(withClosed, 'only')).toBe(true);
    expect(P.passesClosedPRMode(baseIssue, 'only')).toBe(false);
    expect(P.passesClosedPRMode(withMerged, 'only')).toBe(false);
  });
});

describe('reporterActiveWithinDays predicate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('null disables filter', () => {
    expect(P.passesReporterActive(baseIssue, null)).toBe(true);
  });
  it('returns true when last activity within window', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: '2026-05-08T00:00:00Z' };
    expect(P.passesReporterActive(i, 7)).toBe(true);
  });
  it('returns false when last activity outside window', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: '2026-04-01T00:00:00Z' };
    expect(P.passesReporterActive(i, 7)).toBe(false);
  });
  it('returns false when null lastReporterActivityAt and filter set', () => {
    const i: Issue = { ...baseIssue, lastReporterActivityAt: null };
    expect(P.passesReporterActive(i, 7)).toBe(false);
  });
});

describe('ageDays predicate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('null bounds disable filter', () => {
    expect(P.passesAgeDays(baseIssue, { min: null, max: null })).toBe(true);
  });
  it('min only', () => {
    // baseIssue is 30 days old
    expect(P.passesAgeDays(baseIssue, { min: 10, max: null })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: 60, max: null })).toBe(false);
  });
  it('max only', () => {
    expect(P.passesAgeDays(baseIssue, { min: null, max: 60 })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: null, max: 10 })).toBe(false);
  });
  it('both bounds', () => {
    expect(P.passesAgeDays(baseIssue, { min: 10, max: 60 })).toBe(true);
    expect(P.passesAgeDays(baseIssue, { min: 40, max: 60 })).toBe(false);
  });
});

describe('requireReproSteps predicate', () => {
  it('null = either', () => {
    expect(P.passesReproSteps(baseIssue, null)).toBe(true);
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, null)).toBe(true);
  });
  it('true requires repro', () => {
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, true)).toBe(true);
    expect(P.passesReproSteps(baseIssue, true)).toBe(false);
  });
  it('false forbids repro', () => {
    expect(P.passesReproSteps(baseIssue, false)).toBe(true);
    expect(P.passesReproSteps({ ...baseIssue, hasReproSteps: true }, false)).toBe(false);
  });
});

describe('createdRange / updatedRange predicates', () => {
  it('null bounds disable', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: null, max: null })).toBe(true);
  });
  it('min only', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: '2026-04-01', max: null })).toBe(true);
    expect(P.inDateRange('2026-03-10T00:00:00Z', { min: '2026-04-01', max: null })).toBe(false);
  });
  it('max only', () => {
    expect(P.inDateRange('2026-04-10T00:00:00Z', { min: null, max: '2026-05-01' })).toBe(true);
    expect(P.inDateRange('2026-06-10T00:00:00Z', { min: null, max: '2026-05-01' })).toBe(false);
  });
});

describe('annotation predicate', () => {
  const ann = (status: Annotation['status']): Annotation => ({
    repoKey: 'o/r',
    issueNumber: 1,
    status,
    notes: '',
    updatedAt: '2026-05-10T00:00:00Z',
  });

  it('any matches', () => {
    expect(P.passesAnnotation(undefined, 'any')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'any')).toBe(true);
  });
  it('untriaged: no annotation or null status', () => {
    expect(P.passesAnnotation(undefined, 'untriaged')).toBe(true);
    expect(P.passesAnnotation(ann(null), 'untriaged')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'untriaged')).toBe(false);
  });
  it('interested: only interested', () => {
    expect(P.passesAnnotation(ann('interested'), 'interested')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'interested')).toBe(false);
    expect(P.passesAnnotation(undefined, 'interested')).toBe(false);
  });
  it('hide-skipped: everything except skipped', () => {
    expect(P.passesAnnotation(undefined, 'hide-skipped')).toBe(true);
    expect(P.passesAnnotation(ann('interested'), 'hide-skipped')).toBe(true);
    expect(P.passesAnnotation(ann('skipped'), 'hide-skipped')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- predicates`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement predicates**

```ts
// src/state/filters/predicates.ts
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
```

- [ ] **Step 4: Run tests, verify all pass**

Run: `npm test -- predicates`
Expected: PASS, ~30 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/filters/predicates.ts src/state/filters/predicates.test.ts
git commit -m "feat(filters): pure predicates for all filter dimensions"
```

---

## Task 6: Filter pipeline + sort

**Files:**
- Create: `src/state/filters/sort.ts`, `src/state/filters/sort.test.ts`, `src/state/filters/pipeline.ts`, `src/state/filters/pipeline.test.ts`

- [ ] **Step 1: Write failing test for sort**

```ts
// src/state/filters/sort.test.ts
import { describe, it, expect } from 'vitest';
import type { Issue } from '../types';
import { sortIssues } from './sort';

const mk = (n: number, p: Partial<Issue> = {}): Issue => ({
  number: n,
  title: `t${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: '',
  ...p,
});

describe('sortIssues', () => {
  const issues: Issue[] = [
    mk(1, { createdAt: '2026-01-01T00:00:00Z', commentCount: 5, updatedAt: '2026-03-01T00:00:00Z' }),
    mk(2, { createdAt: '2026-02-01T00:00:00Z', commentCount: 1, updatedAt: '2026-04-01T00:00:00Z' }),
    mk(3, { createdAt: '2026-03-01T00:00:00Z', commentCount: 0, updatedAt: '2026-02-01T00:00:00Z' }),
  ];

  it('newest first', () => {
    expect(sortIssues(issues, 'newest').map((i) => i.number)).toEqual([3, 2, 1]);
  });
  it('oldest first', () => {
    expect(sortIssues(issues, 'oldest').map((i) => i.number)).toEqual([1, 2, 3]);
  });
  it('most-commented first', () => {
    expect(sortIssues(issues, 'most-commented').map((i) => i.number)).toEqual([1, 2, 3]);
  });
  it('least-commented first', () => {
    expect(sortIssues(issues, 'least-commented').map((i) => i.number)).toEqual([3, 2, 1]);
  });
  it('recently-updated first', () => {
    expect(sortIssues(issues, 'recently-updated').map((i) => i.number)).toEqual([2, 1, 3]);
  });
  it('returns a new array', () => {
    const sorted = sortIssues(issues, 'newest');
    expect(sorted).not.toBe(issues);
  });
});
```

- [ ] **Step 2: Implement sort**

```ts
// src/state/filters/sort.ts
import type { Issue, SortKey } from '../types';

export function sortIssues(issues: Issue[], key: SortKey): Issue[] {
  const copy = [...issues];
  switch (key) {
    case 'newest':
      return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case 'oldest':
      return copy.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    case 'most-commented':
      return copy.sort((a, b) => b.commentCount - a.commentCount);
    case 'least-commented':
      return copy.sort((a, b) => a.commentCount - b.commentCount);
    case 'recently-updated':
      return copy.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
}
```

- [ ] **Step 3: Write failing test for pipeline**

```ts
// src/state/filters/pipeline.test.ts
import { describe, it, expect } from 'vitest';
import type { Issue, FilterState, Annotation, RepoKey } from '../types';
import { defaultFilterState } from '../types';
import { applyFilters, computeFilterCounts } from './pipeline';

const mkIssue = (n: number, p: Partial<Issue> = {}): Issue => ({
  number: n,
  title: `Issue ${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: [],
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: '2026-04-10T00:00:00Z',
  hasReproSteps: false,
  url: '',
  ...p,
});

const repoKey: RepoKey = 'o/r';

describe('applyFilters', () => {
  it('returns all issues with default filters (sorted newest)', () => {
    const issues = [mkIssue(1), mkIssue(2), mkIssue(3)];
    const result = applyFilters(issues, defaultFilterState, new Map());
    expect(result).toHaveLength(3);
  });

  it('AND-combines filters', () => {
    const issues = [
      mkIssue(1, { commentCount: 0, linkedPRs: [] }),
      mkIssue(2, { commentCount: 5, linkedPRs: [] }),
      mkIssue(3, { commentCount: 0, linkedPRs: [{ number: 9, state: 'OPEN' }] }),
      mkIssue(4, { commentCount: 5, linkedPRs: [{ number: 9, state: 'OPEN' }] }),
    ];
    const state: FilterState = { ...defaultFilterState, noComments: true, noLinkedPR: true };
    const result = applyFilters(issues, state, new Map());
    expect(result.map((i) => i.number)).toEqual([1]);
  });

  it('uses annotation map keyed by issueNumber', () => {
    const issues = [mkIssue(1), mkIssue(2)];
    const ann: Annotation = {
      repoKey,
      issueNumber: 1,
      status: 'skipped',
      notes: '',
      updatedAt: '2026-05-01T00:00:00Z',
    };
    const annMap = new Map<number, Annotation>([[1, ann]]);
    const state: FilterState = { ...defaultFilterState, annotation: 'hide-skipped' };
    const result = applyFilters(issues, state, annMap);
    expect(result.map((i) => i.number)).toEqual([2]);
  });
});

describe('computeFilterCounts', () => {
  it('returns count if each filter were toggled on', () => {
    const issues = [
      mkIssue(1, { commentCount: 0 }),
      mkIssue(2, { commentCount: 5 }),
      mkIssue(3, { commentCount: 0, assignees: ['x'] }),
    ];
    const state = defaultFilterState;
    const counts = computeFilterCounts(issues, state, new Map());
    expect(counts.noComments).toBe(2);
    expect(counts.noAssignee).toBe(2);
    expect(counts.total).toBe(3);
  });
});
```

- [ ] **Step 4: Implement pipeline**

```ts
// src/state/filters/pipeline.ts
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

function passesAll(
  issue: Issue,
  state: FilterState,
  ann: Annotation | undefined,
): boolean {
  return (
    P.matchesText(issue, state.text) &&
    P.matchesLabels(issue, state.labels, state.labelMode) &&
    P.matchesAuthor(issue, state.author) &&
    P.matchesAssignee(issue, state.assignee) &&
    P.passesNoComments(issue, state.noComments) &&
    P.passesNoLinkedPR(issue, state.noLinkedPR) &&
    P.passesNoAssignee(issue, state.noAssignee) &&
    P.passesClosedPRMode(issue, state.closedPRMode) &&
    P.passesReporterActive(issue, state.reporterActiveWithinDays) &&
    P.passesAgeDays(issue, state.ageDays) &&
    P.passesReproSteps(issue, state.requireReproSteps) &&
    P.inDateRange(issue.createdAt, state.createdRange) &&
    P.inDateRange(issue.updatedAt, state.updatedRange) &&
    P.passesAnnotation(ann, state.annotation)
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- filters/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state/filters/
git commit -m "feat(filters): pipeline AND-combines predicates and sorts"
```

---

## Task 7: Heuristic — `hasReproSteps`

**Files:**
- Create: `src/state/heuristics/reproSteps.ts`, `src/state/heuristics/reproSteps.test.ts`, `src/test/fixtures/repro-corpus.ts`

- [ ] **Step 1: Write the fixture corpus**

```ts
// src/test/fixtures/repro-corpus.ts
export const POSITIVE = [
  // Explicit phrase
  'Steps to reproduce:\n1. Open MTA\n2. Click X',
  'Reproduction steps: open the editor and click foo',
  'To reproduce, do the following...',
  'repro steps: load resource then call dgsCreateLabel',
  // Fenced code block (>2 lines)
  'Some bug.\n```lua\nfunction foo()\n  return 1\nend\n```',
  // Stack trace shape
  'Crashes here:\n  at Object.<anonymous> (foo.js:10:5)\n  at Module._compile',
  'Traceback (most recent call last):\n  File "x.py", line 5',
  // C++ crash address
  'Crash dump:\n0x00007ff8 some_function+0x40\n0x00007ff9 caller+0x12',
];

export const NEGATIVE = [
  '',
  'This is a feature request, no steps needed.',
  'I think this is broken but cannot reproduce.',
  'Some inline `code` mention.',
  '```\nshort\n```', // single-line fenced block
  'See attached image.',
];
```

- [ ] **Step 2: Write failing tests**

```ts
// src/state/heuristics/reproSteps.test.ts
import { describe, it, expect } from 'vitest';
import { hasReproSteps } from './reproSteps';
import { POSITIVE, NEGATIVE } from '../../test/fixtures/repro-corpus';

describe('hasReproSteps', () => {
  it.each(POSITIVE)('positive case detects: %s', (body) => {
    expect(hasReproSteps(body)).toBe(true);
  });

  it.each(NEGATIVE)('negative case rejects: %s', (body) => {
    expect(hasReproSteps(body)).toBe(false);
  });
});
```

- [ ] **Step 3: Run, expect fails**

Run: `npm test -- reproSteps`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement**

```ts
// src/state/heuristics/reproSteps.ts
const PHRASE_RE = /\b(steps?\s+to\s+reproduce|reproduction\s+steps|to\s+reproduce|repro\s+steps)\b/i;
const STACK_TRACE_RE = /(^|\n)\s+at\s+\w[\w<>$.]*\s*\(/;
const PYTHON_TRACE_RE = /Traceback\s+\(most\s+recent\s+call\s+last\)/i;
const CRASH_ADDR_RE = /(^|\n)0x[0-9a-fA-F]{8,}\s+\w/;

export function hasReproSteps(body: string): boolean {
  if (!body) return false;
  if (PHRASE_RE.test(body)) return true;
  if (STACK_TRACE_RE.test(body)) return true;
  if (PYTHON_TRACE_RE.test(body)) return true;
  if (CRASH_ADDR_RE.test(body)) return true;
  if (hasMultiLineCodeBlock(body)) return true;
  return false;
}

function hasMultiLineCodeBlock(body: string): boolean {
  const re = /```[^\n]*\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const inner = match[1] ?? '';
    const lineCount = inner.split('\n').filter((l) => l.trim().length > 0).length;
    if (lineCount > 2) return true;
  }
  return false;
}
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- reproSteps`
Expected: PASS, ~14 tests.

- [ ] **Step 6: Commit**

```bash
git add src/state/heuristics/reproSteps.ts src/state/heuristics/reproSteps.test.ts src/test/fixtures/repro-corpus.ts
git commit -m "feat(heuristics): hasReproSteps detects phrases, stack traces, code blocks"
```

---

## Task 8: Heuristic — `linkedPRs` derivation

**Files:**
- Create: `src/state/heuristics/linkedPRs.ts`, `src/state/heuristics/linkedPRs.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/state/heuristics/linkedPRs.test.ts
import { describe, it, expect } from 'vitest';
import { deriveLinkedPRs, deriveLastReporterActivity } from './linkedPRs';
import type { TimelineItem } from '../../data/github/types';

describe('deriveLinkedPRs', () => {
  it('returns empty for no timeline items', () => {
    expect(deriveLinkedPRs([], 'o/r')).toEqual([]);
  });

  it('extracts cross-references where source is a PR in the same repo', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'OPEN',
          repository: { nameWithOwner: 'o/r' },
        },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([{ number: 42, state: 'OPEN' }]);
  });

  it('ignores cross-references to issues', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: { __typename: 'Issue', number: 99 },
      } as TimelineItem,
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([]);
  });

  it('ignores cross-references to PRs in other repos', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: {
          __typename: 'PullRequest',
          number: 42,
          state: 'OPEN',
          repository: { nameWithOwner: 'other/repo' },
        },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([]);
  });

  it('dedupes by PR number, keeping the latest seen state', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'CrossReferencedEvent',
        source: { __typename: 'PullRequest', number: 42, state: 'OPEN', repository: { nameWithOwner: 'o/r' } },
      },
      {
        __typename: 'CrossReferencedEvent',
        source: { __typename: 'PullRequest', number: 42, state: 'CLOSED', repository: { nameWithOwner: 'o/r' } },
      },
    ];
    expect(deriveLinkedPRs(items, 'o/r')).toEqual([{ number: 42, state: 'CLOSED' }]);
  });
});

describe('deriveLastReporterActivity', () => {
  it('returns issue createdAt if no comments by reporter', () => {
    expect(deriveLastReporterActivity([], 'alice', '2026-04-10T00:00:00Z')).toBe('2026-04-10T00:00:00Z');
  });

  it('returns max of createdAt and reporter comments', () => {
    const items: TimelineItem[] = [
      {
        __typename: 'IssueComment',
        author: { login: 'alice' },
        createdAt: '2026-04-15T00:00:00Z',
      },
      {
        __typename: 'IssueComment',
        author: { login: 'bob' },
        createdAt: '2026-04-20T00:00:00Z',
      },
    ];
    expect(deriveLastReporterActivity(items, 'alice', '2026-04-10T00:00:00Z')).toBe('2026-04-15T00:00:00Z');
  });

  it('returns null if reporter is null', () => {
    expect(deriveLastReporterActivity([], null, '2026-04-10T00:00:00Z')).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests, expect they fail**

Run: `npm test -- linkedPRs`
Expected: FAIL — modules missing.

- [ ] **Step 3: Add `TimelineItem` type to data layer**

```ts
// src/data/github/types.ts
export type GraphQLPRState = 'OPEN' | 'CLOSED' | 'MERGED';
export type GraphQLIssueState = 'OPEN' | 'CLOSED';

export type CrossReferencedEvent = {
  __typename: 'CrossReferencedEvent';
  source:
    | {
        __typename: 'PullRequest';
        number: number;
        state: GraphQLPRState;
        repository: { nameWithOwner: string };
      }
    | {
        __typename: 'Issue';
        number: number;
      };
};

export type IssueComment = {
  __typename: 'IssueComment';
  author: { login: string } | null;
  createdAt: string;
};

export type TimelineItem = CrossReferencedEvent | IssueComment;

export type RawIssue = {
  number: number;
  title: string;
  body: string;
  state: GraphQLIssueState;
  author: { login: string } | null;
  assignees: { nodes: { login: string }[] };
  labels: { nodes: { name: string }[] };
  createdAt: string;
  updatedAt: string;
  comments: { totalCount: number };
  timelineItems: { nodes: TimelineItem[] };
  url: string;
};

export type RateLimitInfo = {
  remaining: number;
  resetAt: string;
  cost: number;
};

export type IssuePage = {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RawIssue[];
    };
  };
  rateLimit: RateLimitInfo;
};
```

- [ ] **Step 4: Implement heuristics**

```ts
// src/state/heuristics/linkedPRs.ts
import type { TimelineItem } from '../../data/github/types';
import type { LinkedPR } from '../types';

export function deriveLinkedPRs(items: TimelineItem[], repoNameWithOwner: string): LinkedPR[] {
  const byNumber = new Map<number, LinkedPR>();
  for (const item of items) {
    if (item.__typename !== 'CrossReferencedEvent') continue;
    const src = item.source;
    if (src.__typename !== 'PullRequest') continue;
    if (src.repository.nameWithOwner !== repoNameWithOwner) continue;
    byNumber.set(src.number, { number: src.number, state: src.state });
  }
  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}

export function deriveLastReporterActivity(
  items: TimelineItem[],
  reporterLogin: string | null,
  issueCreatedAt: string,
): string | null {
  if (reporterLogin == null) return null;
  let latest = issueCreatedAt;
  for (const item of items) {
    if (item.__typename !== 'IssueComment') continue;
    if (item.author?.login !== reporterLogin) continue;
    if (Date.parse(item.createdAt) > Date.parse(latest)) {
      latest = item.createdAt;
    }
  }
  return latest;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- linkedPRs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/github/types.ts src/state/heuristics/linkedPRs.ts src/state/heuristics/linkedPRs.test.ts
git commit -m "feat(heuristics): derive linkedPRs and lastReporterActivityAt from timeline events"
```

---

## Task 9: GraphQL queries

**Files:**
- Create: `src/data/github/queries.ts`

- [ ] **Step 1: Write the queries**

```ts
// src/data/github/queries.ts
export const VIEWER_QUERY = `
  query Viewer {
    viewer { login }
  }
`;

export const ISSUES_PAGE_QUERY = `
  query IssuesPage($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          body
          state
          author { login }
          assignees(first: 10) { nodes { login } }
          labels(first: 20) { nodes { name } }
          createdAt
          updatedAt
          comments { totalCount }
          timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT, ISSUE_COMMENT]) {
            nodes {
              __typename
              ... on CrossReferencedEvent {
                source {
                  __typename
                  ... on PullRequest {
                    number
                    state
                    repository { nameWithOwner }
                  }
                  ... on Issue {
                    number
                  }
                }
              }
              ... on IssueComment {
                author { login }
                createdAt
              }
            }
          }
          url
        }
      }
    }
    rateLimit { remaining resetAt cost }
  }
`;
```

- [ ] **Step 2: No tests for query strings (validated indirectly via mapper tests)**

- [ ] **Step 3: Commit**

```bash
git add src/data/github/queries.ts
git commit -m "feat(github): add viewer and paginated issues GraphQL queries"
```

---

## Task 10: Issue mapper

**Files:**
- Create: `src/data/github/mapper.ts`, `src/data/github/mapper.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/data/github/mapper.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapRawIssue } from './mapper';
import type { RawIssue } from './types';

const baseRaw: RawIssue = {
  number: 100,
  title: 'Bug: foo',
  body: 'long body '.repeat(200),
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: { nodes: [] },
  labels: { nodes: [{ name: 'bug' }, { name: 'client' }] },
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  comments: { totalCount: 3 },
  timelineItems: { nodes: [] },
  url: 'https://github.com/o/r/issues/100',
};

describe('mapRawIssue', () => {
  it('maps basic fields', () => {
    const i = mapRawIssue(baseRaw, 'o/r');
    expect(i.number).toBe(100);
    expect(i.title).toBe('Bug: foo');
    expect(i.state).toBe('OPEN');
    expect(i.author).toEqual({ login: 'alice' });
    expect(i.labels).toEqual(['bug', 'client']);
    expect(i.commentCount).toBe(3);
    expect(i.url).toBe('https://github.com/o/r/issues/100');
  });

  it('truncates bodyPreview to 1000 chars', () => {
    const i = mapRawIssue(baseRaw, 'o/r');
    expect(i.bodyPreview.length).toBeLessThanOrEqual(1000);
  });

  it('flattens assignee logins', () => {
    const raw = { ...baseRaw, assignees: { nodes: [{ login: 'x' }, { login: 'y' }] } };
    expect(mapRawIssue(raw, 'o/r').assignees).toEqual(['x', 'y']);
  });

  it('derives linkedPRs from timeline cross-references', () => {
    const raw: RawIssue = {
      ...baseRaw,
      timelineItems: {
        nodes: [
          {
            __typename: 'CrossReferencedEvent',
            source: { __typename: 'PullRequest', number: 7, state: 'OPEN', repository: { nameWithOwner: 'o/r' } },
          },
        ],
      },
    };
    expect(mapRawIssue(raw, 'o/r').linkedPRs).toEqual([{ number: 7, state: 'OPEN' }]);
  });

  it('handles null author', () => {
    expect(mapRawIssue({ ...baseRaw, author: null }, 'o/r').author).toBeNull();
    expect(mapRawIssue({ ...baseRaw, author: null }, 'o/r').lastReporterActivityAt).toBeNull();
  });

  it('sets hasReproSteps from body content', () => {
    const raw = { ...baseRaw, body: 'Steps to reproduce:\n1. open\n2. crash' };
    expect(mapRawIssue(raw, 'o/r').hasReproSteps).toBe(true);
  });
});
```

- [ ] **Step 2: Run, fails**

Run: `npm test -- mapper`
Expected: FAIL.

- [ ] **Step 3: Implement mapper**

```ts
// src/data/github/mapper.ts
import type { Issue } from '../../state/types';
import type { RawIssue } from './types';
import { hasReproSteps } from '../../state/heuristics/reproSteps';
import {
  deriveLinkedPRs,
  deriveLastReporterActivity,
} from '../../state/heuristics/linkedPRs';

export function mapRawIssue(raw: RawIssue, repoNameWithOwner: string): Issue {
  const bodyPreview = (raw.body ?? '').slice(0, 1000);
  const reporterLogin = raw.author?.login ?? null;
  const timeline = raw.timelineItems.nodes;
  return {
    number: raw.number,
    title: raw.title,
    bodyPreview,
    state: raw.state,
    author: raw.author,
    assignees: raw.assignees.nodes.map((n) => n.login),
    labels: raw.labels.nodes.map((n) => n.name),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    commentCount: raw.comments.totalCount,
    linkedPRs: deriveLinkedPRs(timeline, repoNameWithOwner),
    lastReporterActivityAt: deriveLastReporterActivity(timeline, reporterLogin, raw.createdAt),
    hasReproSteps: hasReproSteps(bodyPreview),
    url: raw.url,
  };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- mapper`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/github/mapper.ts src/data/github/mapper.test.ts
git commit -m "feat(github): map raw GraphQL issue to internal Issue with derived fields"
```

---

## Task 11: GraphQL client + paginated fetcher

**Files:**
- Create: `src/data/github/client.ts`, `src/data/github/fetcher.ts`, `src/data/github/fetcher.test.ts`

- [ ] **Step 1: Implement client**

```ts
// src/data/github/client.ts
import { GraphQLClient } from 'graphql-request';
import { VIEWER_QUERY } from './queries';

export const ENDPOINT = 'https://api.github.com/graphql';

export function makeClient(token: string): GraphQLClient {
  return new GraphQLClient(ENDPOINT, {
    headers: { authorization: `bearer ${token}` },
  });
}

export class AuthError extends Error {
  constructor() {
    super('Bad token');
  }
}

export async function validateToken(token: string): Promise<{ login: string }> {
  try {
    const data = await makeClient(token).request<{ viewer: { login: string } }>(VIEWER_QUERY);
    return data.viewer;
  } catch (e) {
    throw new AuthError();
  }
}
```

- [ ] **Step 2: Write failing test for fetcher (with mocked client)**

```ts
// src/data/github/fetcher.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchAllIssues } from './fetcher';
import type { IssuePage, RawIssue } from './types';

const mkRaw = (n: number): RawIssue => ({
  number: n,
  title: `t${n}`,
  body: '',
  state: 'OPEN',
  author: { login: 'a' },
  assignees: { nodes: [] },
  labels: { nodes: [] },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  comments: { totalCount: 0 },
  timelineItems: { nodes: [] },
  url: '',
});

describe('fetchAllIssues', () => {
  it('paginates until hasNextPage is false', async () => {
    const pages: IssuePage[] = [
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
            nodes: [mkRaw(1), mkRaw(2)],
          },
        },
        rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: false, endCursor: 'cursor2' },
            nodes: [mkRaw(3)],
          },
        },
        rateLimit: { remaining: 4980, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
    ];

    const request = vi.fn().mockResolvedValueOnce(pages[0]).mockResolvedValueOnce(pages[1]);
    const onProgress = vi.fn();
    const result = await fetchAllIssues({ request } as never, 'o', 'r', onProgress);

    expect(result.issues.map((i) => i.number)).toEqual([1, 2, 3]);
    expect(result.rateLimit?.remaining).toBe(4980);
    expect(request).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalled();
  });

  it('stops if estimated cost exceeds remaining', async () => {
    const pages: IssuePage[] = [
      {
        repository: {
          issues: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
            nodes: [mkRaw(1)],
          },
        },
        rateLimit: { remaining: 5, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      },
    ];
    const request = vi.fn().mockResolvedValueOnce(pages[0]);
    const result = await fetchAllIssues({ request } as never, 'o', 'r', () => {});
    expect(result.partial).toBe(true);
    expect(result.issues).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run, fails**

Run: `npm test -- fetcher`
Expected: FAIL.

- [ ] **Step 4: Implement fetcher**

```ts
// src/data/github/fetcher.ts
import type { GraphQLClient } from 'graphql-request';
import type { Issue, RateLimit } from '../../state/types';
import type { IssuePage } from './types';
import { ISSUES_PAGE_QUERY } from './queries';
import { mapRawIssue } from './mapper';

export type FetchProgress = { page: number; fetched: number };

export type FetchResult = {
  issues: Issue[];
  rateLimit: RateLimit | null;
  partial: boolean;
};

export async function fetchAllIssues(
  client: GraphQLClient,
  owner: string,
  repo: string,
  onProgress: (p: FetchProgress) => void,
): Promise<FetchResult> {
  const repoKey = `${owner}/${repo}`;
  const issues: Issue[] = [];
  let cursor: string | null = null;
  let page = 0;
  let rateLimit: RateLimit | null = null;
  let partial = false;

  while (true) {
    page += 1;
    const data = await client.request<IssuePage>(ISSUES_PAGE_QUERY, { owner, name: repo, cursor });
    rateLimit = data.rateLimit;
    for (const raw of data.repository.issues.nodes) {
      issues.push(mapRawIssue(raw, repoKey));
    }
    onProgress({ page, fetched: issues.length });

    const info = data.repository.issues.pageInfo;
    if (!info.hasNextPage) break;
    cursor = info.endCursor;

    if (rateLimit.remaining < rateLimit.cost) {
      partial = true;
      break;
    }
  }

  return { issues, rateLimit, partial };
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- fetcher`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/github/client.ts src/data/github/fetcher.ts src/data/github/fetcher.test.ts
git commit -m "feat(github): client + paginated fetcher with rate-limit awareness"
```

---

## Task 12: IndexedDB cache layer

**Files:**
- Create: `src/data/cache/db.ts`, `src/data/cache/issues.ts`, `src/data/cache/issues.test.ts`, `src/data/cache/annotations.ts`, `src/data/cache/annotations.test.ts`, `src/data/cache/localStorage.ts`

- [ ] **Step 1: Implement `db.ts`**

```ts
// src/data/cache/db.ts
import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'gh-issue-prospector';
export const DB_VERSION = 1;

export type RepoMeta = {
  repoKey: string;
  fetchedAt: string;
  partial: boolean;
};

export interface Schema {
  issues: {
    key: [string, number]; // [repoKey, number]
    value: import('../../state/types').Issue & { repoKey: string };
    indexes: { 'by-repo': string };
  };
  repoMeta: {
    key: string;
    value: RepoMeta;
  };
  annotations: {
    key: [string, number];
    value: import('../../state/types').Annotation;
    indexes: { 'by-repo': string };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

export function getDB(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const issues = db.createObjectStore('issues', { keyPath: ['repoKey', 'number'] });
        issues.createIndex('by-repo', 'repoKey');
        db.createObjectStore('repoMeta', { keyPath: 'repoKey' });
        const ann = db.createObjectStore('annotations', { keyPath: ['repoKey', 'issueNumber'] });
        ann.createIndex('by-repo', 'repoKey');
      },
    });
  }
  return dbPromise;
}

export function resetDB(): void {
  dbPromise = null;
}
```

- [ ] **Step 2: Write failing test for issues store**

```ts
// src/data/cache/issues.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveIssues, loadIssues, getRepoMeta } from './issues';
import type { Issue } from '../../state/types';
import { resetDB } from './db';
// fake-indexeddb is auto-mounted via test/setup.ts

const mk = (n: number): Issue => ({
  number: n,
  title: `t${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: '',
});

beforeEach(async () => {
  resetDB();
  // Reset fake-indexeddb between tests
  const dbs = await indexedDB.databases();
  for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
});

describe('issues store', () => {
  it('round-trips issues for a repo', async () => {
    await saveIssues('o/r', [mk(1), mk(2)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number).sort()).toEqual([1, 2]);
  });

  it('does not return issues from other repos', async () => {
    await saveIssues('o/r', [mk(1)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    await saveIssues('o2/r2', [mk(99)], { fetchedAt: '2026-05-10T00:00:00Z', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number)).toEqual([1]);
  });

  it('saveIssues replaces previous data for the repo', async () => {
    await saveIssues('o/r', [mk(1), mk(2), mk(3)], { fetchedAt: 't1', partial: false });
    await saveIssues('o/r', [mk(4)], { fetchedAt: 't2', partial: false });
    const back = await loadIssues('o/r');
    expect(back.map((i) => i.number)).toEqual([4]);
  });

  it('getRepoMeta returns last fetched info', async () => {
    await saveIssues('o/r', [mk(1)], { fetchedAt: '2026-05-10T00:00:00Z', partial: true });
    const meta = await getRepoMeta('o/r');
    expect(meta).toEqual({ repoKey: 'o/r', fetchedAt: '2026-05-10T00:00:00Z', partial: true });
  });

  it('getRepoMeta returns null for unknown repo', async () => {
    expect(await getRepoMeta('unknown/repo')).toBeNull();
  });
});
```

- [ ] **Step 3: Implement `issues.ts`**

```ts
// src/data/cache/issues.ts
import type { Issue } from '../../state/types';
import { getDB, type RepoMeta } from './db';

export async function saveIssues(
  repoKey: string,
  issues: Issue[],
  meta: { fetchedAt: string; partial: boolean },
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['issues', 'repoMeta'], 'readwrite');
  const store = tx.objectStore('issues');
  // Clear existing for this repo
  const existing = await store.index('by-repo').getAllKeys(repoKey);
  for (const key of existing) await store.delete(key);
  for (const issue of issues) {
    await store.put({ ...issue, repoKey });
  }
  await tx.objectStore('repoMeta').put({ repoKey, ...meta });
  await tx.done;
}

export async function loadIssues(repoKey: string): Promise<Issue[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('issues', 'by-repo', repoKey);
  return records.map(({ repoKey: _r, ...issue }) => issue as Issue);
}

export async function getRepoMeta(repoKey: string): Promise<RepoMeta | null> {
  const db = await getDB();
  const meta = await db.get('repoMeta', repoKey);
  return meta ?? null;
}
```

- [ ] **Step 4: Write failing test for annotations store**

```ts
// src/data/cache/annotations.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveAnnotation, loadAnnotations, deleteAnnotation } from './annotations';
import type { Annotation } from '../../state/types';
import { resetDB } from './db';

const ann = (n: number, status: Annotation['status'] = 'interested', notes = ''): Annotation => ({
  repoKey: 'o/r',
  issueNumber: n,
  status,
  notes,
  updatedAt: '2026-05-10T00:00:00Z',
});

beforeEach(async () => {
  resetDB();
  const dbs = await indexedDB.databases();
  for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
});

describe('annotations store', () => {
  it('round-trips an annotation', async () => {
    await saveAnnotation(ann(1, 'interested', 'looks promising'));
    const all = await loadAnnotations('o/r');
    expect(all.size).toBe(1);
    expect(all.get(1)?.status).toBe('interested');
    expect(all.get(1)?.notes).toBe('looks promising');
  });

  it('saveAnnotation overwrites existing', async () => {
    await saveAnnotation(ann(1, 'interested'));
    await saveAnnotation(ann(1, 'skipped'));
    const all = await loadAnnotations('o/r');
    expect(all.get(1)?.status).toBe('skipped');
  });

  it('loadAnnotations is per-repo', async () => {
    await saveAnnotation(ann(1, 'interested'));
    await saveAnnotation({ ...ann(99, 'skipped'), repoKey: 'other/repo' });
    const local = await loadAnnotations('o/r');
    expect(local.size).toBe(1);
    expect(local.has(1)).toBe(true);
    expect(local.has(99)).toBe(false);
  });

  it('deleteAnnotation removes it', async () => {
    await saveAnnotation(ann(1));
    await deleteAnnotation('o/r', 1);
    const all = await loadAnnotations('o/r');
    expect(all.size).toBe(0);
  });
});
```

- [ ] **Step 5: Implement `annotations.ts`**

```ts
// src/data/cache/annotations.ts
import type { Annotation } from '../../state/types';
import { getDB } from './db';

export async function saveAnnotation(ann: Annotation): Promise<void> {
  const db = await getDB();
  await db.put('annotations', ann);
}

export async function loadAnnotations(repoKey: string): Promise<Map<number, Annotation>> {
  const db = await getDB();
  const records = await db.getAllFromIndex('annotations', 'by-repo', repoKey);
  return new Map(records.map((a) => [a.issueNumber, a]));
}

export async function deleteAnnotation(repoKey: string, issueNumber: number): Promise<void> {
  const db = await getDB();
  await db.delete('annotations', [repoKey, issueNumber]);
}
```

- [ ] **Step 6: Implement `localStorage.ts`**

```ts
// src/data/cache/localStorage.ts
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
```

- [ ] **Step 7: Run all cache tests**

Run: `npm test -- cache/`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data/cache/
git commit -m "feat(cache): IndexedDB stores for issues + annotations, localStorage for prefs"
```

---

## Task 13: Built-in filter presets

**Files:**
- Create: `src/state/presets.ts`, `src/state/presets.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/state/presets.test.ts
import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, applyPreset } from './presets';
import { defaultFilterState } from './types';

describe('presets', () => {
  it('Pristine unclaimed sets noComments + noLinkedPR + noAssignee', () => {
    const p = BUILT_IN_PRESETS.find((p) => p.name === 'Pristine unclaimed')!;
    expect(p.filters.noComments).toBe(true);
    expect(p.filters.noLinkedPR).toBe(true);
    expect(p.filters.noAssignee).toBe(true);
  });

  it('applyPreset overrides only specified fields', () => {
    const next = applyPreset(defaultFilterState, BUILT_IN_PRESETS[0]);
    expect(next.noComments).toBe(true);
    expect(next.text).toBe(defaultFilterState.text);
  });

  it('Likely abandoned trap sets closedPRMode = only', () => {
    const p = BUILT_IN_PRESETS.find((p) => p.name === 'Likely abandoned trap')!;
    expect(p.filters.closedPRMode).toBe('only');
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/state/presets.ts
import type { FilterPreset, FilterState } from './types';

export const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    name: 'Pristine unclaimed',
    builtIn: true,
    filters: { noComments: true, noLinkedPR: true, noAssignee: true },
  },
  {
    name: 'Active discussion',
    builtIn: true,
    filters: { reporterActiveWithinDays: 30 },
  },
  {
    name: 'Likely abandoned trap',
    builtIn: true,
    filters: { closedPRMode: 'only' },
  },
  {
    name: 'Good first look',
    builtIn: true,
    filters: { noAssignee: true, requireReproSteps: true, ageDays: { min: 30, max: 365 } },
  },
];

export function applyPreset(current: FilterState, preset: FilterPreset): FilterState {
  return { ...current, ...preset.filters };
}
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test -- presets`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/presets.ts src/state/presets.test.ts
git commit -m "feat(state): built-in filter presets and applyPreset"
```

---

## Task 14: `useAuth` hook

**Files:**
- Create: `src/state/hooks/useAuth.ts`, `src/state/hooks/useAuth.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/state/hooks/useAuth.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../../data/github/client', () => ({
  validateToken: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

import { validateToken } from '../../data/github/client';

beforeEach(() => {
  localStorage.clear();
  vi.mocked(validateToken).mockReset();
});

describe('useAuth', () => {
  it('starts unauthenticated when no token stored', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.login).toBeNull();
  });

  it('signIn validates and persists token', async () => {
    vi.mocked(validateToken).mockResolvedValue({ login: 'alice' });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn('ghp_xxx');
    });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.login).toBe('alice');
    expect(localStorage.getItem('ghip.token')).toBe('ghp_xxx');
  });

  it('signIn surfaces error on bad token', async () => {
    vi.mocked(validateToken).mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.signIn('bad');
      }),
    ).rejects.toThrow();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('signOut clears token', async () => {
    localStorage.setItem('ghip.token', 't');
    vi.mocked(validateToken).mockResolvedValue({ login: 'alice' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    act(() => result.current.signOut());
    expect(result.current.status).toBe('unauthenticated');
    expect(localStorage.getItem('ghip.token')).toBeNull();
  });
});
```

- [ ] **Step 2: Implement hook**

```ts
// src/state/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { validateToken } from '../../data/github/client';
import { getToken, setToken, clearToken } from '../../data/cache/localStorage';

export type AuthState =
  | { status: 'loading'; login: null }
  | { status: 'authenticated'; login: string }
  | { status: 'unauthenticated'; login: null };

export type UseAuth = AuthState & {
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  token: string | null;
};

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>(() =>
    getToken() ? { status: 'loading', login: null } : { status: 'unauthenticated', login: null },
  );
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    let cancelled = false;
    validateToken(t)
      .then(({ login }) => {
        if (!cancelled) setState({ status: 'authenticated', login });
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setTokenState(null);
          setState({ status: 'unauthenticated', login: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (newToken: string) => {
    const { login } = await validateToken(newToken);
    setToken(newToken);
    setTokenState(newToken);
    setState({ status: 'authenticated', login });
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setTokenState(null);
    setState({ status: 'unauthenticated', login: null });
  }, []);

  return { ...state, signIn, signOut, token };
}
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test -- useAuth`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/hooks/useAuth.ts src/state/hooks/useAuth.test.tsx
git commit -m "feat(hooks): useAuth with token validation, persistence, sign in/out"
```

---

## Task 15: `useRepoSync` hook

**Files:**
- Create: `src/state/hooks/useRepoSync.ts`, `src/state/hooks/useRepoSync.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/state/hooks/useRepoSync.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRepoSync } from './useRepoSync';
import type { Issue } from '../types';
import { resetDB } from '../../data/cache/db';

vi.mock('../../data/github/fetcher', () => ({
  fetchAllIssues: vi.fn(),
}));
vi.mock('../../data/github/client', () => ({
  makeClient: vi.fn(() => ({})),
}));

import { fetchAllIssues } from '../../data/github/fetcher';

const mk = (n: number): Issue => ({
  number: n,
  title: `t${n}`,
  bodyPreview: '',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: '',
});

beforeEach(async () => {
  resetDB();
  const dbs = await indexedDB.databases();
  for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
  vi.mocked(fetchAllIssues).mockReset();
});

describe('useRepoSync', () => {
  it('fetches issues when no cache exists', async () => {
    vi.mocked(fetchAllIssues).mockResolvedValue({
      issues: [mk(1), mk(2)],
      rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
      partial: false,
    });
    const { result } = renderHook(() => useRepoSync('token', { owner: 'o', repo: 'r' }));
    await waitFor(() => expect(result.current.issues).toHaveLength(2));
    expect(result.current.status).toBe('idle');
    expect(result.current.fetchedAt).not.toBeNull();
  });

  it('refresh re-fetches', async () => {
    vi.mocked(fetchAllIssues)
      .mockResolvedValueOnce({
        issues: [mk(1)],
        rateLimit: { remaining: 4990, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
        partial: false,
      })
      .mockResolvedValueOnce({
        issues: [mk(1), mk(2)],
        rateLimit: { remaining: 4980, resetAt: '2026-05-10T13:00:00Z', cost: 10 },
        partial: false,
      });
    const { result } = renderHook(() => useRepoSync('token', { owner: 'o', repo: 'r' }));
    await waitFor(() => expect(result.current.issues).toHaveLength(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.issues).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement hook**

```ts
// src/state/hooks/useRepoSync.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Issue, RateLimit } from '../types';
import { makeClient } from '../../data/github/client';
import { fetchAllIssues, type FetchProgress } from '../../data/github/fetcher';
import { saveIssues, loadIssues, getRepoMeta } from '../../data/cache/issues';

const TTL_MS = 60 * 60 * 1000;

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export type UseRepoSync = {
  issues: Issue[];
  status: SyncStatus;
  error: string | null;
  fetchedAt: string | null;
  partial: boolean;
  rateLimit: RateLimit | null;
  progress: FetchProgress | null;
  refresh: () => Promise<void>;
};

export function useRepoSync(
  token: string | null,
  ref: { owner: string; repo: string } | null,
): UseRepoSync {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);

  const fetchInFlight = useRef(false);

  const repoKey = ref ? `${ref.owner}/${ref.repo}` : null;

  const doFetch = useCallback(async () => {
    if (!token || !ref || !repoKey) return;
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    setStatus('syncing');
    setError(null);
    try {
      const client = makeClient(token);
      const result = await fetchAllIssues(client, ref.owner, ref.repo, setProgress);
      const now = new Date().toISOString();
      await saveIssues(repoKey, result.issues, { fetchedAt: now, partial: result.partial });
      setIssues(result.issues);
      setFetchedAt(now);
      setPartial(result.partial);
      setRateLimit(result.rateLimit);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    } finally {
      fetchInFlight.current = false;
      setProgress(null);
    }
  }, [token, ref, repoKey]);

  useEffect(() => {
    if (!repoKey || !token) {
      setIssues([]);
      setFetchedAt(null);
      setPartial(false);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const cached = await loadIssues(repoKey);
      const meta = await getRepoMeta(repoKey);
      if (cancelled) return;
      setIssues(cached);
      setFetchedAt(meta?.fetchedAt ?? null);
      setPartial(meta?.partial ?? false);
      setStatus('idle');
      const stale =
        !meta || Date.now() - Date.parse(meta.fetchedAt) > TTL_MS || cached.length === 0;
      if (stale) await doFetch();
    })();
    return () => {
      cancelled = true;
    };
  }, [repoKey, token, doFetch]);

  return { issues, status, error, fetchedAt, partial, rateLimit, progress, refresh: doFetch };
}
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test -- useRepoSync`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/hooks/useRepoSync.ts src/state/hooks/useRepoSync.test.tsx
git commit -m "feat(hooks): useRepoSync with cache + stale-while-revalidate + manual refresh"
```

---

## Task 16: `useFilterState` and `useAnnotations` hooks

**Files:**
- Create: `src/state/hooks/useFilterState.ts`, `src/state/hooks/useAnnotations.ts`, `src/state/hooks/useAnnotations.test.tsx`

- [ ] **Step 1: Implement `useFilterState`**

```ts
// src/state/hooks/useFilterState.ts
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
```

- [ ] **Step 2: Write failing test for `useAnnotations`**

```tsx
// src/state/hooks/useAnnotations.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnnotations } from './useAnnotations';
import { resetDB } from '../../data/cache/db';

beforeEach(async () => {
  resetDB();
  const dbs = await indexedDB.databases();
  for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
});

describe('useAnnotations', () => {
  it('starts empty for a repo with no annotations', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations.size).toBe(0));
  });

  it('setStatus persists and updates state', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations).toBeDefined());
    await act(async () => {
      await result.current.setStatus(42, 'interested');
    });
    expect(result.current.annotations.get(42)?.status).toBe('interested');
  });

  it('setNotes persists and updates state', async () => {
    const { result } = renderHook(() => useAnnotations('o/r'));
    await waitFor(() => expect(result.current.annotations).toBeDefined());
    await act(async () => {
      await result.current.setNotes(42, 'looks easy');
    });
    expect(result.current.annotations.get(42)?.notes).toBe('looks easy');
  });
});
```

- [ ] **Step 3: Implement `useAnnotations`**

```ts
// src/state/hooks/useAnnotations.ts
import { useCallback, useEffect, useState } from 'react';
import type { Annotation, AnnotationStatus, RepoKey } from '../types';
import { loadAnnotations, saveAnnotation } from '../../data/cache/annotations';

export type UseAnnotations = {
  annotations: Map<number, Annotation>;
  setStatus: (issueNumber: number, status: AnnotationStatus) => Promise<void>;
  setNotes: (issueNumber: number, notes: string) => Promise<void>;
};

export function useAnnotations(repoKey: string | null): UseAnnotations {
  const [annotations, setAnnotations] = useState<Map<number, Annotation>>(new Map());

  useEffect(() => {
    if (!repoKey) {
      setAnnotations(new Map());
      return;
    }
    let cancelled = false;
    loadAnnotations(repoKey).then((m) => {
      if (!cancelled) setAnnotations(m);
    });
    return () => {
      cancelled = true;
    };
  }, [repoKey]);

  const upsert = useCallback(
    async (issueNumber: number, patch: Partial<Annotation>) => {
      if (!repoKey) return;
      const existing = annotations.get(issueNumber);
      const next: Annotation = {
        repoKey: repoKey as RepoKey,
        issueNumber,
        status: existing?.status ?? null,
        notes: existing?.notes ?? '',
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await saveAnnotation(next);
      setAnnotations((m) => new Map(m).set(issueNumber, next));
    },
    [repoKey, annotations],
  );

  const setStatus = useCallback(
    (issueNumber: number, status: AnnotationStatus) => upsert(issueNumber, { status }),
    [upsert],
  );

  const setNotes = useCallback(
    (issueNumber: number, notes: string) => upsert(issueNumber, { notes }),
    [upsert],
  );

  return { annotations, setStatus, setNotes };
}
```

- [ ] **Step 4: Run all hook tests**

Run: `npm test -- hooks/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/hooks/useFilterState.ts src/state/hooks/useAnnotations.ts src/state/hooks/useAnnotations.test.tsx
git commit -m "feat(hooks): useFilterState (with localStorage), useAnnotations (with IndexedDB)"
```

---

## Task 17: `useFilteredIssues` hook

**Files:**
- Create: `src/state/hooks/useFilteredIssues.ts`

- [ ] **Step 1: Implement (no test — pure composition over tested pieces)**

```ts
// src/state/hooks/useFilteredIssues.ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/hooks/useFilteredIssues.ts
git commit -m "feat(hooks): useFilteredIssues memoizes filter pipeline output"
```

---

## Task 18: AuthModal component

**Files:**
- Create: `src/ui/AuthModal.tsx`, `src/ui/AuthModal.test.tsx`, `src/ui/styles.css`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/AuthModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';

describe('AuthModal', () => {
  it('shows the help link to mint a PAT', () => {
    render(<AuthModal onSubmit={vi.fn()} />);
    const link = screen.getByRole('link', { name: /create a personal access token/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com/settings/tokens'));
  });

  it('calls onSubmit with the entered token', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AuthModal onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/personal access token/i), 'ghp_xxx');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith('ghp_xxx');
  });

  it('shows error message on failed signIn', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('bad'));
    render(<AuthModal onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/personal access token/i), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/AuthModal.tsx
import { useState } from 'react';

const PAT_URL =
  'https://github.com/settings/tokens/new?description=gh-issue-prospector&scopes=public_repo';

export type AuthModalProps = {
  onSubmit: (token: string) => Promise<void>;
};

export function AuthModal({ onSubmit }: AuthModalProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(token.trim());
    } catch {
      setError('Invalid token. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="auth-title">
      <form className="modal" onSubmit={handleSubmit}>
        <h2 id="auth-title">Sign in</h2>
        <p>
          Paste a GitHub Personal Access Token. Only <code>public_repo</code> scope is required (use{' '}
          <code>repo</code> for private repos).{' '}
          <a href={PAT_URL} target="_blank" rel="noreferrer">
            Create a personal access token →
          </a>
        </p>
        <label>
          Personal Access Token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={busy}
            required
          />
        </label>
        {error && <div role="alert" className="error">{error}</div>}
        <button type="submit" disabled={busy || !token}>
          {busy ? 'Validating…' : 'Sign in'}
        </button>
        <p className="muted small">
          The token is stored in this browser only. Don't paste this app's URL into anything you
          don't trust.
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add minimal CSS**

```css
/* src/ui/styles.css */
:root {
  --bg: #ffffff;
  --fg: #1c1c1e;
  --muted: #6b7280;
  --border: #e5e7eb;
  --accent: #2563eb;
  --error: #dc2626;
  --bg-soft: #f9fafb;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--fg); background: var(--bg); }
.muted { color: var(--muted); }
.small { font-size: 12px; }
.error { color: var(--error); margin: 8px 0; }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: grid; place-items: center; z-index: 1000;
}
.modal {
  background: var(--bg); padding: 24px; border-radius: 8px;
  width: min(440px, 90vw); display: flex; flex-direction: column; gap: 12px;
}
.modal label { display: flex; flex-direction: column; gap: 4px; }
.modal input { padding: 8px; border: 1px solid var(--border); border-radius: 4px; }
button { padding: 8px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button[type=submit] { background: var(--accent); color: white; border-color: var(--accent); }
```

- [ ] **Step 4: Import CSS in `main.tsx`**

```tsx
// src/main.tsx — add import at top
import './ui/styles.css';
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- AuthModal`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/AuthModal.tsx src/ui/AuthModal.test.tsx src/ui/styles.css src/main.tsx
git commit -m "feat(ui): AuthModal for PAT entry with validation feedback"
```

---

## Task 19: RepoBar + parseRepoUrl integration

**Files:**
- Create: `src/ui/RepoBar.tsx`, `src/ui/RepoBar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/RepoBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoBar } from './RepoBar';

describe('RepoBar', () => {
  it('calls onChange with parsed owner/repo on submit', async () => {
    const onChange = vi.fn();
    render(<RepoBar value={null} onChange={onChange} onRefresh={vi.fn()} fetchedAt={null} loading={false} totalIssues={null} onOpenSettings={vi.fn()} />);
    const input = screen.getByPlaceholderText(/owner\/repo/i);
    await userEvent.type(input, 'multitheftauto/mtasa-blue');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith({ owner: 'multitheftauto', repo: 'mtasa-blue' });
  });

  it('shows inline error on invalid input', async () => {
    const onChange = vi.fn();
    render(<RepoBar value={null} onChange={onChange} onRefresh={vi.fn()} fetchedAt={null} loading={false} totalIssues={null} onOpenSettings={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/owner\/repo/i), 'garbage');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows fetchedAt and total when present', () => {
    render(<RepoBar value={{ owner: 'o', repo: 'r' }} onChange={vi.fn()} onRefresh={vi.fn()} fetchedAt={new Date(Date.now() - 4 * 60 * 1000).toISOString()} loading={false} totalIssues={712} onOpenSettings={vi.fn()} />);
    expect(screen.getByText(/712 issues/)).toBeInTheDocument();
    expect(screen.getByText(/fetched.*ago/i)).toBeInTheDocument();
  });

  it('refresh button calls onRefresh', async () => {
    const onRefresh = vi.fn();
    render(<RepoBar value={{ owner: 'o', repo: 'r' }} onChange={vi.fn()} onRefresh={onRefresh} fetchedAt="2026-05-10T00:00:00Z" loading={false} totalIssues={1} onOpenSettings={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/RepoBar.tsx
import { useState } from 'react';
import { parseRepoUrl, type RepoRef } from '../lib/parseRepoUrl';

export type RepoBarProps = {
  value: RepoRef | null;
  onChange: (ref: RepoRef) => void;
  onRefresh: () => void;
  fetchedAt: string | null;
  loading: boolean;
  totalIssues: number | null;
  onOpenSettings: () => void;
};

export function RepoBar(props: RepoBarProps) {
  const [draft, setDraft] = useState(props.value ? `${props.value.owner}/${props.value.repo}` : '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = parseRepoUrl(draft);
    if (!parsed) {
      setError('Use owner/repo or a github.com URL.');
      return;
    }
    setError(null);
    props.onChange(parsed);
  }

  return (
    <header className="repo-bar">
      <input
        type="text"
        placeholder="owner/repo or github.com/owner/repo"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        aria-label="Repository"
      />
      <button onClick={() => submit()}>Load</button>
      <button onClick={props.onRefresh} disabled={!props.value || props.loading} aria-label="Refresh">
        {props.loading ? '…' : '⟳'} Refresh
      </button>
      {props.fetchedAt && (
        <span className="muted small">fetched {relativeTime(props.fetchedAt)} ago</span>
      )}
      {props.totalIssues != null && (
        <span className="muted small">• {props.totalIssues} issues</span>
      )}
      <button className="settings" onClick={props.onOpenSettings} aria-label="Settings">
        ⚙
      </button>
      {error && <div role="alert" className="error">{error}</div>}
    </header>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
```

- [ ] **Step 3: Add CSS**

Append to `src/ui/styles.css`:

```css
.repo-bar {
  display: flex; gap: 8px; align-items: center; padding: 8px 12px;
  border-bottom: 1px solid var(--border); background: var(--bg-soft);
}
.repo-bar input { flex: 1; max-width: 480px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; }
.repo-bar .settings { margin-left: auto; }
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- RepoBar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/RepoBar.tsx src/ui/RepoBar.test.tsx src/ui/styles.css
git commit -m "feat(ui): RepoBar with URL parsing, refresh, fetched-at indicator"
```

---

## Task 20: SettingsModal

**Files:**
- Create: `src/ui/SettingsModal.tsx`, `src/ui/SettingsModal.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/SettingsModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';

describe('SettingsModal', () => {
  it('shows masked token and login', () => {
    render(<SettingsModal token="ghp_secret123" login="alice" onSignOut={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/ghp_•••/)).toBeInTheDocument();
  });

  it('calls onSignOut and onClose when Sign out clicked', async () => {
    const onSignOut = vi.fn();
    const onClose = vi.fn();
    render(<SettingsModal token="ghp_secret123" login="alice" onSignOut={onSignOut} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/SettingsModal.tsx
export type SettingsModalProps = {
  token: string;
  login: string;
  onSignOut: () => void;
  onClose: () => void;
};

export function SettingsModal({ token, login, onSignOut, onClose }: SettingsModalProps) {
  const masked = token.slice(0, 4) + '•••' + token.slice(-3);
  return (
    <div className="modal-backdrop" role="dialog" aria-labelledby="settings-title">
      <div className="modal">
        <h2 id="settings-title">Settings</h2>
        <p>Signed in as <strong>{login}</strong></p>
        <p className="muted small">Token: <code>{masked}</code></p>
        <p className="muted small">
          The token sits in your browser. Don't paste this app's URL into anything you don't trust.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onSignOut(); onClose(); }}>Sign out</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run, verify pass**

Run: `npm test -- SettingsModal`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/SettingsModal.tsx src/ui/SettingsModal.test.tsx
git commit -m "feat(ui): SettingsModal with masked token and sign-out"
```

---

## Task 21: FilterSidebar

**Files:**
- Create: `src/ui/FilterSidebar.tsx`, `src/ui/FilterSidebar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/FilterSidebar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSidebar } from './FilterSidebar';
import { defaultFilterState } from '../state/types';
import type { FilterCounts } from '../state/filters/pipeline';

const counts: FilterCounts = { total: 100, noComments: 40, noLinkedPR: 60, noAssignee: 70, hasRepro: 25 };

describe('FilterSidebar', () => {
  it('toggles noComments filter', async () => {
    const set = vi.fn();
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug']}
        counts={counts}
        onSet={set}
        onReset={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/no comments/i));
    expect(set).toHaveBeenCalledWith('noComments', true);
  });

  it('shows count badge next to no-comments', () => {
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug']}
        counts={counts}
        onSet={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('selects a label', async () => {
    const set = vi.fn();
    render(
      <FilterSidebar
        state={defaultFilterState}
        availableLabels={['bug', 'help-wanted']}
        counts={counts}
        onSet={set}
        onReset={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByLabelText(/^bug$/i));
    expect(set).toHaveBeenCalledWith('labels', ['bug']);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/FilterSidebar.tsx
import type { FilterState } from '../state/types';
import type { FilterCounts } from '../state/filters/pipeline';

export type FilterSidebarProps = {
  state: FilterState;
  availableLabels: string[];
  counts: FilterCounts;
  onSet: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
};

export function FilterSidebar(p: FilterSidebarProps) {
  const toggleLabel = (label: string) => {
    const next = p.state.labels.includes(label)
      ? p.state.labels.filter((l) => l !== label)
      : [...p.state.labels, label];
    p.onSet('labels', next);
  };

  return (
    <aside className="filter-sidebar">
      <h3>Search</h3>
      <input
        type="text"
        value={p.state.text}
        onChange={(e) => p.onSet('text', e.target.value)}
        placeholder="title or body…"
      />

      <h3>Labels</h3>
      <div className="label-mode">
        <label>
          <input
            type="radio"
            checked={p.state.labelMode === 'OR'}
            onChange={() => p.onSet('labelMode', 'OR')}
          />
          OR
        </label>
        <label>
          <input
            type="radio"
            checked={p.state.labelMode === 'AND'}
            onChange={() => p.onSet('labelMode', 'AND')}
          />
          AND
        </label>
      </div>
      <ul className="label-list">
        {p.availableLabels.map((label) => (
          <li key={label}>
            <label>
              <input
                type="checkbox"
                checked={p.state.labels.includes(label)}
                onChange={() => toggleLabel(label)}
              />
              {label}
            </label>
          </li>
        ))}
      </ul>

      <h3>Custom</h3>
      <ul className="custom-filters">
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noComments}
              onChange={(e) => p.onSet('noComments', e.target.checked)}
            />
            No comments <span className="badge">{p.counts.noComments}</span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noLinkedPR}
              onChange={(e) => p.onSet('noLinkedPR', e.target.checked)}
            />
            No linked PR <span className="badge">{p.counts.noLinkedPR}</span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={p.state.noAssignee}
              onChange={(e) => p.onSet('noAssignee', e.target.checked)}
            />
            No assignee <span className="badge">{p.counts.noAssignee}</span>
          </label>
        </li>
      </ul>

      <h4>Closed PR mode</h4>
      <select
        value={p.state.closedPRMode}
        onChange={(e) => p.onSet('closedPRMode', e.target.value as FilterState['closedPRMode'])}
      >
        <option value="include">Include all</option>
        <option value="exclude">Hide issues with closed PRs</option>
        <option value="only">Only show issues with closed PRs</option>
      </select>

      <h4>Reporter active within (days)</h4>
      <input
        type="number"
        min={1}
        value={p.state.reporterActiveWithinDays ?? ''}
        onChange={(e) =>
          p.onSet(
            'reporterActiveWithinDays',
            e.target.value === '' ? null : Number(e.target.value),
          )
        }
      />

      <h4>Age band (days)</h4>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="number"
          placeholder="min"
          value={p.state.ageDays.min ?? ''}
          onChange={(e) =>
            p.onSet('ageDays', {
              ...p.state.ageDays,
              min: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
        <input
          type="number"
          placeholder="max"
          value={p.state.ageDays.max ?? ''}
          onChange={(e) =>
            p.onSet('ageDays', {
              ...p.state.ageDays,
              max: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </div>

      <h4>Repro steps</h4>
      <select
        value={p.state.requireReproSteps == null ? 'either' : p.state.requireReproSteps ? 'yes' : 'no'}
        onChange={(e) => {
          const v = e.target.value;
          p.onSet('requireReproSteps', v === 'either' ? null : v === 'yes');
        }}
      >
        <option value="either">Either</option>
        <option value="yes">Has repro</option>
        <option value="no">No repro</option>
      </select>

      <h4>Annotation</h4>
      <select
        value={p.state.annotation}
        onChange={(e) => p.onSet('annotation', e.target.value as FilterState['annotation'])}
      >
        <option value="any">Any</option>
        <option value="untriaged">Untriaged only</option>
        <option value="interested">Interested only</option>
        <option value="hide-skipped">Hide skipped</option>
      </select>

      <button className="reset-btn" onClick={p.onReset}>
        Reset all filters
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Add CSS**

Append to `src/ui/styles.css`:

```css
.filter-sidebar {
  width: 260px; padding: 12px; border-right: 1px solid var(--border);
  overflow-y: auto; height: 100%; display: flex; flex-direction: column; gap: 8px;
}
.filter-sidebar h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin: 8px 0 4px; }
.filter-sidebar h4 { font-size: 12px; margin: 6px 0 2px; }
.filter-sidebar input[type=text], .filter-sidebar input[type=number], .filter-sidebar select { width: 100%; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; }
.filter-sidebar ul { list-style: none; padding: 0; margin: 0; }
.filter-sidebar li label { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.label-mode { display: flex; gap: 8px; font-size: 12px; }
.badge { margin-left: auto; font-size: 11px; padding: 1px 6px; background: var(--bg-soft); border-radius: 999px; color: var(--muted); }
.reset-btn { margin-top: auto; }
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- FilterSidebar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/FilterSidebar.tsx src/ui/FilterSidebar.test.tsx src/ui/styles.css
git commit -m "feat(ui): FilterSidebar with all custom filters and live count badges"
```

---

## Task 22: PresetDropdown

**Files:**
- Create: `src/ui/PresetDropdown.tsx`, `src/ui/PresetDropdown.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/PresetDropdown.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetDropdown } from './PresetDropdown';
import { BUILT_IN_PRESETS } from '../state/presets';

describe('PresetDropdown', () => {
  it('shows built-in presets', async () => {
    render(<PresetDropdown userPresets={[]} onApply={vi.fn()} onSaveCurrent={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /presets/i }));
    expect(screen.getByText(BUILT_IN_PRESETS[0].name)).toBeInTheDocument();
  });

  it('calls onApply when a preset is clicked', async () => {
    const onApply = vi.fn();
    render(<PresetDropdown userPresets={[]} onApply={onApply} onSaveCurrent={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /presets/i }));
    await userEvent.click(screen.getByText(BUILT_IN_PRESETS[0].name));
    expect(onApply).toHaveBeenCalledWith(BUILT_IN_PRESETS[0]);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/PresetDropdown.tsx
import { useState } from 'react';
import type { FilterPreset } from '../state/types';
import { BUILT_IN_PRESETS } from '../state/presets';

export type PresetDropdownProps = {
  userPresets: FilterPreset[];
  onApply: (preset: FilterPreset) => void;
  onSaveCurrent: (name: string) => void;
};

export function PresetDropdown(p: PresetDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="preset-dropdown">
      <button onClick={() => setOpen((o) => !o)}>Presets ▾</button>
      {open && (
        <div className="preset-menu" role="menu">
          <div className="preset-section">Built-in</div>
          {BUILT_IN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="preset-item"
              onClick={() => {
                p.onApply(preset);
                setOpen(false);
              }}
            >
              {preset.name}
            </button>
          ))}
          {p.userPresets.length > 0 && <div className="preset-section">Yours</div>}
          {p.userPresets.map((preset) => (
            <button
              key={preset.name}
              className="preset-item"
              onClick={() => {
                p.onApply(preset);
                setOpen(false);
              }}
            >
              {preset.name}
            </button>
          ))}
          <div className="preset-section">—</div>
          <button
            className="preset-item"
            onClick={() => {
              const name = prompt('Preset name?');
              if (name) {
                p.onSaveCurrent(name);
                setOpen(false);
              }
            }}
          >
            Save current filters as preset…
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add CSS**

```css
/* append to styles.css */
.preset-dropdown { position: relative; }
.preset-menu { position: absolute; top: 100%; left: 0; z-index: 5; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); min-width: 220px; padding: 4px 0; }
.preset-section { font-size: 11px; color: var(--muted); padding: 4px 12px; text-transform: uppercase; }
.preset-item { display: block; width: 100%; padding: 6px 12px; text-align: left; background: none; border: none; cursor: pointer; }
.preset-item:hover { background: var(--bg-soft); }
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- PresetDropdown`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/PresetDropdown.tsx src/ui/PresetDropdown.test.tsx src/ui/styles.css
git commit -m "feat(ui): PresetDropdown with built-in and user-saved presets"
```

---

## Task 23: IssueCard + IssueList

**Files:**
- Create: `src/ui/IssueCard.tsx`, `src/ui/IssueCard.test.tsx`, `src/ui/IssueList.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/IssueCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueCard } from './IssueCard';
import type { Issue, Annotation } from '../state/types';

const issue: Issue = {
  number: 4421,
  title: 'Fix crash in resource manager',
  bodyPreview: '',
  state: 'OPEN',
  author: { login: 'alice' },
  assignees: [],
  labels: ['bug', 'client'],
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: true,
  url: 'https://github.com/o/r/issues/4421',
};

describe('IssueCard', () => {
  it('shows title, number, labels, comment count', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/#4421/)).toBeInTheDocument();
    expect(screen.getByText(/Fix crash in resource manager/)).toBeInTheDocument();
    expect(screen.getByText(/bug/)).toBeInTheDocument();
    expect(screen.getByText(/0 comments/)).toBeInTheDocument();
  });

  it('shows unclaimed pill when no PR + no assignee', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/unclaimed/i)).toBeInTheDocument();
  });

  it('shows has repro pill', () => {
    render(<IssueCard issue={issue} annotation={undefined} onClick={vi.fn()} />);
    expect(screen.getByText(/has repro/i)).toBeInTheDocument();
  });

  it('shows annotation status pill', () => {
    const ann: Annotation = {
      repoKey: 'o/r',
      issueNumber: 4421,
      status: 'interested',
      notes: '',
      updatedAt: '2026-05-10T00:00:00Z',
    };
    render(<IssueCard issue={issue} annotation={ann} onClick={vi.fn()} />);
    expect(screen.getByText(/interested/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<IssueCard issue={issue} annotation={undefined} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement IssueCard**

```tsx
// src/ui/IssueCard.tsx
import type { Issue, Annotation } from '../state/types';
import { ageInDays } from '../lib/time';

export type IssueCardProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onClick: () => void;
};

export function IssueCard({ issue, annotation, onClick }: IssueCardProps) {
  const days = ageInDays(issue.createdAt);
  const ageStr = days < 1 ? 'today' : days < 60 ? `${days} days ago` : `${Math.floor(days / 30)} months ago`;
  const unclaimed = issue.assignees.length === 0 && issue.linkedPRs.length === 0;
  const hasClosedPR = issue.linkedPRs.some((pr) => pr.state === 'CLOSED');

  return (
    <button className="issue-card" onClick={onClick} aria-label={`Issue #${issue.number}`}>
      <div className="issue-card-line1">
        <span className="issue-num">#{issue.number}</span>
        <span className="issue-title">{issue.title}</span>
      </div>
      <div className="issue-card-line2 muted small">
        {issue.labels.slice(0, 4).map((l) => (
          <span key={l} className="label-pill">{l}</span>
        ))}
        <span>· {ageStr}</span>
        <span>· {issue.commentCount} comments</span>
      </div>
      <div className="issue-card-line3 small">
        {unclaimed && <span className="pill pill-good">unclaimed</span>}
        {issue.hasReproSteps && <span className="pill">has repro</span>}
        {hasClosedPR && <span className="pill pill-warn">closed PR linked</span>}
        {annotation?.status === 'interested' && <span className="pill pill-star">★ interested</span>}
        {annotation?.status === 'skipped' && <span className="pill pill-mute">skipped</span>}
        {annotation?.status === 'working' && <span className="pill pill-good">working on</span>}
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Implement IssueList**

```tsx
// src/ui/IssueList.tsx
import type { Issue, Annotation, FilterState, SortKey } from '../state/types';
import { IssueCard } from './IssueCard';

export type IssueListProps = {
  issues: Issue[];
  annotations: Map<number, Annotation>;
  totalShown: number;
  totalAvailable: number;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onSelectIssue: (issue: Issue) => void;
  onClearFilters: () => void;
};

export function IssueList(p: IssueListProps) {
  return (
    <main className="issue-list">
      <div className="issue-list-header">
        <span>Showing {p.totalShown} of {p.totalAvailable}</span>
        <select value={p.sort} onChange={(e) => p.onSortChange(e.target.value as FilterState['sort'])}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-commented">Most commented</option>
          <option value="least-commented">Least commented</option>
          <option value="recently-updated">Recently updated</option>
        </select>
      </div>
      {p.issues.length === 0 ? (
        <div className="empty-state">
          <p>No issues match the current filters.</p>
          <button onClick={p.onClearFilters}>Clear all filters</button>
        </div>
      ) : (
        <ul>
          {p.issues.map((issue) => (
            <li key={issue.number}>
              <IssueCard
                issue={issue}
                annotation={p.annotations.get(issue.number)}
                onClick={() => p.onSelectIssue(issue)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Add CSS**

```css
/* append to styles.css */
.issue-list { flex: 1; overflow-y: auto; padding: 12px; }
.issue-list-header { display: flex; justify-content: space-between; align-items: center; padding: 4px 0 12px; }
.issue-list ul { list-style: none; padding: 0; margin: 0; }
.issue-list li { margin-bottom: 8px; }
.issue-card { display: block; width: 100%; text-align: left; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px; cursor: pointer; }
.issue-card:hover { background: var(--bg-soft); }
.issue-card-line1 { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
.issue-num { color: var(--muted); font-variant-numeric: tabular-nums; }
.issue-title { font-weight: 500; }
.issue-card-line2 { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.issue-card-line3 { display: flex; gap: 6px; flex-wrap: wrap; }
.label-pill { padding: 1px 6px; background: var(--bg-soft); border-radius: 3px; font-size: 11px; }
.pill { padding: 2px 8px; background: var(--bg-soft); border-radius: 999px; font-size: 11px; border: 1px solid var(--border); }
.pill-good { background: #dcfce7; border-color: #86efac; }
.pill-warn { background: #fef3c7; border-color: #fde68a; }
.pill-mute { background: #f3f4f6; color: var(--muted); }
.pill-star { background: #fef3c7; }
.empty-state { text-align: center; padding: 48px 12px; color: var(--muted); }
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- IssueCard`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/IssueCard.tsx src/ui/IssueCard.test.tsx src/ui/IssueList.tsx src/ui/styles.css
git commit -m "feat(ui): IssueCard with signal pills and IssueList with sort + empty state"
```

---

## Task 24: IssueDrawer + AnnotationEditor

**Files:**
- Create: `src/ui/IssueDrawer.tsx`, `src/ui/IssueDrawer.test.tsx`, `src/ui/AnnotationEditor.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/ui/IssueDrawer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueDrawer } from './IssueDrawer';
import type { Issue } from '../state/types';

const issue: Issue = {
  number: 4421,
  title: 'Fix crash in resource manager',
  bodyPreview: 'A bug occurs when...',
  state: 'OPEN',
  author: null,
  assignees: [],
  labels: [],
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-08T00:00:00Z',
  commentCount: 0,
  linkedPRs: [],
  lastReporterActivityAt: null,
  hasReproSteps: false,
  url: 'https://github.com/o/r/issues/4421',
};

describe('IssueDrawer', () => {
  it('renders title, body and external link', () => {
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={vi.fn()}
        onSetNotes={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Fix crash in resource manager/)).toBeInTheDocument();
    expect(screen.getByText(/A bug occurs/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open on github/i })).toHaveAttribute('href', issue.url);
  });

  it('changes annotation status via dropdown', async () => {
    const onSetStatus = vi.fn();
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={onSetStatus}
        onSetNotes={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'interested');
    expect(onSetStatus).toHaveBeenCalledWith('interested');
  });

  it('debounces notes save on blur', async () => {
    vi.useFakeTimers();
    const onSetNotes = vi.fn();
    render(
      <IssueDrawer
        issue={issue}
        annotation={undefined}
        onSetStatus={vi.fn()}
        onSetNotes={onSetNotes}
        onClose={vi.fn()}
      />,
    );
    const textarea = screen.getByLabelText(/notes/i);
    await userEvent.type(textarea, 'looks good', { delay: null });
    expect(onSetNotes).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onSetNotes).toHaveBeenCalledWith('looks good');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Implement AnnotationEditor**

```tsx
// src/ui/AnnotationEditor.tsx
import { useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationStatus } from '../state/types';

export type AnnotationEditorProps = {
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
};

export function AnnotationEditor(p: AnnotationEditorProps) {
  const [notes, setNotes] = useState(p.annotation?.notes ?? '');
  const dirty = useRef(false);

  useEffect(() => {
    setNotes(p.annotation?.notes ?? '');
    dirty.current = false;
  }, [p.annotation?.issueNumber]);

  const status: AnnotationStatus = p.annotation?.status ?? null;

  return (
    <section className="annotation-editor">
      <h4>Annotation</h4>
      <label>
        Status
        <select
          value={status ?? 'untriaged'}
          onChange={(e) => {
            const v = e.target.value;
            p.onSetStatus(v === 'untriaged' ? null : (v as AnnotationStatus));
          }}
        >
          <option value="untriaged">Untriaged</option>
          <option value="interested">Interested</option>
          <option value="working">Working on</option>
          <option value="skipped">Skipped</option>
        </select>
      </label>
      <label>
        Notes
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => {
            dirty.current = true;
            setNotes(e.target.value);
          }}
          onBlur={() => {
            if (dirty.current) {
              p.onSetNotes(notes);
              dirty.current = false;
            }
          }}
        />
      </label>
    </section>
  );
}
```

- [ ] **Step 3: Implement IssueDrawer**

```tsx
// src/ui/IssueDrawer.tsx
import type { Issue, Annotation, AnnotationStatus } from '../state/types';
import { AnnotationEditor } from './AnnotationEditor';

export type IssueDrawerProps = {
  issue: Issue;
  annotation: Annotation | undefined;
  onSetStatus: (s: AnnotationStatus) => void;
  onSetNotes: (n: string) => void;
  onClose: () => void;
};

export function IssueDrawer(p: IssueDrawerProps) {
  return (
    <aside className="issue-drawer" role="dialog" aria-labelledby="drawer-title">
      <header className="drawer-header">
        <h2 id="drawer-title">
          #{p.issue.number} {p.issue.title}
        </h2>
        <button onClick={p.onClose} aria-label="Close">✕</button>
      </header>
      <div className="drawer-body">
        <p className="muted small">
          {p.issue.author?.login ?? 'unknown'} · created {new Date(p.issue.createdAt).toLocaleDateString()}
        </p>
        <pre className="issue-body">{p.issue.bodyPreview}</pre>
        <a href={p.issue.url} target="_blank" rel="noreferrer">
          Open on GitHub ↗
        </a>
        <AnnotationEditor
          annotation={p.annotation}
          onSetStatus={p.onSetStatus}
          onSetNotes={p.onSetNotes}
        />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Add CSS**

```css
/* append to styles.css */
.issue-drawer { width: 480px; max-width: 50vw; border-left: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; border-bottom: 1px solid var(--border); }
.drawer-body { padding: 12px; overflow-y: auto; flex: 1; }
.issue-body { white-space: pre-wrap; font-family: inherit; background: var(--bg-soft); padding: 12px; border-radius: 4px; max-height: 320px; overflow-y: auto; }
.annotation-editor { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
.annotation-editor label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.annotation-editor textarea { padding: 6px; border: 1px solid var(--border); border-radius: 4px; font-family: inherit; }
```

- [ ] **Step 5: Run, verify pass**

Run: `npm test -- IssueDrawer`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/IssueDrawer.tsx src/ui/IssueDrawer.test.tsx src/ui/AnnotationEditor.tsx src/ui/styles.css
git commit -m "feat(ui): IssueDrawer with body preview and AnnotationEditor"
```

---

## Task 25: ErrorBanner + RateLimitBadge

**Files:**
- Create: `src/ui/ErrorBanner.tsx`, `src/ui/RateLimitBadge.tsx`

- [ ] **Step 1: Implement ErrorBanner**

```tsx
// src/ui/ErrorBanner.tsx
export type ErrorBannerProps = {
  kind: 'offline' | 'partial' | 'rate-limit' | 'auth' | 'not-found' | 'generic';
  message: string;
  resetAt?: string;
  onDismiss?: () => void;
};

export function ErrorBanner(p: ErrorBannerProps) {
  return (
    <div className={`error-banner banner-${p.kind}`} role="alert">
      <span>{p.message}</span>
      {p.resetAt && <span className="muted small"> Resets at {new Date(p.resetAt).toLocaleTimeString()}.</span>}
      {p.onDismiss && (
        <button className="dismiss" onClick={p.onDismiss} aria-label="Dismiss">✕</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement RateLimitBadge**

```tsx
// src/ui/RateLimitBadge.tsx
import type { RateLimit } from '../state/types';

export function RateLimitBadge({ rateLimit }: { rateLimit: RateLimit | null }) {
  if (!rateLimit) return null;
  const low = rateLimit.remaining < 500;
  return (
    <span className={`rate-badge ${low ? 'rate-low' : ''}`} title={`Resets at ${rateLimit.resetAt}`}>
      rate {rateLimit.remaining}
    </span>
  );
}
```

- [ ] **Step 3: Add CSS**

```css
/* append to styles.css */
.error-banner { padding: 8px 12px; background: #fef3c7; border-bottom: 1px solid #fde68a; display: flex; gap: 8px; align-items: center; }
.banner-offline { background: #fee2e2; border-color: #fca5a5; }
.banner-auth, .banner-not-found, .banner-rate-limit { background: #fee2e2; border-color: #fca5a5; }
.banner-partial { background: #fef3c7; border-color: #fde68a; }
.dismiss { margin-left: auto; background: none; border: none; cursor: pointer; }
.rate-badge { font-size: 11px; color: var(--muted); padding: 2px 6px; }
.rate-low { color: var(--error); }
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/ErrorBanner.tsx src/ui/RateLimitBadge.tsx src/ui/styles.css
git commit -m "feat(ui): ErrorBanner and RateLimitBadge"
```

---

## Task 26: App composition

**Files:**
- Modify: `src/App.tsx`
- Create: `src/ui/AppShell.tsx`

- [ ] **Step 1: Replace `App.tsx`**

```tsx
// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { AuthModal } from './ui/AuthModal';
import { SettingsModal } from './ui/SettingsModal';
import { RepoBar } from './ui/RepoBar';
import { FilterSidebar } from './ui/FilterSidebar';
import { PresetDropdown } from './ui/PresetDropdown';
import { IssueList } from './ui/IssueList';
import { IssueDrawer } from './ui/IssueDrawer';
import { ErrorBanner } from './ui/ErrorBanner';
import { RateLimitBadge } from './ui/RateLimitBadge';
import { useAuth } from './state/hooks/useAuth';
import { useRepoSync } from './state/hooks/useRepoSync';
import { useFilterState } from './state/hooks/useFilterState';
import { useFilteredIssues } from './state/hooks/useFilteredIssues';
import { useAnnotations } from './state/hooks/useAnnotations';
import { applyPreset } from './state/presets';
import type { Issue, FilterPreset } from './state/types';
import {
  getLastRepo,
  setLastRepo,
  getUserPresets,
  setUserPresets,
} from './data/cache/localStorage';
import { parseRepoUrl, type RepoRef } from './lib/parseRepoUrl';

export function App() {
  const auth = useAuth();
  const [repo, setRepo] = useState<RepoRef | null>(() => {
    const last = getLastRepo();
    return last ? parseRepoUrl(last) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [userPresets, setUserPresetsState] = useState<FilterPreset[]>(() => getUserPresets());

  const repoKey = repo ? `${repo.owner}/${repo.repo}` : null;

  const { issues, status, error, fetchedAt, partial, rateLimit, refresh } = useRepoSync(
    auth.status === 'authenticated' ? auth.token : null,
    repo,
  );
  const { state: filterState, set: setFilter, reset: resetFilters, replace: replaceFilters } =
    useFilterState();
  const { annotations, setStatus, setNotes } = useAnnotations(repoKey);
  const { filtered, counts, totalShown, totalAvailable } = useFilteredIssues(
    issues,
    filterState,
    annotations,
  );

  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    for (const i of issues) for (const l of i.labels) set.add(l);
    return [...set].sort();
  }, [issues]);

  useEffect(() => {
    if (repo) setLastRepo(`${repo.owner}/${repo.repo}`);
  }, [repo]);

  if (auth.status === 'loading') {
    return <div className="centered">Loading…</div>;
  }
  if (auth.status === 'unauthenticated') {
    return <AuthModal onSubmit={auth.signIn} />;
  }

  return (
    <div className="app-shell">
      <RepoBar
        value={repo}
        onChange={setRepo}
        onRefresh={refresh}
        fetchedAt={fetchedAt}
        loading={status === 'syncing'}
        totalIssues={totalAvailable || null}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <RateLimitBadge rateLimit={rateLimit} />
      {error && <ErrorBanner kind="generic" message={error} />}
      {partial && (
        <ErrorBanner
          kind="partial"
          message={`Partial cache: showing ${issues.length} issues. Try refresh after rate limit resets.`}
          resetAt={rateLimit?.resetAt}
        />
      )}
      <div className="main-row">
        <FilterSidebar
          state={filterState}
          availableLabels={availableLabels}
          counts={counts}
          onSet={setFilter}
          onReset={resetFilters}
        />
        <section className="list-and-toolbar">
          <div className="list-toolbar">
            <PresetDropdown
              userPresets={userPresets}
              onApply={(preset) => replaceFilters(applyPreset(filterState, preset))}
              onSaveCurrent={(name) => {
                const next = [...userPresets, { name, builtIn: false, filters: filterState }];
                setUserPresetsState(next);
                setUserPresets(next);
              }}
            />
          </div>
          <IssueList
            issues={filtered}
            annotations={annotations}
            totalShown={totalShown}
            totalAvailable={totalAvailable}
            sort={filterState.sort}
            onSortChange={(s) => setFilter('sort', s)}
            onSelectIssue={setSelected}
            onClearFilters={resetFilters}
          />
        </section>
        {selected && (
          <IssueDrawer
            issue={selected}
            annotation={annotations.get(selected.number)}
            onSetStatus={(s) => setStatus(selected.number, s)}
            onSetNotes={(n) => setNotes(selected.number, n)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {settingsOpen && auth.status === 'authenticated' && auth.token && (
        <SettingsModal
          token={auth.token}
          login={auth.login}
          onSignOut={auth.signOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the shell**

```css
/* append to styles.css */
html, body, #root { height: 100%; margin: 0; }
.app-shell { display: flex; flex-direction: column; height: 100%; }
.main-row { display: flex; flex: 1; min-height: 0; }
.list-and-toolbar { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.list-toolbar { padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; }
.centered { display: grid; place-items: center; height: 100%; }
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: PASS — full suite green.

- [ ] **Step 4: Run dev server, manually walk through:**

Run: `npm run dev`

Verify by clicking through:
- AuthModal appears on first load
- Bad token shows error
- Good token closes modal, RepoBar appears
- Enter `multitheftauto/mtasa-blue`, hit Load
- Sync indicator appears, then issues populate
- Filter checkboxes update count badges and the list
- Click an issue → drawer opens
- Change status to "interested" → card pill updates immediately
- Add a note, click out, refresh page → note persists
- Settings ⚙ shows masked token + sign out

Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui/styles.css
git commit -m "feat(app): wire up all components into the shell"
```

---

## Task 27: Build verification + GitHub Pages config

**Files:**
- Modify: `vite.config.ts`, `package.json`

- [ ] **Step 1: Verify production build**

Run: `npm run build`
Expected: build succeeds with no TS or Vite errors.

Run: `npm run preview`
Expected: serves the production build on `http://localhost:4173`. Verify it loads and works as in dev. Stop with Ctrl+C.

- [ ] **Step 2: Add GitHub Pages deploy hint to README**

Create `README.md`:

```markdown
# gh-issue-prospector

Personal browser-based tool for filtering OSS issues with custom signals beyond what GitHub's UI exposes (no comments, no linked PR, has repro steps, abandoned-trap detection, etc.).

## Local dev

```bash
npm install
npm run dev
```

## Build & deploy

```bash
npm run build     # output in dist/
```

To deploy to GitHub Pages: push `dist/` to a `gh-pages` branch, or use a Pages action workflow. The app uses `base: './'` in `vite.config.ts` so it works regardless of repo path.

## Auth

On first load, paste a GitHub Personal Access Token (`public_repo` scope; `repo` for private repos). The token sits in `localStorage` and never leaves the browser.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with dev and deploy instructions"
```

---

## Self-Review

**Spec coverage:**
- §1 Purpose: Tasks 1, 26
- §3 In-scope filters: Task 5 (predicates), Task 6 (pipeline), Task 7-8 (heuristics), Task 21 (UI)
- §4 Architecture (3 layers): enforced by file structure
- §4 Persistence: Task 12
- §5 Data model: Task 4 (types), Tasks 7-10 (derivations)
- §6 Filters table: every row covered by Task 5 + 6
- §6 Built-in presets: Task 13, Task 22
- §7 UI shape: Tasks 18-26
- §8 Auth flow: Tasks 14, 18, 20
- §8 Repo URL parsing: Task 2, Task 19
- §9 Sync, rate limits: Task 11, Task 15, Task 25
- §9 Error states: Task 25, Task 26
- §10 Testing: tests live alongside each module

**Placeholder scan:** None found.

**Type consistency:** Spot-checked. `Issue`, `Annotation`, `FilterState`, `LinkedPR`, `RepoKey`, `AnnotationStatus`, `SortKey` all defined once in `src/state/types.ts` and imported consistently. `RateLimit` defined in `state/types.ts`, mirrored as `RateLimitInfo` in GraphQL response shape (intentional — the GraphQL response uses the same field names but is conceptually a separate boundary).

**Spec gaps:**
- The spec's "Reactions count" was explicitly dropped — confirmed not in plan.
- The spec mentions GraphQL secondary rate-limit retry with backoff (max 3 attempts). The current fetcher has no backoff. Adding a follow-up task would help, but for v1 the outer error banner covers it. Leaving as a documented v1 limitation.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-10-gh-issue-prospector.md`.
