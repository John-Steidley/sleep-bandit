import { describe, it, expect } from 'vitest';
import { reducer } from './useAppState';
import { AppState } from '../types';
import { computePosterior } from '../lib/bayesian';

const DEFAULT_CONFIG = { baseline: 69, tau: 2.5, sigma: 12 };

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    interventions: [],
    observations: [],
    pendingNight: null,
    groups: [],
    config: DEFAULT_CONFIG,
    noteTagDefinitions: [],
    checklistItems: [],
    ...overrides,
  };
}

describe('reducer ADD_INTERVENTION', () => {
  it('pads pendingNight interventions and samples when adding a new intervention', () => {
    // Start with one intervention and a pending night
    const state = makeState({
      interventions: [{ name: 'Melatonin', disabled: false }],
      pendingNight: {
        date: '2024-01-01T00:00:00Z',
        interventions: [true],
        samples: [1.5],
        asleep: false,
      },
    });

    // Add a second intervention while pending night exists
    const newState = reducer(state, { type: 'ADD_INTERVENTION', name: 'Magnesium' });

    // pendingNight should be updated to match the new intervention count
    expect(newState.interventions).toHaveLength(2);
    expect(newState.pendingNight).not.toBeNull();
    expect(newState.pendingNight!.interventions).toHaveLength(2);
    expect(newState.pendingNight!.interventions[0]).toBe(true);  // original preserved
    expect(newState.pendingNight!.interventions[1]).toBe(false); // new one is false
    expect(newState.pendingNight!.samples).toHaveLength(2);
    expect(newState.pendingNight!.samples[0]).toBe(1.5);  // original preserved
    expect(newState.pendingNight!.samples[1]).toBe(0);    // new one is 0
  });

  it('recording a score after adding an intervention does not throw', () => {
    // Start with one intervention, a pending night, and one observation
    const state = makeState({
      interventions: [{ name: 'Melatonin', disabled: false }],
      observations: [
        { date: '2024-01-01', interventions: [true], score: 75 },
      ],
      pendingNight: {
        date: '2024-01-02T00:00:00Z',
        interventions: [true],
        samples: [1.5],
        asleep: true,
      },
    });

    // Add a second intervention
    const afterAdd = reducer(state, { type: 'ADD_INTERVENTION', name: 'Magnesium' });

    // Now record a score — this creates an observation from pendingNight
    const observation = {
      date: afterAdd.pendingNight!.date,
      interventions: afterAdd.pendingNight!.interventions,
      score: 80,
    };
    const afterRecord = reducer(afterAdd, { type: 'RECORD_SCORE', observation });

    // The new observation should have the correct vector length
    const lastObs = afterRecord.observations[afterRecord.observations.length - 1];
    expect(lastObs.interventions).toHaveLength(2);

    // computePosterior should not throw
    const names = afterRecord.interventions.map(i => i.name);
    expect(() => computePosterior(names, afterRecord.observations, DEFAULT_CONFIG)).not.toThrow();
  });
});
