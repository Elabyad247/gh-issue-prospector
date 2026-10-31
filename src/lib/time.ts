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

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${plural(minutes, 'minute')} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${plural(hours, 'hour')} ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${plural(days, 'day')} ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
