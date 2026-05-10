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

  if (stripped.includes('//')) return null;

  const parts = stripped.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo) return null;

  return { owner, repo };
}
