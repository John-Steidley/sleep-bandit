import { useMemo } from 'react';
import { Observation, Posterior, StatisticalConfig } from '../types';
import { computePosterior } from '../lib/bayesian';

/**
 * Memoized posterior computation hook
 * Recomputes only when interventions, observations, or config change
 */
export function usePosterior(
  interventions: string[],
  observations: Observation[],
  config: StatisticalConfig
): Posterior {
  return useMemo(
    () => computePosterior(interventions, observations, config),
    [interventions, observations, config]
  );
}
