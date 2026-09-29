import { describe, expect, it } from 'vitest';

import { executePositionAlphaCareer } from '../../src/index.js';

describe('M7 public position-alpha career builder', () => {
  it('runs and exactly replays a serialized QB transfer career across two seasons', () => {
    const input = {
      scenarioId: 'qb_field_general_transfer',
      seed: 'm7-builder-qb-field-general',
      positionId: 'position_qb',
      archetypeId: 'archetype_qb_field_general',
      recruitingBackgroundId: 'background_late_bloomer',
      initialProgramId: 'program_ember_peak_polytechnic',
      decisionStrategy: 'best_fit',
      offseasonPolicy: 'first_transfer',
    } as const;
    const first = executePositionAlphaCareer(input);
    const replay = executePositionAlphaCareer(input);
    expect(replay).toEqual(first);
    expect(first).toEqual(
      expect.objectContaining({
        positionId: 'position_qb',
        worldArchiveSeasonCount: 2,
        offseasonPolicy: 'first_transfer',
      }),
    );
    expect(first.selectedProgramId).not.toBe(first.initialProgramId);
    expect(first.gameCount).toBeGreaterThanOrEqual(24);
    expect(first.totalKeySnaps).toBeGreaterThan(0);
    expect(first.lifecycle.completedSeasons).toHaveLength(2);
    expect(first.lifecycleRoundTripCount).toBeGreaterThan(20);
    expect(first.meta.alumni[0]?.seasonsPlayed).toBe(2);
    expect(first.eligibilityTagIds).toContain('tag_position_qb');
  }, 20_000);
});
