import { COACH_TRUST_BOUNDS } from '../player/bounds.js';
import { deepFreeze } from '../player/immutable.js';
import {
  isPlayerArchetypeId,
  isPlayerId,
  isPositionId,
  isProgramId,
  type MultiPositionAttributeId,
  type PlayerArchetypeId,
  type PlayerId,
  type PositionId,
  type ProgramId,
} from '../player/ids.js';
import type { CreatedPositionPlayerProfile } from '../player/position-creation.js';
import {
  getPlayableAttributeIds,
  validatePositionAttributeProgress,
  type PositionAttributeProgress,
} from '../player/progression.js';
import { isRngState, nextUint32, type RngState } from '../random/rng.js';
import {
  isRosterFamilyNameId,
  isRosterGivenNameId,
  type DepthRoleId,
  type RecruitTierId,
  type RosterFamilyNameId,
  type RosterGivenNameId,
  type RosterPlayerId,
} from './ids.js';
import { selectDiverseRosterNamePair } from './roster-identity.js';
import {
  COACH_TRUST_WEEKLY_SCORE_BANDS,
  DEPTH_COMPONENT_BOUNDS,
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE,
  PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE,
  deriveRecruitTierId,
  depthRoleIdForRank,
} from './tuning.js';

export const POSITION_ROOM_COMPETITOR_COUNT = 7 as const;
export const POSITION_ROOM_PARTICIPANT_COUNT = 8 as const;
export const POSITION_ROOM_RNG_DRAWS = 35 as const;

export type PositionDepthComponentId =
  'talentFit' | 'coachTrust' | 'practiceForm' | 'schemeFit' | 'experienceReadiness';

