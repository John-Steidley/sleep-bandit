import { describe, it, expect } from 'vitest';
import { expectedImprovement } from './bayesian';
import { normalCDF } from './matrix';
import { Intervention, Group, Posterior } from '../types';

/**
 * Helper: build a minimal Posterior from arrays of means and stds.
 * (cov and precision are not used by expectedImprovement, so we stub them.)
 */
function makePosterior(means: number[], stds: number[]): Posterior {
  const k = means.length;
  return {
    mean: means,
    std: stds,
    cov: Array(k).fill(null).map(() => Array(k).fill(0)),
    precision: Array(k).fill(null).map(() => Array(k).fill(0)),
  };
}

function makeInterventions(count: number, disabled?: number[]): Intervention[] {
  const disabledSet = new Set(disabled ?? []);
  return Array.from({ length: count }, (_, i) => ({
    name: `int-${i}`,
    disabled: disabledSet.has(i),
  }));
}

/** Compute the std that yields a given p_positive for a given mean. */
function stdForPPositive(mean: number, p: number): number {
  // p = Φ(mean/std), so mean/std = Φ⁻¹(p)
  // For p=0.75, Φ⁻¹(0.75) ≈ 0.6745
  // std = mean / Φ⁻¹(p)
  // We use a simple Newton's method to invert normalCDF.
  let z = 0;
  for (let iter = 0; iter < 100; iter++) {
    const cdf = normalCDF(z);
    const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    z -= (cdf - p) / pdf;
  }
  return mean / z;
}

