interface PosteriorCurveProps {
  mean: number;
  std: number;
  minStd: number;
}

export function PosteriorCurve({ mean, std, minStd }: PosteriorCurveProps) {
  const width = 200;
  const height = 40;
  const padding = 2;

  // Scale: +/-10 points covers most realistic ranges
  const scale = 10;

  // Reference std for consistent scaling across all curves
  // Based on the minimum std currently in the app so the most confident curve fills the height
  const referenceMaxY = 1 / (minStd * Math.sqrt(2 * Math.PI));

  // Generate points for the normal distribution curve
  const points: { x: number; y: number }[] = [];
  const numPoints = 100;

  for (let i = 0; i <= numPoints; i++) {
    const x = -scale + (2 * scale * i / numPoints);
    const z = (x - mean) / std;
    const y = Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
    points.push({ x, y });
  }

  // Use fixed reference for scaling (not per-curve max)
  const maxY = referenceMaxY;

  // Convert to SVG coordinates
  const toSvgX = (x: number) => padding + ((x + scale) / (2 * scale)) * (width - 2 * padding);
  const toSvgY = (y: number) => height - padding - (y / maxY) * (height - 2 * padding);

  const zeroX = toSvgX(0);

  // Split points into negative (x < 0) and positive (x >= 0) regions
  const negativePoints = points.filter(p => p.x <= 0);
  const positivePoints = points.filter(p => p.x >= 0);

  // Create path for negative region (x < 0)
  const negativePathD = negativePoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`
  ).join(' ');
  const negativeAreaD = negativePathD +
    ` L ${zeroX.toFixed(1)} ${height - padding} L ${toSvgX(-scale).toFixed(1)} ${height - padding} Z`;

  // Create path for positive region (x >= 0)
  const positivePathD = positivePoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`
  ).join(' ');
  const positiveAreaD = positivePathD +
    ` L ${toSvgX(scale).toFixed(1)} ${height - padding} L ${zeroX.toFixed(1)} ${height - padding} Z`;

  return (
    <svg className="posterior-curve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Baseline */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="rgba(var(--white-rgb),0.1)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {/* Zero line */}
      <line
        x1={zeroX}
        y1={padding}
        x2={zeroX}
        y2={height - padding}
        stroke="rgba(var(--white-rgb),0.3)"
        strokeWidth="1"
        strokeDasharray="2,2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Negative filled area (red) */}
      <path
        d={negativeAreaD}
        fill="rgba(var(--red-rgb), 0.3)"
      />
      {/* Positive filled area (green) */}
      <path
        d={positiveAreaD}
        fill="rgba(var(--green-rgb), 0.3)"
      />
      {/* Curve stroke - split at zero */}
      <path
        d={negativePathD}
        fill="none"
        stroke="var(--red)"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={positivePathD}
        fill="none"
        stroke="var(--green)"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
