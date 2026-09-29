import { projectWorldVNextPositionMatchup } from './world-vnext.js';
import { createPositionPlayerProfile } from '../player/position-creation.js';
import { TACTICAL_GAME_RULES_VERSION } from '../games/tactical-alpha-v1.js';
import type { PositionSkillOfferDefinitionV2 } from './position-alpha-breakthrough-v2.js';
import { projectPositionAlphaOpportunityV2 } from './position-alpha-opportunity-v2.js';
import type { PositionAlphaSkillBuildMechanics } from './position-alpha-skill-builds.js';
import type { AcademicTuningDefinition } from '../off-field/types.js';
import type { PositionAlphaNilMechanicsV2 } from './position-alpha-nil-v2.js';
import type {
  InjuryAvailabilityEvidence,
  InjuryOutcomeMechanicsDefinition,
  InjuryTuningDefinition,
} from '../injuries/types.js';
import { isInjuryAvailabilityEvidence } from '../injuries/validation.js';
import type {
  CreatePositionPlayerProfileInput,
  CreatedPositionPlayerProfile,
  PositionCreationMechanics,
  PositionPlayerCreationIdentity,
} from '../player/position-creation.js';
import { deriveCareerId } from '../player/creation.js';
import { deepFreeze } from '../player/immutable.js';
import { isPositionId, type PositionId, type ProgramId } from '../player/ids.js';
import { derivePositionOverall, validatePositionAttributeProgress } from '../player/progression.js';
import { createRng, isRngState, nextUint32, type RngSeed, type RngState } from '../random/rng.js';
import { isSkillId, type SkillId } from '../skills/ids.js';
import {
  derivePositionRecruitingProfile,
  generatePositionRoom,
  updatePositionRoomAfterPractice,
  type PositionRecruitingProfile,
  type PositionRoomContext,
  type PositionRoomMechanics,
  type PositionRoomNamePool,
} from '../programs/position-room.js';
import type { DepthRoleId } from '../programs/ids.js';
import {
  projectQbWorldAlphaResult,
  resolveQbSnap,
  startQbGame,
  type ActiveQbGame,
  type CompleteQbGame,
  type QbGameState,
  type QbDecisionDefinition,
  type QbPatternDefinition,
  type QbSkillDefinition,
} from '../games/qb.js';
import {
  projectRbWorldAlphaResult,
  resolveRbSnap,
  startRbGame,
  type ActiveRbGame,
  type CompleteRbGame,
  type RbGameState,
  type RbDecisionDefinition,
  type RbPatternDefinition,
  type RbSkillDefinition,
} from '../games/rb.js';
import {
  projectCbWorldAlphaResult,
  resolveCbSnap,
  startCbGame,
  type ActiveCbGame,
  type CbDecisionDefinition,
  type CbPatternDefinition,
  type CbSkillDefinition,
  type CompleteCbGame,
  type CbGameState,
} from '../games/cb.js';
import {
  getAvailableQbEventChoices,
  resolveQbEventChoice,
  selectQbEvent,
  type QbEventDefinition,
  type QbEventResolutionEvidence,
} from '../games/qb-events.js';
import {
  getAvailableRbEventChoices,
  resolveRbEventChoice,
  selectRbEvent,
  type RbEventDefinition,
} from '../games/rb-events.js';
import {
  getAvailableCbEventChoices,
  resolveCbEventChoice,
  selectCbEvent,
  type CbEventDefinition,
} from '../games/cb-events.js';
import {
  createPositionTrainingProficiencyUses,
  derivePositionPracticeGrade,
  resolvePositionTrainingAction,
  type PositionPracticeGradeProjection,
  type PositionTrainingActionDefinition,
  type PositionTrainingActionEvidence,
  type PositionTrainingState,
  type PositionPracticeInput,
} from '../weekly/position-training.js';
import type { WeeklyActionDefinition } from '../weekly/types.js';
import type { PositionFocusInjuryPolicies } from '../weekly/position-focus.js';
import type { DevelopmentWeekConfig } from '../weekly/tuning.js';
import {
  POSITION_STAT_IDS,
  advancePositionLifecycleWeek,
  attachPositionSeasonSummary,
  commitPositionOffseason,
  completePositionCareer,
  createPositionCareerLifecycle,
  derivePositionEligibilityContext,
  derivePositionInjuryExposure,
  projectPositionOffseason,
  resolvePositionRelationshipWeek,
  validatePositionCareerLifecycle,
  type PositionCareerLifecycleV1,
  type PositionEligibilityContextV1,
  type PositionInjuryExposureProjectionV1,
  type PositionLifecycleMechanicsV1,
  type PositionMetaProfileV2,
  type PositionRelationshipWeekEvidenceV1,
  type PositionSeasonSummaryV1,
  type PositionStatLineV1,
} from './position-lifecycle.js';
import {
  createWorldAlphaSeason,
  createEmptyWorldAlphaHistory,
  archiveCompletedWorldAlphaSeason,
  initializeWorldAlphaPostseason,
  projectWorldAlphaOffseason,
  resolveNextWorldAlphaPostseasonRound,
  projectWorldAlphaPositionMatchup,
  resolveNextWorldAlphaRegularRound,
  validateWorldAlphaSeasonState,
  type WorldAlphaFixtureMechanics,
  type WorldAlphaMechanicsDefinition,
  type WorldAlphaPlayerGameResult,
  type WorldAlphaHistory,
  type WorldAlphaPostseasonFixture,
  type WorldAlphaSeasonState,
} from './world-alpha.js';

export const POSITION_ALPHA_SESSION_SCHEMA_VERSION_V1 = 1 as const;
export const POSITION_ALPHA_CONTENT_SCHEMA_VERSION = 9 as const;

export type AddedPositionId = Exclude<PositionId, 'position_wr'>;

export interface PositionAlphaPlanningPhaseV1 {
  readonly type: 'WEEK_PLANNING';
  readonly weekIndex: number;
}

export interface PositionAlphaSeasonReviewPhaseV1 {
  readonly type: 'SEASON_REVIEW';
  readonly seasonIndex: 0 | 1;
}

export interface PositionAlphaOffseasonPhaseV1 {
  readonly type: 'OFFSEASON_DECISION';
  readonly seasonIndex: 0 | 1;
}

export interface PositionAlphaCompletePhaseV1 {
  readonly type: 'CAREER_COMPLETE';
  readonly seasonIndex: 1;
}

export type PositionAlphaSessionPhaseV1 =
  | PositionAlphaPlanningPhaseV1
  | PositionAlphaSeasonReviewPhaseV1
  | PositionAlphaOffseasonPhaseV1
  | PositionAlphaCompletePhaseV1;

export type PositionAlphaDecisionStrategy = 'best_fit' | 'risk_seeking';

export interface PositionAlphaWeekSummaryV1 {
  readonly model: 'position_alpha_week_summary_v1';
  readonly weekIndex: number;
  readonly actionId: PositionTrainingActionDefinition['id'];
  readonly trainingEvidence: readonly [
    PositionTrainingActionEvidence,
    PositionTrainingActionEvidence,
    PositionTrainingActionEvidence,
  ];
  readonly practiceGrade: PositionPracticeGradeProjection;
  readonly depthRankBefore: number;
  readonly depthRankAfter: number;
  readonly roleId: DepthRoleId;
  readonly opportunityCount: number;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly decisionStrategy: PositionAlphaDecisionStrategy;
  readonly playerTeamScore: number;
  readonly opponentScore: number;
  readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
  readonly gameGrade: number;
  readonly breakthroughGaugePoints: number;
  readonly participationFeedbackId: string;
  readonly stats: PositionStatLineV1;
  readonly relationships: PositionRelationshipWeekEvidenceV1;
  readonly injuryExposure: PositionInjuryExposureProjectionV1;
  readonly eligibility: PositionEligibilityContextV1;
}

export interface PositionAlphaPostseasonGameSummaryV1 {
  readonly model: 'position_alpha_postseason_game_summary_v1';
  readonly seasonIndex: 0 | 1;
  readonly roundIndex: 0 | 1;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly decisionStrategy: PositionAlphaDecisionStrategy;
  readonly playerTeamScore: number;
  readonly opponentScore: number;
  readonly resultId: 'game_result_win' | 'game_result_loss' | 'game_result_tie';
  readonly gameGrade: number;
  readonly participationFeedbackId: string;
  readonly stats: PositionStatLineV1;
}

export interface PositionAlphaSkillStateV1 {
  readonly model: 'position_alpha_skill_state_v1';
  readonly breakthroughGauge: number;
  readonly ownedSkillIds: readonly SkillId[];
  readonly equippedSkillIds: readonly [SkillId | null, SkillId | null, SkillId | null];
  readonly offeredSkillIds: readonly [SkillId, SkillId, SkillId] | null;
  readonly breakthroughHistory: readonly {
    readonly weekIndex: number;
    readonly skillId: SkillId;
  }[];
}

export interface PositionAlphaEventStateV1 {
  readonly model: 'position_alpha_event_state_v1';
  readonly pending: {
    readonly eventId: string;
    readonly choiceIds: readonly string[];
    readonly weekIndex: number;
  } | null;
  readonly recentEvents: readonly { readonly eventId: string; readonly weekIndex: number }[];
  readonly history: readonly {
    readonly eventId: string;
    readonly choiceId: string;
    readonly weekIndex: number;
  }[];
  readonly nextGameModifiers: {
    readonly clueBonus: number;
    readonly decisionScoreFlat: number;
    readonly exposureReductionPermille: number;
  };
}

export interface PositionAlphaSessionV1 {
  readonly schemaVersion: typeof POSITION_ALPHA_SESSION_SCHEMA_VERSION_V1;
  readonly model: 'position_alpha_session_v1';
  readonly contentSchemaVersion: typeof POSITION_ALPHA_CONTENT_SCHEMA_VERSION;
  readonly revision: number;
  readonly careerRng: RngState;
  readonly player: CreatedPositionPlayerProfile & { readonly positionId: AddedPositionId };
  readonly recruiting: PositionRecruitingProfile;
  readonly room: PositionRoomContext;
  readonly lifecycle: PositionCareerLifecycleV1;
  readonly world: WorldAlphaSeasonState;
  readonly worldHistory: WorldAlphaHistory;
  readonly training: PositionTrainingState;
  readonly skills: PositionAlphaSkillStateV1;
  readonly events: PositionAlphaEventStateV1;
  readonly weekHistory: readonly PositionAlphaWeekSummaryV1[];
  readonly postseasonHistory: readonly PositionAlphaPostseasonGameSummaryV1[];
  readonly meta: PositionMetaProfileV2 | null;
  readonly phase: PositionAlphaSessionPhaseV1;
}

