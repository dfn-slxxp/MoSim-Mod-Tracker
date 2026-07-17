// Simple percentage bar; gradient shifts to solid green at 100%.
export function ProgressBar({ pct, small }: { pct: number; small?: boolean }) {
  return (
    <div className={`progress ${small ? 'small' : ''}`}>
      <div
        className={`progress-fill ${pct >= 100 ? 'complete' : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
