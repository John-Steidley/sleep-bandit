# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with HMR
npm run build    # TypeScript compile + production build to dist/
npm run preview  # Preview production build
```

## Architecture

Sleep Bandit is a React/TypeScript app that uses Thompson Sampling (Bayesian bandit algorithm) to help users optimize sleep interventions. The app runs entirely client-side with localStorage persistence.

### Core Algorithm (src/lib/)

- **bayesian.ts**: Bayesian linear regression for estimating intervention effects
  - `computePosterior()`: Conjugate Gaussian prior update to compute posterior mean/covariance
  - `sampleFromPosterior()`: Thompson Sampling via Cholesky decomposition
  - `probPositive()`: P(effect > 0) using normal CDF
  - Model constants: BASELINE=69, SIGMA=12 (noise), TAU=2.5 (prior std)

- **matrix.ts**: Custom linear algebra (no external dependencies)
  - LU decomposition with partial pivoting for matrix inverse
  - Cholesky decomposition for multivariate normal sampling
  - Box-Muller for random normal generation

### State Management

- **useAppState.ts**: useReducer-based state with auto-save to localStorage
  - Manages interventions, observations, pending nights, and groups
  - Groups enforce mutual exclusivity during Thompson Sampling (only best-sampled intervention in a group activates)

- **usePosterior.ts**: Memoized posterior computation from observations

### Data Model (src/types.ts)

- `Observation`: A recorded night with active interventions and sleep score
- `PendingNight`: Tonight's sampled interventions awaiting score recording
- `Group`: Mutually exclusive intervention set (e.g., different mattress types)

### UI Components

- **PendingNight/**: Shows tonight's recommended interventions, collects sleep score
- **InterventionList/**: Displays all interventions with posterior statistics and visualizations
- **modals/**: Data import/export, observation history, group management, update reports

### Build

Uses vite-plugin-singlefile to bundle everything into a single HTML file for offline use.
