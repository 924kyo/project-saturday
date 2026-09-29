import type { InjuryOutcomeId } from '../injuries/ids.js';
import { scalePositiveRelationshipDelta } from '../skills/positive-life-effects.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import {
  POSITION_IDS,
  isCareerId,
  isPlayerArchetypeId,
  isPlayerId,
  isPositionId,
  isProgramId,
  isStableDomainId,
  type CareerId,
  type PlayerArchetypeId,
  type PlayerId,
  type PositionId,
  type ProgramId,
} from '../player/ids.js';
import type { PlayerAppearance, PlayerState } from '../player/types.js';
import { compareCodeUnits } from '../player/order.js';
import { isRngState, nextUint32, type RngSeed, type RngState } from '../random/rng.js';
import type { DepthRoleId } from '../programs/ids.js';
import { isDepthRoleId } from '../programs/ids.js';
import type { SkillId } from '../skills/ids.js';
import type {
  AlumniRecordV1,
  MetaProfileV1,
  ProgramFamiliarityV1,
  SeasonOutcomeId,
} from './types.js';
import type { WorldAlphaOffseasonProjection } from './world-alpha.js';

export const POSITION_LIFECYCLE_SCHEMA_VERSION_V1 = 1 as const;
export const POSITION_META_PROFILE_SCHEMA_VERSION_V2 = 2 as const;

export const POSITION_STAT_IDS = Object.freeze({
  position_wr: Object.freeze([
    'stat_wr_targets',
    'stat_wr_receptions',
    'stat_wr_receiving_yards',
    'stat_wr_receiving_touchdowns',
    'stat_wr_drops',
    'stat_wr_turnovers',
  ]),
  position_qb: Object.freeze([
    'stat_qb_pass_attempts',
    'stat_qb_completions',
    'stat_qb_passing_yards',
    'stat_qb_passing_touchdowns',
    'stat_qb_interceptions',
    'stat_qb_sacks_taken',
    'stat_qb_rush_attempts',
    'stat_qb_rushing_yards',
    'stat_qb_rushing_touchdowns',
    'stat_qb_fumbles',
  ]),
  position_rb: Object.freeze([
    'stat_rb_carries',
    'stat_rb_rushing_yards',
    'stat_rb_rushing_touchdowns',
    'stat_rb_receptions',
    'stat_rb_receiving_yards',
    'stat_rb_receiving_touchdowns',
    'stat_rb_protection_assignments',
    'stat_rb_protection_wins',
    'stat_rb_fumbles',
  ]),
  position_cb: Object.freeze([
    'stat_cb_coverage_snaps',
    'stat_cb_targets',
    'stat_cb_completions_allowed',
    'stat_cb_yards_allowed',
    'stat_cb_touchdowns_allowed',
    'stat_cb_passes_defended',
    'stat_cb_interceptions',
    'stat_cb_tackles',
    'stat_cb_missed_tackles',
  ]),
  position_lb: Object.freeze([
    'stat_lb_snaps',
    'stat_lb_tackles',
    'stat_lb_tackles_for_loss',
    'stat_lb_sacks',
    'stat_lb_passes_defended',
    'stat_lb_interceptions',
    'stat_lb_yards_allowed',
    'stat_lb_missed_tackles',
  ]),
  position_edge: Object.freeze([
    'stat_edge_snaps',
    'stat_edge_pressures',
    'stat_edge_sacks',
    'stat_edge_tackles',
    'stat_edge_tackles_for_loss',
    'stat_edge_forced_fumbles',
    'stat_edge_yards_allowed',
    'stat_edge_missed_tackles',
  ]),
} as const satisfies Readonly<Record<PositionId, readonly `stat_${string}`[]>>);

export type PositionStatId = (typeof POSITION_STAT_IDS)[PositionId][number];
export type PositionRelationshipActorId = 'POSITION_COACH' | 'ROOM_LEADER' | 'DIRECT_COMPETITOR';
export type PositionLifecycleEligibilityTagId =
  | `tag_position_${'wr' | 'qb' | 'rb' | 'cb' | 'lb' | 'edge'}`
  | `tag_role_${'starter' | 'rotation' | 'reserve' | 'developmental'}`
  | `tag_performance_${'featured' | 'steady' | 'developing'}`
  | `tag_relationship_${'coach' | 'room' | 'competitor'}_${'high' | 'low'}`;

export interface PositionLifecycleMechanicsV1 {
  readonly model: 'position_lifecycle_mechanics_v1';
  readonly injuryExposurePermille: Readonly<Record<PositionId, number>>;
  readonly relationshipActionEffects: Readonly<
    Record<PositionId, Readonly<Record<string, readonly [number, number, number]>>>
  >;
  readonly stayTrustRetentionPermille: number;
  readonly transferTrustRetentionPermille: number;
  readonly transferRelationshipBaseline: number;
  readonly shortlistSize: 3;
}

export interface PositionInjuryExposureInput {
  readonly positionId: PositionId;
  readonly body: number;
  readonly durability: number;
  readonly workloadSnapPermille: number;
  readonly recentTrainingLoad: number;
  readonly currentInjury: NewInjuryEvidence | null;
}

export interface PositionInjuryExposureProjectionV1 {
  readonly model: 'position_injury_exposure_v1';
  readonly positionId: PositionId;
  readonly bodyRiskPermille: number;
  readonly durabilityRiskPermille: number;
  readonly workloadRiskPermille: number;
  readonly trainingRiskPermille: number;
  readonly positionExposurePermille: number;
  readonly totalRiskPermille: number;
  readonly currentAvailabilityId:
    'injury_availability_full' | 'injury_availability_limited' | 'injury_availability_out';
  readonly opportunityCap: number | null;
}

export interface PositionRelationshipTrackV1 {
  readonly actorId: PositionRelationshipActorId;
  readonly value: number;
}

