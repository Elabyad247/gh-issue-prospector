import type { RateLimit } from '../state/types';

export function RateLimitBadge({ rateLimit }: { rateLimit: RateLimit | null }) {
  if (!rateLimit) return null;
  const low = rateLimit.remaining < 500;
  return (
    <span
      className={`rate-badge ${low ? 'rate-low' : ''}`}
      title={`Resets at ${new Date(rateLimit.resetAt).toLocaleTimeString()}`}
    >
      rate {rateLimit.remaining}
    </span>
  );
}
