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
