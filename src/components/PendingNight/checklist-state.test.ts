import { describe, it, expect } from 'vitest';
import { reducer } from '../../hooks/useAppState';
import { AppState, ChecklistItemDefinition } from '../../types';

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

/**
 * Simulates how the PendingNight component resolves which checklist labels
 * are checked, given the items array and label-keyed checked state.
 */
function getCheckedChecklistLabels(
  items: ChecklistItemDefinition[],
  checked: Record<string, boolean>
): string[] {
  return items
    .filter(item => checked[item.label])
    .map(item => item.label);
}

/**
 * Simulates how the PendingNight component resolves which intervention names
 * the user has marked as completed, given the interventions list, the pending
 * night's active flags, and the name-keyed completed state.
 */
function getCompletedInterventionNames(
  interventionNames: string[],
  pendingInterventions: boolean[],
  completed: Record<string, boolean>
): string[] {
  const active = interventionNames
    .map((name, i) => ({ name, index: i }))
    .filter(({ index }) => pendingInterventions[index]);

  return active
    .filter(({ name }) => completed[name])
    .map(({ name }) => name);
}

describe('Bug: checklist checked state drifts when items are reordered', () => {
  it('reordering checklist items should preserve which items are checked', () => {
    // User has 3 checklist items: A, B, C
    const items: ChecklistItemDefinition[] = [
      { label: 'A', description: 'Item A' },
      { label: 'B', description: 'Item B' },
      { label: 'C', description: 'Item C' },
    ];

    // User checks item B — component stores { 'B': true }
    const checkedState: Record<string, boolean> = { 'B': true };

    // Sanity: before reorder, B is checked
    expect(getCheckedChecklistLabels(items, checkedState)).toEqual(['B']);

    // Now user reorders: moves B (index 1) to index 0 → items become [B, A, C]
    const state = makeState({ checklistItems: items });
    const reordered = reducer(state, { type: 'REORDER_CHECKLIST_ITEM', fromIndex: 1, toIndex: 0 });

    // After reorder, 'B' key still correctly identifies B regardless of position
    const labelsAfter = getCheckedChecklistLabels(reordered.checklistItems, checkedState);
    expect(labelsAfter).toEqual(['B']);
  });
});

describe('Bug: checklist checked state drifts when items are removed', () => {
  it('removing an item before a checked one should preserve which items are checked', () => {
    // User has 3 checklist items: A, B, C
    const items: ChecklistItemDefinition[] = [
      { label: 'A', description: 'Item A' },
      { label: 'B', description: 'Item B' },
      { label: 'C', description: 'Item C' },
    ];

    // User checks item C — component stores { 'C': true }
    const checkedState: Record<string, boolean> = { 'C': true };

    expect(getCheckedChecklistLabels(items, checkedState)).toEqual(['C']);

    // Now item A (index 0) is removed → items become [B, C]
    const state = makeState({ checklistItems: items });
    const afterRemove = reducer(state, { type: 'REMOVE_CHECKLIST_ITEM', index: 0 });

    // 'C' key still correctly identifies C regardless of position change
    const labelsAfter = getCheckedChecklistLabels(afterRemove.checklistItems, checkedState);
    expect(labelsAfter).toEqual(['C']);
  });
});

describe('Bug: intervention completed state drifts when interventions are removed', () => {
  it('removing an intervention before a completed one should preserve completed state', () => {
    // User has 3 interventions: Melatonin, Magnesium, Blue Light Filter
    // Pending night has all 3 active
    const state = makeState({
      interventions: [
        { name: 'Melatonin', disabled: false },
        { name: 'Magnesium', disabled: false },
        { name: 'Blue Light Filter', disabled: false },
      ],
      pendingNight: {
        date: '2024-01-01T00:00:00Z',
        interventions: [true, true, true],
        samples: [1.0, 0.5, 2.0],
        asleep: false,
      },
    });

    const names = state.interventions.map(i => i.name);

    // User checks off "Blue Light Filter" — component stores { 'Blue Light Filter': true }
    const completedState: Record<string, boolean> = { 'Blue Light Filter': true };

    expect(getCompletedInterventionNames(
      names, state.pendingNight!.interventions, completedState
    )).toEqual(['Blue Light Filter']);

    // Now "Melatonin" (index 0) is removed
    const afterRemove = reducer(state, { type: 'REMOVE_INTERVENTION', index: 0 });
    const newNames = afterRemove.interventions.map(i => i.name);

    // Name-keyed state still correctly identifies Blue Light Filter
    const namesAfter = getCompletedInterventionNames(
      newNames, afterRemove.pendingNight!.interventions, completedState
    );
    expect(namesAfter).toEqual(['Blue Light Filter']);
  });
});
