import { useEffect, useReducer, useCallback } from 'react';
import { AppState, Group, Intervention, NoteTagDefinition, Notes, Observation, Posterior, StatisticalConfig } from '../types';
import { loadData, saveData } from '../lib/storage';
import { DEFAULT_NOTE_TAG_DEFINITIONS } from '../lib/noteTags';
import { sampleFromPosterior, computePosterior, probPositive } from '../lib/bayesian';
import { UpdateReportData } from '../types';

type Action =
  | { type: 'ADD_INTERVENTION'; name: string }
  | { type: 'REMOVE_INTERVENTION'; index: number }
  | { type: 'RENAME_INTERVENTION'; index: number; newName: string }
  | { type: 'TOGGLE_INTERVENTION_DISABLED'; index: number }
  | { type: 'ADD_GROUP'; group: Group }
  | { type: 'REMOVE_GROUP'; index: number }
  | { type: 'UPDATE_GROUP'; index: number; group: Group }
  | { type: 'ADD_NOTE_TAG'; tag: NoteTagDefinition }
  | { type: 'UPDATE_NOTE_TAG'; index: number; tag: NoteTagDefinition }
  | { type: 'ROLL_TONIGHT'; samples: number[]; activeInterventions: boolean[] }
  | { type: 'MARK_ASLEEP' }
  | { type: 'RECORD_SCORE'; observation: Observation }
  | { type: 'CANCEL_PENDING' }
  | { type: 'IMPORT_DATA'; data: AppState }
  | { type: 'IMPORT_HISTORICAL'; interventions: Intervention[]; observations: Observation[] }
  | { type: 'CLEAR_DATA' }
  | { type: 'UPDATE_CONFIG'; config: Partial<StatisticalConfig> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_INTERVENTION':
      if (state.interventions.some(int => int.name === action.name)) {
        return state;
      }
      return {
        ...state,
        interventions: [...state.interventions, { name: action.name, disabled: false }],
        observations: state.observations.map(obs => ({
          ...obs,
          interventions: [...(obs.interventions || []), false]
        }))
      };

    case 'REMOVE_INTERVENTION':
      return {
        ...state,
        interventions: state.interventions.filter((_, i) => i !== action.index),
        observations: state.observations.map(obs => ({
          ...obs,
          interventions: obs.interventions?.filter((_, i) => i !== action.index) || []
        })),
        pendingNight: state.pendingNight ? {
          ...state.pendingNight,
          interventions: state.pendingNight.interventions.filter((_, i) => i !== action.index),
          samples: state.pendingNight.samples?.filter((_, i) => i !== action.index) || []
        } : null,
        groups: (state.groups || [])
          .map(group => ({
            ...group,
            interventionIndices: group.interventionIndices
              .filter(i => i !== action.index)
              .map(i => i > action.index ? i - 1 : i)
          }))
          .filter(group => group.interventionIndices.length >= 2)
      };

    case 'RENAME_INTERVENTION':
      if (state.interventions.some(int => int.name === action.newName)) {
        return state;
      }
      return {
        ...state,
        interventions: state.interventions.map((int, i) =>
          i === action.index ? { ...int, name: action.newName } : int
        )
      };

    case 'TOGGLE_INTERVENTION_DISABLED':
      return {
        ...state,
        interventions: state.interventions.map((int, i) =>
          i === action.index ? { ...int, disabled: !int.disabled } : int
        )
      };

    case 'ADD_GROUP':
      return {
        ...state,
        groups: [...(state.groups || []), action.group]
      };

    case 'REMOVE_GROUP':
      return {
        ...state,
        groups: (state.groups || []).filter((_, i) => i !== action.index)
      };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: (state.groups || []).map((g, i) =>
          i === action.index ? action.group : g
        )
      };

    case 'ADD_NOTE_TAG':
      return {
        ...state,
        noteTagDefinitions: [...state.noteTagDefinitions, action.tag]
      };

    case 'UPDATE_NOTE_TAG':
      return {
        ...state,
        noteTagDefinitions: state.noteTagDefinitions.map((t, i) =>
          i === action.index ? action.tag : t
        )
      };

    case 'ROLL_TONIGHT':
      return {
        ...state,
        pendingNight: {
          date: new Date().toISOString(),
          interventions: action.activeInterventions,
          samples: action.samples,
          asleep: false
        }
      };

    case 'MARK_ASLEEP':
      return {
        ...state,
        pendingNight: state.pendingNight ? {
          ...state.pendingNight,
          asleep: true
        } : null
      };

    case 'RECORD_SCORE':
      return {
        ...state,
        observations: [...state.observations, action.observation],
        pendingNight: null
      };

    case 'CANCEL_PENDING':
      return {
        ...state,
        pendingNight: null
      };

    case 'IMPORT_DATA':
      return {
        ...action.data,
        groups: action.data.groups || [],
        config: action.data.config || state.config,
        noteTagDefinitions: action.data.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS
      };

    case 'IMPORT_HISTORICAL':
      return {
        ...state,
        interventions: action.interventions,
        observations: action.observations,
        pendingNight: null
      };

    case 'CLEAR_DATA':
      return {
        interventions: [],
        observations: [],
        pendingNight: null,
        groups: [],
        config: state.config,
        noteTagDefinitions: state.noteTagDefinitions
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.config }
      };

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadData);

  // Auto-save to localStorage on state changes
  useEffect(() => {
    saveData(state);
  }, [state]);

  const addIntervention = useCallback((name: string) => {
    if (state.interventions.some(int => int.name === name)) {
      alert('Intervention already exists');
      return;
    }
    dispatch({ type: 'ADD_INTERVENTION', name });
  }, [state.interventions]);

  const removeIntervention = useCallback((index: number) => {
    if (!confirm(`Remove "${state.interventions[index].name}"? Historical data for this intervention will be lost.`)) {
      return;
    }
    dispatch({ type: 'REMOVE_INTERVENTION', index });
  }, [state.interventions]);

  const renameIntervention = useCallback((index: number, newName: string) => {
    if (state.interventions.some(int => int.name === newName)) {
      alert('An intervention with that name already exists');
      return;
    }
    dispatch({ type: 'RENAME_INTERVENTION', index, newName });
  }, [state.interventions]);

  const toggleInterventionDisabled = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_INTERVENTION_DISABLED', index });
  }, []);

  const addGroup = useCallback((group: Group) => {
    dispatch({ type: 'ADD_GROUP', group });
  }, []);

  const removeGroup = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_GROUP', index });
  }, []);

  const updateGroup = useCallback((index: number, group: Group) => {
    dispatch({ type: 'UPDATE_GROUP', index, group });
  }, []);

  const addNoteTag = useCallback((tag: NoteTagDefinition) => {
    dispatch({ type: 'ADD_NOTE_TAG', tag });
  }, []);

  const updateNoteTag = useCallback((index: number, tag: NoteTagDefinition) => {
    dispatch({ type: 'UPDATE_NOTE_TAG', index, tag });
  }, []);

  const getInterventionGroup = useCallback((interventionIndex: number): string | null => {
    for (const group of (state.groups || [])) {
      if (group.interventionIndices.includes(interventionIndex)) {
        return group.name;
      }
    }
    return null;
  }, [state.groups]);

  const rollTonight = useCallback((posterior: Posterior) => {
    const enabledCount = state.interventions.filter(int => !int.disabled).length;
    if (enabledCount === 0) {
      alert('Add some interventions first!');
      return;
    }

    const samples = sampleFromPosterior(posterior.mean, posterior.cov);

    // Start with all interventions that have positive samples, but never include disabled ones
    const activeInterventions = samples.map((s, i) => s > 0 && !state.interventions[i].disabled);

    // For each group, only keep the highest-sampled intervention (if positive and not disabled)
    for (const group of (state.groups || [])) {
      let bestIdx = -1;
      let bestSample = -Infinity;

      for (const idx of group.interventionIndices) {
        // Skip disabled interventions when finding best in group
        if (idx < samples.length && !state.interventions[idx].disabled && samples[idx] > bestSample) {
          bestSample = samples[idx];
          bestIdx = idx;
        }
      }

      // Deactivate all interventions in this group
      for (const idx of group.interventionIndices) {
        if (idx < activeInterventions.length) {
          activeInterventions[idx] = false;
        }
      }

      // Only activate the best one if it has a positive sample and is not disabled
      if (bestIdx !== -1 && bestSample > 0 && !state.interventions[bestIdx].disabled) {
        activeInterventions[bestIdx] = true;
      }
    }

    dispatch({ type: 'ROLL_TONIGHT', samples, activeInterventions });
  }, [state.interventions, state.groups]);

  const markAsleep = useCallback(() => {
    dispatch({ type: 'MARK_ASLEEP' });
  }, []);

  const recordScore = useCallback((
    score: number,
    notes: Notes,
    posterior: Posterior
  ): UpdateReportData | null => {
    if (!state.pendingNight) return null;

    const oldPosterior = posterior;

    const newObservation: Observation = {
      date: state.pendingNight.date,
      interventions: state.pendingNight.interventions,
      score,
      notes
    };

    // Compute new posterior with the new observation
    const newObservations = [...state.observations, newObservation];
    const interventionNames = state.interventions.map(int => int.name);
    const newPosterior = computePosterior(interventionNames, newObservations, state.config);

    // Build comparison report
    const report: UpdateReportData = {
      score,
      date: state.pendingNight.date,
      interventions: state.interventions.map((int, i) => {
        const oldMean = oldPosterior.mean[i] || 0;
        const newMean = newPosterior.mean[i] || 0;
        const oldStd = oldPosterior.std[i] || state.config.tau;
        const newStd = newPosterior.std[i] || state.config.tau;
        return {
          name: int.name,
          wasActive: state.pendingNight!.interventions[i],
          oldMean,
          newMean,
          oldStd,
          newStd,
          oldProb: probPositive(oldMean, oldStd),
          newProb: probPositive(newMean, newStd)
        };
      })
    };

    dispatch({ type: 'RECORD_SCORE', observation: newObservation });
    return report;
  }, [state.pendingNight, state.observations, state.interventions, state.config]);

  const previewScore = useCallback((
    score: number,
    posterior: Posterior
  ): UpdateReportData | null => {
    if (!state.pendingNight) return null;

    // Create hypothetical observation
    const hypotheticalObservation: Observation = {
      date: state.pendingNight.date,
      interventions: state.pendingNight.interventions,
      score
    };

    // Compute hypothetical posterior
    const hypotheticalObservations = [...state.observations, hypotheticalObservation];
    const interventionNames = state.interventions.map(int => int.name);
    const hypotheticalPosterior = computePosterior(interventionNames, hypotheticalObservations, state.config);

    // Build preview report
    const report: UpdateReportData = {
      isPreview: true,
      score,
      date: state.pendingNight.date,
      interventions: state.interventions.map((int, i) => {
        const oldMean = posterior.mean[i] || 0;
        const newMean = hypotheticalPosterior.mean[i] || 0;
        const oldStd = posterior.std[i] || state.config.tau;
        const newStd = hypotheticalPosterior.std[i] || state.config.tau;
        return {
          name: int.name,
          wasActive: state.pendingNight!.interventions[i],
          oldMean,
          newMean,
          oldStd,
          newStd,
          oldProb: probPositive(oldMean, oldStd),
          newProb: probPositive(newMean, newStd)
        };
      })
    };

    return report;
  }, [state.pendingNight, state.observations, state.interventions, state.config]);

  const cancelPending = useCallback(() => {
    dispatch({ type: 'CANCEL_PENDING' });
  }, []);

  const importData = useCallback((imported: Partial<AppState>, isFullBackup = false) => {
    if (isFullBackup && imported.interventions && imported.observations) {
      dispatch({
        type: 'IMPORT_DATA',
        data: {
          interventions: imported.interventions,
          observations: imported.observations,
          pendingNight: imported.pendingNight || null,
          groups: imported.groups || [],
          config: imported.config || state.config,
          noteTagDefinitions: imported.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS
        }
      });
    } else {
      const newInterventions = imported.interventions || [];
      const existingNames = new Set(state.interventions.map(int => int.name));
      const mergedInterventions = [...state.interventions];

      for (const intervention of newInterventions) {
        if (!existingNames.has(intervention.name)) {
          mergedInterventions.push(intervention);
        }
      }

      const indexMap = newInterventions.map(int =>
        mergedInterventions.findIndex(merged => merged.name === int.name)
      );

      interface HistoricalNight {
        interventions: boolean[];
        score: number;
        date?: string;
      }

      const nights = (imported as { nights?: HistoricalNight[] }).nights || [];
      const newObservations: Observation[] = nights.map((night, idx) => {
        const interventionVector = Array(mergedInterventions.length).fill(false);
        night.interventions.forEach((active, i) => {
          if (active && indexMap[i] !== -1) {
            interventionVector[indexMap[i]] = true;
          }
        });
        return {
          date: night.date || new Date(Date.now() - (nights.length - idx) * 86400000).toISOString(),
          interventions: interventionVector,
          score: night.score
        };
      });

      const extendedExisting = state.observations.map(obs => ({
        ...obs,
        interventions: [
          ...(obs.interventions || []),
          ...Array(mergedInterventions.length - (obs.interventions?.length || 0)).fill(false)
        ]
      }));

      dispatch({
        type: 'IMPORT_HISTORICAL',
        interventions: mergedInterventions,
        observations: [...extendedExisting, ...newObservations]
      });
    }
  }, [state.interventions, state.observations, state.config]);

  const clearData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);

  const updateConfig = useCallback((config: Partial<StatisticalConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', config });
  }, []);

  return {
    state,
    addIntervention,
    removeIntervention,
    renameIntervention,
    toggleInterventionDisabled,
    addGroup,
    removeGroup,
    updateGroup,
    addNoteTag,
    updateNoteTag,
    getInterventionGroup,
    rollTonight,
    markAsleep,
    recordScore,
    previewScore,
    cancelPending,
    importData,
    clearData,
    updateConfig
  };
}