export interface PositionRelationshipWeekEvidenceV1 {
  readonly model: 'position_relationship_week_v1';
  readonly positionId: PositionId;
  readonly weekIndex: number;
  readonly actionIds: readonly string[];
  readonly changes: readonly {
    readonly actorId: PositionRelationshipActorId;
    readonly valueBefore: number;
    readonly requestedDelta: number;
    readonly actualDelta: number;
    readonly valueAfter: number;
  }[];
  readonly tracksAfter: readonly PositionRelationshipTrackV1[];
  readonly coachTrustModifier: number;
  readonly informationScoreModifier: number;
  readonly opportunitySnapBonusPermille: number;
}

export interface PositionEligibilityContextV1 {
  readonly model: 'position_eligibility_context_v1';
  readonly positionId: PositionId;
  readonly roleId: DepthRoleId;
  readonly brand: number;
  readonly gpaMilli: number;
  readonly statTotal: number;
  readonly tagIds: readonly PositionLifecycleEligibilityTagId[];
}

export interface PositionStatEntryV1 {
  readonly statId: PositionStatId;
  readonly value: number;
}

export interface PositionStatLineV1 {
  readonly model: 'position_stat_line_v1';
  readonly positionId: PositionId;
  readonly entries: readonly PositionStatEntryV1[];
}

export interface PositionSeasonSummaryV1 {
  readonly model: 'position_season_summary_v1';
  readonly seasonIndex: number;
  readonly seasonId: `season_${string}`;
  readonly programId: ProgramId;
  readonly positionId: PositionId;
  readonly outcomeId: SeasonOutcomeId;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly stats: PositionStatLineV1;
  readonly averagePerformanceGrade: number;
  readonly startingDepthRank: number;
  readonly startingRoleId: DepthRoleId;
  readonly finalDepthRank: number;
  readonly finalRoleId: DepthRoleId;
  readonly injuryOutcomeIds: readonly InjuryOutcomeId[];
  readonly injuryWeeksMissed: number;
  readonly ownedSkillIds: readonly SkillId[];
  readonly equippedSkillIds: readonly (SkillId | null)[];
}

export interface PositionOffseasonOptionV1 {
  readonly programId: ProgramId;
  readonly kind: 'STAY' | 'TRANSFER';
  readonly projectedDepthRank: number;
  readonly projectedRoleId: DepthRoleId;
  readonly roomPressure: number;
  readonly positionRating: number;
  readonly staffContinuityScore: number;
  readonly relationshipScore: number;
  readonly familiarityScore: number;
  readonly comparisonScore: number;
}

export interface PositionOffseasonProjectionV1 {
  readonly model: 'position_offseason_projection_v1';
  readonly seasonIndex: number;
  readonly positionId: PositionId;
  readonly options: readonly [
    PositionOffseasonOptionV1,
    PositionOffseasonOptionV1,
    PositionOffseasonOptionV1,
    PositionOffseasonOptionV1,
  ];
  readonly candidateProgramIds: readonly ProgramId[];
  readonly selectionRolls: readonly [number, number, number];
  readonly rngDrawCountBefore: number;
  readonly rngDrawCountAfter: number;
  readonly rng: RngState;
}

export interface PositionProgramHistoryEntryV1 {
  readonly programId: ProgramId;
  readonly startSeasonIndex: number;
  readonly endSeasonIndex: number | null;
}

export interface PositionLifecycleIdentityV1 {
  readonly careerId: CareerId;
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly appearance: PlayerAppearance;
  readonly positionId: PositionId;
  readonly archetypeId: PlayerArchetypeId;
  readonly careerSeed: RngSeed;
}

export interface PositionCareerLifecycleV1 extends PositionLifecycleIdentityV1 {
  readonly schemaVersion: typeof POSITION_LIFECYCLE_SCHEMA_VERSION_V1;
  readonly model: 'position_career_lifecycle_v1';
  readonly revision: number;
  readonly currentProgramId: ProgramId;
  readonly activeSeasonIndex: number;
  readonly playerState: PlayerState;
  readonly relationships: readonly [
    PositionRelationshipTrackV1,
    PositionRelationshipTrackV1,
    PositionRelationshipTrackV1,
  ];
  readonly programHistory: readonly PositionProgramHistoryEntryV1[];
  readonly completedSeasons: readonly PositionSeasonSummaryV1[];
  readonly offseason: PositionOffseasonProjectionV1 | null;
}

export interface PositionAlumniRecordV2 extends PositionLifecycleIdentityV1 {
  readonly schemaVersion: 2;
  readonly alumniId: `alumni_${string}`;
  readonly programIds: readonly ProgramId[];
  readonly seasonsPlayed: number;
  readonly seasonSummaries: readonly PositionSeasonSummaryV1[];
  readonly careerStats: PositionStatLineV1;
  readonly championshipCount: number;
  readonly endingId: 'career_ending_college_complete' | 'career_ending_one_season_complete';
  readonly careerSchemaVersion: number;
  readonly contentVersion: number;
}

export interface PositionMetaProfileV2 {
  readonly schemaVersion: typeof POSITION_META_PROFILE_SCHEMA_VERSION_V2;
  readonly revision: number;
  readonly alumni: readonly PositionAlumniRecordV2[];
  readonly unlockedOptionIds: readonly string[];
  readonly programFamiliarity: readonly ProgramFamiliarityV1[];
}

export interface PositionLegacyProjectionV2 {
  readonly model: 'position_legacy_projection_v2';
  readonly positionId: PositionId;
  readonly programId: ProgramId;
  readonly matchingAlumni: readonly PositionAlumniRecordV2[];
  readonly familiarProgramCareerCount: number;
  readonly completedPositionCareerCount: number;
  readonly unlockedOptionIds: readonly string[];
  readonly startingPowerBonus: 0;
}

