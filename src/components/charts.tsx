export function LineChart({ points, label }: { points: { label: string; value: number }[]; label: string }) {
  const W = 600, H = 200, P = 28;
  if (points.length === 0) return null;
  const x = (i: number) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={4} y={y(g) + 4} fontSize="11" fill="var(--color-muted)">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--color-signal)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="5" fill="white" stroke="var(--color-signal)" strokeWidth="2.5"><title>{`${p.label}: ${p.value}`}</title></circle>
          <text x={x(i)} y={y(p.value) - 11} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-ink)">{p.value}</text>
        </g>
      ))}
    </svg>
  );
}
