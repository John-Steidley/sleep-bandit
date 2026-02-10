/**
 * localStorage persistence layer for sleep-bandit data
 */

import { AppState, Intervention } from '../types';
import { DEFAULT_NOTE_TAG_DEFINITIONS } from './noteTags';

const STORAGE_KEY = 'sleep-bandit-data';

const DEFAULT_STATE: AppState = {
  interventions: [],
  observations: [],
  pendingNight: null,
  groups: [],
  config: { baseline: 69, tau: 2.5, sigma: 12 },
  noteTagDefinitions: DEFAULT_NOTE_TAG_DEFINITIONS,
  checklistItems: []
};

/**
 * Migrate interventions from old string[] format to Intervention[] format
 */
function migrateInterventions(interventions: unknown[]): Intervention[] {
  if (!interventions || interventions.length === 0) return [];

  // Check if already migrated (first item is an object with 'name' property)
  if (typeof interventions[0] === 'object' && interventions[0] !== null && 'name' in interventions[0]) {
    return interventions as Intervention[];
  }

  // Migrate from string[] to Intervention[]
  return (interventions as string[]).map(name => ({ name, disabled: false }));
}


export function loadData(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure groups array and config exist for backwards compatibility
      // Migrate interventions from string[] to Intervention[] if needed
      return {
        ...DEFAULT_STATE,
        ...parsed,
        interventions: migrateInterventions(parsed.interventions || []),
        observations: parsed.observations || [],
        groups: parsed.groups || [],
        config: { ...DEFAULT_STATE.config, ...parsed.config },
        noteTagDefinitions: parsed.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS,
        checklistItems: parsed.checklistItems || []
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return DEFAULT_STATE;
}

export function saveData(data: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}
