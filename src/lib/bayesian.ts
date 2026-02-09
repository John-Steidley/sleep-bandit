/**
 * Bayesian Linear Regression for sleep intervention optimization
 */

import { Observation, Posterior } from '../types';
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
} from './matrix';

// Model constants
export const BASELINE = 69;
export const TAU = 2.5;      // Prior standard deviation
export const SIGMA = 12;     // Noise standard deviation

/**
 * Compute posterior distribution over intervention effects
 * using Bayesian linear regression with conjugate Gaussian prior
 */
export function computePosterior(
  interventions: string[],
  observations: Observation[],
  config?: { baseline?: number; tau?: number; sigma?: number }
): Posterior {
  const baseline = config?.baseline ?? BASELINE;
  const tau = config?.tau ?? TAU;
  const sigma = config?.sigma ?? SIGMA;

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