export interface CreatePositionAlphaSessionInput {
  readonly careerSeed: RngSeed;
  readonly identity: PositionPlayerCreationIdentity & { readonly positionId: AddedPositionId };
  readonly programId: ProgramId;
}

export interface PositionAlphaSessionFoundationMechanics {
  readonly creation: PositionCreationMechanics;
  readonly room: PositionRoomMechanics;
  readonly roomNames: PositionRoomNamePool;
  readonly world: WorldAlphaMechanicsDefinition;
  readonly skillIds: readonly SkillId[];
  readonly eventIds: readonly string[];
  readonly eventChoiceIds: readonly string[];
}

export interface PositionAlphaSessionCommandMechanics extends PositionAlphaSessionFoundationMechanics {
  readonly skillOffers: readonly PositionSkillOfferDefinitionV2[];
  readonly skillBuilds: PositionAlphaSkillBuildMechanics;
  readonly nil: PositionAlphaNilMechanicsV2;
  readonly academics: AcademicTuningDefinition;
  readonly commonFocuses: readonly WeeklyActionDefinition[];
  readonly focusInjuryPolicies: PositionFocusInjuryPolicies;
  readonly injuries: {
    readonly outcomes: readonly InjuryOutcomeMechanicsDefinition[];
    readonly tuning: InjuryTuningDefinition;
  };
  readonly trainingActions: readonly PositionTrainingActionDefinition[];
  readonly trainingConfig: DevelopmentWeekConfig;
  readonly lifecycle: PositionLifecycleMechanicsV1;
  readonly qb: {
    readonly decisions: readonly QbDecisionDefinition[];
    readonly patterns: readonly QbPatternDefinition[];
    readonly skills: readonly QbSkillDefinition[];
    readonly events: readonly QbEventDefinition[];
  };
  readonly rb: {
    readonly decisions: readonly RbDecisionDefinition[];
    readonly patterns: readonly RbPatternDefinition[];
    readonly skills: readonly RbSkillDefinition[];
    readonly events: readonly RbEventDefinition[];
  };
  readonly cb: {
    readonly decisions: readonly CbDecisionDefinition[];
    readonly patterns: readonly CbPatternDefinition[];
    readonly skills: readonly CbSkillDefinition[];
    readonly events: readonly CbEventDefinition[];
  };
}

export type ResolvePositionAlphaWeekResult =
  | { readonly ok: true; readonly session: PositionAlphaSessionV1 }
  | { readonly ok: false; readonly reason: 'position_alpha_session.invalid_command' };

export type ResolvePositionAlphaSeasonResult = ResolvePositionAlphaWeekResult;
export type CommitPositionAlphaOffseasonResult = ResolvePositionAlphaWeekResult;
export type ChoosePositionAlphaSkillResult = ResolvePositionAlphaWeekResult;
export type EquipPositionAlphaSkillResult = ResolvePositionAlphaWeekResult;
export type ResolvePositionAlphaEventResult = ResolvePositionAlphaWeekResult;

export type CreatePositionAlphaSessionResult =
  | { readonly ok: true; readonly session: PositionAlphaSessionV1 }
  | {
      readonly ok: false;
      readonly reason:
        | 'position_alpha_session.invalid_input'
        | 'position_alpha_session.player_failed'
        | 'position_alpha_session.room_failed'
        | 'position_alpha_session.world_failed';
    };

const SESSION_KEYS = [
  'careerRng',
  'contentSchemaVersion',
  'events',
  'lifecycle',
  'model',
  'meta',
  'phase',
  'player',
  'recruiting',
  'revision',
  'room',
  'schemaVersion',
  'skills',
  'training',
  'postseasonHistory',
  'weekHistory',
  'world',
  'worldHistory',
] as const;

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameSerializable(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isAddedPositionId(value: unknown): value is AddedPositionId {
  return isPositionId(value) && value !== 'position_wr';
}

function validFoundationMechanics(
  positionId: AddedPositionId,
  mechanics: PositionAlphaSessionFoundationMechanics,
): boolean {
  return (
    mechanics?.room?.positionId === positionId &&
    mechanics.skillIds.length === 12 &&
    mechanics.skillIds.every(isSkillId) &&
    new Set(mechanics.skillIds).size === mechanics.skillIds.length &&
    mechanics.eventIds.length === 12 &&
    new Set(mechanics.eventIds).size === mechanics.eventIds.length &&
    mechanics.eventChoiceIds.length >= 24 &&
    new Set(mechanics.eventChoiceIds).size === mechanics.eventChoiceIds.length
  );
}

export function createPositionAlphaSession(
  input: CreatePositionAlphaSessionInput,
  mechanics: PositionAlphaSessionFoundationMechanics,
): CreatePositionAlphaSessionResult {
  if (
    !isAddedPositionId(input?.identity?.positionId) ||
    !validFoundationMechanics(input.identity.positionId, mechanics)
  ) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.invalid_input' as const,
    });
  }
  const playerResult = createPositionPlayerProfile({
    careerSeed: input.careerSeed,
    identity: input.identity,
    mechanics: mechanics.creation,
  } satisfies CreatePositionPlayerProfileInput);
  if (!playerResult.ok) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.player_failed' as const,
    });
  }
  const player = playerResult.player as PositionAlphaSessionV1['player'];
  const recruiting = derivePositionRecruitingProfile(player, mechanics.room, 0);
  if (recruiting === undefined) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.player_failed' as const,
    });
  }
  const careerRngBefore = createRng(`${String(input.careerSeed)}:position-alpha-career`);
  const roomResult = generatePositionRoom(
    player,
    careerRngBefore,
    mechanics.roomNames,
    mechanics.room,
    {
      programId: input.programId,
      roomTalentMean: 66,
      roomTalentSpread: 9,
      trustBase: 50,
      practiceFormBase: 50,
      experienceReadinessBase: 50,
      playerCoachTrustBonus: 0,
      playerPracticeForm: 50,
      playerExperienceReadiness: 45,
    },
  );
  if (!roomResult.ok) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.room_failed' as const,
    });
  }
  const worldResult = createWorldAlphaSeason(
    mechanics.world,
    createRng(`${String(input.careerSeed)}:position-alpha-world:0`),
    0,
    input.programId,
  );
  if (!worldResult.ok) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.world_failed' as const,
    });
  }
  const lifecycle = createPositionCareerLifecycle(
    {
      careerId: deriveCareerId(input.careerSeed),
      playerId: player.id,
      displayName: player.displayName,
      appearance: player.appearance,
      positionId: player.positionId,
      archetypeId: player.archetypeId,
      careerSeed: input.careerSeed,
    },
    input.programId,
    player.state,
  );
  if (lifecycle === null) {
    return deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.invalid_input' as const,
    });
  }
  const session: PositionAlphaSessionV1 = {
    schemaVersion: POSITION_ALPHA_SESSION_SCHEMA_VERSION_V1,
    model: 'position_alpha_session_v1',
    contentSchemaVersion: POSITION_ALPHA_CONTENT_SCHEMA_VERSION,
    revision: 0,
    careerRng: roomResult.generated.rng,
    player,
    recruiting,
    room: roomResult.generated.context,
    lifecycle,
    world: worldResult.value,
    worldHistory: createEmptyWorldAlphaHistory(),
    training: {
      positionId: player.positionId,
      attributes: player.attributes,
      proficiencyUses: createPositionTrainingProficiencyUses(player.positionId),
      state: {
        body: player.state.body,
        preparation: player.state.preparation,
        confidence: player.state.confidence,
      },
    },
    skills: {
      model: 'position_alpha_skill_state_v1',
      breakthroughGauge: 0,
      ownedSkillIds: [],
      equippedSkillIds: [null, null, null],
      offeredSkillIds: null,
      breakthroughHistory: [],
    },
    events: {
      model: 'position_alpha_event_state_v1',
      pending: null,
      recentEvents: [],
      history: [],
      nextGameModifiers: {
        clueBonus: 0,
        decisionScoreFlat: 0,
        exposureReductionPermille: 0,
      },
    },
    weekHistory: [],
    postseasonHistory: [],
    meta: null,
    phase: { type: 'WEEK_PLANNING', weekIndex: 0 },
  };
  return validatePositionAlphaSession(session, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(session)) })
    : deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_input' as const });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function chooseQbDecision(active: ActiveQbGame, strategy: PositionAlphaDecisionStrategy): string {
  if (strategy === 'risk_seeking') return active.pendingSnap.decisionIds.at(-1)!;
  const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
  return [...pattern.decisionFits]
    .filter(({ decisionId }) => active.pendingSnap.decisionIds.includes(decisionId))
    .sort(
      (left, right) => right.fit - left.fit || left.decisionId.localeCompare(right.decisionId),
    )[0]!.decisionId;
}

function chooseRbDecision(active: ActiveRbGame, strategy: PositionAlphaDecisionStrategy): string {
  if (strategy === 'risk_seeking') return active.pendingSnap.decisionIds.at(-1)!;
  const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
  return [...pattern.decisionFits]
    .filter(({ decisionId }) => active.pendingSnap.decisionIds.includes(decisionId))
    .sort(
      (left, right) => right.fit - left.fit || left.decisionId.localeCompare(right.decisionId),
    )[0]!.decisionId;
}

function chooseCbDecision(active: ActiveCbGame, strategy: PositionAlphaDecisionStrategy): string {
  if (strategy === 'risk_seeking') return active.pendingSnap.decisionIds.at(-1)!;
  const pattern = active.patterns.find(({ id }) => id === active.pendingSnap.patternId)!;
  return [...pattern.decisionFits]
    .filter(({ decisionId }) => active.pendingSnap.decisionIds.includes(decisionId))
    .sort(
      (left, right) => right.fit - left.fit || left.decisionId.localeCompare(right.decisionId),
    )[0]!.decisionId;
}

export type PositionAlphaGameContext = Pick<
  PositionAlphaSessionV1,
  'player' | 'lifecycle' | 'room' | 'careerRng'
> & {
  readonly events: Pick<PositionAlphaEventStateV1, 'nextGameModifiers'>;
  readonly skills: { readonly equippedSkillIds: readonly (SkillId | null)[] };
  readonly relationshipInformationScoreModifier?: number;
  readonly relationshipOpportunitySnapBonusPermille?: number;
};

function equippedSkillIds(session: Pick<PositionAlphaGameContext, 'skills'>): readonly SkillId[] {
  return session.skills.equippedSkillIds.filter((skillId): skillId is SkillId => skillId !== null);
}

export type CompletedPositionGame =
  | { readonly positionId: 'position_qb'; readonly game: CompleteQbGame }
  | { readonly positionId: 'position_rb'; readonly game: CompleteRbGame }
  | { readonly positionId: 'position_cb'; readonly game: CompleteCbGame };

