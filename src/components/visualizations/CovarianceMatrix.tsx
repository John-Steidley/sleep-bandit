interface CovarianceMatrixProps {
  interventions: string[];
  cov: number[][];
}

export function CovarianceMatrix({ interventions, cov }: CovarianceMatrixProps) {
  const n = interventions.length;
  if (n < 2) return null;

  // Cell size and layout
  const cellSize = 40;
  const labelWidth = 120;
  const padding = 8;
  const width = labelWidth + n * cellSize + padding * 2;
  const height = n * cellSize + padding * 2;

  // Find max absolute covariance for scaling colors
  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const absVal = Math.abs(cov[i][j]);
      if (absVal > maxAbs) maxAbs = absVal;
    }
  }

  // Map covariance to color
  // Use power curve to fade more toward grey near zero, brighter at extremes
  const getColor = (value: number): string => {
    if (maxAbs === 0) return 'rgba(128, 128, 128, 0.15)';
    const intensity = Math.abs(value) / maxAbs;
    const curved = intensity ** 2; // Faster fade near zero
    if (value > 0) {
      return `rgba(34, 197, 94, ${0.08 + curved * 0.85})`;
    } else if (value < 0) {
      return `rgba(239, 68, 68, ${0.08 + curved * 0.85})`;
    }
    return 'rgba(128, 128, 128, 0.15)';
  };

  // Truncate long names
  const truncateName = (name: string, maxLen: number = 12): string => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '…';
  };

  return (
    <div className="covariance-matrix">
      <h3>Uncertainty Relationships (covariance matrix)</h3>
      <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        How uncertainty about each intervention's effect is linked.
        This depends on which interventions you've tested together, not on your sleep scores.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(34, 197, 94, 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Positive: exclusive groups, estimates move together</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(239, 68, 68, 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Negative: tested together, estimates compete for credit</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(128, 128, 128, 0.5)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Zero: tested independently</span>
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
              fill="#9ca3af"
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
                fill={getColor(cov[i][j])}
                rx={3}
              >
                <title>
                  {intervention} × {interventions[j]}: {cov[i][j].toFixed(3)}
                </title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
