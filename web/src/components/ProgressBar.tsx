// Simple percentage bar. At 100% the bar is replaced by a "Complete" chip.
export function ProgressBar({ pct, small }: { pct: number; small?: boolean }) {
  if (pct >= 100) {
    return <span className={`complete-chip ${small ? 'small' : ''}`}>✓ Complete</span>;
  }
  const frac = Math.min(100, Math.max(0, pct)) / 100;
  return (
    <div className={`progress ${small ? 'small' : ''}`}>
      {/* Animate transform (GPU) rather than width (layout). */}
      <div className="progress-fill" style={{ transform: `scaleX(${frac})` }} />
    </div>
  );
}
