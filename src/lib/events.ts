import {
  AppState,
  ChecklistItemDefinition,
  Group,
  Intervention,
  Notes,
  NoteTagDefinition,
  Observation,
  StatisticalConfig,
} from '../types';
import { DEFAULT_NOTE_TAG_DEFINITIONS } from './noteTags';

// -- Event types --

export type AppEvent =
  | { type: 'INIT'; timestamp: string; state: AppState }
  | { type: 'ADD_INTERVENTION'; timestamp: string; name: string }
  | { type: 'RENAME_INTERVENTION'; timestamp: string; index: number; newName: string }
  | { type: 'TOGGLE_INTERVENTION_DISABLED'; timestamp: string; index: number }
  | { type: 'ADD_GROUP'; timestamp: string; group: Group }
  | { type: 'REMOVE_GROUP'; timestamp: string; index: number }
  | { type: 'UPDATE_GROUP'; timestamp: string; index: number; group: Group }
  | { type: 'ADD_NOTE_TAG'; timestamp: string; tag: NoteTagDefinition }
  | { type: 'UPDATE_NOTE_TAG'; timestamp: string; index: number; tag: NoteTagDefinition }
  | { type: 'ADD_CHECKLIST_ITEM'; timestamp: string; item: ChecklistItemDefinition }
  | { type: 'UPDATE_CHECKLIST_ITEM'; timestamp: string; index: number; item: ChecklistItemDefinition }
  | { type: 'REMOVE_CHECKLIST_ITEM'; timestamp: string; index: number }
  | { type: 'ROLL_TONIGHT'; timestamp: string; samples: number[]; activeInterventions: boolean[] }
  | { type: 'TOGGLE_PENDING_INTERVENTION'; timestamp: string; index: number; active: boolean }
  | { type: 'CHECK_CHECKLIST_ITEM'; timestamp: string; index: number; label: string; checked: boolean }
  | { type: 'MARK_ASLEEP'; timestamp: string }
  | { type: 'TOGGLE_NOTE_TAG'; timestamp: string; label: string; checked: boolean }
  | { type: 'RECORD_SCORE'; timestamp: string; score: number; notes: Notes }
  | { type: 'CANCEL_PENDING'; timestamp: string }
  | { type: 'IMPORT_DATA'; timestamp: string; eventLog: EventLog }
  | { type: 'IMPORT_HISTORICAL'; timestamp: string; interventions: Intervention[]; observations: Observation[] }
  | { type: 'UPDATE_CONFIG'; timestamp: string; config: Partial<StatisticalConfig> };

export interface EventLog {
  version: number;
  events: AppEvent[];
}

export const CURRENT_VERSION = 1;

// -- Default state --

const DEFAULT_STATE: AppState = {
  interventions: [],
  observations: [],
  pendingNight: null,
  groups: [],
  config: { baseline: 69, tau: 2.5, sigma: 12 },
  noteTagDefinitions: DEFAULT_NOTE_TAG_DEFINITIONS,
  checklistItems: [],
};

// -- Replay --

interface ReplayContext {
  rollTimestamp: string | null;
  sleepTimestamp: string | null;
  pendingNotes: Notes | null;
}