export type PositionAlphaGameState =
  | { readonly positionId: 'position_qb'; readonly game: QbGameState }
  | { readonly positionId: 'position_rb'; readonly game: RbGameState }
  | { readonly positionId: 'position_cb'; readonly game: CbGameState };

/**
 * Rules recorded by an untrusted saved game (active input or completed summary). Returns null for a
 * malformed marker; exact replay against the owning engine still proves the whole game.
 */
export function recordedPositionAlphaRulesVersion(
  value: unknown,
): typeof TACTICAL_GAME_RULES_VERSION | undefined | null {
  if (typeof value !== 'object' || value === null) return null;
  const game = (value as Record<string, unknown>)['game'];
  if (typeof game !== 'object' || game === null) return null;
  const record = game as Record<string, unknown>;
  const evidence = record['type'] === 'ACTIVE' ? record['input'] : record['summary'];
  if (typeof evidence !== 'object' || evidence === null) return null;
  if (!Object.hasOwn(evidence, 'rulesVersion')) return undefined;
  return (evidence as Record<string, unknown>)['rulesVersion'] === TACTICAL_GAME_RULES_VERSION
    ? TACTICAL_GAME_RULES_VERSION
    : null;
}

/** Shared engine entry point; accepts all four current slots without a v1 projection. */
export function startPositionAlphaGame(
  session: PositionAlphaGameContext,
  fixture: WorldAlphaFixtureMechanics | WorldAlphaPostseasonFixture,
  gameWeekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
  availability: InjuryAvailabilityEvidence | null = null,
  maximumOpportunities = 5,
  /** Explicit new-game selection only; absent reproduces the original historical rules. */
  rulesVersion?: typeof TACTICAL_GAME_RULES_VERSION,
): PositionAlphaGameState | null {
  if (rulesVersion !== undefined && rulesVersion !== TACTICAL_GAME_RULES_VERSION) return null;
  const rules = rulesVersion === undefined ? {} : { rulesVersion };
  if (
    !Number.isInteger(maximumOpportunities) ||
    maximumOpportunities < 0 ||
    maximumOpportunities > 5
  )
    return null;
  // The owning pregame command binds week/source identity. This adapter enforces
  // the actual state transition and cap without changing depth-role ownership.
  if (
    Object.hasOwn(session, 'relationshipInformationScoreModifier') &&
    (typeof session.relationshipInformationScoreModifier !== 'number' ||
      !Number.isInteger(session.relationshipInformationScoreModifier) ||
      Math.abs(session.relationshipInformationScoreModifier) > 6)
  )
    return null;
  if (
    availability !== null &&
    (!isInjuryAvailabilityEvidence(availability) ||
      availability.bodyAfter !== session.player.state.body ||
      availability.confidenceAfter !== session.player.state.confidence ||
      availability.coachTrustAfter !== session.player.state.coachTrust)
  )
    return null;
  if (
    fixture.homeProgramId !== session.lifecycle.currentProgramId &&
    fixture.awayProgramId !== session.lifecycle.currentProgramId
  )
    return null;
  const equipped = equippedSkillIds(session);
  const catalog =
    mechanics[
      session.player.positionId === 'position_qb'
        ? 'qb'
        : session.player.positionId === 'position_rb'
          ? 'rb'
          : 'cb'
    ].skills;
  if (
    session.skills.equippedSkillIds.length > 4 ||
    new Set(equipped).size !== equipped.length ||
    equipped.some((id) => !catalog.some((skill) => skill.id === id))
  )
    return null;
  const isHome = fixture.homeProgramId === session.lifecycle.currentProgramId;
  const relationshipInformation = Object.hasOwn(session, 'relationshipInformationScoreModifier')
    ? { relationshipInformationScoreModifier: session.relationshipInformationScoreModifier! }
    : {};
  const opponentProgramId = isHome ? fixture.awayProgramId : fixture.homeProgramId;
  // Career VNext (M8) supplies the 64-program conference world; the alpha session its own world.
  const matchup =
    projectWorldAlphaPositionMatchup(
      mechanics.world,
      session.player.positionId,
      session.lifecycle.currentProgramId,
      opponentProgramId,
      isHome,
    ) ??
    projectWorldVNextPositionMatchup(
      mechanics.world,
      session.player.positionId,
      session.lifecycle.currentProgramId,
      opponentProgramId,
      isHome,
    );
  if (matchup === undefined) return null;
  const opportunity = Object.hasOwn(session, 'relationshipOpportunitySnapBonusPermille')
    ? projectPositionAlphaOpportunityV2(
        session.room.projection,
        session.relationshipOpportunitySnapBonusPermille!,
      )
    : undefined;
  if (opportunity === null) return null;
  const opportunityCount = Math.min(
    maximumOpportunities,
    opportunity?.projectedOpportunities ?? session.room.projection.interactiveSnapMaximum,
    availability?.opportunityCap ?? 12,
  );
  const state = {
    body: session.player.state.body,
    preparation: session.player.state.preparation,
    confidence: session.player.state.confidence,
    coachTrust: session.player.state.coachTrust,
  };
  if (session.player.positionId === 'position_qb') {
    const started = startQbGame(
      cloneSerializable({
        ...rules,
        gameId: `game_qb_alpha_${session.lifecycle.activeSeasonIndex}_${gameWeekIndex}`,
        ...relationshipInformation,
        weekIndex: gameWeekIndex,
        playerProgramId: session.lifecycle.currentProgramId,
        opponentProgramId,
        isHome,
        opportunityCount,
        playerTeamRating: matchup.supportingUnitRating,
        opponentDefenseRating: matchup.opponentPrimaryRating,
        opponentOffenseRating: matchup.opponentSecondaryRating,
        player: {
          id: session.player.id,
          positionId: 'position_qb',
          attributes: session.player.attributes,
          state,
        },
        patterns: mechanics.qb.patterns,
        decisions: mechanics.qb.decisions,
        equippedSkills: mechanics.qb.skills.filter(({ id }) =>
          equippedSkillIds(session).includes(id),
        ),
        eventModifiers: {
          clueBonus: session.events.nextGameModifiers.clueBonus,
          decisionScoreFlat: session.events.nextGameModifiers.decisionScoreFlat,
          pressureReductionPermille: session.events.nextGameModifiers.exposureReductionPermille,
        },
        rng: session.careerRng,
      }),
    );
    if (!started.ok) return null;
    return deepFreeze({ positionId: 'position_qb', game: started.state });
  }
  if (session.player.positionId === 'position_rb') {
    const started = startRbGame(
      cloneSerializable({
        ...rules,
        gameId: `game_rb_alpha_${session.lifecycle.activeSeasonIndex}_${gameWeekIndex}`,
        ...relationshipInformation,
        weekIndex: gameWeekIndex,
        playerProgramId: session.lifecycle.currentProgramId,
        opponentProgramId,
        isHome,
        opportunityCount,
        playerTeamRating: matchup.supportingUnitRating,
        opponentDefenseRating: matchup.opponentPrimaryRating,
        opponentOffenseRating: matchup.opponentSecondaryRating,
        player: {
          id: session.player.id,
          positionId: 'position_rb',
          attributes: session.player.attributes,
          state,
        },
        patterns: mechanics.rb.patterns,
        decisions: mechanics.rb.decisions,
        equippedSkills: mechanics.rb.skills.filter(({ id }) =>
          equippedSkillIds(session).includes(id),
        ),
        eventModifiers: {
          clueBonus: session.events.nextGameModifiers.clueBonus,
          decisionScoreFlat: session.events.nextGameModifiers.decisionScoreFlat,
          contactReductionPermille: session.events.nextGameModifiers.exposureReductionPermille,
        },
        rng: session.careerRng,
      }),
    );
    if (!started.ok) return null;
    return deepFreeze({ positionId: 'position_rb', game: started.state });
  }
  const started = startCbGame(
    cloneSerializable({
      ...rules,
      gameId: `game_cb_alpha_${session.lifecycle.activeSeasonIndex}_${gameWeekIndex}`,
      ...relationshipInformation,
      weekIndex: gameWeekIndex,
      playerProgramId: session.lifecycle.currentProgramId,
      opponentProgramId,
      isHome,
      opportunityCount,
      playerTeamRating: matchup.supportingUnitRating,
      opponentOffenseRating: matchup.opponentPrimaryRating,
      opponentDefenseRating: matchup.opponentSecondaryRating,
      player: {
        id: session.player.id,
        positionId: 'position_cb',
        attributes: session.player.attributes,
        state,
      },
      patterns: mechanics.cb.patterns,
      decisions: mechanics.cb.decisions,
      equippedSkills: mechanics.cb.skills.filter(({ id }) =>
        equippedSkillIds(session).includes(id),
      ),
      eventModifiers: {
        clueBonus: session.events.nextGameModifiers.clueBonus,
        decisionScoreFlat: session.events.nextGameModifiers.decisionScoreFlat,
        targetReductionPermille: session.events.nextGameModifiers.exposureReductionPermille,
      },
      rng: session.careerRng,
    }),
  );
  if (!started.ok) return null;
  return deepFreeze({ positionId: 'position_cb', game: started.state });
}

/** Resolve only the caller's permitted decision; no automatic decision policy. */
export function resolvePositionAlphaSnap(
  state: PositionAlphaGameState,
  decisionId: unknown,
): PositionAlphaGameState | null {
  if (state.game.type !== 'ACTIVE' || typeof decisionId !== 'string') return null;
  state = cloneSerializable(state);
  if (state.positionId === 'position_qb' && state.game.type === 'ACTIVE') {
    const result = resolveQbSnap(state.game, decisionId);
    return result.ok ? deepFreeze({ positionId: state.positionId, game: result.state }) : null;
  }
  if (state.positionId === 'position_rb' && state.game.type === 'ACTIVE') {
    const result = resolveRbSnap(state.game, decisionId);
    return result.ok ? deepFreeze({ positionId: state.positionId, game: result.state }) : null;
  }
  if (state.positionId === 'position_cb' && state.game.type === 'ACTIVE') {
    const result = resolveCbSnap(state.game, decisionId);
    return result.ok ? deepFreeze({ positionId: state.positionId, game: result.state }) : null;
  }
  return null;
}