const RELATIONSHIP_ACTORS = Object.freeze([
  'POSITION_COACH',
  'ROOM_LEADER',
  'DIRECT_COMPETITOR',
] as const);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function boundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

function validCareerSeed(value: unknown): value is RngSeed {
  return (
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  );
}

function archetypeMatchesPosition(archetypeId: PlayerArchetypeId, positionId: PositionId): boolean {
  return archetypeId.startsWith(`archetype_${positionId.replace('position_', '')}_`);
}

function validAppearance(value: unknown): value is PlayerAppearance {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const appearance = value as Record<string, unknown>;
  const prefixes = {
    skinToneId: 'skin_tone_',
    faceId: 'face_',
    hairStyleId: 'hair_style_',
    hairColorId: 'hair_color_',
    bodyTypeId: 'body_type_',
    eyeBlackId: 'eye_black_',
    armSleevesId: 'arm_sleeves_',
    glovesId: 'gloves_',
    visorId: 'visor_',
    wristTapeId: 'wrist_tape_',
    towelId: 'towel_',
    jerseyFitId: 'jersey_fit_',
    footwearId: 'footwear_',
  } as const;
  if (Object.keys(appearance).length !== Object.keys(prefixes).length) return false;
  const nullable = new Set([
    'eyeBlackId',
    'armSleevesId',
    'glovesId',
    'visorId',
    'wristTapeId',
    'towelId',
  ]);
  return Object.entries(prefixes).every(([key, prefix]) => {
    const optionId = appearance[key];
    return (
      (nullable.has(key) && optionId === null) ||
      (isStableDomainId(optionId) && optionId.startsWith(prefix))
    );
  });
}

function validPlayerState(value: unknown): value is PlayerState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const state = value as Partial<PlayerState>;
  return (
    Object.keys(state).length === 6 &&
    boundedInteger(state.body, 0, 100) &&
    boundedInteger(state.preparation, 0, 100) &&
    boundedInteger(state.confidence, 0, 100) &&
    boundedInteger(state.coachTrust, 0, 100) &&
    boundedInteger(state.brand, 0, 100) &&
    typeof state.gpa === 'number' &&
    Number.isFinite(state.gpa) &&
    state.gpa >= 0 &&
    state.gpa <= 4
  );
}

function roleTag(roleId: DepthRoleId): PositionLifecycleEligibilityTagId {
  return `tag_role_${roleId.replace('depth_role_', '')}` as PositionLifecycleEligibilityTagId;
}

function positionTag(positionId: PositionId): PositionLifecycleEligibilityTagId {
  return `tag_position_${positionId.replace('position_', '')}` as PositionLifecycleEligibilityTagId;
}

function relationshipTag(
  actorId: PositionRelationshipActorId,
  level: 'high' | 'low',
): PositionLifecycleEligibilityTagId {
  const actor =
    actorId === 'POSITION_COACH' ? 'coach' : actorId === 'ROOM_LEADER' ? 'room' : 'competitor';
  return `tag_relationship_${actor}_${level}` as PositionLifecycleEligibilityTagId;
}

function isLifecycleMechanics(value: PositionLifecycleMechanicsV1): boolean {
  return (
    value.model === 'position_lifecycle_mechanics_v1' &&
    POSITION_IDS.every((id) => boundedInteger(value.injuryExposurePermille[id], 0, 300)) &&
    boundedInteger(value.stayTrustRetentionPermille, 0, 1_000) &&
    boundedInteger(value.transferTrustRetentionPermille, 0, 1_000) &&
    boundedInteger(value.transferRelationshipBaseline, 0, 100) &&
    value.shortlistSize === 3
  );
}

export function derivePositionInjuryExposure(
  input: PositionInjuryExposureInput,
  mechanics: PositionLifecycleMechanicsV1,
): PositionInjuryExposureProjectionV1 | null {
  if (
    !isPositionId(input.positionId) ||
    !isLifecycleMechanics(mechanics) ||
    !boundedInteger(input.body, 0, 100) ||
    !boundedInteger(input.durability, 0, 100) ||
    !boundedInteger(input.workloadSnapPermille, 0, 1_000) ||
    !boundedInteger(input.recentTrainingLoad, 0, 120)
  ) {
    return null;
  }
  const bodyRiskPermille = Math.floor((100 - input.body) * 1.4);
  const durabilityRiskPermille = Math.floor((100 - input.durability) * 1.1);
  const workloadRiskPermille = Math.floor(input.workloadSnapPermille / 10);
  const trainingRiskPermille = input.recentTrainingLoad * 2;
  const positionExposurePermille = mechanics.injuryExposurePermille[input.positionId];
  const totalRiskPermille = clamp(
    8 +
      bodyRiskPermille +
      durabilityRiskPermille +
      workloadRiskPermille +
      trainingRiskPermille +
      positionExposurePermille,
    0,
    600,
  );
  return deepFreeze({
    model: 'position_injury_exposure_v1',
    positionId: input.positionId,
    bodyRiskPermille,
    durabilityRiskPermille,
    workloadRiskPermille,
    trainingRiskPermille,
    positionExposurePermille,
    totalRiskPermille,
    currentAvailabilityId: input.currentInjury?.defaultAvailabilityId ?? 'injury_availability_full',
    opportunityCap: input.currentInjury?.opportunityCap ?? null,
  });
}

