export function ProgressBar({
  value,
  total,
  className = "",
  color,
}: {
  value: number;
  total: number;
  className?: string;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={className}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, backgroundColor: color || undefined }}
        />
      </div>
    </div>
  );
}
