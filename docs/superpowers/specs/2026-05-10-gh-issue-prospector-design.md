# gh-issue-prospector — Design

**Date:** 2026-05-10
**Status:** Approved (brainstorming phase)
**Owner:** saif

## 1. Purpose

A personal browser-based tool that helps the user find good open-source issues to work on. It points at one GitHub repo at a time, pulls all open issues, and applies filters that GitHub's native UI doesn't expose — most importantly: *"no comments"*, *"no linked PR"*, *"no assignee"*, *"has a closed PR linked (likely abandoned trap)"*, *"reporter still active"*, *"has reproduction steps"*, plus an issue-age band.

It also stores light personal annotations (interested / skipped / working / notes) per issue so the user doesn't re-evaluate the same issue list every session.

The tool runs entirely in the browser. The user supplies a GitHub Personal Access Token; nothing leaves their machine.

## 2. Non-goals

- Multi-user / shared accounts
- Cross-repo or whole-of-GitHub discovery (single repo at a time, swappable)
- A backend service, server, or database
- A Kanban / time-tracking workflow
- E2E testing for v1
- Full offline support beyond cached snapshots
- Mobile-first design (desktop is the target form factor)

## 3. Scope

### In scope (v1)

- Single-repo mode, repo URL changeable from the UI (`owner/repo`, `github.com/owner/repo`, or full URL accepted)
- PAT-based auth, stored in `localStorage`
- Bulk fetch all open issues for the chosen repo via GitHub GraphQL
- Cache in IndexedDB with a 1-hour TTL and a manual refresh button
- All filters listed in §6
- Annotation status (`interested` / `skipped` / `working` / `null`) and free-text notes per issue
- Saved filter presets (built-in + user-defined, stored in `localStorage`)
- Issue detail drawer (preserves filter context)

### Out of scope (v1)

- Closed issues (toggleable later; v1 is open-only since the user is hunting for work)
- Bulk operations on issues (mark many as skipped at once)
- Export / import of annotations
- Incremental sync via the `since` parameter (v2 enhancement)

## 4. Architecture

Static SPA, Vite + React + TypeScript. Three layers, strictly separated:

1. **Data layer** — `src/data/`
   - `github/` — typed GraphQL client, paginated issue fetcher, response → `Issue` mapper
   - `cache/` — IndexedDB read/write for issues; localStorage helpers for PAT, last repo, presets
   - All async, no React imports here

2. **State / logic layer** — `src/state/`
   - Pure filter functions over `Issue[]` (one file per filter)
   - Heuristic detectors (`hasReproSteps`, derive `linkedPRs` from timeline events)
   - React hooks that wrap the above: `useRepoSync`, `useFilteredIssues`, `useAnnotations`, `useFilterState`

3. **UI layer** — `src/ui/`
   - React components only; no fetching, no business logic
   - Reads exclusively through hooks from the state layer

This separation keeps filter logic and heuristics testable without React or a network.

### Persistence

- **`localStorage`** — PAT, last-used repo, user-defined filter presets, sidebar layout preferences
- **IndexedDB** — single `issues` object store keyed by `[repoKey, number]` (with a secondary index on `repoKey` for "all issues for this repo" queries); single `annotations` object store keyed by `[repoKey, issueNumber]`. One DB schema, no per-repo object stores (which would require an `onupgradeneeded` version bump every time a new repo is opened).
- **Cache TTL** — 1 hour. Expiry triggers a soft-red "fetched Xm ago" indicator + visible refresh button. v1 does **not** auto-refresh on TTL expiry; the user always clicks. Cached data is shown immediately while a manually-triggered refresh runs (stale-while-revalidate).

### Deployment

Push to GitHub, enable Pages, the URL is the tool. No server. If the user ever wants to share, the same URL works for anyone — they enter their own PAT.

## 5. Data model

```ts
type Issue = {
  number: number;
  title: string;
  bodyPreview: string;        // first ~1000 chars; enough for the repro-steps heuristic
  state: 'OPEN' | 'CLOSED';
  author: { login: string } | null;
  assignees: string[];
  labels: string[];
  createdAt: string;          // ISO 8601
  updatedAt: string;
  commentCount: number;
  // Derived at fetch time:
  linkedPRs: { number: number; state: 'OPEN' | 'CLOSED' | 'MERGED' }[];
  lastReporterActivityAt: string | null;
  hasReproSteps: boolean;
  url: string;
};

type Annotation = {
  repoKey: string;            // "owner/name"
  issueNumber: number;
  status: 'interested' | 'skipped' | 'working' | null;
  notes: string;
  updatedAt: string;
};

type FilterState = {
  labels: string[];
  labelMode: 'AND' | 'OR';
  noComments: boolean;
  noLinkedPR: boolean;
  noAssignee: boolean;
  closedPRMode: 'include' | 'exclude' | 'only';
  reporterActiveWithinDays: number | null;
  ageDays: { min: number | null; max: number | null };
  requireReproSteps: boolean | null;
  annotation: 'any' | 'untriaged' | 'interested' | 'hide-skipped';
  text: string;
  sort: 'newest' | 'oldest' | 'most-commented' | 'least-commented' | 'recently-updated';
};

type FilterPreset = {
  name: string;
  filters: Partial<FilterState>;
  builtIn: boolean;
};
```