export function resolvePositionRelationshipWeek(
  positionId: PositionId,
  weekIndex: number,
  tracks: readonly PositionRelationshipTrackV1[],
  actionIds: readonly string[],
  mechanics: PositionLifecycleMechanicsV1,
  gainMultiplierPermille = 1000,
): PositionRelationshipWeekEvidenceV1 | null {
  if (
    !boundedInteger(gainMultiplierPermille, 1000, 1500) ||
    !isPositionId(positionId) ||
    !boundedInteger(weekIndex, 0, Number.MAX_SAFE_INTEGER) ||
    !isLifecycleMechanics(mechanics) ||
    tracks.length !== 3 ||
    new Set(tracks.map(({ actorId }) => actorId)).size !== 3 ||
    !RELATIONSHIP_ACTORS.every((actorId) => tracks.some((track) => track.actorId === actorId)) ||
    tracks.some(({ value }) => !boundedInteger(value, 0, 100)) ||
    actionIds.some((actionId) => typeof actionId !== 'string')
  ) {
    return null;
  }
  const effects = mechanics.relationshipActionEffects[positionId]!;
  const totals = [0, 0, 0];
  for (const actionId of [...actionIds].sort(compareCodeUnits)) {
    const actionEffect = effects[actionId];
    if (actionEffect === undefined) continue;
    totals[0] = totals[0]! + actionEffect[0];
    totals[1] = totals[1]! + actionEffect[1];
    totals[2] = totals[2]! + actionEffect[2];
  }
  const canonicalTracks = RELATIONSHIP_ACTORS.map((actorId) =>
    tracks.find((track) => track.actorId === actorId)!,
  );
  const changes = canonicalTracks.map((track, index) => {
    const requestedDelta = scalePositiveRelationshipDelta(totals[index]!, gainMultiplierPermille);
    const valueAfter = clamp(track.value + requestedDelta, 0, 100);
    return {
      actorId: track.actorId,
      valueBefore: track.value,
      requestedDelta,
      actualDelta: valueAfter - track.value,
      valueAfter,
    };
  });
  const tracksAfter = changes.map(({ actorId, valueAfter }) => ({
    actorId,
    value: valueAfter,
  })) as [PositionRelationshipTrackV1, PositionRelationshipTrackV1, PositionRelationshipTrackV1];
  return deepFreeze({
    model: 'position_relationship_week_v1',
    positionId,
    weekIndex,
    actionIds: [...actionIds].sort(compareCodeUnits),
    changes,
    tracksAfter,
    coachTrustModifier: Math.trunc((tracksAfter[0].value - 50) / 10),
    informationScoreModifier: Math.trunc((tracksAfter[1].value - 50) / 8),
    opportunitySnapBonusPermille: clamp((tracksAfter[2].value - 50) * 2, -100, 100),
  });
}

export function derivePositionEligibilityContext(
  positionId: PositionId,
  roleId: DepthRoleId,
  brand: number,
  gpaMilli: number,
  stats: PositionStatLineV1,
  relationships: readonly PositionRelationshipTrackV1[],
): PositionEligibilityContextV1 | null {
  if (
    !isPositionId(positionId) ||
    !isDepthRoleId(roleId) ||
    !boundedInteger(brand, 0, 100) ||
    !boundedInteger(gpaMilli, 0, 4_000) ||
    !isPositionStatLine(stats) ||
    stats.positionId !== positionId ||
    relationships.length !== 3
  ) {
    return null;
  }
  const statTotal = stats.entries.reduce((sum, entry) => sum + entry.value, 0);
  const performanceTag: PositionLifecycleEligibilityTagId =
    statTotal >= 250
      ? 'tag_performance_featured'
      : statTotal >= 75
        ? 'tag_performance_steady'
        : 'tag_performance_developing';
  const tagIds: PositionLifecycleEligibilityTagId[] = [
    positionTag(positionId),
    roleTag(roleId),
    performanceTag,
  ];
  for (const track of relationships) {
    if (!RELATIONSHIP_ACTORS.includes(track.actorId) || !boundedInteger(track.value, 0, 100)) {
      return null;
    }
    if (track.value >= 70) tagIds.push(relationshipTag(track.actorId, 'high'));
    if (track.value <= 30) tagIds.push(relationshipTag(track.actorId, 'low'));
  }
  return deepFreeze({
    model: 'position_eligibility_context_v1',
    positionId,
    roleId,
    brand,
    gpaMilli,
    statTotal,
    tagIds: [...new Set(tagIds)].sort(compareCodeUnits),
  });
}

function roleForProjectedRank(rank: number): DepthRoleId {
  if (rank === 1) return 'depth_role_starter';
  if (rank <= 3) return 'depth_role_rotation';
  if (rank <= 6) return 'depth_role_reserve';
  return 'depth_role_developmental';
}

function relationshipMean(tracks: readonly PositionRelationshipTrackV1[]): number {
  return Math.round(tracks.reduce((sum, track) => sum + track.value, 0) / tracks.length);
}

function buildOffseasonOption(
  program: WorldAlphaOffseasonProjection['programs'][number],
  kind: 'STAY' | 'TRANSFER',
  positionId: PositionId,
  currentDepthRank: number,
  relationshipScore: number,
  familiarityScore: number,
): PositionOffseasonOptionV1 {
  const roomPressure = program.incomingPressure - program.departingPressure;
  const positionRating = program.after.positionRatings[positionId];
  const staffContinuityScore =
    program.staffOutcome === 'CONTINUITY'
      ? 80
      : program.positionStaffFocus === positionId
        ? 72
        : program.staffOutcome === 'SCHEME_SHIFT'
          ? 55
          : 48;
  const projectedDepthRank = clamp(
    currentDepthRank + Math.round(roomPressure / 2) - Math.round((positionRating - 65) / 15),
    1,
    8,
  );
  const comparisonScore = Math.round(
    (9 - projectedDepthRank) * 9 +
      positionRating * 0.35 +
      staffContinuityScore * 0.2 +
      relationshipScore * 0.15 +
      familiarityScore * 0.1,
  );
  return {
    programId: program.programId,
    kind,
    projectedDepthRank,
    projectedRoleId: roleForProjectedRank(projectedDepthRank),
    roomPressure,
    positionRating,
    staffContinuityScore,
    relationshipScore,
    familiarityScore,
    comparisonScore,
  };
}