export function applyEvent(state: AppState, event: AppEvent, ctx?: ReplayContext): AppState {
  switch (event.type) {
    case 'INIT':
      return event.state;

    case 'ADD_INTERVENTION':
      if (state.interventions.some(int => int.name === event.name)) {
        return state;
      }
      return {
        ...state,
        interventions: [...state.interventions, { name: event.name, disabled: false }],
      };

    case 'RENAME_INTERVENTION':
      if (state.interventions.some(int => int.name === event.newName)) {
        return state;
      }
      return {
        ...state,
        interventions: state.interventions.map((int, i) =>
          i === event.index ? { ...int, name: event.newName } : int
        ),
      };

    case 'TOGGLE_INTERVENTION_DISABLED':
      return {
        ...state,
        interventions: state.interventions.map((int, i) =>
          i === event.index ? { ...int, disabled: !int.disabled } : int
        ),
      };

    case 'ADD_GROUP':
      return {
        ...state,
        groups: [...(state.groups || []), event.group],
      };

    case 'REMOVE_GROUP':
      return {
        ...state,
        groups: (state.groups || []).filter((_, i) => i !== event.index),
      };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: (state.groups || []).map((g, i) =>
          i === event.index ? event.group : g
        ),
      };

    case 'ADD_NOTE_TAG':
      return {
        ...state,
        noteTagDefinitions: [...state.noteTagDefinitions, event.tag],
      };

    case 'UPDATE_NOTE_TAG':
      return {
        ...state,
        noteTagDefinitions: state.noteTagDefinitions.map((t, i) =>
          i === event.index ? event.tag : t
        ),
      };

    case 'ADD_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: [...(state.checklistItems || []), event.item],
      };

    case 'UPDATE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: (state.checklistItems || []).map((item, i) =>
          i === event.index ? event.item : item
        ),
      };

    case 'REMOVE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: (state.checklistItems || []).filter((_, i) => i !== event.index),
      };

    case 'ROLL_TONIGHT':
      if (ctx) ctx.rollTimestamp = event.timestamp;
      return {
        ...state,
        pendingNight: {
          date: event.timestamp,
          interventions: event.activeInterventions,
          samples: event.samples,
          asleep: false,
        },
      };

    case 'TOGGLE_PENDING_INTERVENTION':
      if (!state.pendingNight) return state;
      return {
        ...state,
        pendingNight: {
          ...state.pendingNight,
          interventions: state.pendingNight.interventions.map((v, i) =>
            i === event.index ? event.active : v
          ),
        },
      };

    case 'CHECK_CHECKLIST_ITEM':
      // Logged but no derived state change
      return state;

    case 'MARK_ASLEEP':
      if (ctx) ctx.sleepTimestamp = event.timestamp;
      return {
        ...state,
        pendingNight: state.pendingNight
          ? { ...state.pendingNight, asleep: true }
          : null,
      };

    case 'TOGGLE_NOTE_TAG':
      // Logged but notes accumulate locally in UI; final snapshot in RECORD_SCORE
      return state;

    case 'RECORD_SCORE': {
      if (!state.pendingNight) return state;
      const nightDate = state.pendingNight.date;
      const activeInterventions: number[] = [];
      state.pendingNight.interventions.forEach((active, i) => {
        if (active) activeInterventions.push(i);
      });
      const observation: Observation = {
        nightDate,
        sleepDate: nightDate, // best approximation from pending date
        recordDate: event.timestamp,
        activeInterventions,
        score: event.score,
        notes: event.notes,
      };
      return {
        ...state,
        observations: [...state.observations, observation],
        pendingNight: null,
      };
    }

    case 'CANCEL_PENDING':
      return {
        ...state,
        pendingNight: null,
      };

    case 'IMPORT_DATA': {
      // Replay the imported event log to get its state, then use that
      const importedState = replayEvents(event.eventLog.events);
      return importedState;
    }

    case 'IMPORT_HISTORICAL':
      return {
        ...state,
        interventions: event.interventions,
        observations: event.observations,
        pendingNight: null,
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...event.config },
      };

    default: {
      const exhaustive: never = event;
      throw new Error(`Unknown event type: ${(exhaustive as AppEvent).type}`);
    }
  }
}

export function replayEvents(events: AppEvent[]): AppState {
  const ctx: ReplayContext = {
    rollTimestamp: null,
    sleepTimestamp: null,
    pendingNotes: null,
  };
  return events.reduce((state, event) => applyEvent(state, event, ctx), DEFAULT_STATE);
}

// -- Migration from old snapshot format --

interface OldObservation {
  date: string;
  interventions: boolean[];
  score: number;
  notes?: { tags: { label: string; value: boolean }[]; text: string };
}

interface OldAppState {
  interventions: ({ name: string; disabled: boolean } | string)[];
  observations: OldObservation[];
  pendingNight: {
    date: string;
    interventions: boolean[];
    samples: number[];
    asleep: boolean;
  } | null;
  groups: Group[];
  config: StatisticalConfig;
  noteTagDefinitions: NoteTagDefinition[];
  checklistItems: ChecklistItemDefinition[];
}

function migrateOldObservation(obs: OldObservation): Observation {
  const activeInterventions: number[] = [];
  if (obs.interventions) {
    obs.interventions.forEach((active, i) => {
      if (active) activeInterventions.push(i);
    });
  }
  return {
    nightDate: obs.date,
    sleepDate: obs.date,
    recordDate: obs.date,
    activeInterventions,
    score: obs.score,
    notes: obs.notes,
  };
}

function migrateOldInterventions(interventions: ({ name: string; disabled: boolean } | string)[]): Intervention[] {
  return interventions.map(int =>
    typeof int === 'string' ? { name: int, disabled: false } : int
  );
}

export function migrateSnapshot(snapshot: OldAppState): EventLog {
  const migratedState: AppState = {
    interventions: migrateOldInterventions(snapshot.interventions || []),
    observations: (snapshot.observations || []).map(migrateOldObservation),
    pendingNight: snapshot.pendingNight || null,
    groups: snapshot.groups || [],
    config: snapshot.config || DEFAULT_STATE.config,
    noteTagDefinitions: snapshot.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS,
    checklistItems: snapshot.checklistItems || [],
  };

  return {
    version: CURRENT_VERSION,
    events: [{
      type: 'INIT',
      timestamp: new Date().toISOString(),
      state: migratedState,
    }],
  };
}

export function migrateLog(log: EventLog): EventLog {
  // v1 is current, no migrations needed yet
  return log;
}