describe('expectedImprovement', () => {
  it('returns 0 for no interventions', () => {
    const result = expectedImprovement([], makePosterior([], []), []);
    expect(result).toBe(0);
  });

  it('single enabled intervention with strongly positive mean', () => {
    // mean=5, std=1 → p_positive = Φ(5) ≈ 0.9999997
    // Expected ≈ 5 × Φ(5) ≈ 5.0
    const interventions = makeInterventions(1);
    const posterior = makePosterior([5], [1]);
    const result = expectedImprovement(interventions, posterior, []);
    expect(result).toBeCloseTo(5 * normalCDF(5), 4);
  });

  it('single intervention with zero mean returns 0', () => {
    // mean=0, std=2.5 → p_positive=0.5, expected = 0 × 0.5 = 0
    const interventions = makeInterventions(1);
    const posterior = makePosterior([0], [2.5]);
    const result = expectedImprovement(interventions, posterior, []);
    expect(result).toBe(0);
  });

  it('single intervention with strongly negative mean is near zero', () => {
    // mean=-5, std=1 → p_positive = Φ(-5) ≈ 2.87e-7
    // Expected = -5 × 2.87e-7 ≈ -1.4e-6 ≈ 0
    const interventions = makeInterventions(1);
    const posterior = makePosterior([-5], [1]);
    const result = expectedImprovement(interventions, posterior, []);
    expect(Math.abs(result)).toBeLessThan(0.001);
  });

  it('two ungrouped interventions: user example (mean=1, p=0.75 each → 1.5)', () => {
    const std = stdForPPositive(1, 0.75);
    const interventions = makeInterventions(2);
    const posterior = makePosterior([1, 1], [std, std]);
    const result = expectedImprovement(interventions, posterior, []);
    expect(result).toBeCloseTo(1.5, 3);
  });

  it('disabled intervention contributes nothing', () => {
    // Intervention 0: enabled, mean=3, std=1
    // Intervention 1: disabled, mean=3, std=1
    // Only intervention 0 should contribute
    const interventions = makeInterventions(2, [1]);
    const posterior = makePosterior([3, 3], [1, 1]);
    const result = expectedImprovement(interventions, posterior, []);
    const expected = 3 * normalCDF(3);
    expect(result).toBeCloseTo(expected, 4);
  });

  it('group of 2: one very positive, one very negative → positive dominates', () => {
    // A: mean=10, std=1 (p≈1), B: mean=-10, std=1 (p≈0)
    // A almost always wins and is positive. B almost never activates.
    // Expected ≈ 10
    const interventions = makeInterventions(2);
    const posterior = makePosterior([10, -10], [1, 1]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1] }];
    const result = expectedImprovement(interventions, posterior, groups);
    expect(result).toBeCloseTo(10, 1);
  });

  it('group of 2: symmetric (mean=1, p=0.75) → μ×(1-(1-p)²)', () => {
    // Symmetric group: expected = μ × (1 - (1-p)^m) = 1 × (1 - 0.25²) = 0.9375
    const std = stdForPPositive(1, 0.75);
    const interventions = makeInterventions(2);
    const posterior = makePosterior([1, 1], [std, std]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1] }];
    const result = expectedImprovement(interventions, posterior, groups);
    expect(result).toBeCloseTo(0.9375, 2);
  });

  it('group of 3: symmetric (mean=1, p=0.75) → μ×(1-(1-p)³)', () => {
    // Expected = 1 × (1 - 0.25³) = 1 × 0.984375
    const std = stdForPPositive(1, 0.75);
    const interventions = makeInterventions(3);
    const posterior = makePosterior([1, 1, 1], [std, std, std]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1, 2] }];
    const result = expectedImprovement(interventions, posterior, groups);
    expect(result).toBeCloseTo(0.984375, 2);
  });

  it('group of 2: both strongly positive, different means → close to better mean', () => {
    // A: mean=3, std=0.5; B: mean=5, std=0.5
    // Both almost always positive. B wins most of the time.
    // P(B>A) = Φ((5-3)/√(0.25+0.25)) = Φ(2/√0.5) = Φ(2.828) ≈ 0.9977
    // Expected ≈ 3×0.0023 + 5×0.9977 ≈ 4.995
    const interventions = makeInterventions(2);
    const posterior = makePosterior([3, 5], [0.5, 0.5]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1] }];
    const result = expectedImprovement(interventions, posterior, groups);
    expect(result).toBeCloseTo(4.995, 1);
  });

  it('mixed: ungrouped + grouped + disabled', () => {
    // Int 0: ungrouped, enabled, mean=2, std=0.5 → contributes 2×Φ(4) ≈ 2.0
    // Int 1: in group, enabled, mean=1, p=0.75
    // Int 2: in group, enabled, mean=1, p=0.75
    // Int 3: disabled, mean=3, std=1 → contributes 0
    // Group contribution ≈ 0.9375
    // Total ≈ 2×Φ(4) + 0.9375 ≈ 2.9375
    const std75 = stdForPPositive(1, 0.75);
    const interventions = makeInterventions(4, [3]);
    const posterior = makePosterior([2, 1, 1, 3], [0.5, std75, std75, 1]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [1, 2] }];
    const result = expectedImprovement(interventions, posterior, groups);
    const ungroupedContrib = 2 * normalCDF(2 / 0.5);
    const groupContrib = 0.9375;
    expect(result).toBeCloseTo(ungroupedContrib + groupContrib, 1);
  });

  it('group where all members have negative mean → near zero', () => {
    // A: mean=-2, std=1; B: mean=-3, std=1
    // Both have low p_positive. Contribution is negative but near zero.
    const interventions = makeInterventions(2);
    const posterior = makePosterior([-2, -3], [1, 1]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1] }];
    const result = expectedImprovement(interventions, posterior, groups);
    expect(Math.abs(result)).toBeLessThan(0.1);
  });

  it('group where one member is disabled → only enabled member contributes', () => {
    // Int 0: in group, enabled, mean=2, std=1
    // Int 1: in group, disabled, mean=5, std=1
    // Only int 0 should contribute, as simple μ×p
    const interventions = makeInterventions(2, [1]);
    const posterior = makePosterior([2, 5], [1, 1]);
    const groups: Group[] = [{ name: 'g', interventionIndices: [0, 1] }];
    const result = expectedImprovement(interventions, posterior, groups);
    const expected = 2 * normalCDF(2);
    expect(result).toBeCloseTo(expected, 4);
  });
});
