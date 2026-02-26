import { describe, it, expect } from 'vitest';
import {
  zeros,
  identity,
  transpose,
  matmul,
  addMatrices,
  scaleMatrix,
  inverse,
  cholesky,
  normalPDF,
  normalCDF,
  randn,
} from './matrix';

describe('zeros', () => {
  it('creates a matrix of the correct shape filled with zeros', () => {
    const m = zeros(2, 3);
    expect(m).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  it('creates an empty matrix for 0 rows', () => {
    expect(zeros(0, 3)).toEqual([]);
  });
});

describe('identity', () => {
  it('creates a 3x3 identity matrix', () => {
    expect(identity(3)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('creates a 1x1 identity matrix', () => {
    expect(identity(1)).toEqual([[1]]);
  });
});

describe('transpose', () => {
  it('transposes a rectangular matrix', () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    expect(transpose(A)).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  it('transposes a square matrix', () => {
    const A = [[1, 2], [3, 4]];
    expect(transpose(A)).toEqual([[1, 3], [2, 4]]);
  });

  it('returns empty for empty input', () => {
    expect(transpose([])).toEqual([]);
  });
});

describe('matmul', () => {
  it('multiplying by identity returns the same matrix', () => {
    const A = [[1, 2], [3, 4]];
    expect(matmul(A, identity(2))).toEqual(A);
    expect(matmul(identity(2), A)).toEqual(A);
  });

  it('computes a known product', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(matmul(A, B)).toEqual([[19, 22], [43, 50]]);
  });

  it('returns empty for empty input', () => {
    expect(matmul([], [])).toEqual([]);
  });
});

describe('addMatrices', () => {
  it('adds two matrices element-wise', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(addMatrices(A, B)).toEqual([[6, 8], [10, 12]]);
  });
});

describe('scaleMatrix', () => {
  it('scales a matrix by a scalar', () => {
    const A = [[1, 2], [3, 4]];
    expect(scaleMatrix(A, 3)).toEqual([[3, 6], [9, 12]]);
  });

  it('scales by zero', () => {
    expect(scaleMatrix([[5, 10]], 0)).toEqual([[0, 0]]);
  });
});

describe('inverse', () => {
  it('returns empty for empty input', () => {
    expect(inverse([])).toEqual([]);
  });

  it('inverts a 1x1 matrix', () => {
    const inv = inverse([[4]]);
    expect(inv[0][0]).toBeCloseTo(0.25);
  });

  it('A * A^-1 ≈ I for a 2x2 matrix', () => {
    const A = [[4, 7], [2, 6]];
    const Ainv = inverse(A);
    const product = matmul(A, Ainv);
    const I = identity(2);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        expect(product[i][j]).toBeCloseTo(I[i][j], 10);
  });

  it('A * A^-1 ≈ I for a 3x3 matrix', () => {
    const A = [[2, 1, 1], [1, 3, 2], [1, 0, 0]];
    const Ainv = inverse(A);
    const product = matmul(A, Ainv);
    const I = identity(3);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(product[i][j]).toBeCloseTo(I[i][j], 10);
  });
});

describe('cholesky', () => {
  it('L * L^T ≈ A for a 2x2 SPD matrix', () => {
    const A = [[4, 2], [2, 3]];
    const L = cholesky(A);
    const LLt = matmul(L, transpose(L));
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        expect(LLt[i][j]).toBeCloseTo(A[i][j], 10);
  });

  it('L * L^T ≈ A for a 3x3 SPD matrix', () => {
    const A = [[25, 15, -5], [15, 18, 0], [-5, 0, 11]];
    const L = cholesky(A);
    const LLt = matmul(L, transpose(L));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(LLt[i][j]).toBeCloseTo(A[i][j], 10);
  });

  it('L is lower triangular', () => {
    const A = [[4, 2], [2, 3]];
    const L = cholesky(A);
    expect(L[0][1]).toBe(0);
  });
});

describe('normalPDF', () => {
  it('φ(0) = 1/√(2π)', () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
  });

  it('is symmetric: φ(x) = φ(-x)', () => {
    expect(normalPDF(1.5)).toBeCloseTo(normalPDF(-1.5), 10);
  });

  it('known value at x=1', () => {
    const expected = Math.exp(-0.5) / Math.sqrt(2 * Math.PI);
    expect(normalPDF(1)).toBeCloseTo(expected, 10);
  });
});

describe('normalCDF', () => {
  it('Φ(0) = 0.5', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 5);
  });

  it('Φ(large) ≈ 1', () => {
    expect(normalCDF(6)).toBeCloseTo(1, 5);
  });

  it('Φ(-large) ≈ 0', () => {
    expect(normalCDF(-6)).toBeCloseTo(0, 5);
  });

  it('known value Φ(1) ≈ 0.8413', () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
  });

  it('known value Φ(-1) ≈ 0.1587', () => {
    expect(normalCDF(-1)).toBeCloseTo(0.1587, 3);
  });

  it('symmetry: Φ(x) + Φ(-x) = 1', () => {
    expect(normalCDF(2) + normalCDF(-2)).toBeCloseTo(1, 10);
  });
});

describe('randn', () => {
  it('has approximately mean 0 and std 1 over many samples', () => {
    const N = 10000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      const x = randn();
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / N;
    const std = Math.sqrt(sumSq / N - mean * mean);
    expect(mean).toBeCloseTo(0, 1);
    expect(std).toBeCloseTo(1, 1);
  });
});
