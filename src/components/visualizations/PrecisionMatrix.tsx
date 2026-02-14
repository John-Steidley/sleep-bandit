interface PrecisionMatrixProps {
  interventions: string[];
  precision: number[][];
}

export function PrecisionMatrix({ interventions, precision }: PrecisionMatrixProps) {
  const n = interventions.length;
  if (n < 2) return null;

  // Cell size and layout
  const cellSize = 40;
  const labelWidth = 120;
  const padding = 8;
  const width = labelWidth + n * cellSize + padding * 2;
  const height = n * cellSize + padding * 2;

  // Find max absolute precision for scaling colors
  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const absVal = Math.abs(precision[i][j]);
      if (absVal > maxAbs) maxAbs = absVal;
    }
  }

  // Map precision to color
  // Use power curve to fade more toward grey near zero, brighter at extremes
  const getColor = (value: number): string => {
    if (maxAbs === 0) return 'rgba(var(--neutral-gray-rgb), 0.15)';
    const intensity = Math.abs(value) / maxAbs;
    const curved = intensity ** 2; // Faster fade near zero
    if (value > 0) {
      return `rgba(var(--green-rgb), ${0.08 + curved * 0.85})`;
    } else if (value < 0) {
      return `rgba(var(--red-rgb), ${0.08 + curved * 0.85})`;
    }
    return 'rgba(var(--neutral-gray-rgb), 0.15)';
  };

  // Truncate long names
  const truncateName = (name: string, maxLen: number = 12): string => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '…';
  };

  return (
    <div className="precision-matrix">
      <h3>Information Matrix (precision)</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        How much information we have about each intervention's effect.
        Higher values indicate more certainty in our estimates.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(var(--green-rgb), 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Diagonal: precision of individual estimates (higher = more certain)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(var(--red-rgb), 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Off-diagonal: how observations of one inform another</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', maxWidth: width }}
      >
        {/* Row labels and cells */}
        {interventions.map((intervention, i) => (
          <g key={i}>
            {/* Row label */}
            <text
              x={labelWidth - 8}
              y={padding + i * cellSize + cellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-secondary)"
              fontSize="11"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {truncateName(intervention)}
            </text>
            {/* Cells for this row */}
            {interventions.map((_, j) => (
              <rect
                key={j}
                x={labelWidth + j * cellSize}
                y={padding + i * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={getColor(precision[i][j])}
                rx={3}
              >
                <title>
                  {intervention} × {interventions[j]}: {precision[i][j].toFixed(3)}
                </title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
