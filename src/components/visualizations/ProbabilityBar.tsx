interface ProbabilityBarProps {
  probability: number;
}

export function ProbabilityBar({ probability }: ProbabilityBarProps) {
  const pct = (probability * 100).toFixed(0);
  const isHigh = probability > 0.7;
  const isLow = probability < 0.3;

  return (
    <div className="prob-bar-container">
      <div
        className={`prob-bar-fill ${isHigh ? 'high' : ''} ${isLow ? 'low' : ''}`}
        style={{ width: `${pct}%` }}
      />
      <span className="prob-bar-label">{pct}%</span>
    </div>
  );
}
