export function Spinner({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <span
      className="spinner"
      role="status"
      aria-label={label ?? 'Loading'}
      style={{ width: size, height: size }}
    />
  );
}
