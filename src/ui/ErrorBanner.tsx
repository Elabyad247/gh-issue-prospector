export type ErrorBannerProps = {
  kind: 'offline' | 'partial' | 'rate-limit' | 'auth' | 'not-found' | 'generic';
  message: string;
  resetAt?: string;
  onDismiss?: () => void;
};

export function ErrorBanner(p: ErrorBannerProps) {
  return (
    <div className={`error-banner banner-${p.kind}`} role="alert">
      <span>{p.message}</span>
      {p.resetAt && (
        <span className="muted small"> Resets at {new Date(p.resetAt).toLocaleTimeString()}.</span>
      )}
      {p.onDismiss && (
        <button className="dismiss" onClick={p.onDismiss} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