export function projectPositionOffseason(
  world: WorldAlphaOffseasonProjection,
  positionId: PositionId,
  currentProgramId: ProgramId,
  currentDepthRank: number,
  relationships: readonly PositionRelationshipTrackV1[],
  familiarity: readonly ProgramFamiliarityV1[],
  rng: RngState,
  mechanics: PositionLifecycleMechanicsV1,
): PositionOffseasonProjectionV1 | null {
  if (
    world.model !== 'world_alpha_offseason_v1' ||
    !isPositionId(positionId) ||
    !isProgramId(currentProgramId) ||
    !boundedInteger(currentDepthRank, 1, 8) ||
    relationships.length !== 3 ||
    !isRngState(rng) ||
    !isLifecycleMechanics(mechanics) ||
    world.programs.length !== 32 ||
    !world.programs.some(({ programId }) => programId === currentProgramId) ||
    rng.drawCount > Number.MAX_SAFE_INTEGER - 3
  ) {
    return null;
  }
  const candidates = world.programs
    .filter(({ programId }) => programId !== currentProgramId)
    .sort((left, right) => compareCodeUnits(left.programId, right.programId));
  let currentRng = rng;
  const selected: typeof candidates = [];
  const rolls: number[] = [];
  while (selected.length < mechanics.shortlistSize) {
    const available = candidates.filter((candidate) => !selected.includes(candidate));
    const sampled = nextUint32(currentRng);
    currentRng = sampled.nextRng;
    const roll = sampled.value % available.length;
    rolls.push(roll);
    selected.push(available[roll]!);
  }
  const familiarityFor = (programId: ProgramId): number =>
    clamp(
      (familiarity.find((entry) => entry.programId === programId)?.completedCareers ?? 0) * 20,
      0,
      100,
    );
  const current = world.programs.find(({ programId }) => programId === currentProgramId)!;
  const stay = buildOffseasonOption(
    current,
    'STAY',
    positionId,
    currentDepthRank,
    relationshipMean(relationships),
    clamp(50 + familiarityFor(currentProgramId), 0, 100),
  );
  const transfers = selected.map((program) =>
    buildOffseasonOption(
      program,
      'TRANSFER',
      positionId,
      currentDepthRank,
      mechanics.transferRelationshipBaseline,
      familiarityFor(program.programId),
    ),
  ) as [PositionOffseasonOptionV1, PositionOffseasonOptionV1, PositionOffseasonOptionV1];
  return deepFreeze({
    model: 'position_offseason_projection_v1',
    seasonIndex: world.seasonIndex,
    positionId,
    options: [stay, ...transfers],
    candidateProgramIds: candidates.map(({ programId }) => programId),
    selectionRolls: rolls as [number, number, number],
    rngDrawCountBefore: rng.drawCount,
    rngDrawCountAfter: currentRng.drawCount,
    rng: currentRng,
  });
}

export function commitPositionOffseason(
  lifecycle: PositionCareerLifecycleV1,
  selectedProgramId: ProgramId,
  mechanics: PositionLifecycleMechanicsV1,
): PositionCareerLifecycleV1 | null {
  if (!validatePositionCareerLifecycle(lifecycle) || !isLifecycleMechanics(mechanics)) return null;
  const projection = lifecycle.offseason;
  const selected = projection?.options.find(({ programId }) => programId === selectedProgramId);
  if (projection === null || selected === undefined) return null;
  const isStay = selected.kind === 'STAY';
  const history: PositionProgramHistoryEntryV1[] = cloneSerializable([...lifecycle.programHistory]);
  if (!isStay) {
    const current = history.at(-1)!;
    history[history.length - 1] = { ...current, endSeasonIndex: lifecycle.activeSeasonIndex };
    history.push({
      programId: selectedProgramId,
      startSeasonIndex: lifecycle.activeSeasonIndex + 1,
      endSeasonIndex: null,
    });
  }
  const relationshipBaseline = mechanics.transferRelationshipBaseline;
  const relationships = (
    isStay
      ? cloneSerializable(lifecycle.relationships)
      : RELATIONSHIP_ACTORS.map((actorId) => ({ actorId, value: relationshipBaseline }))
  ) as [PositionRelationshipTrackV1, PositionRelationshipTrackV1, PositionRelationshipTrackV1];
  const trustRetention = isStay
    ? mechanics.stayTrustRetentionPermille
    : mechanics.transferTrustRetentionPermille;
  return deepFreeze({
    ...cloneSerializable(lifecycle),
    revision: lifecycle.revision + 1,
    currentProgramId: selectedProgramId,
    activeSeasonIndex: lifecycle.activeSeasonIndex + 1,
    playerState: {
      ...cloneSerializable(lifecycle.playerState),
      coachTrust: isStay
        ? clamp(Math.round((lifecycle.playerState.coachTrust * trustRetention) / 1_000), 0, 100)
        : clamp(
            relationshipBaseline +
              Math.round((lifecycle.playerState.coachTrust * trustRetention) / 1_000),
            0,
            100,
          ),
      preparation: 50,
    },
    relationships,
    programHistory: history,
    offseason: null,
  });
}

