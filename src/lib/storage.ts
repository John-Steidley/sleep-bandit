/**
 * localStorage persistence layer for sleep-bandit data
 */

import { AppState, Intervention, Observation } from '../types';
import { DEFAULT_NOTE_TAG_DEFINITIONS } from './noteTags';

const STORAGE_KEY = 'sleep-bandit-data';

const DEFAULT_STATE: AppState = {
  interventions: [],
  observations: [],
  pendingNight: null,
  groups: [],
  config: { baseline: 69, tau: 2.5, sigma: 12 },
  noteTagDefinitions: DEFAULT_NOTE_TAG_DEFINITIONS
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

// MIGRATION (NOTE TAGS) — To remove:
// 1. Delete migrateNoteTags() from src/lib/storage.ts
// 2. Remove migrateNoteTags() call from loadData() in storage.ts
// 3. Remove migrateNoteTags() call from importData in useAppState.ts
// 4. Remove the import of migrateNoteTags from useAppState.ts
export function migrateNoteTags(observations: unknown[]): Observation[] {
  if (!observations || observations.length === 0) return observations as Observation[];

  return (observations as Record<string, unknown>[]).map(obs => {
    const notes = obs.notes as Record<string, unknown> | undefined;
    if (!notes) return obs as unknown as Observation;

    // Already migrated: has 'tags' array
    if (Array.isArray(notes.tags)) return obs as unknown as Observation;

    // Legacy format: convert boolean fields to Tag[]
    const tags = [
      { label: 'wokeUpLong', value: Boolean(notes.wokeUpLong) },
      { label: 'nightmares', value: Boolean(notes.nightmares) },
      { label: 'nightSweats', value: Boolean(notes.nightSweats) },
    ];

    return {
      ...obs,
      notes: { tags, text: (notes.text as string) || '' },
    } as Observation;
  });
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
        observations: migrateNoteTags(parsed.observations || []), // MIGRATION (NOTE TAGS)
        groups: parsed.groups || [],
        config: { ...DEFAULT_STATE.config, ...parsed.config },
        noteTagDefinitions: parsed.noteTagDefinitions || DEFAULT_NOTE_TAG_DEFINITIONS
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
