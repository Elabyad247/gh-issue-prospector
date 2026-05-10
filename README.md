# gh-issue-prospector

Personal browser-based tool for filtering OSS issues with custom signals beyond what GitHub's UI exposes (no comments, no linked PR, has repro steps, abandoned-trap detection, etc.).

## Local dev

```bash
npm install
npm run dev
```

Vite serves on `http://localhost:5173`.

## Test

```bash
npm test            # one-shot
npm run test:watch  # watch mode
```

## Build & deploy

```bash
npm run build       # output in dist/
npm run preview     # serve the production build locally on port 4173
```

To deploy to GitHub Pages: push `dist/` to a `gh-pages` branch, or use a Pages action workflow. The app uses `base: './'` in `vite.config.ts` so it works regardless of repo path.

## Auth

On first load, paste a GitHub Personal Access Token (`public_repo` scope; `repo` for private repos). The token sits in `localStorage` and never leaves the browser.

## Architecture

Three layers under `src/`:

- `data/` — GraphQL client, paginated fetcher, IndexedDB cache, localStorage helpers
- `state/` — pure filter predicates, heuristic detectors, React hooks
- `ui/` — components only; reads exclusively through hooks

See `docs/superpowers/specs/2026-05-10-gh-issue-prospector-design.md` for the full design.