export function createPositionCareerLifecycle(
  identity: PositionLifecycleIdentityV1,
  currentProgramId: ProgramId,
  playerState: PlayerState,
): PositionCareerLifecycleV1 | null {
  if (
    !isCareerId(identity.careerId) ||
    !isPlayerId(identity.playerId) ||
    typeof identity.displayName !== 'string' ||
    identity.displayName.trim().length === 0 ||
    !isPositionId(identity.positionId) ||
    !isPlayerArchetypeId(identity.archetypeId) ||
    !archetypeMatchesPosition(identity.archetypeId, identity.positionId) ||
    !validAppearance(identity.appearance) ||
    !validCareerSeed(identity.careerSeed) ||
    !isProgramId(currentProgramId) ||
    !boundedInteger(playerState.body, 0, 100) ||
    !boundedInteger(playerState.preparation, 0, 100) ||
    !boundedInteger(playerState.confidence, 0, 100) ||
    !boundedInteger(playerState.coachTrust, 0, 100) ||
    !boundedInteger(playerState.brand, 0, 100) ||
    typeof playerState.gpa !== 'number' ||
    playerState.gpa < 0 ||
    playerState.gpa > 4
  ) {
    return null;
  }
  return deepFreeze({
    ...cloneSerializable(identity),
    schemaVersion: POSITION_LIFECYCLE_SCHEMA_VERSION_V1,
    model: 'position_career_lifecycle_v1',
    revision: 0,
    currentProgramId,
    activeSeasonIndex: 0,
    playerState: cloneSerializable(playerState),
    relationships: RELATIONSHIP_ACTORS.map((actorId) => ({ actorId, value: 50 })) as [
      PositionRelationshipTrackV1,
      PositionRelationshipTrackV1,
      PositionRelationshipTrackV1,
    ],
    programHistory: [{ programId: currentProgramId, startSeasonIndex: 0, endSeasonIndex: null }],
    completedSeasons: [],
    offseason: null,
  });
}

export function attachPositionSeasonSummary(
  lifecycle: PositionCareerLifecycleV1,
  summary: PositionSeasonSummaryV1,
  offseason: PositionOffseasonProjectionV1,
): PositionCareerLifecycleV1 | null {
  if (
    !validatePositionCareerLifecycle(lifecycle) ||
    !isPositionSeasonSummary(summary) ||
    summary.positionId !== lifecycle.positionId ||
    summary.programId !== lifecycle.currentProgramId ||
    summary.seasonIndex !== lifecycle.activeSeasonIndex ||
    offseason.positionId !== lifecycle.positionId ||
    offseason.seasonIndex !== lifecycle.activeSeasonIndex ||
    lifecycle.offseason !== null ||
    lifecycle.completedSeasons.some(({ seasonIndex }) => seasonIndex === summary.seasonIndex)
  ) {
    return null;
  }
  return deepFreeze({
    ...cloneSerializable(lifecycle),
    revision: lifecycle.revision + 1,
    completedSeasons: [
      ...cloneSerializable(lifecycle.completedSeasons),
      cloneSerializable(summary),
    ],
    offseason: cloneSerializable(offseason),
  });
}

export function advancePositionLifecycleWeek(
  lifecycle: PositionCareerLifecycleV1,
  playerState: PlayerState,
  relationships: PositionRelationshipWeekEvidenceV1,
): PositionCareerLifecycleV1 | null {
  if (
    !validatePositionCareerLifecycle(lifecycle) ||
    !validPlayerState(playerState) ||
    relationships.positionId !== lifecycle.positionId ||
    relationships.tracksAfter.length !== 3 ||
    relationships.changes.some(({ actorId, valueBefore }) => {
      const current = lifecycle.relationships.find((track) => track.actorId === actorId);
      return current === undefined || current.value !== valueBefore;
    })
  ) {
    return null;
  }
  return deepFreeze({
    ...cloneSerializable(lifecycle),
    revision: lifecycle.revision + 1,
    playerState: cloneSerializable(playerState),
    relationships: cloneSerializable(relationships.tracksAfter) as [
      PositionRelationshipTrackV1,
      PositionRelationshipTrackV1,
      PositionRelationshipTrackV1,
    ],
  });
}

function isPositionStatLine(value: unknown): value is PositionStatLineV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const line = value as Partial<PositionStatLineV1>;
  if (
    line.model !== 'position_stat_line_v1' ||
    !isPositionId(line.positionId) ||
    !Array.isArray(line.entries)
  )
    return false;
  const expected = POSITION_STAT_IDS[line.positionId];
  return (
    line.entries.length === expected.length &&
    line.entries.every(
      (entry, index) =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry as PositionStatEntryV1).statId === expected[index] &&
        boundedInteger((entry as PositionStatEntryV1).value, 0, Number.MAX_SAFE_INTEGER),
    )
  );
}

function isPositionSeasonSummary(value: unknown): value is PositionSeasonSummaryV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const summary = value as Partial<PositionSeasonSummaryV1>;
  return (
    summary.model === 'position_season_summary_v1' &&
    boundedInteger(summary.seasonIndex, 0, Number.MAX_SAFE_INTEGER) &&
    typeof summary.seasonId === 'string' &&
    summary.seasonId.startsWith('season_') &&
    isProgramId(summary.programId) &&
    isPositionId(summary.positionId) &&
    [
      'season_outcome_champion',
      'season_outcome_runner_up',
      'season_outcome_semifinal_exit',
      'season_outcome_regular_season_complete',
    ].includes(summary.outcomeId ?? '') &&
    boundedInteger(summary.gamesPlayed, 0, 100) &&
    boundedInteger(summary.wins, 0, 100) &&
    boundedInteger(summary.losses, 0, 100) &&
    boundedInteger(summary.ties, 0, 100) &&
    summary.gamesPlayed === summary.wins + summary.losses + summary.ties &&
    isPositionStatLine(summary.stats) &&
    summary.stats.positionId === summary.positionId &&
    typeof summary.averagePerformanceGrade === 'number' &&
    boundedInteger(summary.startingDepthRank, 1, 8) &&
    boundedInteger(summary.finalDepthRank, 1, 8) &&
    isDepthRoleId(summary.startingRoleId) &&
    isDepthRoleId(summary.finalRoleId) &&
    Array.isArray(summary.injuryOutcomeIds) &&
    boundedInteger(summary.injuryWeeksMissed, 0, 100) &&
    Array.isArray(summary.ownedSkillIds) &&
    Array.isArray(summary.equippedSkillIds)
  );
}