/** Historical simulation policy only. Live commands use start/resolve above. */
function resolveCompletePositionGame(
  session: PositionAlphaGameContext,
  fixture: WorldAlphaFixtureMechanics | WorldAlphaPostseasonFixture,
  gameWeekIndex: number,
  strategy: PositionAlphaDecisionStrategy,
  mechanics: PositionAlphaSessionCommandMechanics,
): CompletedPositionGame | null {
  let current = startPositionAlphaGame(session, fixture, gameWeekIndex, mechanics);
  while (current !== null) {
    if (current.positionId === 'position_qb') {
      if (current.game.type === 'COMPLETE') return { ...current, game: current.game };
      current = resolvePositionAlphaSnap(current, chooseQbDecision(current.game, strategy));
    } else if (current.positionId === 'position_rb') {
      if (current.game.type === 'COMPLETE') return { ...current, game: current.game };
      current = resolvePositionAlphaSnap(current, chooseRbDecision(current.game, strategy));
    } else {
      if (current.game.type === 'COMPLETE') return { ...current, game: current.game };
      current = resolvePositionAlphaSnap(current, chooseCbDecision(current.game, strategy));
    }
  }
  return null;
}

function gameStatLine(completed: CompletedPositionGame): PositionStatLineV1 {
  let values: readonly number[];
  if (completed.positionId === 'position_qb') {
    const stats = completed.game.summary.statLine;
    values = [
      stats.passAttempts,
      stats.completions,
      stats.passingYards,
      stats.passingTouchdowns,
      stats.interceptions,
      stats.sacksTaken,
      stats.rushAttempts,
      stats.rushingYards,
      stats.rushingTouchdowns,
      stats.fumbles,
    ];
  } else if (completed.positionId === 'position_rb') {
    const stats = completed.game.summary.statLine;
    values = [
      stats.carries,
      stats.rushingYards,
      stats.rushingTouchdowns,
      stats.receptions,
      stats.receivingYards,
      stats.receivingTouchdowns,
      stats.protectionAssignments,
      stats.protectionWins,
      stats.fumbles,
    ];
  } else {
    const stats = completed.game.summary.statLine;
    values = [
      stats.coverageSnaps,
      stats.targets,
      stats.completionsAllowed,
      stats.yardsAllowed,
      stats.touchdownsAllowed,
      stats.passesDefended,
      stats.interceptions,
      stats.tackles,
      stats.missedTackles,
    ];
  }
  return {
    model: 'position_stat_line_v1',
    positionId: completed.positionId,
    entries: POSITION_STAT_IDS[completed.positionId].map((statId, index) => ({
      statId,
      value: values[index]!,
    })),
  } as PositionStatLineV1;
}

export function projectCompletedWorldResult(
  completed: CompletedPositionGame,
  fixture: WorldAlphaFixtureMechanics,
): WorldAlphaPlayerGameResult | null {
  if (completed.positionId === 'position_qb') {
    const result = projectQbWorldAlphaResult(completed.game.summary, fixture);
    return result.ok ? result.result : null;
  }
  if (completed.positionId === 'position_rb') {
    const result = projectRbWorldAlphaResult(completed.game.summary, fixture);
    return result.ok ? result.result : null;
  }
  const result = projectCbWorldAlphaResult(completed.game.summary, fixture);
  return result.ok ? result.result : null;
}

export function advancePositionSkillGauge<
  T extends Pick<
    PositionAlphaSkillStateV1,
    'breakthroughGauge' | 'offeredSkillIds' | 'ownedSkillIds'
  >,
>(
  state: T,
  points: number,
  skillIds: readonly SkillId[],
  rng: RngState,
): { readonly state: T; readonly rng: RngState } {
  const gauge = clamp(state.breakthroughGauge + points, 0, 160);
  if (gauge < 100 || state.offeredSkillIds !== null) {
    return { state: { ...cloneSerializable(state), breakthroughGauge: gauge }, rng };
  }
  const available = [...skillIds]
    .filter((skillId) => !state.ownedSkillIds.includes(skillId))
    .sort((left, right) => left.localeCompare(right));
  if (available.length < 3) {
    return { state: { ...cloneSerializable(state), breakthroughGauge: gauge }, rng };
  }
  const offers: SkillId[] = [];
  let currentRng = rng;
  while (offers.length < 3) {
    const remaining = available.filter((skillId) => !offers.includes(skillId));
    const draw = nextUint32(currentRng);
    currentRng = draw.nextRng;
    offers.push(remaining[draw.value % remaining.length]!);
  }
  return {
    state: {
      ...cloneSerializable(state),
      breakthroughGauge: gauge,
      offeredSkillIds: offers as [SkillId, SkillId, SkillId],
    },
    rng: currentRng,
  };
}

function selectNextPositionAlphaEvent(
  session: PositionAlphaSessionV1,
  eligibility: PositionEligibilityContextV1,
  rng: RngState,
  mechanics: PositionAlphaSessionCommandMechanics,
): { readonly events: PositionAlphaEventStateV1; readonly rng: RngState } {
  const weekIndex = session.lifecycle.activeSeasonIndex * 12 + session.weekHistory.length;
  const context = {
    weekIndex,
    body: session.player.state.body,
    preparation: session.player.state.preparation,
    confidence: session.player.state.confidence,
    coachTrust: session.player.state.coachTrust,
    gpaMilli: Math.round(session.player.state.gpa * 1_000),
    brand: session.player.state.brand,
    contextTags: eligibility.tagIds,
    recentEvents: session.events.recentEvents,
  };
  const equippedIds = equippedSkillIds(session);
  let selected:
    | { readonly eventId: string; readonly choiceIds: readonly string[]; readonly rng: RngState }
    | undefined;
  if (session.player.positionId === 'position_qb') {
    const result = selectQbEvent(
      { ...context, recentEvents: context.recentEvents as never },
      mechanics.qb.events,
      450,
      rng,
    );
    const skills = mechanics.qb.skills.filter(({ id }) => equippedIds.includes(id));
    if (result.event !== undefined) {
      selected = {
        eventId: result.event.id,
        choiceIds: getAvailableQbEventChoices(result.event, skills).map(({ id }) => id),
        rng: result.rng,
      };
    } else return { events: session.events, rng: result.rng };
  } else if (session.player.positionId === 'position_rb') {
    const result = selectRbEvent(
      { ...context, recentEvents: context.recentEvents as never },
      mechanics.rb.events,
      450,
      rng,
    );
    const skills = mechanics.rb.skills.filter(({ id }) => equippedIds.includes(id));
    if (result.event !== undefined) {
      selected = {
        eventId: result.event.id,
        choiceIds: getAvailableRbEventChoices(result.event, skills).map(({ id }) => id),
        rng: result.rng,
      };
    } else return { events: session.events, rng: result.rng };
  } else {
    const result = selectCbEvent(
      { ...context, recentEvents: context.recentEvents as never },
      mechanics.cb.events,
      450,
      rng,
    );
    const skills = mechanics.cb.skills.filter(({ id }) => equippedIds.includes(id));
    if (result.event !== undefined) {
      selected = {
        eventId: result.event.id,
        choiceIds: getAvailableCbEventChoices(result.event, skills).map(({ id }) => id),
        rng: result.rng,
      };
    } else return { events: session.events, rng: result.rng };
  }
  return {
    events: {
      ...cloneSerializable(session.events),
      pending: {
        eventId: selected.eventId,
        choiceIds: selected.choiceIds,
        weekIndex,
      },
    },
    rng: selected.rng,
  };
}

export interface PositionAlphaPreparation<
  TActionId extends string = PositionTrainingActionDefinition['id'],
  TEvidence extends PositionPracticeInput = PositionTrainingActionEvidence,
  TTraining extends PositionTrainingState = PositionTrainingState,
> {
  readonly player: PositionAlphaSessionV1['player'];
  readonly room: PositionRoomContext;
  readonly training: TTraining;
  readonly actionIds: readonly [TActionId, TActionId, TActionId];
  readonly trainingEvidence: readonly [TEvidence, TEvidence, TEvidence];
  readonly practiceGrade: PositionPracticeGradeProjection;
}

export type PositionAlphaFootballPreparation = PositionAlphaPreparation<
  string,
  PositionPracticeInput
>;

/** Exactly three ordered discretionary focuses, including intentional repeats. No RNG. */
export function preparePositionAlphaWeek(
  session: Pick<PositionAlphaSessionV1, 'player' | 'room' | 'training'>,
  actionIds: unknown,
  mechanics: Pick<
    PositionAlphaSessionCommandMechanics,
    'trainingActions' | 'trainingConfig' | 'room'
  >,
): PositionAlphaPreparation | null {
  if (!Array.isArray(actionIds) || actionIds.length !== 3) return null;
  let training = session.training;
  const evidence: PositionTrainingActionEvidence[] = [];
  const actions: PositionTrainingActionDefinition['id'][] = [];
  for (const actionId of actionIds) {
    const action = mechanics.trainingActions.find(
      (candidate) =>
        candidate.id === actionId && candidate.positionId === session.player.positionId,
    );
    if (action === undefined) return null;
    const result = resolvePositionTrainingAction(training, action, mechanics.trainingConfig);
    if (!result.ok) return null;
    training = result.next;
    evidence.push(result.evidence);
    actions.push(action.id);
  }
  const trainingEvidence = evidence as unknown as PositionAlphaPreparation['trainingEvidence'];
  return finishPositionAlphaWeekPreparation(
    session,
    training,
    trainingEvidence,
    actions as unknown as PositionAlphaPreparation['actionIds'],
    mechanics.room,
  );
}

export function finishPositionAlphaWeekPreparation<
  TActionId extends string,
  TEvidence extends PositionPracticeInput,
  TTraining extends PositionTrainingState,
>(
  session: Pick<PositionAlphaSessionV1, 'player' | 'room'>,
  training: TTraining,
  trainingEvidence: readonly [TEvidence, TEvidence, TEvidence],
  actionIds: readonly [TActionId, TActionId, TActionId],
  roomMechanics: PositionRoomMechanics,
): PositionAlphaPreparation<TActionId, TEvidence, TTraining> | null {
  const practiceGrade = derivePositionPracticeGrade(
    trainingEvidence,
    session.room.projection.roleId,
  );
  const roomUpdated = updatePositionRoomAfterPractice(
    session.room,
    training.attributes,
    practiceGrade.score,
    roomMechanics,
  );
  if (!roomUpdated.ok) return null;
  const overall = derivePositionOverall(session.player.positionId, training.attributes);
  if (!overall.ok) return null;
  const player: PositionAlphaSessionV1['player'] = {
    ...cloneSerializable(session.player),
    attributes: training.attributes,
    overall: overall.overall,
    state: {
      ...cloneSerializable(session.player.state),
      ...training.state,
      coachTrust: roomUpdated.context.playerCoachTrust,
    },
  };
  return deepFreeze(
    cloneSerializable({
      player,
      room: roomUpdated.context,
      training,
      actionIds,
      trainingEvidence,
      practiceGrade,
    }),
  );
}

