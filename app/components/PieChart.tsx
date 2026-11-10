export type PieSlice = { label: string; value: number; color: string };

export function PieChart({ slices, size = 120 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const r = size / 2;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={r} cy={r} r={r} fill="#f1f5f9" />
        <title>No data yet</title>
      </svg>
    );
  }

  const point = (angle: number) => [r + r * Math.sin(angle), r - r * Math.cos(angle)];
  let start = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {slices
        .filter((slice) => slice.value > 0)
        .map((slice) => {
          const fraction = slice.value / total;
          const title = `${slice.label}: ${slice.value} (${Math.round(fraction * 100)}%)`;

          if (fraction >= 1) {
            return (
              <circle key={slice.label} cx={r} cy={r} r={r} fill={slice.color}>
                <title>{title}</title>
              </circle>
            );
          }

          const end = start + fraction * Math.PI * 2;
          const [x1, y1] = point(start);
          const [x2, y2] = point(end);
          const largeArc = fraction > 0.5 ? 1 : 0;
          const d = `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          start = end;

          return (
            <path
              key={slice.label}
              d={d}
              fill={slice.color}
              stroke="#ffffff"
              strokeWidth={2}
              className="transition-opacity duration-200 hover:opacity-80"
            >
              <title>{title}</title>
            </path>
          );
        })}
    </svg>
  );
}

