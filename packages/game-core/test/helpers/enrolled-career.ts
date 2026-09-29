import {
  DEPTH_EVALUATION_WEIGHTS_PERMILLE,
  depthRoleIdForRank,
  validateCareerRun,
  type CareerRun,
  type DepthEvaluationComponents,
  type DepthEvaluationTuple,
  type DepthOrderTuple,
  type ProgramCareerState,
  type RecruitingOfferTuple,
  type RecruitingOffenseStyleDefinition,
  type RotationPolicyMechanicsDefinition,
  type WrRoomCompetitorTuple,
} from '../../src/index.js';

export const TEST_OFFENSE_STYLE_DEFINITIONS = [
  {
    id: 'offense_style_test',
    attributeWeightsPermille: {
      attribute_speed: 125,
      attribute_burst: 125,
      attribute_agility: 125,
      attribute_strength: 125,
      attribute_wr_release: 125,
      attribute_wr_route_running: 125,
      attribute_wr_hands: 125,
      attribute_wr_catch_in_traffic: 125,
    },
    schemeFitByArchetype: {
      archetype_wr_deep_threat: 80,
      archetype_wr_route_technician: 80,
      archetype_wr_possession_receiver: 80,
    },
  },
] as const satisfies readonly RecruitingOffenseStyleDefinition[];

export const TEST_ROTATION_POLICY_DEFINITIONS = [
  {
    id: 'rotation_policy_test',
    rankSnapRanges: [1, 2, 3, 4, 5, 6, 7, 8].map((rank) => ({
      rank,
      minSnapPermille: (8 - rank) * 100,
      maxSnapPermille: (9 - rank) * 100,
    })) as unknown as RotationPolicyMechanicsDefinition['rankSnapRanges'],
  },
] as const satisfies readonly RotationPolicyMechanicsDefinition[];

const OFFERS = [0, 1, 2, 3, 4].map((index) => ({
  programId: `program_test_${String(index + 1).padStart(2, '0')}`,
  interest: 100 - index * 5,
  schemeFit: 80,
  priority: 280 - index * 10,
  projectedDepthBandId: 'projected_depth_band_rotation_path' as const,
})) as unknown as RecruitingOfferTuple;

const COMPONENTS = [
  [85, 60, 65, 85, 85],
  [78, 50, 60, 80, 75],
  [68, 40, 55, 75, 65],
  [60, 35, 50, 70, 55],
  [52, 30, 48, 65, 45],
  [45, 25, 45, 60, 35],
  [38, 20, 42, 55, 25],
] as const;

function evaluation(participantId: string, components: DepthEvaluationComponents) {
  const contributions = {
    talentFitMilli: components.talentFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.talentFit,
    coachTrustMilli: components.coachTrust * DEPTH_EVALUATION_WEIGHTS_PERMILLE.coachTrust,
    practiceFormMilli: components.practiceForm * DEPTH_EVALUATION_WEIGHTS_PERMILLE.practiceForm,
    schemeFitMilli: components.schemeFit * DEPTH_EVALUATION_WEIGHTS_PERMILLE.schemeFit,
    experienceReadinessMilli:
      components.experienceReadiness * DEPTH_EVALUATION_WEIGHTS_PERMILLE.experienceReadiness,
  };
  return {
    participantId,
    components,
    contributions,
    totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
  };
}

/** Builds a strict committed context without advancing the test's RNG word state. */
export function enrollTestCareer(career: CareerRun): CareerRun {
  if (career.recruitingState.type === 'COMMITTED') {
    return career;
  }
  const competitors = COMPONENTS.map((values, index) => {
    const [talentFit, coachTrust, practiceForm, schemeFit, experienceReadiness] = values;
    return {
      id: `roster_player_test_${String(index + 1).padStart(2, '0')}`,
      givenNameId: `roster_given_name_test_${String(index + 1).padStart(2, '0')}`,
      familyNameId: `roster_family_name_test_${String(index + 1).padStart(2, '0')}`,
      archetypeId: [
        'archetype_wr_deep_threat',
        'archetype_wr_route_technician',
        'archetype_wr_possession_receiver',
      ][index % 3] as
        | 'archetype_wr_deep_threat'
        | 'archetype_wr_route_technician'
        | 'archetype_wr_possession_receiver',
      classYear: ((index % 4) + 1) as 1 | 2 | 3 | 4,
      talentFit,
      coachTrust,
      practiceForm,
      schemeFit,
      experienceReadiness,
    };
  }) as unknown as WrRoomCompetitorTuple;
  const unsorted = [
    evaluation(career.player.id, {
      talentFit: 55,
      coachTrust: career.player.state.coachTrust,
      practiceForm: 50,
      schemeFit: 80,
      experienceReadiness: 20,
    }),
    ...competitors.map((competitor) =>
      evaluation(competitor.id, {
        talentFit: competitor.talentFit,
        coachTrust: competitor.coachTrust,
        practiceForm: competitor.practiceForm,
        schemeFit: competitor.schemeFit,
        experienceReadiness: competitor.experienceReadiness,
      }),
    ),
  ].sort((left, right) =>
    right.totalScoreMilli === left.totalScoreMilli
      ? left.participantId < right.participantId
        ? -1
        : left.participantId > right.participantId
          ? 1
          : 0
      : right.totalScoreMilli - left.totalScoreMilli,
  );
  const evaluations = unsorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  })) as unknown as DepthEvaluationTuple;
  const depthOrderIds = evaluations.map(
    ({ participantId }) => participantId,
  ) as unknown as DepthOrderTuple;
  const playerEvaluation = evaluations.find(
    ({ participantId }) => participantId === career.player.id,
  );
  if (playerEvaluation === undefined) {
    throw new Error('Test enrollment lost the player evaluation.');
  }
  const programContext: ProgramCareerState = {
    programId: 'program_test_01',
    offenseStyleId: 'offense_style_test',
    rotationPolicyId: 'rotation_policy_test',
    playerPracticeForm: 50,
    competitors,
    depthOrderIds,
    evaluations,
    projection: {
      rank: playerEvaluation.rank,
      roleId: playerEvaluation.roleId,
      minSnapPermille: (8 - playerEvaluation.rank) * 100,
      maxSnapPermille: (9 - playerEvaluation.rank) * 100,
    },
    latestDepthUpdate: null,
  };
  const next: CareerRun = {
    ...career,
    rng: { ...career.rng, drawCount: career.rng.drawCount + 35 },
    programId: 'program_test_01',
    recruitingState: {
      type: 'COMMITTED',
      recruitAbilityScore: 60,
      backgroundModifier: 0,
      recruitScore: 60,
      recruitTierId: 'recruit_tier_priority',
      offers: OFFERS,
      selectedProgramId: 'program_test_01',
      selectedAtWeekIndex: career.weekIndex,
      rosterRngDrawCountBefore: career.rng.drawCount,
      rosterRngDrawCountAfter: career.rng.drawCount + 35,
    },
    programContext,
  };
  const validated = validateCareerRun(next);
  if (!validated.ok) {
    throw new Error(`Test enrollment invalid: ${JSON.stringify(validated.issues)}`);
  }
  return next;
}