export interface PositionDepthWeightsPermille {
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export interface PositionOpportunityBand {
  readonly interactiveSnapMinimum: number;
  readonly interactiveSnapMaximum: number;
  readonly feedbackBeatMinimum: number;
}

export interface PositionRoomMechanics {
  readonly positionId: PositionId;
  readonly archetypeIds: readonly [PlayerArchetypeId, PlayerArchetypeId, PlayerArchetypeId];
  readonly recruitingAbilityWeightsPermille: Readonly<
    Partial<Record<MultiPositionAttributeId, number>>
  >;
  readonly schemeFitByArchetype: Readonly<Partial<Record<PlayerArchetypeId, number>>>;
  readonly depthEvaluationWeightsPermille: PositionDepthWeightsPermille;
  readonly opportunityByRole: Readonly<Record<DepthRoleId, PositionOpportunityBand>>;
  readonly hysteresisThresholdMilli: number;
}

export interface PositionRecruitingProfile {
  readonly abilityScore: number;
  readonly backgroundModifier: number;
  readonly recruitScore: number;
  readonly recruitTierId: RecruitTierId;
  readonly schemeFit: number;
}

export interface PositionRoomNamePool {
  readonly givenNameIds: readonly RosterGivenNameId[];
  readonly familyNameIds: readonly RosterFamilyNameId[];
}

export interface PositionRoomGenerationConfig {
  readonly programId: ProgramId;
  readonly roomTalentMean: number;
  readonly roomTalentSpread: number;
  readonly trustBase: number;
  readonly practiceFormBase: number;
  readonly experienceReadinessBase: number;
  readonly playerCoachTrustBonus: number;
  readonly playerPracticeForm: number;
  readonly playerExperienceReadiness: number;
}

export interface PositionRoomCompetitor {
  readonly id: RosterPlayerId;
  readonly givenNameId: RosterGivenNameId;
  readonly familyNameId: RosterFamilyNameId;
  readonly positionId: PositionId;
  readonly archetypeId: PlayerArchetypeId;
  readonly classYear: 1 | 2 | 3 | 4;
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export type PositionDepthParticipantId = PlayerId | RosterPlayerId;

export interface PositionDepthComponents {
  readonly talentFit: number;
  readonly coachTrust: number;
  readonly practiceForm: number;
  readonly schemeFit: number;
  readonly experienceReadiness: number;
}

export interface PositionDepthContributions {
  readonly talentFitMilli: number;
  readonly coachTrustMilli: number;
  readonly practiceFormMilli: number;
  readonly schemeFitMilli: number;
  readonly experienceReadinessMilli: number;
}

export interface PositionDepthEvaluation {
  readonly participantId: PositionDepthParticipantId;
  readonly rank: number;
  readonly roleId: DepthRoleId;
  readonly components: PositionDepthComponents;
  readonly contributions: PositionDepthContributions;
  readonly totalScoreMilli: number;
}

export interface PositionOpportunityProjection extends PositionOpportunityBand {
  readonly rank: number;
  readonly roleId: DepthRoleId;
}

export interface PositionAdjacentComponentComparison {
  readonly componentId: PositionDepthComponentId;
  readonly playerValue: number;
  readonly neighborValue: number;
  readonly contributionGapMilli: number;
}

export interface PositionAdjacentDepthExplanation {
  readonly direction: 'ADVANCEMENT_TARGET' | 'ROLE_PRESSURE';
  readonly neighborParticipantId: PositionDepthParticipantId;
  readonly scoreGapMilli: number;
  readonly components: readonly PositionAdjacentComponentComparison[];
  readonly leadingPlayerDeficit: PositionAdjacentComponentComparison | null;
}

export interface PositionRoomContext {
  readonly positionId: PositionId;
  readonly programId: ProgramId;
  readonly playerId: PlayerId;
  readonly playerPracticeForm: number;
  readonly playerCoachTrust: number;
  readonly competitors: readonly PositionRoomCompetitor[];
  readonly depthOrderIds: readonly PositionDepthParticipantId[];
  readonly evaluations: readonly PositionDepthEvaluation[];
  readonly projection: PositionOpportunityProjection;
  readonly adjacentExplanation: PositionAdjacentDepthExplanation;
}

export interface GeneratedPositionRoom {
  readonly context: PositionRoomContext;
  readonly rng: RngState;
  readonly rosterRngDrawCountBefore: number;
  readonly rosterRngDrawCountAfter: number;
}

export interface PositionCoachTrustChange {
  readonly before: number;
  readonly weeklyPracticeScore: number;
  readonly requestedDelta: number;
  readonly actualDelta: number;
  readonly after: number;
}

export interface PositionDepthUpdateEvidence {
  readonly practiceFormBefore: number;
  readonly weeklyPracticeScore: number;
  readonly practiceFormAfter: number;
  readonly coachTrust: PositionCoachTrustChange;
  readonly rankBefore: number;
  readonly rankAfter: number;
  readonly roleBefore: DepthRoleId;
  readonly roleAfter: DepthRoleId;
  readonly opportunityBefore: PositionOpportunityProjection;
  readonly opportunityAfter: PositionOpportunityProjection;
  readonly movement: 'PROMOTED' | 'DEMOTED' | 'HELD';
  readonly hysteresisThresholdMilli: number;
  readonly neighborParticipantId: PositionDepthParticipantId | null;
  readonly adjacentExplanation: PositionAdjacentDepthExplanation;
}

export type GeneratePositionRoomResult =
  | { readonly ok: true; readonly generated: GeneratedPositionRoom }
  | {
      readonly ok: false;
      readonly reason: 'position_room.invalid_input' | 'position_room.rng_exhausted';
    };

export type UpdatePositionRoomResult =
  | {
      readonly ok: true;
      readonly context: PositionRoomContext;
      readonly evidence: PositionDepthUpdateEvidence;
    }
  | { readonly ok: false; readonly reason: 'position_room.invalid_input' };

const COMPONENT_IDS = Object.freeze([
  'talentFit',
  'coachTrust',
  'practiceForm',
  'schemeFit',
  'experienceReadiness',
] as const satisfies readonly PositionDepthComponentId[]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function integerIn(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function archetypeMatchesPosition(positionId: PositionId, archetypeId: PlayerArchetypeId): boolean {
  return archetypeId.startsWith(`archetype_${positionId.slice('position_'.length)}_`);
}

function validMechanics(mechanics: PositionRoomMechanics): boolean {
  if (
    !isPositionId(mechanics?.positionId) ||
    !Array.isArray(mechanics.archetypeIds) ||
    mechanics.archetypeIds.length !== 3 ||
    new Set(mechanics.archetypeIds).size !== 3 ||
    mechanics.archetypeIds.some(
      (id) => !isPlayerArchetypeId(id) || !archetypeMatchesPosition(mechanics.positionId, id),
    ) ||
    mechanics.hysteresisThresholdMilli !== DEPTH_HYSTERESIS_THRESHOLD_MILLI
  ) {
    return false;
  }
  const attributeIds = getPlayableAttributeIds(mechanics.positionId);
  const weights = mechanics.recruitingAbilityWeightsPermille;
  if (
    Object.keys(weights).length !== attributeIds.length ||
    attributeIds.some((id) => !integerIn(weights[id], 0, 1_000)) ||
    attributeIds.reduce((total, id) => total + (weights[id] ?? 0), 0) !== 1_000
  ) {
    return false;
  }
  const schemeFits = mechanics.schemeFitByArchetype;
  if (
    Object.keys(schemeFits).length !== 3 ||
    mechanics.archetypeIds.some((id) => !integerIn(schemeFits[id], 0, 100))
  ) {
    return false;
  }
  const depthWeights = mechanics.depthEvaluationWeightsPermille;
  if (
    COMPONENT_IDS.some((id) => !integerIn(depthWeights[id], 1, 1_000)) ||
    COMPONENT_IDS.reduce((total, id) => total + depthWeights[id], 0) !== 1_000
  ) {
    return false;
  }
  const roles: readonly DepthRoleId[] = [
    'depth_role_starter',
    'depth_role_rotation',
    'depth_role_reserve',
    'depth_role_developmental',
  ];
  return roles.every((roleId) => {
    const band = mechanics.opportunityByRole[roleId];
    return (
      band !== undefined &&
      integerIn(band.interactiveSnapMinimum, 0, 8) &&
      integerIn(band.interactiveSnapMaximum, 0, 8) &&
      band.interactiveSnapMinimum <= band.interactiveSnapMaximum &&
      integerIn(band.feedbackBeatMinimum, 1, 4)
    );
  });
}

function validPlayer(
  player: CreatedPositionPlayerProfile,
  mechanics: PositionRoomMechanics,
): boolean {
  return (
    isPlayerId(player?.id) &&
    player.positionId === mechanics.positionId &&
    isPlayerArchetypeId(player.archetypeId) &&
    mechanics.archetypeIds.includes(player.archetypeId) &&
    validatePositionAttributeProgress(player.positionId, player.attributes).length === 0 &&
    integerIn(player.state?.coachTrust, COACH_TRUST_BOUNDS.min, COACH_TRUST_BOUNDS.max)
  );
}

function playerTalentFit(
  attributes: PositionAttributeProgress,
  mechanics: PositionRoomMechanics,
): number {
  return Math.round(
    getPlayableAttributeIds(mechanics.positionId).reduce(
      (total, attributeId) =>
        total +
        attributes[attributeId]!.rating * mechanics.recruitingAbilityWeightsPermille[attributeId]!,
      0,
    ) / 1_000,
  );
}

export function derivePositionRecruitingProfile(
  player: CreatedPositionPlayerProfile,
  mechanics: PositionRoomMechanics,
  backgroundModifier: number,
): PositionRecruitingProfile | undefined {
  if (
    !validMechanics(mechanics) ||
    !validPlayer(player, mechanics) ||
    !integerIn(backgroundModifier, -20, 20)
  ) {
    return undefined;
  }
  const abilityScore = playerTalentFit(player.attributes, mechanics);
  const recruitScore = clamp(abilityScore + backgroundModifier, 0, 100);
  return deepFreeze({
    abilityScore,
    backgroundModifier,
    recruitScore,
    recruitTierId: deriveRecruitTierId(recruitScore),
    schemeFit: mechanics.schemeFitByArchetype[player.archetypeId]!,
  });
}

function evaluate(
  participantId: PositionDepthParticipantId,
  components: PositionDepthComponents,
  mechanics: PositionRoomMechanics,
): Omit<PositionDepthEvaluation, 'rank' | 'roleId'> {
  const weights = mechanics.depthEvaluationWeightsPermille;
  const contributions = {
    talentFitMilli: components.talentFit * weights.talentFit,
    coachTrustMilli: components.coachTrust * weights.coachTrust,
    practiceFormMilli: components.practiceForm * weights.practiceForm,
    schemeFitMilli: components.schemeFit * weights.schemeFit,
    experienceReadinessMilli: components.experienceReadiness * weights.experienceReadiness,
  };
  return {
    participantId,
    components,
    contributions,
    totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
  };
}

function rankEvaluations(
  evaluations: readonly Omit<PositionDepthEvaluation, 'rank' | 'roleId'>[],
): readonly PositionDepthEvaluation[] {
  return evaluations
    .map((entry) => ({ ...entry }))
    .sort((left, right) =>
      right.totalScoreMilli === left.totalScoreMilli
        ? compareCodeUnits(left.participantId, right.participantId)
        : right.totalScoreMilli - left.totalScoreMilli,
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      roleId: depthRoleIdForRank(index + 1),
    }));
}

function opportunityForRank(
  rank: number,
  mechanics: PositionRoomMechanics,
): PositionOpportunityProjection {
  const roleId = depthRoleIdForRank(rank);
  return { rank, roleId, ...mechanics.opportunityByRole[roleId] };
}

function contributionFor(
  evaluation: PositionDepthEvaluation,
  componentId: PositionDepthComponentId,
): number {
  switch (componentId) {
    case 'talentFit':
      return evaluation.contributions.talentFitMilli;
    case 'coachTrust':
      return evaluation.contributions.coachTrustMilli;
    case 'practiceForm':
      return evaluation.contributions.practiceFormMilli;
    case 'schemeFit':
      return evaluation.contributions.schemeFitMilli;
    case 'experienceReadiness':
      return evaluation.contributions.experienceReadinessMilli;
  }
}

function adjacentExplanation(
  evaluations: readonly PositionDepthEvaluation[],
  playerId: PlayerId,
): PositionAdjacentDepthExplanation | undefined {
  const playerIndex = evaluations.findIndex(({ participantId }) => participantId === playerId);
  const player = evaluations[playerIndex];
  if (
    playerIndex < 0 ||
    player === undefined ||
    evaluations.length !== POSITION_ROOM_PARTICIPANT_COUNT
  ) {
    return undefined;
  }
  const direction = playerIndex === 0 ? 'ROLE_PRESSURE' : 'ADVANCEMENT_TARGET';
  const neighbor = evaluations[playerIndex === 0 ? 1 : playerIndex - 1];
  if (neighbor === undefined) return undefined;
  const components = COMPONENT_IDS.map((componentId) => ({
    componentId,
    playerValue: player.components[componentId],
    neighborValue: neighbor.components[componentId],
    contributionGapMilli:
      contributionFor(neighbor, componentId) - contributionFor(player, componentId),
  }));
  const leadingPlayerDeficit =
    components
      .filter(({ contributionGapMilli }) => contributionGapMilli > 0)
      .sort((left, right) =>
        right.contributionGapMilli === left.contributionGapMilli
          ? COMPONENT_IDS.indexOf(left.componentId) - COMPONENT_IDS.indexOf(right.componentId)
          : right.contributionGapMilli - left.contributionGapMilli,
      )[0] ?? null;
  return {
    direction,
    neighborParticipantId: neighbor.participantId,
    scoreGapMilli: neighbor.totalScoreMilli - player.totalScoreMilli,
    components,
    leadingPlayerDeficit,
  };
}

function validNamePool(value: PositionRoomNamePool): boolean {
  return (
    Array.isArray(value?.givenNameIds) &&
    Array.isArray(value.familyNameIds) &&
    value.givenNameIds.length > 0 &&
    value.familyNameIds.length > 0 &&
    value.givenNameIds.length * value.familyNameIds.length >= POSITION_ROOM_COMPETITOR_COUNT &&
    value.givenNameIds.every(isRosterGivenNameId) &&
    value.familyNameIds.every(isRosterFamilyNameId) &&
    new Set(value.givenNameIds).size === value.givenNameIds.length &&
    new Set(value.familyNameIds).size === value.familyNameIds.length
  );
}

function validGenerationConfig(config: PositionRoomGenerationConfig): boolean {
  return (
    isProgramId(config?.programId) &&
    integerIn(config.roomTalentMean, 35, 90) &&
    integerIn(config.roomTalentSpread, 1, 25) &&
    integerIn(config.trustBase, 0, 100) &&
    integerIn(config.practiceFormBase, 0, 100) &&
    integerIn(config.experienceReadinessBase, 0, 100) &&
    integerIn(config.playerCoachTrustBonus, -20, 20) &&
    integerIn(config.playerPracticeForm, 0, 100) &&
    integerIn(config.playerExperienceReadiness, 0, 100)
  );
}

function oneDrawIndex(
  rng: RngState,
  length: number,
): { readonly index: number; readonly rng: RngState } {
  const sample = nextUint32(rng);
  return { index: Math.floor((sample.value * length) / 0x1_0000_0000), rng: sample.nextRng };
}

export function generatePositionRoom(
  player: CreatedPositionPlayerProfile,
  rngBefore: RngState,
  namePool: PositionRoomNamePool,
  mechanics: PositionRoomMechanics,
  config: PositionRoomGenerationConfig,
): GeneratePositionRoomResult {
  if (
    !validMechanics(mechanics) ||
    !validPlayer(player, mechanics) ||
    !isRngState(rngBefore) ||
    !validNamePool(namePool) ||
    !validGenerationConfig(config)
  ) {
    return deepFreeze({ ok: false as const, reason: 'position_room.invalid_input' as const });
  }
  if (rngBefore.drawCount > Number.MAX_SAFE_INTEGER - POSITION_ROOM_RNG_DRAWS) {
    return deepFreeze({ ok: false as const, reason: 'position_room.rng_exhausted' as const });
  }
  const givenIds = [...namePool.givenNameIds].sort(compareCodeUnits);
  const familyIds = [...namePool.familyNameIds].sort(compareCodeUnits);
  let rng = rngBefore;
  const usedPairs = new Set<string>();
  const givenUsage = new Map<RosterGivenNameId, number>();
  const familyUsage = new Map<RosterFamilyNameId, number>();
  const competitors: PositionRoomCompetitor[] = [];
  for (let index = 0; index < POSITION_ROOM_COMPETITOR_COUNT; index += 1) {
    const givenDraw = oneDrawIndex(rng, givenIds.length);
    rng = givenDraw.rng;
    const familyDraw = oneDrawIndex(rng, familyIds.length);
    rng = familyDraw.rng;
    const archetypeDraw = oneDrawIndex(rng, mechanics.archetypeIds.length);
    rng = archetypeDraw.rng;
    const classDraw = oneDrawIndex(rng, 4);
    rng = classDraw.rng;
    const talentDraw = oneDrawIndex(rng, config.roomTalentSpread * 2 + 1);
    rng = talentDraw.rng;
    const selectedName = selectDiverseRosterNamePair({
      familyNameIds: familyIds,
      familyStartIndex: familyDraw.index,
      familyUsage,
      givenNameIds: givenIds,
      givenStartIndex: givenDraw.index,
      givenUsage,
      usedPairs,
    });
    const givenNameId = selectedName?.givenNameId;
    const familyNameId = selectedName?.familyNameId;
    const archetypeId = mechanics.archetypeIds[archetypeDraw.index];
    if (givenNameId === undefined || familyNameId === undefined || archetypeId === undefined) {
      return deepFreeze({ ok: false as const, reason: 'position_room.invalid_input' as const });
    }
    usedPairs.add(`${givenNameId}|${familyNameId}`);
    givenUsage.set(givenNameId, (givenUsage.get(givenNameId) ?? 0) + 1);
    familyUsage.set(familyNameId, (familyUsage.get(familyNameId) ?? 0) + 1);
    const classYear = (classDraw.index + 1) as 1 | 2 | 3 | 4;
    const talentFit = clamp(
      config.roomTalentMean - config.roomTalentSpread + talentDraw.index,
      DEPTH_COMPONENT_BOUNDS.min,
      DEPTH_COMPONENT_BOUNDS.max,
    );
    competitors.push({
      id: `roster_player_${config.programId.slice('program_'.length)}_${mechanics.positionId.slice('position_'.length)}_${String(index + 1).padStart(2, '0')}`,
      givenNameId,
      familyNameId,
      positionId: mechanics.positionId,
      archetypeId,
      classYear,
      talentFit,
      coachTrust: clamp(config.trustBase + (classYear - 1) * 5, 0, 100),
      practiceForm: clamp(
        config.practiceFormBase + Math.round((talentFit - config.roomTalentMean) / 3),
        0,
        100,
      ),
      schemeFit: mechanics.schemeFitByArchetype[archetypeId]!,
      experienceReadiness: clamp(config.experienceReadinessBase + (classYear - 2) * 8, 0, 100),
    });
  }
  const playerCoachTrust = clamp(player.state.coachTrust + config.playerCoachTrustBonus, 0, 100);
  const evaluations = rankEvaluations([
    evaluate(
      player.id,
      {
        talentFit: playerTalentFit(player.attributes, mechanics),
        coachTrust: playerCoachTrust,
        practiceForm: config.playerPracticeForm,
        schemeFit: mechanics.schemeFitByArchetype[player.archetypeId]!,
        experienceReadiness: config.playerExperienceReadiness,
      },
      mechanics,
    ),
    ...competitors.map((competitor) =>
      evaluate(
        competitor.id,
        {
          talentFit: competitor.talentFit,
          coachTrust: competitor.coachTrust,
          practiceForm: competitor.practiceForm,
          schemeFit: competitor.schemeFit,
          experienceReadiness: competitor.experienceReadiness,
        },
        mechanics,
      ),
    ),
  ]);
  const playerEvaluation = evaluations.find(({ participantId }) => participantId === player.id)!;
  const explanation = adjacentExplanation(evaluations, player.id)!;
  const context: PositionRoomContext = {
    positionId: mechanics.positionId,
    programId: config.programId,
    playerId: player.id,
    playerPracticeForm: config.playerPracticeForm,
    playerCoachTrust,
    competitors,
    depthOrderIds: evaluations.map(({ participantId }) => participantId),
    evaluations,
    projection: opportunityForRank(playerEvaluation.rank, mechanics),
    adjacentExplanation: explanation,
  };
  return deepFreeze({
    ok: true,
    generated: {
      context,
      rng,
      rosterRngDrawCountBefore: rngBefore.drawCount,
      rosterRngDrawCountAfter: rng.drawCount,
    },
  });
}

export function derivePositionCoachTrustChange(
  coachTrustBefore: number,
  weeklyPracticeScore: number,
): PositionCoachTrustChange | undefined {
  if (!integerIn(coachTrustBefore, 0, 100) || !integerIn(weeklyPracticeScore, 0, 100)) {
    return undefined;
  }
  const requestedDelta =
    COACH_TRUST_WEEKLY_SCORE_BANDS.find(({ maxScore }) => weeklyPracticeScore <= maxScore)?.delta ??
    0;
  const after = clamp(coachTrustBefore + requestedDelta, 0, 100);
  return deepFreeze({
    before: coachTrustBefore,
    weeklyPracticeScore,
    requestedDelta,
    actualDelta: after - coachTrustBefore,
    after,
  });
}

function contextIsUsable(context: PositionRoomContext, mechanics: PositionRoomMechanics): boolean {
  return (
    context?.positionId === mechanics.positionId &&
    isProgramId(context.programId) &&
    isPlayerId(context.playerId) &&
    integerIn(context.playerPracticeForm, 0, 100) &&
    integerIn(context.playerCoachTrust, 0, 100) &&
    Array.isArray(context.competitors) &&
    context.competitors.length === POSITION_ROOM_COMPETITOR_COUNT &&
    Array.isArray(context.evaluations) &&
    context.evaluations.length === POSITION_ROOM_PARTICIPANT_COUNT &&
    context.evaluations.every(
      (entry, index) => entry.rank === index + 1 && entry.roleId === depthRoleIdForRank(index + 1),
    ) &&
    context.evaluations.filter(({ participantId }) => participantId === context.playerId).length ===
      1 &&
    context.depthOrderIds.length === POSITION_ROOM_PARTICIPANT_COUNT &&
    context.depthOrderIds.every((id, index) => id === context.evaluations[index]?.participantId)
  );
}

export function updatePositionRoomAfterPractice(
  context: PositionRoomContext,
  attributes: PositionAttributeProgress,
  weeklyPracticeScore: number,
  mechanics: PositionRoomMechanics,
): UpdatePositionRoomResult {
  if (
    !validMechanics(mechanics) ||
    !contextIsUsable(context, mechanics) ||
    validatePositionAttributeProgress(mechanics.positionId, attributes).length > 0 ||
    !integerIn(weeklyPracticeScore, 0, 100)
  ) {
    return deepFreeze({ ok: false as const, reason: 'position_room.invalid_input' as const });
  }
  const oldPlayerIndex = context.evaluations.findIndex(
    ({ participantId }) => participantId === context.playerId,
  );
  const previousPlayer = context.evaluations[oldPlayerIndex];
  if (oldPlayerIndex < 0 || previousPlayer === undefined) {
    return deepFreeze({ ok: false as const, reason: 'position_room.invalid_input' as const });
  }
  const practiceFormAfter = Math.round(
    (context.playerPracticeForm * PRACTICE_FORM_PREVIOUS_WEIGHT_PERMILLE +
      weeklyPracticeScore * PRACTICE_FORM_WEEKLY_WEIGHT_PERMILLE) /
      1_000,
  );
  const coachTrust = derivePositionCoachTrustChange(context.playerCoachTrust, weeklyPracticeScore)!;
  const playerEvaluation = evaluate(
    context.playerId,
    {
      talentFit: playerTalentFit(attributes, mechanics),
      coachTrust: coachTrust.after,
      practiceForm: practiceFormAfter,
      schemeFit: previousPlayer.components.schemeFit,
      experienceReadiness: previousPlayer.components.experienceReadiness,
    },
    mechanics,
  );
  const ordered = context.evaluations.map((entry) =>
    entry.participantId === context.playerId
      ? playerEvaluation
      : {
          participantId: entry.participantId,
          components: { ...entry.components },
          contributions: { ...entry.contributions },
          totalScoreMilli: entry.totalScoreMilli,
        },
  );
  let nextPlayerIndex = oldPlayerIndex;
  let movement: PositionDepthUpdateEvidence['movement'] = 'HELD';
  let neighborParticipantId: PositionDepthParticipantId | null = null;
  const above = ordered[oldPlayerIndex - 1];
  const below = ordered[oldPlayerIndex + 1];
  if (
    above !== undefined &&
    playerEvaluation.totalScoreMilli >= above.totalScoreMilli + mechanics.hysteresisThresholdMilli
  ) {
    ordered[oldPlayerIndex - 1] = playerEvaluation;
    ordered[oldPlayerIndex] = above;
    nextPlayerIndex -= 1;
    movement = 'PROMOTED';
    neighborParticipantId = above.participantId;
  } else if (
    below !== undefined &&
    below.totalScoreMilli >= playerEvaluation.totalScoreMilli + mechanics.hysteresisThresholdMilli
  ) {
    ordered[oldPlayerIndex] = below;
    ordered[oldPlayerIndex + 1] = playerEvaluation;
    nextPlayerIndex += 1;
    movement = 'DEMOTED';
    neighborParticipantId = below.participantId;
  } else if (above !== undefined && playerEvaluation.totalScoreMilli > above.totalScoreMilli) {
    neighborParticipantId = above.participantId;
  } else if (below !== undefined && below.totalScoreMilli > playerEvaluation.totalScoreMilli) {
    neighborParticipantId = below.participantId;
  }
  const evaluations = ordered.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  }));
  const explanation = adjacentExplanation(evaluations, context.playerId);
  if (explanation === undefined) {
    return deepFreeze({ ok: false as const, reason: 'position_room.invalid_input' as const });
  }
  const rankBefore = oldPlayerIndex + 1;
  const rankAfter = nextPlayerIndex + 1;
  const opportunityAfter = opportunityForRank(rankAfter, mechanics);
  const nextContext: PositionRoomContext = {
    ...context,
    playerPracticeForm: practiceFormAfter,
    playerCoachTrust: coachTrust.after,
    depthOrderIds: evaluations.map(({ participantId }) => participantId),
    evaluations,
    projection: opportunityAfter,
    adjacentExplanation: explanation,
  };
  return deepFreeze({
    ok: true,
    context: nextContext,
    evidence: {
      practiceFormBefore: context.playerPracticeForm,
      weeklyPracticeScore,
      practiceFormAfter,
      coachTrust,
      rankBefore,
      rankAfter,
      roleBefore: depthRoleIdForRank(rankBefore),
      roleAfter: depthRoleIdForRank(rankAfter),
      opportunityBefore: context.projection,
      opportunityAfter,
      movement,
      hysteresisThresholdMilli: mechanics.hysteresisThresholdMilli,
      neighborParticipantId,
      adjacentExplanation: explanation,
    },
  });
}
