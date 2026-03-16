import { useMatrixTooltip, MatrixTooltip } from './MatrixTooltip';

interface CovarianceMatrixProps {
  interventions: string[];
  cov: number[][];
}

export function CovarianceMatrix({ interventions, cov }: CovarianceMatrixProps) {
  const n = interventions.length;
  const { tooltip, onCellEnter, onCellMove, onCellLeave } = useMatrixTooltip();
  if (n < 2) return null;

  // Cell size and layout
  const cellSize = 40;
  const labelWidth = 120;
  const padding = 8;
  const width = labelWidth + n * cellSize + padding * 2;
  const height = n * cellSize + padding * 2;

  // Find max absolute covariance separately for diagonal and off-diagonal
  // so off-diagonal values aren't crushed by the much larger diagonal
  let maxAbsDiag = 0;
  let maxAbsOff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const absVal = Math.abs(cov[i][j]);
      if (i === j) {
        if (absVal > maxAbsDiag) maxAbsDiag = absVal;
      } else {
        if (absVal > maxAbsOff) maxAbsOff = absVal;
      }
    }
  }

  // Map covariance to color, scaling off-diagonal independently
  const getColor = (value: number, isDiag: boolean): string => {
    const maxRef = isDiag ? maxAbsDiag : maxAbsOff;
    if (maxRef === 0) return 'rgba(var(--neutral-gray-rgb), 0.15)';
    const intensity = Math.abs(value) / maxRef;
    const curved = intensity ** 0.6; // Gentler curve to spread out mid-range values
    if (value > 0) {
      return `rgba(var(--green-rgb), ${0.1 + curved * 0.85})`;
    } else if (value < 0) {
      return `rgba(var(--red-rgb), ${0.1 + curved * 0.85})`;
    }
    return 'rgba(var(--neutral-gray-rgb), 0.15)';
  };

  // Truncate long names
  const truncateName = (name: string, maxLen: number = 12): string => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '…';
  };

  return (
    <div className="vis-card">
      <h3>Uncertainty Relationships (covariance matrix)</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        How uncertainty about each intervention's effect is linked.
        This depends on which interventions you've tested together, not on your sleep scores.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(var(--green-rgb), 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Positive: exclusive groups, estimates move together</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(var(--red-rgb), 0.6)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Negative: tested together, estimates compete for credit</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(var(--neutral-gray-rgb), 0.5)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span>Zero: tested independently</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: width, display: 'block' }}
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
                  width={cellSize}
                  height={cellSize}
                  fill={getColor(cov[i][j], i === j)}
                  rx={3}
                  stroke="var(--bg-panel-dark)"
                  strokeWidth={2}
                  onMouseEnter={(e) => onCellEnter(e, `${intervention} \u00d7 ${interventions[j]}: ${cov[i][j].toFixed(3)}`)}
                  onMouseMove={onCellMove}
                  onMouseLeave={onCellLeave}
                />
              ))}
            </g>
          ))}
        </svg>
        <MatrixTooltip tooltip={tooltip} />
      </div>
    </div>
  );
}
