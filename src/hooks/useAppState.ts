import { useReducer, useCallback, useRef } from 'react';
import { AppState, ChecklistItemDefinition, Group, Intervention, NoteTagDefinition, Notes, Observation, Posterior, StatisticalConfig } from '../types';
import { loadEventLog, saveEventLog } from '../lib/storage';
import { AppEvent, EventLog, applyEvent, replayEvents, migrateLog, CURRENT_VERSION } from '../lib/events';
import { DEFAULT_NOTE_TAG_DEFINITIONS } from '../lib/noteTags';
import { sampleFromPosterior, computePosterior, probPositive } from '../lib/bayesian';
import { UpdateReportData } from '../types';

function reducer(state: AppState, event: AppEvent): AppState {
  return applyEvent(state, event);
}

function init(): { state: AppState; log: EventLog } {
  const log = loadEventLog();
  const state = replayEvents(log.events);
  return { state, log };
}

export function useAppState() {
  const initialRef = useRef<{ state: AppState; log: EventLog } | null>(null);
  if (!initialRef.current) {
    initialRef.current = init();
  }

  const [state, dispatch] = useReducer(reducer, initialRef.current.state);
  const eventLogRef = useRef<EventLog>(initialRef.current.log);

  const appendEvent = useCallback((partial: Omit<AppEvent, 'timestamp'>) => {
    const event = { ...partial, timestamp: new Date().toISOString() } as AppEvent;
    eventLogRef.current.events.push(event);
    saveEventLog(eventLogRef.current);
    dispatch(event);
  }, []);

  const addIntervention = useCallback((name: string) => {
    if (state.interventions.some(int => int.name === name)) {
      alert('Intervention already exists');
      return;
    }
    appendEvent({ type: 'ADD_INTERVENTION', name } as Omit<AppEvent, 'timestamp'>);
  }, [state.interventions, appendEvent]);

  const renameIntervention = useCallback((index: number, newName: string) => {
    if (state.interventions.some(int => int.name === newName)) {
      alert('An intervention with that name already exists');
      return;
    }
    appendEvent({ type: 'RENAME_INTERVENTION', index, newName } as Omit<AppEvent, 'timestamp'>);
  }, [state.interventions, appendEvent]);

  const toggleInterventionDisabled = useCallback((index: number) => {
    appendEvent({ type: 'TOGGLE_INTERVENTION_DISABLED', index } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const addGroup = useCallback((group: Group) => {
    appendEvent({ type: 'ADD_GROUP', group } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const removeGroup = useCallback((index: number) => {
    appendEvent({ type: 'REMOVE_GROUP', index } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const updateGroup = useCallback((index: number, group: Group) => {
    appendEvent({ type: 'UPDATE_GROUP', index, group } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const addNoteTag = useCallback((tag: NoteTagDefinition) => {
    appendEvent({ type: 'ADD_NOTE_TAG', tag } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const updateNoteTag = useCallback((index: number, tag: NoteTagDefinition) => {
    appendEvent({ type: 'UPDATE_NOTE_TAG', index, tag } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const addChecklistItem = useCallback((item: ChecklistItemDefinition) => {
    appendEvent({ type: 'ADD_CHECKLIST_ITEM', item } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const updateChecklistItem = useCallback((index: number, item: ChecklistItemDefinition) => {
    appendEvent({ type: 'UPDATE_CHECKLIST_ITEM', index, item } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const removeChecklistItem = useCallback((index: number) => {
    appendEvent({ type: 'REMOVE_CHECKLIST_ITEM', index } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

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

    const activeInterventions = samples.map((s, i) => s > 0 && !state.interventions[i].disabled);

    for (const group of (state.groups || [])) {
      let bestIdx = -1;
      let bestSample = -Infinity;

      for (const idx of group.interventionIndices) {
        if (idx < samples.length && !state.interventions[idx].disabled && samples[idx] > bestSample) {
          bestSample = samples[idx];
          bestIdx = idx;
        }
      }

      for (const idx of group.interventionIndices) {
        if (idx < activeInterventions.length) {
          activeInterventions[idx] = false;
        }
      }

      if (bestIdx !== -1 && bestSample > 0 && !state.interventions[bestIdx].disabled) {
        activeInterventions[bestIdx] = true;
      }
    }

    appendEvent({ type: 'ROLL_TONIGHT', samples, activeInterventions } as Omit<AppEvent, 'timestamp'>);
  }, [state.interventions, state.groups, appendEvent]);

  const togglePendingIntervention = useCallback((index: number, active: boolean) => {
    appendEvent({ type: 'TOGGLE_PENDING_INTERVENTION', index, active } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const checkChecklistItem = useCallback((index: number, label: string, checked: boolean) => {
    appendEvent({ type: 'CHECK_CHECKLIST_ITEM', index, label, checked } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const toggleNoteTag = useCallback((label: string, checked: boolean) => {
    appendEvent({ type: 'TOGGLE_NOTE_TAG', label, checked } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const markAsleep = useCallback(() => {
    appendEvent({ type: 'MARK_ASLEEP' } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const recordScore = useCallback((
    score: number,
    notes: Notes,
    posterior: Posterior
  ): UpdateReportData | null => {
    if (!state.pendingNight) return null;

    const oldPosterior = posterior;

    // Build the observation that will be created by replay
    const activeInterventions: number[] = [];
    state.pendingNight.interventions.forEach((active, i) => {
      if (active) activeInterventions.push(i);
    });
    const newObservation: Observation = {
      nightDate: state.pendingNight.date,
      sleepDate: state.pendingNight.date,
      recordDate: new Date().toISOString(),
      activeInterventions,
      score,
      notes,
    };

    // Compute new posterior with the new observation (dense format for bayesian)
    const interventionNames = state.interventions.map(int => int.name);
    const allObs = [...state.observations, newObservation];
    const denseObs = allObs.map(obs => {
      const interventions = Array(interventionNames.length).fill(false);
      for (const idx of obs.activeInterventions) {
        if (idx < interventionNames.length) interventions[idx] = true;
      }
      return { interventions, score: obs.score };
    });
    const newPosterior = computePosterior(interventionNames, denseObs, state.config);

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
          newProb: probPositive(newMean, newStd),
        };
      }),
    };

    appendEvent({ type: 'RECORD_SCORE', score, notes } as Omit<AppEvent, 'timestamp'>);
    return report;
  }, [state.pendingNight, state.observations, state.interventions, state.config, appendEvent]);

  const previewScore = useCallback((
    score: number,
    posterior: Posterior
  ): UpdateReportData | null => {
    if (!state.pendingNight) return null;

    const activeInterventions: number[] = [];
    state.pendingNight.interventions.forEach((active, i) => {
      if (active) activeInterventions.push(i);
    });
    const hypotheticalObservation: Observation = {
      nightDate: state.pendingNight.date,
      sleepDate: state.pendingNight.date,
      recordDate: new Date().toISOString(),
      activeInterventions,
      score,
    };

    const interventionNames = state.interventions.map(int => int.name);
    const allObs = [...state.observations, hypotheticalObservation];
    const denseObs = allObs.map(obs => {
      const interventions = Array(interventionNames.length).fill(false);
      for (const idx of obs.activeInterventions) {
        if (idx < interventionNames.length) interventions[idx] = true;
      }
      return { interventions, score: obs.score };
    });
    const hypotheticalPosterior = computePosterior(interventionNames, denseObs, state.config);

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
          newProb: probPositive(newMean, newStd),
        };
      }),
    };

    return report;
  }, [state.pendingNight, state.observations, state.interventions, state.config]);

  const cancelPending = useCallback(() => {
    appendEvent({ type: 'CANCEL_PENDING' } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  const importData = useCallback((imported: unknown, isFullBackup = false) => {
    if (isFullBackup) {
      // Check if it's an EventLog
      const asLog = imported as { version?: number; events?: AppEvent[] };
      if (asLog.version && asLog.events) {
        const migratedLog = migrateLog(asLog as EventLog);
        appendEvent({ type: 'IMPORT_DATA', eventLog: migratedLog } as Omit<AppEvent, 'timestamp'>);
        // Replace the entire event log ref
        eventLogRef.current = {
          version: CURRENT_VERSION,
          events: [...eventLogRef.current.events],
        };
        saveEventLog(eventLogRef.current);
      } else {
        // Old AppState format — wrap in INIT event
        const data = imported as Partial<AppState>;
        const initLog: EventLog = {
          version: CURRENT_VERSION,
          events: [{
            type: 'INIT',
            timestamp: new Date().toISOString(),
            state: {
              interventions: data.interventions || [],
              observations: data.observations || [],
              pendingNight: data.pendingNight || null,
              groups: data.groups || [],
              config: data.config || state.config,
              noteTagDefinitions: data.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS,
              checklistItems: data.checklistItems || [],
            },
          }],
        };
        appendEvent({ type: 'IMPORT_DATA', eventLog: initLog } as Omit<AppEvent, 'timestamp'>);
      }
    } else {
      // Historical import
      const data = imported as {
        interventions?: (Intervention | string)[];
        nights?: { interventions: boolean[]; score: number; date?: string }[];
      };
      const newInterventions = (data.interventions || []).map(int =>
        typeof int === 'string' ? { name: int, disabled: false } : int
      );
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

      const nights = data.nights || [];
      const newObservations: Observation[] = nights.map((night, idx) => {
        const activeInterventions: number[] = [];
        night.interventions.forEach((active, i) => {
          if (active && indexMap[i] !== -1) {
            activeInterventions.push(indexMap[i]);
          }
        });
        return {
          nightDate: night.date || new Date(Date.now() - (nights.length - idx) * 86400000).toISOString(),
          sleepDate: night.date || new Date(Date.now() - (nights.length - idx) * 86400000).toISOString(),
          recordDate: night.date || new Date(Date.now() - (nights.length - idx) * 86400000).toISOString(),
          activeInterventions,
          score: night.score,
        };
      });

      // Existing observations don't need extending since they use sparse format
      const allObservations = [...state.observations, ...newObservations];

      appendEvent({
        type: 'IMPORT_HISTORICAL',
        interventions: mergedInterventions,
        observations: allObservations,
      } as Omit<AppEvent, 'timestamp'>);
    }
  }, [state.interventions, state.observations, state.config, appendEvent]);

  const updateConfig = useCallback((config: Partial<StatisticalConfig>) => {
    appendEvent({ type: 'UPDATE_CONFIG', config } as Omit<AppEvent, 'timestamp'>);
  }, [appendEvent]);

  return {
    state,
    eventLog: eventLogRef,
    addIntervention,
    renameIntervention,
    toggleInterventionDisabled,
    addGroup,
    removeGroup,
    updateGroup,
    addNoteTag,
    updateNoteTag,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    getInterventionGroup,
    rollTonight,
    togglePendingIntervention,
    checkChecklistItem,
    toggleNoteTag,
    markAsleep,
    recordScore,
    previewScore,
    cancelPending,
    importData,
    updateConfig,
  };
}
