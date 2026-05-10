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