export interface PositionAlphaFootballSettlement {
  readonly player: PositionAlphaSessionV1['player'];
  readonly room: PositionRoomContext;
  readonly training: PositionTrainingState;
  readonly lifecycle: PositionCareerLifecycleV1;
  readonly world: WorldAlphaSeasonState;
  readonly stats: PositionStatLineV1;
  readonly relationships: PositionRelationshipWeekEvidenceV1;
  readonly injuryExposure: PositionInjuryExposureProjectionV1;
  readonly eligibility: PositionEligibilityContextV1;
  readonly gaugePoints: number;
}

/** Shared regular-week settlement. The world engine rejects an already resolved fixture. */
export function settlePositionAlphaFootballWeek(
  session: Pick<PositionAlphaSessionV1, 'player' | 'lifecycle' | 'world'>,
  preparation: PositionAlphaFootballPreparation,
  completed: CompletedPositionGame,
  mechanics: PositionAlphaSessionCommandMechanics,
  pregameRelationships?: PositionRelationshipWeekEvidenceV1,
  pregameRelationshipGainMultiplier = 1000,
): PositionAlphaFootballSettlement | null {
  const weekIndex = session.world.completedRegularSeasonRoundCount;
  if (
    completed.positionId !== session.player.positionId ||
    completed.game.nextPlayer.id !== session.player.id ||
    completed.game.summary.weekIndex !== weekIndex
  )
    return null;
  const fixture = mechanics.world.regularSeasonRounds
    .find(({ roundNumber }) => roundNumber === weekIndex + 1)
    ?.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === session.lifecycle.currentProgramId ||
        awayProgramId === session.lifecycle.currentProgramId,
    );
  if (fixture === undefined) return null;
  const projectedWorldResult = projectCompletedWorldResult(completed, fixture);
  if (projectedWorldResult === null) return null;
  const consequences = derivePositionAlphaFootballConsequences(
    session,
    preparation,
    completed,
    weekIndex,
    mechanics,
    pregameRelationships,
    pregameRelationshipGainMultiplier,
  );
  if (consequences === null) return null;
  const resolvedWorld = resolveNextWorldAlphaRegularRound(
    session.world,
    mechanics.world,
    projectedWorldResult,
  );
  return resolvedWorld.ok
    ? deepFreeze(cloneSerializable({ ...consequences, world: resolvedWorld.value.state }))
    : null;
}

/** Deterministic consequence projection shared by settlement and archived-evidence validation. */
export function derivePositionAlphaFootballConsequences(
  session: Pick<PositionAlphaSessionV1, 'player' | 'lifecycle'>,
  preparation: PositionAlphaFootballPreparation,
  completed: CompletedPositionGame,
  weekIndex: number,
  mechanics: PositionAlphaSessionCommandMechanics,
  pregameRelationships?: PositionRelationshipWeekEvidenceV1,
  pregameRelationshipGainMultiplier = 1000,
): Omit<PositionAlphaFootballSettlement, 'world'> | null {
  if (
    completed.positionId !== session.player.positionId ||
    completed.game.nextPlayer.id !== session.player.id ||
    completed.game.summary.weekIndex !== weekIndex
  )
    return null;
  const { trainingEvidence, practiceGrade } = preparation;
  const resolvedRelationships = resolvePositionRelationshipWeek(
    session.player.positionId,
    weekIndex,
    session.lifecycle.relationships,
    preparation.actionIds,
    mechanics.lifecycle,
    pregameRelationshipGainMultiplier,
  );
  if (resolvedRelationships === null) return null;
  if (
    pregameRelationships !== undefined &&
    JSON.stringify(pregameRelationships) !== JSON.stringify(resolvedRelationships)
  )
    return null;
  const relationships = pregameRelationships ?? resolvedRelationships;
  const gamePlayer = completed.game.nextPlayer;
  const nextState = {
    ...cloneSerializable(preparation.player.state),
    ...cloneSerializable(gamePlayer.state),
    coachTrust: clamp(
      gamePlayer.state.coachTrust +
        (pregameRelationships === undefined ? relationships.coachTrustModifier : 0),
      0,
      100,
    ),
  };
  const nextLifecycle = advancePositionLifecycleWeek(session.lifecycle, nextState, relationships);
  if (nextLifecycle === null) return null;
  const stats = gameStatLine(completed);
  const injuryExposure = derivePositionInjuryExposure(
    {
      positionId: session.player.positionId,
      body: nextState.body,
      durability: gamePlayer.attributes.attribute_durability!.rating,
      workloadSnapPermille: completed.game.summary.opportunityCount * 180,
      recentTrainingLoad: Math.max(
        0,
        trainingEvidence[0].bodyBefore - trainingEvidence[2].bodyAfter,
      ),
      currentInjury: null,
    },
    mechanics.lifecycle,
  );
  const eligibility = derivePositionEligibilityContext(
    session.player.positionId,
    preparation.room.projection.roleId,
    nextState.brand,
    Math.round(nextState.gpa * 1_000),
    stats,
    relationships.tracksAfter,
  );
  if (injuryExposure === null || eligibility === null) return null;
  const derivedOverall = derivePositionOverall(session.player.positionId, gamePlayer.attributes);
  if (!derivedOverall.ok) return null;
  const nextPlayer: PositionAlphaSessionV1['player'] = {
    ...cloneSerializable(session.player),
    attributes: gamePlayer.attributes,
    overall: derivedOverall.overall,
    state: nextState,
  };
  const gaugePoints = clamp(
    Math.round((practiceGrade.score + completed.game.summary.gradeScore) / 8),
    12,
    30,
  );
  return deepFreeze(
    cloneSerializable({
      player: nextPlayer,
      room: { ...preparation.room, playerCoachTrust: nextState.coachTrust },
      training: {
        ...preparation.training,
        attributes: nextPlayer.attributes,
        state: {
          body: nextState.body,
          preparation: nextState.preparation,
          confidence: nextState.confidence,
        },
      },
      lifecycle: nextLifecycle,
      stats,
      relationships,
      injuryExposure,
      eligibility,
      gaugePoints,
    }),
  );
}

