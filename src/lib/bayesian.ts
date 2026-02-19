/**
 * Bayesian Linear Regression for sleep intervention optimization
 */

import { Observation, Posterior, Intervention, Group } from '../types';
import {
  identity,
  transpose,
  matmul,
  addMatrices,
  scaleMatrix,
  inverse,
  cholesky,
  randn,
  normalCDF,
  normalPDF,
} from './matrix';

/**
 * Compute posterior distribution over intervention effects
 * using Bayesian linear regression with conjugate Gaussian prior
 */
export function computePosterior(
  interventions: string[],
  observations: Observation[],
  config: { baseline: number; tau: number; sigma: number }
): Posterior {
  const { baseline, tau, sigma } = config;

  const k = interventions.length;
  if (k === 0) return { mean: [], cov: [], std: [], precision: [] };

  const tauSq = tau * tau;
  const sigmaSq = sigma * sigma;

  const validObs = observations.filter(obs =>
    obs.interventions && obs.interventions.length === k
  );
  const n = validObs.length;

  const priorPrecision = scaleMatrix(identity(k), 1 / tauSq);

  if (n === 0) {
    const priorCov = scaleMatrix(identity(k), tauSq);
    return {
      mean: Array(k).fill(0),
      cov: priorCov,
      std: Array(k).fill(tau),
      precision: priorPrecision
    };
  }

  // Design matrix X and response y
  const X = validObs.map(obs =>
    interventions.map((_, i) => obs.interventions[i] ? 1 : 0)
  );
  const y = validObs.map(obs => [obs.score - baseline]);

  // Compute posterior using conjugate update
  const Xt = transpose(X);
  const XtX = matmul(Xt, X);
  const Xty = matmul(Xt, y);

  const postPrecision = addMatrices(priorPrecision, scaleMatrix(XtX, 1 / sigmaSq));
  const postCov = inverse(postPrecision);
  const scaledXty = scaleMatrix(Xty, 1 / sigmaSq);
  const postMean = matmul(postCov, scaledXty).map(row => row[0]);
  const postStd = postCov.map((row, i) => Math.sqrt(row[i]));

  return { mean: postMean, cov: postCov, std: postStd, precision: postPrecision };
}

/**
 * Sample from multivariate normal posterior using Cholesky decomposition
 */
export function sampleFromPosterior(mean: number[], cov: number[][]): number[] {
  const k = mean.length;
  if (k === 0) return [];

  const L = cholesky(cov);
  const z = Array(k).fill(0).map(() => randn());

  const sample = [...mean];
  for (let i = 0; i < k; i++) {
    for (let j = 0; j <= i; j++) {
      sample[i] += L[i][j] * z[j];
    }
  }
  return sample;
}

/**
 * Compute probability that an intervention is helpful (effect > 0)
 * P(beta > 0) = Phi(mean / std)
 */
export function probPositive(mean: number, std: number): number {
  if (std === 0) return mean > 0 ? 1 : 0;
  return normalCDF(mean / std);
}

/**
 * Compute the probability that intervention j activates in a group,
 * i.e. P(s_j > 0 AND s_j > s_k for all other k in group).
 *
 * Uses the substitution u = (x - μ_j)/σ_j to get a 1D integral:
 *   P(j activates) = ∫_{-μ_j/σ_j}^∞ φ(u) × Π_{k≠j} Φ((μ_j + σ_j·u - μ_k)/σ_k) du
 *
 * Evaluated via Simpson's rule over a truncated range.
 */
function groupActivationProbability(
  j: number,
  means: number[],
  stds: number[]
): number {
  const muJ = means[j];
  const sigJ = stds[j];

  const lowerU = Math.max(-6, -muJ / sigJ);
  const upperU = 6;
  if (lowerU >= upperU) return 0;

  const N = 200; // Simpson intervals (even)
  const h = (upperU - lowerU) / N;

  function integrand(u: number): number {
    const x = muJ + sigJ * u;
    let product = 1;
    for (let k = 0; k < means.length; k++) {
      if (k === j) continue;
      product *= normalCDF((x - means[k]) / stds[k]);
    }
    return normalPDF(u) * product;
  }

  let sum = integrand(lowerU) + integrand(upperU);
  for (let i = 1; i < N; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * integrand(lowerU + i * h);
  }
  return sum * h / 3;
}

/**
 * Expected sleep score improvement from Thompson Sampling.
 *
 * For each enabled, non-grouped intervention i:
 *   contribution_i = μ_i × P(sample_i > 0) = μ_i × p_positive_i
 *
 * For each group G (enabled members only):
 *   contribution_G = Σ_{j∈G} μ_j × P(j activates in group)
 *   where P(j activates) accounts for mutual exclusivity via numerical integration.
 */
export function expectedImprovement(
  interventions: Intervention[],
  posterior: Posterior,
  groups: Group[]
): number {
  const k = interventions.length;
  if (k === 0) return 0;

  // Identify which interventions belong to a group
  const inGroup = new Set<number>();
  for (const group of groups) {
    for (const idx of group.interventionIndices) {
      inGroup.add(idx);
    }
  }

  let total = 0;

  // Non-grouped, enabled interventions: μ × p_positive
  for (let i = 0; i < k; i++) {
    if (!interventions[i].disabled && !inGroup.has(i)) {
      total += posterior.mean[i] * probPositive(posterior.mean[i], posterior.std[i]);
    }
  }

  // Group contributions
  for (const group of groups) {
    const enabled = group.interventionIndices.filter(
      idx => idx < k && !interventions[idx].disabled
    );
    if (enabled.length === 0) continue;

    if (enabled.length === 1) {
      const i = enabled[0];
      total += posterior.mean[i] * probPositive(posterior.mean[i], posterior.std[i]);
    } else {
      const groupMeans = enabled.map(i => posterior.mean[i]);
      const groupStds = enabled.map(i => posterior.std[i]);
      for (let j = 0; j < enabled.length; j++) {
        total += groupMeans[j] * groupActivationProbability(j, groupMeans, groupStds);
      }
    }
  }

  return total;
}