export function validatePositionCareerLifecycle(
  value: unknown,
): value is PositionCareerLifecycleV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const state = value as Partial<PositionCareerLifecycleV1>;
  return (
    state.schemaVersion === POSITION_LIFECYCLE_SCHEMA_VERSION_V1 &&
    state.model === 'position_career_lifecycle_v1' &&
    isCareerId(state.careerId) &&
    isPlayerId(state.playerId) &&
    typeof state.displayName === 'string' &&
    state.displayName.trim().length > 0 &&
    validAppearance(state.appearance) &&
    isPositionId(state.positionId) &&
    isPlayerArchetypeId(state.archetypeId) &&
    archetypeMatchesPosition(state.archetypeId, state.positionId) &&
    validCareerSeed(state.careerSeed) &&
    boundedInteger(state.revision, 0, Number.MAX_SAFE_INTEGER) &&
    isProgramId(state.currentProgramId) &&
    boundedInteger(state.activeSeasonIndex, 0, 9) &&
    validPlayerState(state.playerState) &&
    Array.isArray(state.relationships) &&
    state.relationships.length === 3 &&
    state.relationships.every(
      ({ actorId, value }) =>
        RELATIONSHIP_ACTORS.includes(actorId) && boundedInteger(value, 0, 100),
    ) &&
    new Set(state.relationships.map(({ actorId }) => actorId)).size === 3 &&
    Array.isArray(state.programHistory) &&
    state.programHistory.length > 0 &&
    state.programHistory.every(
      ({ programId, startSeasonIndex, endSeasonIndex }) =>
        isProgramId(programId) &&
        boundedInteger(startSeasonIndex, 0, 9) &&
        (endSeasonIndex === null ||
          (boundedInteger(endSeasonIndex, startSeasonIndex, 9) &&
            endSeasonIndex < state.activeSeasonIndex!)),
    ) &&
    state.programHistory.at(-1)?.programId === state.currentProgramId &&
    state.programHistory.at(-1)?.endSeasonIndex === null &&
    Array.isArray(state.completedSeasons) &&
    state.completedSeasons.every(isPositionSeasonSummary) &&
    state.completedSeasons.every(({ positionId }) => positionId === state.positionId) &&
    new Set(state.completedSeasons.map(({ seasonIndex }) => seasonIndex)).size ===
      state.completedSeasons.length &&
    state.completedSeasons.every(({ seasonIndex }) => seasonIndex <= state.activeSeasonIndex!) &&
    (state.offseason === null ||
      (state.offseason?.model === 'position_offseason_projection_v1' &&
        state.offseason.positionId === state.positionId &&
        state.offseason.seasonIndex === state.activeSeasonIndex &&
        state.offseason.options.length === 4 &&
        state.offseason.options[0]?.kind === 'STAY' &&
        state.offseason.options[0]?.programId === state.currentProgramId &&
        state.offseason.options.slice(1).every(({ kind }) => kind === 'TRANSFER') &&
        new Set(state.offseason.options.map(({ programId }) => programId)).size === 4 &&
        state.offseason.candidateProgramIds.length === 31 &&
        new Set(state.offseason.candidateProgramIds).size === 31 &&
        state.offseason.selectionRolls.length === 3 &&
        state.offseason.rngDrawCountAfter - state.offseason.rngDrawCountBefore === 3 &&
        state.offseason.rng.drawCount === state.offseason.rngDrawCountAfter &&
        isRngState(state.offseason.rng)))
  );
}

export function parsePositionCareerLifecycleJson(json: string): PositionCareerLifecycleV1 | null {
  try {
    const value: unknown = JSON.parse(json);
    return validatePositionCareerLifecycle(value) ? deepFreeze(cloneSerializable(value)) : null;
  } catch {
    return null;
  }
}

function wrStatLineFromLegacy(alumnus: AlumniRecordV1): PositionStatLineV1 {
  const stats = alumnus.careerStats;
  return {
    model: 'position_stat_line_v1',
    positionId: 'position_wr',
    entries: [
      { statId: 'stat_wr_targets', value: stats.targets },
      { statId: 'stat_wr_receptions', value: stats.receptions },
      { statId: 'stat_wr_receiving_yards', value: stats.receivingYards },
      { statId: 'stat_wr_receiving_touchdowns', value: stats.receivingTouchdowns },
      { statId: 'stat_wr_drops', value: stats.drops },
      { statId: 'stat_wr_turnovers', value: stats.turnovers },
    ],
  };
}