export function resolvePositionAlphaWeek(
  session: PositionAlphaSessionV1,
  actionId: unknown,
  strategy: PositionAlphaDecisionStrategy,
  mechanics: PositionAlphaSessionCommandMechanics,
): ResolvePositionAlphaWeekResult {
  const invalid = (): ResolvePositionAlphaWeekResult =>
    deepFreeze({
      ok: false as const,
      reason: 'position_alpha_session.invalid_command' as const,
    });
  if (
    !validatePositionAlphaSession(session, mechanics) ||
    session.phase.type !== 'WEEK_PLANNING' ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null ||
    (strategy !== 'best_fit' && strategy !== 'risk_seeking')
  ) {
    return invalid();
  }
  const weekIndex = session.phase.weekIndex;
  const preparation = preparePositionAlphaWeek(session, [actionId, actionId, actionId], mechanics);
  if (preparation === null) return invalid();
  const { training, trainingEvidence, practiceGrade } = preparation;
  const prepared: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    player: preparation.player,
    room: preparation.room,
    training,
  };
  const round = mechanics.world.regularSeasonRounds.find(
    ({ roundNumber }) => roundNumber === weekIndex + 1,
  );
  const fixture = round?.fixtures.find(
    ({ homeProgramId, awayProgramId }) =>
      homeProgramId === session.lifecycle.currentProgramId ||
      awayProgramId === session.lifecycle.currentProgramId,
  );
  if (fixture === undefined) return invalid();
  const completed = resolveCompletePositionGame(prepared, fixture, weekIndex, strategy, mechanics);
  if (completed === null) return invalid();
  const settlement = settlePositionAlphaFootballWeek(session, preparation, completed, mechanics);
  if (settlement === null) return invalid();
  const {
    player: nextPlayer,
    stats,
    relationships,
    injuryExposure,
    eligibility,
    gaugePoints,
  } = settlement;
  const advancedSkills = advancePositionSkillGauge(
    session.skills,
    gaugePoints,
    mechanics.skillIds,
    completed.game.rng,
  );
  const eventBaseSession: PositionAlphaSessionV1 = {
    ...session,
    player: nextPlayer,
    events: {
      ...cloneSerializable(session.events),
      nextGameModifiers: {
        clueBonus: 0,
        decisionScoreFlat: 0,
        exposureReductionPermille: 0,
      },
    },
  };
  const selectedEvent = selectNextPositionAlphaEvent(
    eventBaseSession,
    eligibility,
    advancedSkills.rng,
    mechanics,
  );
  const summary: PositionAlphaWeekSummaryV1 = {
    model: 'position_alpha_week_summary_v1',
    weekIndex,
    actionId: preparation.actionIds[0],
    trainingEvidence,
    practiceGrade,
    depthRankBefore: session.room.projection.rank,
    depthRankAfter: preparation.room.projection.rank,
    roleId: preparation.room.projection.roleId,
    opportunityCount: completed.game.summary.opportunityCount,
    opponentProgramId: completed.game.summary.opponentProgramId,
    isHome: completed.game.summary.isHome,
    decisionStrategy: strategy,
    playerTeamScore: completed.game.summary.playerTeamScore,
    opponentScore: completed.game.summary.opponentScore,
    resultId: completed.game.summary.resultId,
    gameGrade: completed.game.summary.gradeScore,
    breakthroughGaugePoints: gaugePoints,
    participationFeedbackId: completed.game.summary.participationFeedbackId,
    stats,
    relationships,
    injuryExposure,
    eligibility,
  };
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    careerRng: selectedEvent.rng,
    player: nextPlayer,
    room: settlement.room,
    lifecycle: settlement.lifecycle,
    world: settlement.world,
    training: settlement.training,
    skills: advancedSkills.state,
    events: selectedEvent.events,
    weekHistory: [...session.weekHistory, summary],
    phase:
      weekIndex === 11
        ? { type: 'SEASON_REVIEW', seasonIndex: session.lifecycle.activeSeasonIndex as 0 | 1 }
        : { type: 'WEEK_PLANNING', weekIndex: weekIndex + 1 },
  };
  return validatePositionAlphaSession(nextSession, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

function addPositionStatLines(
  positionId: AddedPositionId,
  lines: readonly PositionStatLineV1[],
): PositionStatLineV1 {
  const totals = new Map<string, number>();
  for (const line of lines) {
    for (const entry of line.entries) {
      totals.set(entry.statId, (totals.get(entry.statId) ?? 0) + entry.value);
    }
  }
  return {
    model: 'position_stat_line_v1',
    positionId,
    entries: POSITION_STAT_IDS[positionId].map((statId) => ({
      statId,
      value: totals.get(statId) ?? 0,
    })),
  } as PositionStatLineV1;
}

function postseasonGameSummary(
  completed: CompletedPositionGame,
  seasonIndex: 0 | 1,
  roundIndex: 0 | 1,
  strategy: PositionAlphaDecisionStrategy,
): PositionAlphaPostseasonGameSummaryV1 {
  return {
    model: 'position_alpha_postseason_game_summary_v1',
    seasonIndex,
    roundIndex,
    opponentProgramId: completed.game.summary.opponentProgramId,
    isHome: completed.game.summary.isHome,
    decisionStrategy: strategy,
    playerTeamScore: completed.game.summary.playerTeamScore,
    opponentScore: completed.game.summary.opponentScore,
    resultId: completed.game.summary.resultId,
    gameGrade: completed.game.summary.gradeScore,
    participationFeedbackId: completed.game.summary.participationFeedbackId,
    stats: gameStatLine(completed),
  };
}

export type PositionAlphaEventEffects = Pick<
  PositionAlphaSessionV1,
  'player' | 'lifecycle' | 'room' | 'training' | 'events'
>;
export type PositionAlphaEventContext = PositionAlphaEventEffects &
  Pick<PositionAlphaGameContext, 'skills'>;

/** Shared event rules; accepts four-slot current builds without truncation. */
export function resolvePositionAlphaEventEffects(
  session: PositionAlphaEventContext,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaEventEffects | null {
  const result = resolvePositionAlphaEventChoiceResult(session, choiceId, mechanics);
  if (result === null) return null;
  const playerState = result.playerState;
  return deepFreeze(
    cloneSerializable({
      player: { ...session.player, state: playerState },
      lifecycle: { ...session.lifecycle, playerState },
      room: { ...session.room, playerCoachTrust: playerState.coachTrust },
      training: {
        ...session.training,
        state: {
          body: playerState.body,
          preparation: playerState.preparation,
          confidence: playerState.confidence,
        },
      },
      events: result.events,
    }),
  );
}

export type PositionAlphaEventResolutionEvidence =
  | QbEventResolutionEvidence
  | ReturnType<typeof resolveRbEventChoice>['evidence']
  | ReturnType<typeof resolveCbEventChoice>['evidence'];

export function resolvePositionAlphaEventChoiceResult(
  session: PositionAlphaEventContext,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): {
  readonly playerState: PositionAlphaEventEffects['player']['state'];
  readonly events: PositionAlphaEventStateV1;
  readonly evidence: PositionAlphaEventResolutionEvidence;
} | null {
  const pending = session.events.pending;
  if (pending === null || typeof choiceId !== 'string' || !pending.choiceIds.includes(choiceId)) {
    return null;
  }
  const context = {
    weekIndex: pending.weekIndex,
    body: session.player.state.body,
    preparation: session.player.state.preparation,
    confidence: session.player.state.confidence,
    coachTrust: session.player.state.coachTrust,
    gpaMilli: Math.round(session.player.state.gpa * 1_000),
    brand: session.player.state.brand,
    contextTags: [] as string[],
    recentEvents: session.events.recentEvents,
  };
  const equippedIds = equippedSkillIds(session);
  let nextContext: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
    readonly coachTrust: number;
    readonly gpaMilli: number;
    readonly brand: number;
  };
  let modifiers: PositionAlphaEventStateV1['nextGameModifiers'];
  let evidence: PositionAlphaEventResolutionEvidence;
  try {
    if (session.player.positionId === 'position_qb') {
      const event = mechanics.qb.events.find(({ id }) => id === pending.eventId);
      if (event === undefined) return null;
      const result = resolveQbEventChoice(
        { ...context, recentEvents: context.recentEvents as never },
        event,
        choiceId,
        mechanics.qb.skills.filter(({ id }) => equippedIds.includes(id)),
      );
      evidence = result.evidence;
      nextContext = result.nextContext;
      modifiers = {
        clueBonus: result.gameModifiers.clueBonus,
        decisionScoreFlat: result.gameModifiers.decisionScoreFlat,
        exposureReductionPermille: result.gameModifiers.pressureReductionPermille,
      };
    } else if (session.player.positionId === 'position_rb') {
      const event = mechanics.rb.events.find(({ id }) => id === pending.eventId);
      if (event === undefined) return null;
      const result = resolveRbEventChoice(
        { ...context, recentEvents: context.recentEvents as never },
        event,
        choiceId,
        mechanics.rb.skills.filter(({ id }) => equippedIds.includes(id)),
      );
      evidence = result.evidence;
      nextContext = result.nextContext;
      modifiers = {
        clueBonus: result.gameModifiers.clueBonus,
        decisionScoreFlat: result.gameModifiers.decisionScoreFlat,
        exposureReductionPermille: result.gameModifiers.contactReductionPermille,
      };
    } else {
      const event = mechanics.cb.events.find(({ id }) => id === pending.eventId);
      if (event === undefined) return null;
      const result = resolveCbEventChoice(
        { ...context, recentEvents: context.recentEvents as never },
        event,
        choiceId,
        mechanics.cb.skills.filter(({ id }) => equippedIds.includes(id)),
      );
      evidence = result.evidence;
      nextContext = result.nextContext;
      modifiers = {
        clueBonus: result.gameModifiers.clueBonus,
        decisionScoreFlat: result.gameModifiers.decisionScoreFlat,
        exposureReductionPermille: result.gameModifiers.targetReductionPermille,
      };
    }
  } catch {
    return null;
  }
  const playerState = {
    ...cloneSerializable(session.player.state),
    body: nextContext.body,
    preparation: nextContext.preparation,
    confidence: nextContext.confidence,
    coachTrust: nextContext.coachTrust,
    gpa: nextContext.gpaMilli / 1_000,
    brand: nextContext.brand,
  };
  const events: PositionAlphaEventStateV1 = {
    ...cloneSerializable(session.events),
    pending: null,
    recentEvents: [
      ...session.events.recentEvents,
      { eventId: pending.eventId, weekIndex: pending.weekIndex },
    ],
    history: [
      ...session.events.history,
      { eventId: pending.eventId, choiceId, weekIndex: pending.weekIndex },
    ],
    nextGameModifiers: modifiers,
  };
  // Current replay needs only these changed fields. The historical wrapper above
  // constructs the full literal effects shape when its caller needs that shape.
  return deepFreeze(cloneSerializable({ playerState, events, evidence }));
}

export function resolvePositionAlphaEvent(
  session: PositionAlphaSessionV1,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): ResolvePositionAlphaEventResult {
  const invalid = (): ResolvePositionAlphaEventResult =>
    deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });
  if (!validatePositionAlphaSession(session, mechanics)) return invalid();
  const effects = resolvePositionAlphaEventEffects(session, choiceId, mechanics);
  if (effects === null) return invalid();
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    ...effects,
    revision: session.revision + 1,
  };
  return validatePositionAlphaSession(nextSession, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

export function choosePositionAlphaSkill(
  session: PositionAlphaSessionV1,
  skillId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): ChoosePositionAlphaSkillResult {
  const invalid = (): ChoosePositionAlphaSkillResult =>
    deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });
  if (!validatePositionAlphaSession(session, mechanics)) return invalid();
  const offered = session.skills.offeredSkillIds;
  if (typeof skillId !== 'string' || offered === null || !offered.includes(skillId as SkillId)) {
    return invalid();
  }
  const selected = skillId as SkillId;
  const firstOpenSlot = session.skills.equippedSkillIds.findIndex((entry) => entry === null);
  const equipped = [...session.skills.equippedSkillIds] as [
    SkillId | null,
    SkillId | null,
    SkillId | null,
  ];
  if (firstOpenSlot >= 0) equipped[firstOpenSlot] = selected;
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    skills: {
      ...cloneSerializable(session.skills),
      breakthroughGauge: Math.max(0, session.skills.breakthroughGauge - 100),
      ownedSkillIds: [...session.skills.ownedSkillIds, selected],
      equippedSkillIds: equipped,
      offeredSkillIds: null,
      breakthroughHistory: [
        ...session.skills.breakthroughHistory,
        {
          weekIndex: session.lifecycle.activeSeasonIndex * 12 + session.weekHistory.length - 1,
          skillId: selected,
        },
      ],
    },
  };
  return validatePositionAlphaSession(nextSession, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

export function equipPositionAlphaSkill(
  session: PositionAlphaSessionV1,
  skillId: unknown,
  slotIndex: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): EquipPositionAlphaSkillResult {
  const invalid = (): EquipPositionAlphaSkillResult =>
    deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });
  if (
    !validatePositionAlphaSession(session, mechanics) ||
    typeof skillId !== 'string' ||
    !session.skills.ownedSkillIds.includes(skillId as SkillId) ||
    !Number.isSafeInteger(slotIndex) ||
    (slotIndex as number) < 0 ||
    (slotIndex as number) > 2
  ) {
    return invalid();
  }
  const equipped = session.skills.equippedSkillIds.map((entry) =>
    entry === skillId ? null : entry,
  ) as [SkillId | null, SkillId | null, SkillId | null];
  equipped[slotIndex as number] = skillId as SkillId;
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    skills: { ...cloneSerializable(session.skills), equippedSkillIds: equipped },
  };
  return validatePositionAlphaSession(nextSession, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

export function resolvePositionAlphaSeason(
  session: PositionAlphaSessionV1,
  strategy: PositionAlphaDecisionStrategy,
  mechanics: PositionAlphaSessionCommandMechanics,
): ResolvePositionAlphaSeasonResult {
  const invalid = (): ResolvePositionAlphaSeasonResult =>
    deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });
  if (
    !validatePositionAlphaSession(session, mechanics) ||
    session.phase.type !== 'SEASON_REVIEW' ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null ||
    (strategy !== 'best_fit' && strategy !== 'risk_seeking')
  ) {
    return invalid();
  }
  const seasonIndex = session.phase.seasonIndex;
  const initialized = initializeWorldAlphaPostseason(session.world, mechanics.world);
  if (!initialized.ok) return invalid();
  let working: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    world: initialized.value,
  };
  const postseasonHistory: PositionAlphaPostseasonGameSummaryV1[] = [];
  while (working.world.postseason.type === 'ACTIVE') {
    const roundIndex = working.world.postseason.currentRoundIndex;
    const round = working.world.postseason.rounds[roundIndex];
    const fixture = round.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === working.lifecycle.currentProgramId ||
        awayProgramId === working.lifecycle.currentProgramId,
    );
    let worldResult: WorldAlphaPlayerGameResult | null = null;
    if (fixture !== undefined) {
      const completed = resolveCompletePositionGame(
        working,
        fixture,
        12 + roundIndex,
        strategy,
        mechanics,
      );
      if (completed === null) return invalid();
      worldResult = projectCompletedWorldResult(completed, fixture);
      if (worldResult === null) return invalid();
      postseasonHistory.push(postseasonGameSummary(completed, seasonIndex, roundIndex, strategy));
      const nextPlayerState = completed.game.nextPlayer.state;
      const overall = derivePositionOverall(
        working.player.positionId,
        completed.game.nextPlayer.attributes,
      );
      if (!overall.ok) return invalid();
      working = {
        ...working,
        careerRng: completed.game.rng,
        player: {
          ...cloneSerializable(working.player),
          attributes: completed.game.nextPlayer.attributes,
          overall: overall.overall,
          state: { ...cloneSerializable(working.player.state), ...nextPlayerState },
        },
        training: {
          ...cloneSerializable(working.training),
          attributes: completed.game.nextPlayer.attributes,
          state: {
            body: nextPlayerState.body,
            preparation: nextPlayerState.preparation,
            confidence: nextPlayerState.confidence,
          },
        },
        events: {
          ...cloneSerializable(working.events),
          nextGameModifiers: {
            clueBonus: 0,
            decisionScoreFlat: 0,
            exposureReductionPermille: 0,
          },
        },
      };
    }
    const resolved = resolveNextWorldAlphaPostseasonRound(
      working.world,
      mechanics.world,
      worldResult,
    );
    if (!resolved.ok) return invalid();
    working = { ...working, world: resolved.value };
  }
  if (working.world.postseason.type !== 'COMPLETE') return invalid();
  const offseasonWorld = projectWorldAlphaOffseason(working.world, mechanics.world);
  const archived = archiveCompletedWorldAlphaSeason(
    working.worldHistory,
    working.world,
    mechanics.world,
  );
  if (!offseasonWorld.ok || !archived.ok) return invalid();
  const projected = projectPositionOffseason(
    offseasonWorld.value,
    working.player.positionId,
    working.lifecycle.currentProgramId,
    working.room.projection.rank,
    working.lifecycle.relationships,
    [],
    working.careerRng,
    mechanics.lifecycle,
  );
  if (projected === null) return invalid();
  const allGames = [
    ...working.weekHistory.map(({ stats, gameGrade, resultId }) => ({
      stats,
      gameGrade,
      resultId,
    })),
    ...postseasonHistory.map(({ stats, gameGrade, resultId }) => ({
      stats,
      gameGrade,
      resultId,
    })),
  ];
  const regularRecord = working.world.programRecords.find(
    ({ programId }) => programId === working.lifecycle.currentProgramId,
  );
  if (regularRecord === undefined) return invalid();
  const postseasonWins = postseasonHistory.filter(
    ({ resultId }) => resultId === 'game_result_win',
  ).length;
  const postseasonLosses = postseasonHistory.filter(
    ({ resultId }) => resultId === 'game_result_loss',
  ).length;
  const postseasonTies = postseasonHistory.filter(
    ({ resultId }) => resultId === 'game_result_tie',
  ).length;
  const firstWeek = working.weekHistory[0];
  const summary: PositionSeasonSummaryV1 = {
    model: 'position_season_summary_v1',
    seasonIndex,
    seasonId: `season_position_alpha_${seasonIndex}`,
    programId: working.lifecycle.currentProgramId,
    positionId: working.player.positionId,
    outcomeId:
      working.world.postseason.championProgramId === working.lifecycle.currentProgramId
        ? 'season_outcome_champion'
        : 'season_outcome_regular_season_complete',
    gamesPlayed: allGames.length,
    wins: regularRecord.wins + postseasonWins,
    losses: regularRecord.losses + postseasonLosses,
    ties: regularRecord.ties + postseasonTies,
    stats: addPositionStatLines(
      working.player.positionId,
      allGames.map(({ stats }) => stats),
    ),
    averagePerformanceGrade: Math.round(
      allGames.reduce((total, { gameGrade }) => total + gameGrade, 0) /
        Math.max(1, allGames.length),
    ),
    startingDepthRank: firstWeek?.depthRankBefore ?? working.room.projection.rank,
    startingRoleId: firstWeek?.roleId ?? working.room.projection.roleId,
    finalDepthRank: working.room.projection.rank,
    finalRoleId: working.room.projection.roleId,
    injuryOutcomeIds: [],
    injuryWeeksMissed: 0,
    ownedSkillIds: [] as SkillId[],
    equippedSkillIds: [null, null, null],
  };
  const synchronizedLifecycle: PositionCareerLifecycleV1 = {
    ...cloneSerializable(working.lifecycle),
    playerState: cloneSerializable(working.player.state),
  };
  const reviewed = attachPositionSeasonSummary(synchronizedLifecycle, summary, projected);
  if (reviewed === null) return invalid();
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(working),
    revision: session.revision + 1,
    careerRng: projected.rng,
    lifecycle: reviewed,
    worldHistory: archived.value,
    postseasonHistory,
    phase: { type: 'OFFSEASON_DECISION', seasonIndex },
  };
  return validatePositionAlphaSession(nextSession, mechanics)
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

