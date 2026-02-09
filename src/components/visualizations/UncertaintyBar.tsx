interface UncertaintyBarProps {
  mean: number;
  std: number;
}

export function UncertaintyBar({ mean, std }: UncertaintyBarProps) {
  // Scale: +/-10 points covers most realistic ranges
  const scale = 10;
  const lowerBound = mean - std;
  const upperBound = mean + std;

  // Convert to percentages (0-100%)
  const meanPercent = ((mean + scale) / (2 * scale)) * 100;
  const lowerPercent = ((lowerBound + scale) / (2 * scale)) * 100;
  const upperPercent = ((upperBound + scale) / (2 * scale)) * 100;
  const zeroPercent = ((0 + scale) / (2 * scale)) * 100;

  // Clamp to visible range
  const clamp = (val: number) => Math.max(0, Math.min(100, val));
  const rangeLower = clamp(lowerPercent);
  const rangeUpper = clamp(upperPercent);
  const rangeWidth = rangeUpper - rangeLower;

  // Determine color based on whether interval crosses zero
  let rangeClass = 'mixed';
  if (lowerBound > 0) rangeClass = 'positive';
  else if (upperBound < 0) rangeClass = 'negative';

  const meanClass = mean > 0 ? 'positive' : 'negative';

  return (
    <div className="uncertainty-bar-container">
      <div className="uncertainty-bar-scale" />
      <div
        className="uncertainty-bar-zero"
        style={{ left: `${zeroPercent}%` }}
      />
      <div
        className={`uncertainty-bar-range ${rangeClass}`}
        style={{
          left: `${rangeLower}%`,
          width: `${rangeWidth}%`
        }}
      />
      <div
        className={`uncertainty-bar-mean ${meanClass}`}
        style={{ left: `${clamp(meanPercent)}%` }}
      />
    </div>
  );
}
