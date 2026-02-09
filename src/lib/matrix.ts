/**
 * Matrix utilities for Bayesian linear regression
 * Custom linear algebra implementation - no external math libraries
 */

export type Matrix = number[][];
export type Vector = number[];

export function zeros(rows: number, cols: number): Matrix {
  return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

export function identity(n: number): Matrix {
  const I = zeros(n, n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

export function transpose(A: Matrix): Matrix {
  if (A.length === 0) return [];
  const rows = A.length, cols = A[0].length;
  const T = zeros(cols, rows);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j];
  return T;
}

export function matmul(A: Matrix, B: Matrix): Matrix {
  if (A.length === 0 || B.length === 0) return [];
  const rowsA = A.length, colsA = A[0].length;
  const colsB = B[0].length;
  const C = zeros(rowsA, colsB);
  for (let i = 0; i < rowsA; i++)
    for (let j = 0; j < colsB; j++)
      for (let k = 0; k < colsA; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

export function addMatrices(A: Matrix, B: Matrix): Matrix {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

export function scaleMatrix(A: Matrix, s: number): Matrix {
  return A.map(row => row.map(v => v * s));
}

/**
 * Cholesky decomposition
 * Returns lower triangular L such that A = L * L^T
 * Uses max(sum, 1e-10) floor to prevent negative sqrt
 */
export function cholesky(A: Matrix): Matrix {
  const n = A.length;
  const L = zeros(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(sum, 1e-10));
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return L;
}

/**
 * Matrix inverse using LU decomposition with partial pivoting
 */
export function inverse(A: Matrix): Matrix {
  const n = A.length;
  if (n === 0) return [];

  const L = zeros(n, n);
  const U = A.map(row => [...row]);
  const P = identity(n);

  for (let k = 0; k < n; k++) {
    let maxVal = Math.abs(U[k][k]);
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i][k]) > maxVal) {
        maxVal = Math.abs(U[i][k]);
        maxRow = i;
      }
    }

    if (maxRow !== k) {
      [U[k], U[maxRow]] = [U[maxRow], U[k]];
      [P[k], P[maxRow]] = [P[maxRow], P[k]];
      [L[k], L[maxRow]] = [L[maxRow], L[k]];
    }

    L[k][k] = 1;
    for (let i = k + 1; i < n; i++) {
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) {
        U[i][j] -= L[i][k] * U[k][j];
      }
    }
  }

  const inv = zeros(n, n);
  for (let col = 0; col < n; col++) {
    const y = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      y[i] = P[i][col];
      for (let j = 0; j < i; j++) {
        y[i] -= L[i][j] * y[j];
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      inv[i][col] = y[i];
      for (let j = i + 1; j < n; j++) {
        inv[i][col] -= U[i][j] * inv[j][col];
      }
      inv[i][col] /= U[i][i];
    }
  }

  return inv;
}

/**
 * Generate a random sample from standard normal distribution
 * Uses Box-Muller transform
 */
export function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Approximate normal CDF using Abramowitz and Stegun formula
 */
export function normalCDF(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}
