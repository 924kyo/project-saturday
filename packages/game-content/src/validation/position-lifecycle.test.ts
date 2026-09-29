import {
  POSITION_IDS,
  POSITION_STAT_IDS,
  attachPositionSeasonSummary,
  commitPositionOffseason,
  completePositionCareer,
  createPositionCareerLifecycle,
  createRng,
  derivePositionEligibilityContext,
  derivePositionInjuryExposure,
  derivePositionLegacyProjection,
  migrateMetaProfileV1ToPositionV2,
  parsePositionCareerLifecycleJson,
  projectPositionOffseason,
  resolvePositionRelationshipWeek,
  type MetaProfileV1,
  type PlayerArchetypeId,
  type PositionCareerLifecycleV1,
  type PositionId,
  type PositionMetaProfileV2,
  type PositionSeasonSummaryV1,
  type PositionStatLineV1,
  type WorldAlphaOffseasonProjection,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { defaultWrAppearance } from '../content/appearance.js';
import { positionLifecycleMechanics } from '../content/position-lifecycle-mechanics.js';
import { worldAlphaMechanicsDefinition } from '../content/world-alpha-mechanics.js';

const archetypes: Readonly<Record<PositionId, PlayerArchetypeId>> = {
  position_wr: 'archetype_wr_route_technician',
  position_qb: 'archetype_qb_field_general',
  position_rb: 'archetype_rb_all_purpose',
  position_cb: 'archetype_cb_zone_technician',
  position_lb: 'archetype_lb_run_stopper',
  position_edge: 'archetype_edge_speed_rusher',
};

const actions: Readonly<Record<PositionId, string>> = {
  position_wr: 'action_film_study',
  position_qb: 'action_qb_delivery_work',
  position_rb: 'action_rb_third_down_work',
  position_cb: 'action_cb_zone_recognition',
  position_lb: 'action_lb_coverage_drops',
  position_edge: 'action_edge_edge_discipline',
};

const currentProgramId = worldAlphaMechanicsDefinition.programProfiles[0]!.programId;

function lifecycle(positionId: PositionId): PositionCareerLifecycleV1 {
  const created = createPositionCareerLifecycle(
    {
      careerId: `career_lifecycle_${positionId}`,
      playerId: `player_lifecycle_${positionId}`,
      displayName: `Alpha ${positionId}`,
      appearance: defaultWrAppearance,
      positionId,
      archetypeId: archetypes[positionId],
      careerSeed: `lifecycle-seed-${positionId}`,
    },
    currentProgramId,
    {
      body: 72,
      preparation: 68,
      confidence: 61,
      coachTrust: 57,
      brand: 33,
      gpa: 3.1,
    },
  );
  if (created === null) throw new Error('Expected valid lifecycle.');
  return created;
}

function emptyStats(positionId: PositionId): PositionStatLineV1 {
  return {
    model: 'position_stat_line_v1',
    positionId,
    entries: POSITION_STAT_IDS[positionId].map((statId, index) => ({
      statId,
      value: index === 0 ? 96 : index,
    })),
  };
}

function summary(
  positionId: PositionId,
  seasonIndex = 0,
  programId: PositionSeasonSummaryV1['programId'] = currentProgramId,
): PositionSeasonSummaryV1 {
  return {
    model: 'position_season_summary_v1',
    seasonIndex,
    seasonId: `season_lifecycle_${positionId}_${seasonIndex}`,
    programId,
    positionId,
    outcomeId: 'season_outcome_regular_season_complete',
    gamesPlayed: 12,
    wins: 8,
    losses: 4,
    ties: 0,
    stats: emptyStats(positionId),
    averagePerformanceGrade: 74,
    startingDepthRank: 5,
    startingRoleId: 'depth_role_reserve',
    finalDepthRank: 2,
    finalRoleId: 'depth_role_rotation',
    injuryOutcomeIds: [],
    injuryWeeksMissed: 0,
    ownedSkillIds: [],
    equippedSkillIds: [null, null, null],
  };
}

function offseasonWorld(seasonIndex = 0): WorldAlphaOffseasonProjection {
  const rng = createRng('m7-position-lifecycle-world');
  return {
    model: 'world_alpha_offseason_v1',
    seasonIndex,
    worldRngDrawCountBefore: 0,
    worldRngDrawCountAfter: 0,
    programs: worldAlphaMechanicsDefinition.programProfiles.map((profile, index) => ({
      programId: profile.programId,
      staffOutcome:
        index % 3 === 0 ? 'CONTINUITY' : index % 3 === 1 ? 'POSITION_STAFF_CHANGE' : 'SCHEME_SHIFT',
      positionStaffFocus: index % 3 === 1 ? POSITION_IDS[index % POSITION_IDS.length]! : null,
      departingPressure: (index % 7) - 3,
      incomingPressure: (index % 5) - 2,
      ratingDelta: (index % 5) - 2,
      before: profile,
      after: {
        ...profile,
        positionRatings: {
          ...profile.positionRatings,
          position_wr: Math.min(95, profile.positionRatings.position_wr + (index % 3)),
          position_qb: Math.min(95, profile.positionRatings.position_qb + (index % 3)),
          position_rb: Math.min(95, profile.positionRatings.position_rb + (index % 3)),
          position_cb: Math.min(95, profile.positionRatings.position_cb + (index % 3)),
          position_lb: Math.min(95, profile.positionRatings.position_lb + (index % 3)),
          position_edge: Math.min(95, profile.positionRatings.position_edge + (index % 3)),
        },
      },
    })),
    rng,
  };
}

function emptyPositionMeta(): PositionMetaProfileV2 {
  return {
    schemaVersion: 2,
    revision: 0,
    alumni: [],
    unlockedOptionIds: [],
    programFamiliarity: [],
  };
}

describe('M7 four-position lifecycle foundation', () => {
  it('projects position-owned injury exposure and preserves current availability', () => {
    const risks = POSITION_IDS.map((positionId) =>
      derivePositionInjuryExposure(
        {
          positionId,
          body: 55,
          durability: 64,
          workloadSnapPermille: 700,
          recentTrainingLoad: 18,
          currentInjury: null,
        },
        positionLifecycleMechanics,
      ),
    );
    expect(risks.every((risk) => risk !== null)).toBe(true);
    expect(risks.map((risk) => risk!.positionExposurePermille)).toEqual([42, 34, 62, 48, 56, 58]);
    expect(new Set(risks.map((risk) => risk!.totalRiskPermille)).size).toBe(6);
    expect(risks[2]!.totalRiskPermille).toBeGreaterThan(risks[1]!.totalRiskPermille);

    const limited = derivePositionInjuryExposure(
      {
        positionId: 'position_cb',
        body: 55,
        durability: 64,
        workloadSnapPermille: 700,
        recentTrainingLoad: 18,
        currentInjury: {
          outcomeId: 'injury_outcome_test_knock',
          severityId: 'injury_severity_minor_restriction',
          startedWeekIndex: 3,
          originalDurationWeeks: 2,
          remainingWeeks: 1,
          defaultAvailabilityId: 'injury_availability_limited',
          opportunityCap: 2,
        },
      },
      positionLifecycleMechanics,
    );
    expect(limited).toEqual(
      expect.objectContaining({
        currentAvailabilityId: 'injury_availability_limited',
        opportunityCap: 2,
      }),
    );
  });

  it('turns position-specific weekly work into three-track football and eligibility evidence', () => {
    for (const positionId of POSITION_IDS) {
      const state = lifecycle(positionId);
      const evidence = resolvePositionRelationshipWeek(
        positionId,
        4,
        state.relationships,
        [actions[positionId], actions[positionId], actions[positionId]],
        positionLifecycleMechanics,
      );
      expect(evidence).not.toBeNull();
      expect(evidence!.tracksAfter.some(({ value }) => value > 50)).toBe(true);
      expect(evidence!.actionIds).toEqual([...evidence!.actionIds].sort());
      const context = derivePositionEligibilityContext(
        positionId,
        'depth_role_rotation',
        40,
        3_100,
        emptyStats(positionId),
        evidence!.tracksAfter,
      );
      expect(context?.tagIds).toContain(`tag_position_${positionId.replace('position_', '')}`);
      expect(context?.tagIds).toContain('tag_role_rotation');
      expect(context?.statTotal).toBeGreaterThan(95);
    }
  });

  it('uses three career draws for a canonical Stay plus three-transfer projection', () => {
    const state = lifecycle('position_rb');
    const world = offseasonWorld();
    const projected = projectPositionOffseason(
      world,
      state.positionId,
      state.currentProgramId,
      4,
      state.relationships,
      [],
      createRng('m7-position-offseason'),
      positionLifecycleMechanics,
    );
    const reordered = projectPositionOffseason(
      { ...world, programs: [...world.programs].reverse() },
      state.positionId,
      state.currentProgramId,
      4,
      state.relationships,
      [],
      createRng('m7-position-offseason'),
      positionLifecycleMechanics,
    );
    expect(projected).not.toBeNull();
    expect(projected).toEqual(reordered);
    expect(projected!.rngDrawCountAfter - projected!.rngDrawCountBefore).toBe(3);
    expect(projected!.options).toHaveLength(4);
    expect(projected!.options[0]).toEqual(
      expect.objectContaining({ kind: 'STAY', programId: currentProgramId }),
    );
    expect(new Set(projected!.options.map(({ programId }) => programId)).size).toBe(4);
  });

  it('preserves identity and season evidence through transfer and season-two return for every position', () => {
    let meta = emptyPositionMeta();
    for (const positionId of POSITION_IDS) {
      const state = lifecycle(positionId);
      const projected = projectPositionOffseason(
        offseasonWorld(),
        positionId,
        currentProgramId,
        4,
        state.relationships,
        [],
        createRng(`offseason-${positionId}`),
        positionLifecycleMechanics,
      )!;
      const reviewed = attachPositionSeasonSummary(state, summary(positionId), projected)!;
      expect(parsePositionCareerLifecycleJson(JSON.stringify(reviewed))).toEqual(reviewed);
      expect(
        parsePositionCareerLifecycleJson(JSON.stringify({ ...reviewed, activeSeasonIndex: -1 })),
      ).toBeNull();
      const destination = projected.options[1].programId;
      let returned = commitPositionOffseason(reviewed, destination, positionLifecycleMechanics)!;
      expect(returned).toEqual(
        expect.objectContaining({
          activeSeasonIndex: 1,
          currentProgramId: destination,
          offseason: null,
          playerId: state.playerId,
          appearance: state.appearance,
        }),
      );
      expect(returned.programHistory).toHaveLength(2);
      expect(returned.relationships.every(({ value }) => value === 50)).toBe(true);
      expect(returned.playerState.preparation).toBe(50);
      if (positionId === 'position_qb') {
        const secondProjection = projectPositionOffseason(
          offseasonWorld(1),
          positionId,
          destination,
          2,
          returned.relationships,
          [],
          createRng('offseason-position-qb-season-two'),
          positionLifecycleMechanics,
        )!;
        const secondReview = attachPositionSeasonSummary(
          returned,
          summary(positionId, 1, destination),
          secondProjection,
        )!;
        returned = commitPositionOffseason(secondReview, destination, positionLifecycleMechanics)!;
      }
      meta = completePositionCareer(returned, meta, 9)!;
    }
    expect(meta.alumni.map(({ positionId }) => positionId).sort()).toEqual(
      [...POSITION_IDS].sort(),
    );
    expect(meta.alumni.find(({ positionId }) => positionId === 'position_qb')?.seasonsPlayed).toBe(
      2,
    );
    expect(meta.programFamiliarity.some(({ completedCareers }) => completedCareers > 1)).toBe(true);
    const legacy = derivePositionLegacyProjection(meta, 'position_cb', currentProgramId)!;
    expect(legacy.completedPositionCareerCount).toBe(1);
    expect(legacy.startingPowerBonus).toBe(0);
  });

  it('migrates a strict WR meta-v1 alumnus into the generic v2 record without losing totals', () => {
    const legacy: MetaProfileV1 = {
      schemaVersion: 1,
      revision: 6,
      alumni: [
        {
          schemaVersion: 1,
          alumniId: 'alumni_career_legacy_wr',
          careerId: 'career_legacy_wr',
          playerId: 'player_legacy_wr',
          displayName: 'Legacy Receiver',
          appearance: defaultWrAppearance,
          positionId: 'position_wr',
          archetypeId: 'archetype_wr_route_technician',
          recruitingBackgroundId: 'background_late_bloomer',
          personalityTraitIds: ['personality_disciplined', 'personality_leader'],
          programIds: [currentProgramId],
          seasonsPlayed: 1,
          careerStats: {
            targets: 80,
            receptions: 54,
            receivingYards: 742,
            receivingTouchdowns: 7,
            drops: 3,
            turnovers: 1,
          },
          gamesPlayed: 12,
          wins: 9,
          losses: 3,
          ties: 0,
          averagePerformanceGrade: 78,
          bestGame: null,
          startingDepthRank: 6,
          startingRoleId: 'depth_role_reserve',
          finalDepthRank: 1,
          finalRoleId: 'depth_role_starter',
          ownedSkillIds: [],
          equippedSkillIds: [null, null, null],
          injuryOutcomeIds: [],
          injuryWeeksMissed: 0,
          seasonOutcomeId: 'season_outcome_regular_season_complete',
          regularSeasonRank: 5,
          postseasonSeed: null,
          championshipCount: 0,
          endingId: 'career_ending_one_season_complete',
          careerSeed: 'legacy-wr-seed',
          careerSchemaVersion: 7,
          contentVersion: 1,
        },
      ],
      unlockedOptionIds: ['legacy_option_alumni_history'],
      programFamiliarity: [{ programId: currentProgramId, completedCareers: 1 }],
    };
    const migrated = migrateMetaProfileV1ToPositionV2(legacy);
    expect(migrated).toEqual(expect.objectContaining({ schemaVersion: 2, revision: 6 }));
    expect(migrated.alumni[0]).toEqual(
      expect.objectContaining({
        careerId: 'career_legacy_wr',
        positionId: 'position_wr',
        careerSchemaVersion: 7,
        contentVersion: 1,
      }),
    );
    expect(migrated.alumni[0]!.careerStats.entries).toEqual([
      { statId: 'stat_wr_targets', value: 80 },
      { statId: 'stat_wr_receptions', value: 54 },
      { statId: 'stat_wr_receiving_yards', value: 742 },
      { statId: 'stat_wr_receiving_touchdowns', value: 7 },
      { statId: 'stat_wr_drops', value: 3 },
      { statId: 'stat_wr_turnovers', value: 1 },
    ]);
  });
});
