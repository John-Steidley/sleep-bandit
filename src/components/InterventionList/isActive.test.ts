import { describe, it, expect } from 'vitest';

/**
 * Bug: InterventionList computes isActive as `displaySamples[i] > 0`,
 * using raw Thompson samples. But the actual activation decision
 * (stored in pendingNight.interventions) accounts for:
 *   - Group constraints (only best-in-group is active)
 *   - Disabled interventions (never active regardless of sample)
 *
 * This means the UI can show interventions as active when they aren't.
 */

// This helper mirrors the buggy logic used in InterventionList/index.tsx line 56
function buggyIsActive(samples: number[] | null, index: number): boolean {
  return samples ? samples[index] > 0 : false;
}

// This helper mirrors what rollTonight() actually computes for activeInterventions
function computeActiveInterventions(
  samples: number[],
  interventions: { disabled: boolean }[],
  groups: { interventionIndices: number[] }[]
): boolean[] {
  const active = samples.map((s, i) => s > 0 && !interventions[i].disabled);

  for (const group of groups) {
    let bestIdx = -1;
    let bestSample = -Infinity;

    for (const idx of group.interventionIndices) {
      if (idx < samples.length && !interventions[idx].disabled && samples[idx] > bestSample) {
        bestSample = samples[idx];
        bestIdx = idx;
      }
    }

    for (const idx of group.interventionIndices) {
      if (idx < active.length) {
        active[idx] = false;
      }
    }

    if (bestIdx !== -1 && bestSample > 0 && !interventions[bestIdx].disabled) {
      active[bestIdx] = true;
    }
  }

  return active;
}

// The fixed logic: use activeInterventions from pendingNight.interventions
function fixedIsActive(activeInterventions: boolean[] | null, index: number): boolean {
  return activeInterventions ? activeInterventions[index] : false;
}

describe('isActive bug: raw sample > 0 vs actual activation', () => {
  it('shows grouped intervention as active when it should not be', () => {
    // Two interventions in a group, both with positive samples
    const samples = [1.5, 2.0];
    const interventions = [
      { disabled: false },
      { disabled: false },
    ];
    const groups = [{ interventionIndices: [0, 1] }];

    // The actual activation: only intervention 1 wins (higher sample)
    const actualActive = computeActiveInterventions(samples, interventions, groups);
    expect(actualActive).toEqual([false, true]);

    // The buggy UI logic: both show as active since both samples > 0
    const buggyActive = samples.map((_, i) => buggyIsActive(samples, i));
    expect(buggyActive).toEqual([true, true]);

    // BUG: intervention 0 shows as active in the UI but is NOT actually active
    expect(buggyActive[0]).toBe(true);   // UI says active
    expect(actualActive[0]).toBe(false);  // reality says inactive

    // FIX: using activeInterventions directly gives correct result
    const fixedActive = actualActive.map((_, i) => fixedIsActive(actualActive, i));
    expect(fixedActive).toEqual([false, true]);
  });

  it('shows disabled intervention as active when it should not be', () => {
    // A disabled intervention with a positive sample
    const samples = [3.0];
    const interventions = [{ disabled: true }];
    const groups: { interventionIndices: number[] }[] = [];

    const actualActive = computeActiveInterventions(samples, interventions, groups);
    expect(actualActive).toEqual([false]);

    // The buggy UI logic: shows as active because sample > 0
    const buggyActive = samples.map((_, i) => buggyIsActive(samples, i));
    expect(buggyActive).toEqual([true]);

    // BUG: disabled intervention shows as active in UI
    expect(buggyActive[0]).toBe(true);
    expect(actualActive[0]).toBe(false);

    // FIX: using activeInterventions directly gives correct result
    const fixedActive = actualActive.map((_, i) => fixedIsActive(actualActive, i));
    expect(fixedActive).toEqual([false]);
  });

  it('correctly identifies the winning group member', () => {
    // Three interventions: 0 and 2 in a group, 1 is independent
    const samples = [0.5, 1.0, 2.0];
    const interventions = [
      { disabled: false },
      { disabled: false },
      { disabled: false },
    ];
    const groups = [{ interventionIndices: [0, 2] }];

    const actualActive = computeActiveInterventions(samples, interventions, groups);
    // Intervention 0 loses to 2 in the group; intervention 1 is independent and positive
    expect(actualActive).toEqual([false, true, true]);

    const buggyActive = samples.map((_, i) => buggyIsActive(samples, i));
    // Bug: all three show active because all samples > 0
    expect(buggyActive).toEqual([true, true, true]);

    // Intervention 0 is incorrectly shown as active
    expect(buggyActive[0]).not.toEqual(actualActive[0]);

    // FIX: using activeInterventions directly gives correct result
    const fixedActive = actualActive.map((_, i) => fixedIsActive(actualActive, i));
    expect(fixedActive).toEqual([false, true, true]);
  });
});
