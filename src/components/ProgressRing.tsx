export function ProgressRing({
  pct,
  size = 58,
  stroke = 4,
  color,
  labelSize = 14,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  labelSize?: number;
}) {
  const r = size / 2 - stroke;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = `${(pct / 100) * circumference} ${circumference}`;

  return (
    <div style={{ position: "relative", flex: "none", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--color-neutral-300)"
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color ?? "var(--color-accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
          fontSize: labelSize,
          fontFeatureSettings: "'tnum' 1",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}
