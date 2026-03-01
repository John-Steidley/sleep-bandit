import type { Observation } from '../../types';

interface MeanScoresTableProps {
  interventions: string[];
  observations: Observation[];
}

export function MeanScoresTable({ interventions, observations }: MeanScoresTableProps) {
  if (interventions.length === 0 || observations.length === 0) return null;

  const stats = interventions.map((name, i) => {
    let activeSum = 0, activeCount = 0;
    let inactiveSum = 0, inactiveCount = 0;
    for (const obs of observations) {
      if (obs.interventions[i]) {
        activeSum += obs.score;
        activeCount++;
      } else {
        inactiveSum += obs.score;
        inactiveCount++;
      }
    }
    return {
      name,
      activeCount,
      activeMean: activeCount > 0 ? activeSum / activeCount : null,
      inactiveCount,
      inactiveMean: inactiveCount > 0 ? inactiveSum / inactiveCount : null,
    };
  });

  const fmt = (v: number | null) => v !== null ? v.toFixed(1) : '—';

  return (
    <div className="covariance-matrix">
      <h3>Mean Sleep Scores</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        Average sleep score when each intervention is active vs. inactive. Unlike the model estimates,
        these are raw averages that don't control for other interventions.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(var(--neutral-gray-rgb), 0.3)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Intervention</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Trials (Active)</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Mean (Active)</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Trials (Inactive)</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Mean (Inactive)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.name} style={{ borderBottom: '1px solid rgba(var(--neutral-gray-rgb), 0.12)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{s.name}</td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-primary)' }}>{s.activeCount}</td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-primary)' }}>{fmt(s.activeMean)}</td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-primary)' }}>{s.inactiveCount}</td>
                <td style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-primary)' }}>{fmt(s.inactiveMean)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
