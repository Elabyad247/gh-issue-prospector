import type { Issue, SortKey } from '../types';

export function sortIssues(issues: Issue[], key: SortKey): Issue[] {
  const copy = [...issues];
  const byNumber = (a: Issue, b: Issue) => b.number - a.number;
  switch (key) {
    case 'newest':
      return copy.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || byNumber(a, b),
      );
    case 'oldest':
      return copy.sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || byNumber(a, b),
      );
    case 'most-commented':
      return copy.sort((a, b) => b.commentCount - a.commentCount || byNumber(a, b));
    case 'least-commented':
      return copy.sort((a, b) => a.commentCount - b.commentCount || byNumber(a, b));
    case 'recently-updated':
      return copy.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || byNumber(a, b),
      );
    case 'most-reactions':
      return copy.sort((a, b) => b.reactionCount - a.reactionCount || byNumber(a, b));
  }
}
