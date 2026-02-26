import { describe, it, expect } from 'vitest';
import { computePosterior, probPositive, sampleFromPosterior } from './bayesian';
import { Observation } from '../types';

const DEFAULT_CONFIG = { baseline: 69, tau: 2.5, sigma: 12 };

describe('computePosterior', () => {
  it('returns empty posterior for no interventions', () => {
    const p = computePosterior([], [], DEFAULT_CONFIG);
    expect(p.mean).toEqual([]);
    expect(p.cov).toEqual([]);
    expect(p.std).toEqual([]);
    expect(p.precision).toEqual([]);
  });

  it('returns prior when there are no observations', () => {
    const p = computePosterior(['A', 'B'], [], DEFAULT_CONFIG);
    expect(p.mean).toEqual([0, 0]);
    expect(p.std).toEqual([2.5, 2.5]);
    // cov should be tau^2 * I
    expect(p.cov[0][0]).toBeCloseTo(6.25);
    expect(p.cov[0][1]).toBeCloseTo(0);
    expect(p.cov[1][1]).toBeCloseTo(6.25);
  });

  it('updates posterior with a single observation', () => {
    const obs: Observation[] = [{
      date: '2024-01-01',
      interventions: [true],
      score: 79, // 79 - 69 = 10 above baseline
    }];
    const p = computePosterior(['A'], obs, DEFAULT_CONFIG);

    // Posterior mean should be pulled toward 10 (the observed effect)
    expect(p.mean[0]).toBeGreaterThan(0);
    expect(p.mean[0]).toBeLessThan(10);

    // Posterior std should be less than prior std
    expect(p.std[0]).toBeLessThan(2.5);
  });

  it('handles multiple interventions and observations', () => {
    const obs: Observation[] = [
      { date: '2024-01-01', interventions: [true, false], score: 79 },
      { date: '2024-01-02', interventions: [false, true], score: 59 },
      { date: '2024-01-03', interventions: [true, true], score: 74 },
    ];
    const p = computePosterior(['A', 'B'], obs, DEFAULT_CONFIG);

    // Should have correct shape
    expect(p.mean).toHaveLength(2);
    expect(p.std).toHaveLength(2);
    expect(p.cov).toHaveLength(2);
    expect(p.cov[0]).toHaveLength(2);

    // Cov should be symmetric
    expect(p.cov[0][1]).toBeCloseTo(p.cov[1][0]);

    // Std should match diagonal of cov
    expect(p.std[0]).toBeCloseTo(Math.sqrt(p.cov[0][0]));
    expect(p.std[1]).toBeCloseTo(Math.sqrt(p.cov[1][1]));

    // A had positive observed effects, B had negative
    expect(p.mean[0]).toBeGreaterThan(p.mean[1]);
  });

  it('throws on observations with mismatched intervention vector lengths', () => {
    const obs: Observation[] = [
      { date: '2024-01-01', interventions: [true], score: 79 },
      { date: '2024-01-02', interventions: [true, false], score: 79 },
    ];
    expect(() => computePosterior(['A', 'B'], obs, DEFAULT_CONFIG)).toThrow(
      /Observation vector length mismatch/
    );
  });

  it('throws on observations with longer intervention vectors', () => {
    const obs: Observation[] = [
      { date: '2024-01-01', interventions: [true, false, true], score: 79 },
    ];
    expect(() => computePosterior(['A', 'B'], obs, DEFAULT_CONFIG)).toThrow(
      /Observation vector length mismatch/
    );
  });

  it('ignores observations with empty intervention vectors', () => {
    const obs: Observation[] = [
      { date: '2024-01-01', interventions: [], score: 79 },
      { date: '2024-01-02', interventions: [true, false], score: 79 },
    ];
    const p = computePosterior(['A', 'B'], obs, DEFAULT_CONFIG);

    // Only the second observation should be used
    expect(p.mean).toHaveLength(2);
    expect(p.std[0]).toBeLessThan(2.5);
  });
});

describe('probPositive', () => {
  it('returns 0.5 for mean=0', () => {
    expect(probPositive(0, 1)).toBeCloseTo(0.5);
  });

  it('returns > 0.5 for positive mean', () => {
    expect(probPositive(2, 1)).toBeGreaterThan(0.5);
  });

  it('returns < 0.5 for negative mean', () => {
    expect(probPositive(-2, 1)).toBeLessThan(0.5);
  });

  it('returns 1 for positive mean with std=0', () => {
    expect(probPositive(5, 0)).toBe(1);
  });

  it('returns 0 for negative mean with std=0', () => {
    expect(probPositive(-5, 0)).toBe(0);
  });

  it('returns 0 for zero mean with std=0', () => {
    expect(probPositive(0, 0)).toBe(0);
  });
});

describe('sampleFromPosterior', () => {
  it('returns empty for empty input', () => {
    expect(sampleFromPosterior([], [])).toEqual([]);
  });

  it('output length matches input length', () => {
    const mean = [1, 2, 3];
    const cov = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const sample = sampleFromPosterior(mean, cov);
    expect(sample).toHaveLength(3);
  });

  it('mean of many samples ≈ posterior mean', () => {
    const mean = [3, -2];
    const cov = [[1, 0.5], [0.5, 2]];
    const N = 5000;
    const sums = [0, 0];

    for (let i = 0; i < N; i++) {
      const s = sampleFromPosterior(mean, cov);
      sums[0] += s[0];
      sums[1] += s[1];
    }

    expect(sums[0] / N).toBeCloseTo(3, 0);
    expect(sums[1] / N).toBeCloseTo(-2, 0);
  });
});