Heuristics (`hasReproSteps`, `linkedPRs`, `lastReporterActivityAt`) are computed once at fetch/sync time and stored on the cached `Issue`. Filtering then runs as a single pass of pure predicates over the array — fast even with thousands of issues.

### Heuristic: `hasReproSteps`

Returns true if any of the following match `bodyPreview`:

- The phrases "steps to reproduce", "reproduction steps", "to reproduce", or "repro steps" (case-insensitive)
- A fenced code block (\`\`\`) of more than 2 lines
- A line that looks like a stack trace (e.g., starts with whitespace + `at ` + identifier + parens, or contains `Traceback`, or matches a C++ crash-line pattern `0x[0-9a-f]+\s+`)

Tested against a fixture corpus drawn from real mtasa-blue issues.

### Heuristic: `linkedPRs`

Walks `timelineItems(itemTypes: [CROSS_REFERENCED_EVENT], first: 50)` from the GraphQL response. For each cross-reference whose `source` is a `PullRequest` in the same repo, records `{ number, state }`. We dedupe by PR number.

`lastReporterActivityAt` = max of the issue's own `createdAt` and any `IssueComment` from the original author in the timeline.

## 6. Filters

| Filter | Source | Notes |
|---|---|---|
| Free-text search | `title + bodyPreview` | Case-insensitive substring match |
| Labels (AND / OR) | `labels` | Multi-select, mode toggle |
| Author | `author.login` | Single value |
| Assignee | `assignees` | "any", "none", or specific login |
| Created date range | `createdAt` | Optional min/max |
| Updated date range | `updatedAt` | Optional min/max |
| **No comments** | `commentCount === 0` | Custom |
| **No linked PR** | `linkedPRs.length === 0` | Custom |
| **No assignee** | `assignees.length === 0` | Custom |
| **Closed-PR mode** | `linkedPRs` includes `state: 'CLOSED'` | `include` (default), `exclude`, `only` |
| **Reporter active within N days** | `lastReporterActivityAt` | Custom |
| **Issue age band** | `now - createdAt` in days | min/max optional |
| **Has reproduction steps** | `hasReproSteps` | Tri-state: required / forbidden / either |
| **Annotation filter** | from IndexedDB | `any` / `untriaged` / `interested` / `hide-skipped` |
| Sort | various | newest / oldest / most-commented / least-commented / recently-updated |

All filters AND-ed. Each filter shows a live count badge ("if you check this, N issues remain"), recomputed from the in-memory list whenever the filter state changes.

### Built-in presets

- **Pristine unclaimed**: no comments + no linked PR + no assignee
- **Active discussion**: reporter active within 30 days + commentCount > 0
- **Likely abandoned trap**: closed-PR mode = `only` (filter is showing you what to *avoid* working on)
- **Good first look**: no assignee + has repro steps + age 30–365 days

User can save the current filter state as a named preset.

## 7. UI shape

```
┌────────────────────────────────────────────────────────────────────┐
│ [owner/repo input ▼] [⟳ refresh] fetched 4m ago • 712 issues  ⚙   │
├──────────────┬─────────────────────────────────────────────────────┤
│ FILTERS      │ Showing 38 of 712 • Sort: newest ▾ • Preset: ▾      │
│              │ ┌──────────────────────────────────────────────────┐│
│ Search…      │ │ #4421  Fix crash in resource manager             ││
│              │ │ bug · client · 2 days ago · 0 comments           ││
│ Labels       │ │ ○ unclaimed   ◇ has repro                        ││
│ ☐ bug        │ ├──────────────────────────────────────────────────┤│
│ ☐ help-wanted│ │ #4405  Dashed resource get/set bug               ││
│ ...          │ │ bug · 6 months ago · 3 comments · ★ interested   ││
│              │ └──────────────────────────────────────────────────┘│
│ ── custom ── │ ...                                                  │
│ ☐ no comments│                                                      │
│ ☐ no linked  │ ╭ Drawer (slides in when issue clicked) ───────────╮│
│   PR         │ │ #4421  Fix crash in resource manager             ││
│ ☐ no assignee│ │ Body...                                          ││
│ closed PR:   │ │ ─ Annotation ─                                   ││
│ (•)exclude   │ │ Status: [ untriaged ▾ ]                          ││
│ ( )include   │ │ Notes: [ textarea, autosaves locally ]           ││
│ ( )only      │ │ [ Open on GitHub ↗ ]                             ││
│ ...          │ ╰──────────────────────────────────────────────────╯│
└──────────────┴─────────────────────────────────────────────────────┘
```

### Behaviors

- **Filter sidebar**: sticky left, all filters AND-ed, live count badge per filter
- **Issue cards**: surface the signals being filtered on (comment count, age, PR-linked status, annotation) so the user can scan without opening
- **Drawer**: slides in from the right; selecting an issue does *not* change the URL or reset filter state. Closing the drawer returns to the list with scroll position preserved.
- **Annotation status**: dropdown in drawer; updating persists immediately to IndexedDB; the card pill updates without re-fetching anything.
- **Notes**: `<textarea>` autosaves on blur with a 500ms debounce.

## 8. Auth & repo handling

### PAT entry flow

1. First-load modal: "Paste a GitHub PAT (only `public_repo` scope is needed; use `repo` if you want private repos)."
2. Link to GitHub's PAT-creation page with the right scopes pre-selected.
3. On submit, validate by sending `query { viewer { login } }`. On failure, modal stays open with the error.
4. On success, store under `localStorage["ghip.token"]`, close modal.
5. Settings (⚙) shows masked token + login + "Sign out" button (clears token + cache).

The settings page carries a single warning line: *"This token sits in your browser. Don't paste this app's URL into anything you don't trust."*

### Repo URL parsing

Accepts:

- `https://github.com/owner/repo`
- `http://github.com/owner/repo`
- `github.com/owner/repo`
- `owner/repo`

Strips trailing `/`, `.git`, `/issues`, `/pulls`, query strings, and hashes. Invalid input shows a non-blocking inline error and the previous repo stays loaded.

## 9. Sync, rate limits, errors

### Rate-limit awareness

Each GraphQL response includes `rateLimit { remaining, resetAt, cost }`. The header shows a small "rate: 4870 / 5000" indicator. Before starting a bulk fetch the app estimates cost (≈ 7 requests × 10–20 cost each for mtasa-blue size) and aborts with a friendly error if `remaining < estimated_cost`.

If the limit is hit mid-fetch, persist what we have, mark the cache as `partial: true`, and show: *"Showing 400 of ~712 issues. Refresh available at 14:32."* Filtering still works on partial data.

### Sync model (v1)

- Initial repo load: full bulk fetch
- TTL: 1 hour. After that, the "fetched Xm ago" badge turns soft red.
- Refresh button: full re-fetch (correct, simple). Shows progress (page X of Y).
- Stale-while-revalidate: cached data shown during refresh.
- v2 enhancement (out of scope for now): incremental sync via `filterBy: { since: lastSyncedAt }`.

### Error states

| Condition | Behavior |
|---|---|
| Bad PAT | Settings modal reopens with red error message |
| Repo not found / 404 | Empty state echoes parsed `owner/repo`: "Couldn't find that repo. Typo?" |
| Insufficient PAT scope (private repo) | Error suggesting re-mint with `repo` scope, link provided |
| Network down | Keep cached data, banner: *"Offline — showing cached snapshot from Xm ago."* |
| Empty after filtering | Empty state with "Clear all filters" button |
| GraphQL secondary rate-limit (abuse) | Retry with backoff, max 3 attempts, then partial cache |

## 10. Testing

- **Vitest + React Testing Library** (Vite default).
- **Filter pipeline**: one test file per filter, plus a combined-filter test exercising AND interaction. Pure functions, exhaustive cases (zero matches, all match, edge values for numeric ranges).
- **Heuristic detectors**: `hasReproSteps` and `linkedPRs` against a fixture corpus drawn from real (anonymized) mtasa-blue issues. Add fixtures over time as edge cases come up.
- **Data-layer mapper**: feed canned GraphQL JSON, assert the produced `Issue` has correct `linkedPRs`, `lastReporterActivityAt`, `hasReproSteps`. This is the trickiest piece because the mapper translates timeline events into derived flags.
- **IndexedDB layer**: round-trip tests using `fake-indexeddb` (read what you wrote, TTL expiry, partial-cache flag, composite-key lookup).
- **Components**: RTL tests for `FilterSidebar` (toggling updates state), `IssueCard` (signal pills render conditionally), `Drawer` (annotation persists on status change).
- **No E2E** for v1.

## 11. Open questions / future work

- v2: incremental sync using `since`
- v2: optional GitHub OAuth Device Flow instead of PAT (still client-only, no backend)
- Closed-issue mode (toggle) for studying past fixes
- Bulk-skip ("hide all issues older than 2 years")
- Heuristic tuning over time as `hasReproSteps` misclassifies things — log near-misses to a debug panel

## 12. Build sequence (handed to writing-plans)

Suggested high-level slices, each independently shippable:

1. Project skeleton: Vite + React + TS + Vitest + Prettier + ESLint
2. Auth modal + PAT validation + settings
3. Repo URL bar + parser
4. Data layer: GraphQL client, paginated fetch, mapper, mocked tests
5. IndexedDB cache + stale-while-revalidate hook
6. Filter pipeline (pure functions) + tests
7. Heuristic detectors + fixture tests
8. Filter sidebar UI + live counts
9. Issue list + cards
10. Issue detail drawer
11. Annotations store + UI
12. Filter presets (built-in + user-saved)
13. Rate-limit awareness UI + error states
14. Polish, deploy to GitHub Pages
