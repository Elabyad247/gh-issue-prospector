export type RepoRef = { owner: string; repo: string };

const OWNER_RE = /^[\w-]+$/;
const REPO_RE = /^[\w.-]+$/;
const GITHUB_PREFIX = 'github.com/';

export function parseRepoUrl(input: string): RepoRef | null {
  const stripped = input
    .trim()
    .toLowerCase()
    .replace(/^git@github\.com:/, GITHUB_PREFIX)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');

  const hosted = stripped.startsWith(GITHUB_PREFIX);
  const path = hosted ? stripped.slice(GITHUB_PREFIX.length) : stripped;
  const parts = path.split('/');
  if (hosted ? parts.length < 2 : parts.length !== 2) return null;

  const owner = parts[0] ?? '';
  const repo = (parts[1] ?? '').replace(/\.git$/, '');
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;

  return { owner, repo };
}
