// Simple percentage bar. At 100% the bar is replaced by a "Complete" chip.
export function ProgressBar({ pct, small }: { pct: number; small?: boolean }) {
  if (pct >= 100) {
    return <span className={`complete-chip ${small ? 'small' : ''}`}>✓ Complete</span>;
  }
  return (
    <div className={`progress ${small ? 'small' : ''}`}>
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