export function commitPositionAlphaOffseason(
  session: PositionAlphaSessionV1,
  selectedProgramId: ProgramId,
  mechanics: PositionAlphaSessionCommandMechanics,
): CommitPositionAlphaOffseasonResult {
  const invalid = (): CommitPositionAlphaOffseasonResult =>
    deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });
  if (
    !validatePositionAlphaSession(session, mechanics) ||
    session.phase.type !== 'OFFSEASON_DECISION'
  ) {
    return invalid();
  }
  const completedSeasonIndex = session.phase.seasonIndex;
  const committed = commitPositionOffseason(
    session.lifecycle,
    selectedProgramId,
    mechanics.lifecycle,
  );
  if (committed === null) {
    return invalid();
  }
  const player: PositionAlphaSessionV1['player'] = {
    ...cloneSerializable(session.player),
    state: cloneSerializable(committed.playerState),
  };
  if (completedSeasonIndex === 1) {
    const meta = completePositionCareer(
      committed,
      { schemaVersion: 2, revision: 0, alumni: [], unlockedOptionIds: [], programFamiliarity: [] },
      POSITION_ALPHA_CONTENT_SCHEMA_VERSION,
    );
    if (meta === null) return invalid();
    const complete: PositionAlphaSessionV1 = {
      ...cloneSerializable(session),
      revision: session.revision + 1,
      player,
      lifecycle: committed,
      training: {
        ...cloneSerializable(session.training),
        state: {
          body: player.state.body,
          preparation: player.state.preparation,
          confidence: player.state.confidence,
        },
      },
      meta,
      phase: { type: 'CAREER_COMPLETE', seasonIndex: 1 },
    };
    return validatePositionAlphaSession(complete, mechanics)
      ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(complete)) })
      : invalid();
  }
  const room = generatePositionRoom(
    player,
    session.careerRng,
    mechanics.roomNames,
    mechanics.room,
    {
      programId: committed.currentProgramId,
      roomTalentMean: 68,
      roomTalentSpread: 9,
      trustBase: 50,
      practiceFormBase: 50,
      experienceReadinessBase: 55,
      playerCoachTrustBonus: 0,
      playerPracticeForm: 55,
      playerExperienceReadiness: 60,
    },
  );
  const world = createWorldAlphaSeason(
    mechanics.world,
    createRng(`${String(committed.careerSeed)}:position-alpha-world:1`),
    1,
    committed.currentProgramId,
  );
  if (!room.ok || !world.ok) {
    return invalid();
  }
  const nextSession: PositionAlphaSessionV1 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    careerRng: room.generated.rng,
    player,
    room: room.generated.context,
    lifecycle: committed,
    world: world.value,
    training: {
      ...cloneSerializable(session.training),
      attributes: player.attributes,
      state: {
        body: player.state.body,
        preparation: player.state.preparation,
        confidence: player.state.confidence,
      },
    },
    weekHistory: [],
    postseasonHistory: [],
    phase: { type: 'WEEK_PLANNING', weekIndex: 0 },
  };
  const validNextSeason = validatePositionAlphaSession(nextSession, mechanics);
  return validNextSeason
    ? deepFreeze({ ok: true as const, session: deepFreeze(cloneSerializable(nextSession)) })
    : invalid();
}

export function validatePositionAlphaSession(
  value: unknown,
  mechanics: PositionAlphaSessionFoundationMechanics,
): value is PositionAlphaSessionV1 {
  return validatePositionAlphaSessionFields(value, mechanics, validatePositionAlphaWeekSummaryV1);
}

export function validatePositionAlphaWeekSummaryV1(entry: unknown, index: number): boolean {
  return (
    isRecord(entry) &&
    entry['model'] === 'position_alpha_week_summary_v1' &&
    entry['weekIndex'] === index &&
    typeof entry['actionId'] === 'string' &&
    typeof entry['opponentProgramId'] === 'string' &&
    (entry['decisionStrategy'] === 'best_fit' || entry['decisionStrategy'] === 'risk_seeking') &&
    Number.isSafeInteger(entry['gameGrade']) &&
    Number.isSafeInteger(entry['opportunityCount'])
  );
}

