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
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%`, backgroundColor: color || undefined }}
        />
      </div>
    </div>
  );
}
