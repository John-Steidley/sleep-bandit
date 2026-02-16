import { useMemo } from 'react';
import { Observation, Posterior, StatisticalConfig } from '../types';
import { computePosterior } from '../lib/bayesian';

interface DenseObservation {
  interventions: boolean[];
  score: number;
}

function toDense(obs: Observation, interventionCount: number): DenseObservation {
  const interventions = Array(interventionCount).fill(false);
  for (const idx of obs.activeInterventions) {
    if (idx < interventionCount) interventions[idx] = true;
  }
  return { interventions, score: obs.score };
}

export function usePosterior(
  interventions: string[],
  observations: Observation[],
  config: StatisticalConfig
): Posterior {
  return useMemo(() => {
    const dense = observations.map(obs => toDense(obs, interventions.length));
    return computePosterior(interventions, dense, config);
  }, [interventions, observations, config]);
}
