import type { Observation } from '../../types';

interface CooccurrenceMatrixProps {
  interventions: string[];
  observations: Observation[];
}

export function CooccurrenceMatrix({ interventions, observations }: CooccurrenceMatrixProps) {
  const n = interventions.length;
  if (n < 2) return null;

  // Build co-occurrence counts
  // Diagonal: how many times each intervention was active
  // Off-diagonal: how many times both interventions were active on the same night
  const counts: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (const obs of observations) {
    for (let i = 0; i < n; i++) {
      if (!obs.interventions[i]) continue;
      counts[i][i]++;
      for (let j = i + 1; j < n; j++) {
        if (!obs.interventions[j]) continue;
        counts[i][j]++;
        counts[j][i]++;
      }
    }
  }

  const cellSize = 40;
  const labelWidth = 120;
  const padding = 8;
  const width = labelWidth + n * cellSize + padding * 2;
  const height = n * cellSize + padding * 2;

  const truncateName = (name: string, maxLen: number = 12): string => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '…';
  };

  return (
    <div className="covariance-matrix">
      <h3>Co-occurrence Matrix</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        How many nights each pair of interventions was active together.
        Diagonal shows how many nights each individual intervention was used.
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', maxWidth: width }}
      >
        {interventions.map((intervention, i) => (
          <g key={i}>
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
            {interventions.map((_, j) => {
              const count = counts[i][j];
              const isDiagonal = i === j;
              return (
                <g key={j}>
                  <rect
                    x={labelWidth + j * cellSize}
                    y={padding + i * cellSize}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill={isDiagonal ? 'rgba(var(--neutral-gray-rgb), 0.25)' : 'rgba(var(--neutral-gray-rgb), 0.12)'}
                    rx={3}
                  >
                    <title>
                      {isDiagonal
                        ? `${intervention}: used ${count} night${count !== 1 ? 's' : ''}`
                        : `${intervention} × ${interventions[j]}: co-occurred ${count} night${count !== 1 ? 's' : ''}`}
                    </title>
                  </rect>
                  <text
                    x={labelWidth + j * cellSize + (cellSize - 2) / 2}
                    y={padding + i * cellSize + (cellSize - 2) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-primary)"
                    fontSize={count >= 100 ? '9' : '11'}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight={isDiagonal ? 'bold' : 'normal'}
                  >
                    {count}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
