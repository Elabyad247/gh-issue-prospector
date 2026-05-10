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