export function migrateMetaProfileV1ToPositionV2(meta: MetaProfileV1): PositionMetaProfileV2 {
  const alumni = meta.alumni.map((alumnus): PositionAlumniRecordV2 => {
    const stats = wrStatLineFromLegacy(alumnus);
    const summary: PositionSeasonSummaryV1 = {
      model: 'position_season_summary_v1',
      seasonIndex: 0,
      seasonId: `season_${alumnus.careerId}`,
      programId: alumnus.programIds[0],
      positionId: 'position_wr',
      outcomeId: alumnus.seasonOutcomeId,
      gamesPlayed: alumnus.gamesPlayed,
      wins: alumnus.wins,
      losses: alumnus.losses,
      ties: alumnus.ties,
      stats,
      averagePerformanceGrade: alumnus.averagePerformanceGrade,
      startingDepthRank: alumnus.startingDepthRank,
      startingRoleId: alumnus.startingRoleId,
      finalDepthRank: alumnus.finalDepthRank,
      finalRoleId: alumnus.finalRoleId,
      injuryOutcomeIds: cloneSerializable(alumnus.injuryOutcomeIds),
      injuryWeeksMissed: alumnus.injuryWeeksMissed,
      ownedSkillIds: cloneSerializable(alumnus.ownedSkillIds),
      equippedSkillIds: cloneSerializable(alumnus.equippedSkillIds),
    };
    return {
      schemaVersion: 2,
      alumniId: alumnus.alumniId,
      careerId: alumnus.careerId,
      playerId: alumnus.playerId,
      displayName: alumnus.displayName,
      appearance: cloneSerializable(alumnus.appearance),
      positionId: 'position_wr',
      archetypeId: alumnus.archetypeId,
      careerSeed: alumnus.careerSeed,
      programIds: cloneSerializable(alumnus.programIds),
      seasonsPlayed: alumnus.seasonsPlayed,
      seasonSummaries: [summary],
      careerStats: stats,
      championshipCount: alumnus.championshipCount,
      endingId: alumnus.endingId,
      careerSchemaVersion: alumnus.careerSchemaVersion,
      contentVersion: alumnus.contentVersion,
    };
  });
  return deepFreeze({
    schemaVersion: POSITION_META_PROFILE_SCHEMA_VERSION_V2,
    revision: meta.revision,
    alumni,
    unlockedOptionIds: cloneSerializable(meta.unlockedOptionIds),
    programFamiliarity: cloneSerializable(meta.programFamiliarity),
  });
}

export function completePositionCareer(
  lifecycle: PositionCareerLifecycleV1,
  meta: PositionMetaProfileV2,
  contentVersion: number,
): PositionMetaProfileV2 | null {
  if (
    !validatePositionCareerLifecycle(lifecycle) ||
    lifecycle.completedSeasons.length === 0 ||
    lifecycle.offseason !== null ||
    !boundedInteger(contentVersion, 1, Number.MAX_SAFE_INTEGER) ||
    meta.schemaVersion !== POSITION_META_PROFILE_SCHEMA_VERSION_V2 ||
    meta.alumni.some(({ careerId }) => careerId === lifecycle.careerId)
  ) {
    return null;
  }
  const totals = new Map<PositionStatId, number>(
    POSITION_STAT_IDS[lifecycle.positionId].map((statId) => [statId, 0]),
  );
  for (const summary of lifecycle.completedSeasons) {
    for (const { statId, value } of summary.stats.entries) {
      totals.set(statId, (totals.get(statId) ?? 0) + value);
    }
  }
  const careerStats: PositionStatLineV1 = {
    model: 'position_stat_line_v1',
    positionId: lifecycle.positionId,
    entries: POSITION_STAT_IDS[lifecycle.positionId].map((statId) => ({
      statId,
      value: totals.get(statId) ?? 0,
    })),
  };
  const alumnus: PositionAlumniRecordV2 = {
    schemaVersion: 2,
    alumniId: `alumni_${lifecycle.careerId}`,
    careerId: lifecycle.careerId,
    playerId: lifecycle.playerId,
    displayName: lifecycle.displayName,
    appearance: cloneSerializable(lifecycle.appearance),
    positionId: lifecycle.positionId,
    archetypeId: lifecycle.archetypeId,
    careerSeed: lifecycle.careerSeed,
    programIds: lifecycle.programHistory.map(({ programId }) => programId),
    seasonsPlayed: lifecycle.completedSeasons.length,
    seasonSummaries: cloneSerializable(lifecycle.completedSeasons),
    careerStats,
    championshipCount: lifecycle.completedSeasons.filter(
      ({ outcomeId }) => outcomeId === 'season_outcome_champion',
    ).length,
    endingId:
      lifecycle.completedSeasons.length === 1
        ? 'career_ending_one_season_complete'
        : 'career_ending_college_complete',
    careerSchemaVersion: POSITION_LIFECYCLE_SCHEMA_VERSION_V1,
    contentVersion,
  };
  const familiarity = new Map(
    meta.programFamiliarity.map(({ programId, completedCareers }) => [programId, completedCareers]),
  );
  for (const programId of new Set(alumnus.programIds)) {
    familiarity.set(programId, (familiarity.get(programId) ?? 0) + 1);
  }
  return deepFreeze({
    ...cloneSerializable(meta),
    revision: meta.revision + 1,
    alumni: [...cloneSerializable(meta.alumni), alumnus].sort((left, right) =>
      compareCodeUnits(left.alumniId, right.alumniId),
    ),
    unlockedOptionIds: [
      ...new Set([...meta.unlockedOptionIds, 'legacy_option_alumni_history']),
    ].sort(compareCodeUnits),
    programFamiliarity: [...familiarity.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([programId, completedCareers]) => ({ programId, completedCareers })),
  });
}

export function derivePositionLegacyProjection(
  meta: PositionMetaProfileV2,
  positionId: PositionId,
  programId: ProgramId,
): PositionLegacyProjectionV2 | null {
  if (
    meta.schemaVersion !== POSITION_META_PROFILE_SCHEMA_VERSION_V2 ||
    !isPositionId(positionId) ||
    !isProgramId(programId)
  ) {
    return null;
  }
  return deepFreeze({
    model: 'position_legacy_projection_v2',
    positionId,
    programId,
    matchingAlumni: meta.alumni.filter(
      (alumnus) => alumnus.positionId === positionId && alumnus.programIds.includes(programId),
    ),
    familiarProgramCareerCount:
      meta.programFamiliarity.find((entry) => entry.programId === programId)?.completedCareers ?? 0,
    completedPositionCareerCount: meta.alumni.filter((alumnus) => alumnus.positionId === positionId)
      .length,
    unlockedOptionIds: cloneSerializable(meta.unlockedOptionIds),
    startingPowerBonus: 0,
  });
}
