/** The product's signature element: a ring showing how well a resume fits a job. */
export default function ScoreRing({ score = 0, size = 48, stroke = 5, animate = false, label = true }) {
  const r = (size - stroke) / 2;
  const full = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, score ?? 0));
  const color = value >= 70 ? "#0E5A54" : value >= 45 ? "#E7A33E" : "#B9412F";
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}
         role="img" aria-label={`Match score ${Math.round(value)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6ECEA" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={full} strokeDashoffset={full * (1 - value / 100)}
          className={animate ? "ring-animate" : ""} style={{ "--full": full }}
        />
      </svg>
      {label && (
        <span className="absolute font-display font-semibold tabular-nums text-ink"
              style={{ fontSize: Math.max(11, size * 0.28) }}>
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}