/** Internal aggregate validation seam. The historical public reader pins its exact v1 history predicate. */
export function validatePositionAlphaSessionFields(
  value: unknown,
  mechanics: PositionAlphaSessionFoundationMechanics,
  validateWeekSummary: (entry: unknown, index: number) => boolean,
  currentPostseason?: {
    readonly validateHistoryEntry: (entry: unknown, index: number) => boolean;
    readonly validatePhase: (
      phase: Record<string, unknown>,
      world: WorldAlphaSeasonState,
      lifecycle: PositionCareerLifecycleV1,
    ) => boolean;
  },
): boolean {
  if (!isRecord(value) || !exactKeys(value, SESSION_KEYS)) return false;
  if (
    value['schemaVersion'] !== POSITION_ALPHA_SESSION_SCHEMA_VERSION_V1 ||
    value['model'] !== 'position_alpha_session_v1' ||
    value['contentSchemaVersion'] !== POSITION_ALPHA_CONTENT_SCHEMA_VERSION ||
    !Number.isSafeInteger(value['revision']) ||
    (value['revision'] as number) < 0 ||
    !isRngState(value['careerRng'])
  ) {
    return false;
  }
  const player = value['player'] as PositionAlphaSessionV1['player'];
  const derivedOverall = isRecord(player)
    ? derivePositionOverall(player.positionId, player.attributes)
    : { ok: false as const };
  if (
    !isRecord(player) ||
    !isAddedPositionId(player.positionId) ||
    !validFoundationMechanics(player.positionId, mechanics) ||
    validatePositionAttributeProgress(player.positionId, player.attributes).length > 0 ||
    !derivedOverall.ok ||
    player.overall !== derivedOverall.overall
  ) {
    return false;
  }
  const lifecycle = value['lifecycle'];
  if (
    !validatePositionCareerLifecycle(lifecycle) ||
    lifecycle.positionId !== player.positionId ||
    lifecycle.playerId !== player.id ||
    (((value['phase'] as PositionAlphaSessionPhaseV1)?.type !== 'CAREER_COMPLETE' ||
      currentPostseason !== undefined) &&
      lifecycle.currentProgramId !== (value['room'] as PositionRoomContext)?.programId) ||
    !sameSerializable(lifecycle.playerState, player.state)
  ) {
    return false;
  }
  if (!validateWorldAlphaSeasonState(mechanics.world, value['world']).ok) return false;
  const world = value['world'] as WorldAlphaSeasonState;
  const phase = value['phase'];
  if (!isRecord(phase)) return false;
  const careerComplete = phase['type'] === 'CAREER_COMPLETE';
  const currentCareerComplete = careerComplete && currentPostseason !== undefined;
  if (
    ((!careerComplete || currentCareerComplete) &&
      world.playerProgramId !== lifecycle.currentProgramId) ||
    (!careerComplete && world.seasonIndex !== lifecycle.activeSeasonIndex) ||
    (careerComplete &&
      (world.seasonIndex !== 1 || lifecycle.activeSeasonIndex !== (currentCareerComplete ? 1 : 2)))
  ) {
    return false;
  }
  const room = value['room'] as PositionRoomContext;
  const roomProbe = updatePositionRoomAfterPractice(
    room,
    player.attributes,
    room?.playerPracticeForm,
    mechanics.room,
  );
  if (!roomProbe.ok || room.playerId !== player.id || room.positionId !== player.positionId) {
    return false;
  }
  const training = value['training'] as PositionTrainingState;
  if (
    training?.positionId !== player.positionId ||
    !sameSerializable(training.attributes, player.attributes) ||
    !sameSerializable(training.state, {
      body: player.state.body,
      preparation: player.state.preparation,
      confidence: player.state.confidence,
    }) ||
    !isRecord(training.proficiencyUses) ||
    Object.values(training.proficiencyUses).some(
      (uses) => !Number.isSafeInteger(uses) || (uses as number) < 0,
    )
  ) {
    return false;
  }
  const skills = value['skills'] as PositionAlphaSkillStateV1;
  if (
    !isRecord(skills) ||
    !exactKeys(skills, [
      'breakthroughGauge',
      'breakthroughHistory',
      'equippedSkillIds',
      'model',
      'offeredSkillIds',
      'ownedSkillIds',
    ]) ||
    skills.model !== 'position_alpha_skill_state_v1' ||
    !Number.isSafeInteger(skills.breakthroughGauge) ||
    skills.breakthroughGauge < 0 ||
    skills.breakthroughGauge > 160 ||
    !Array.isArray(skills.ownedSkillIds) ||
    new Set(skills.ownedSkillIds).size !== skills.ownedSkillIds.length ||
    skills.ownedSkillIds.some((skillId) => !mechanics.skillIds.includes(skillId)) ||
    !Array.isArray(skills.equippedSkillIds) ||
    skills.equippedSkillIds.length !== 3 ||
    skills.equippedSkillIds.some(
      (skillId) => skillId !== null && !skills.ownedSkillIds.includes(skillId),
    ) ||
    new Set(skills.equippedSkillIds.filter((skillId) => skillId !== null)).size !==
      skills.equippedSkillIds.filter((skillId) => skillId !== null).length ||
    (skills.offeredSkillIds !== null &&
      (!Array.isArray(skills.offeredSkillIds) ||
        skills.offeredSkillIds.length !== 3 ||
        new Set(skills.offeredSkillIds).size !== 3 ||
        skills.offeredSkillIds.some(
          (skillId) =>
            !mechanics.skillIds.includes(skillId) || skills.ownedSkillIds.includes(skillId),
        ))) ||
    !Array.isArray(skills.breakthroughHistory) ||
    skills.breakthroughHistory.length !== skills.ownedSkillIds.length ||
    skills.breakthroughHistory.some(
      (entry, index) =>
        !isRecord(entry) ||
        !exactKeys(entry, ['skillId', 'weekIndex']) ||
        entry['skillId'] !== skills.ownedSkillIds[index] ||
        !Number.isSafeInteger(entry['weekIndex']) ||
        (entry['weekIndex'] as number) < 0,
    )
  ) {
    return false;
  }
  const events = value['events'] as PositionAlphaEventStateV1;
  const modifiers = events?.nextGameModifiers;
  if (
    !isRecord(events) ||
    !exactKeys(events, ['history', 'model', 'nextGameModifiers', 'pending', 'recentEvents']) ||
    events.model !== 'position_alpha_event_state_v1' ||
    !Array.isArray(events.recentEvents) ||
    !Array.isArray(events.history) ||
    events.recentEvents.length !== events.history.length ||
    events.history.some(
      (entry, index) =>
        !isRecord(entry) ||
        !exactKeys(entry, ['choiceId', 'eventId', 'weekIndex']) ||
        !mechanics.eventIds.includes(entry['eventId'] as string) ||
        !mechanics.eventChoiceIds.includes(entry['choiceId'] as string) ||
        !Number.isSafeInteger(entry['weekIndex']) ||
        entry['eventId'] !== events.recentEvents[index]?.eventId ||
        entry['weekIndex'] !== events.recentEvents[index]?.weekIndex,
    ) ||
    !isRecord(modifiers) ||
    !exactKeys(modifiers, ['clueBonus', 'decisionScoreFlat', 'exposureReductionPermille']) ||
    !Number.isSafeInteger(modifiers.clueBonus) ||
    modifiers.clueBonus < 0 ||
    modifiers.clueBonus > 2 ||
    !Number.isSafeInteger(modifiers.decisionScoreFlat) ||
    modifiers.decisionScoreFlat < -10 ||
    modifiers.decisionScoreFlat > 10 ||
    !Number.isSafeInteger(modifiers.exposureReductionPermille) ||
    modifiers.exposureReductionPermille < 0 ||
    modifiers.exposureReductionPermille > 250 ||
    (events.pending !== null &&
      (!isRecord(events.pending) ||
        !exactKeys(events.pending, ['choiceIds', 'eventId', 'weekIndex']) ||
        !mechanics.eventIds.includes(events.pending['eventId'] as string) ||
        !Array.isArray(events.pending['choiceIds']) ||
        events.pending['choiceIds'].length < 2 ||
        new Set(events.pending['choiceIds']).size !== events.pending['choiceIds'].length ||
        events.pending['choiceIds'].some(
          (choiceId) => !mechanics.eventChoiceIds.includes(choiceId as string),
        ) ||
        !Number.isSafeInteger(events.pending['weekIndex'])))
  ) {
    return false;
  }
  const weekHistory = value['weekHistory'];
  if (
    !Array.isArray(weekHistory) ||
    weekHistory.length !== world.completedRegularSeasonRoundCount ||
    weekHistory.some((entry, index) => !validateWeekSummary(entry, index))
  ) {
    return false;
  }
  const postseasonHistory = value['postseasonHistory'];
  if (
    !Array.isArray(postseasonHistory) ||
    postseasonHistory.length > 2 ||
    postseasonHistory.some((entry, index) =>
      currentPostseason !== undefined
        ? !currentPostseason.validateHistoryEntry(entry, index)
        : !isRecord(entry) ||
          entry['model'] !== 'position_alpha_postseason_game_summary_v1' ||
          entry['seasonIndex'] !== world.seasonIndex ||
          !Number.isSafeInteger(entry['roundIndex']) ||
          !Number.isSafeInteger(entry['gameGrade']),
    )
  ) {
    return false;
  }
  const worldHistory = value['worldHistory'];
  if (
    !isRecord(worldHistory) ||
    worldHistory['model'] !== 'world_alpha_history_v1' ||
    !Array.isArray(worldHistory['detailedSeasons']) ||
    !Array.isArray(worldHistory['summarizedSeasons']) ||
    worldHistory['detailedSeasons'].length > 2 ||
    worldHistory['summarizedSeasons'].length > 8 ||
    worldHistory['detailedSeasons'].length + worldHistory['summarizedSeasons'].length !==
      lifecycle.completedSeasons.length
  ) {
    return false;
  }
  const meta = value['meta'];
  if (
    (phase['type'] === 'CAREER_COMPLETE' &&
      (!isRecord(meta) || meta['schemaVersion'] !== 2 || !Array.isArray(meta['alumni']))) ||
    (phase['type'] !== 'CAREER_COMPLETE' && meta !== null)
  ) {
    return false;
  }
  if (world.completedRegularSeasonRoundCount < 12) {
    return (
      exactKeys(phase, ['type', 'weekIndex']) &&
      phase['type'] === 'WEEK_PLANNING' &&
      phase['weekIndex'] === world.completedRegularSeasonRoundCount &&
      lifecycle.offseason === null &&
      postseasonHistory.length === 0
    );
  }
  if (currentPostseason !== undefined && world.postseason.type !== 'PENDING')
    return currentPostseason.validatePhase(phase, world, lifecycle);
  if (phase['type'] === 'SEASON_REVIEW') {
    return (
      exactKeys(phase, ['seasonIndex', 'type']) &&
      phase['seasonIndex'] === world.seasonIndex &&
      world.postseason.type === 'PENDING' &&
      lifecycle.offseason === null &&
      postseasonHistory.length === 0
    );
  }
  if (phase['type'] === 'OFFSEASON_DECISION') {
    return (
      exactKeys(phase, ['seasonIndex', 'type']) &&
      phase['seasonIndex'] === world.seasonIndex &&
      world.postseason.type === 'COMPLETE' &&
      lifecycle.offseason !== null
    );
  }
  return (
    exactKeys(phase, ['seasonIndex', 'type']) &&
    phase['type'] === 'CAREER_COMPLETE' &&
    phase['seasonIndex'] === 1 &&
    world.postseason.type === 'COMPLETE' &&
    lifecycle.offseason === null
  );
}

export function serializePositionAlphaSession(session: PositionAlphaSessionV1): string {
  return JSON.stringify(session);
}

export function parsePositionAlphaSessionJson(
  json: string,
  mechanics: PositionAlphaSessionFoundationMechanics,
): PositionAlphaSessionV1 | null {
  try {
    const value: unknown = JSON.parse(json);
    return validatePositionAlphaSession(value, mechanics)
      ? deepFreeze(cloneSerializable(value))
      : null;
  } catch {
    return null;
  }
}
