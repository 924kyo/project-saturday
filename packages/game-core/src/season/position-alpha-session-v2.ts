import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { packJsonArchiveV1, unpackJsonArchiveV1 } from '../player/json-archive.js';
import { utf8ByteLength } from '../player/utf8.js';
import type { ProgramId } from '../player/ids.js';
import type { PlayerState } from '../player/types.js';
import type { DepthRoleId } from '../programs/ids.js';
import {
  derivePositionAlphaSeasonStartV2,
  positionAlphaActiveMechanicsV2,
  type PositionAlphaSeasonStartV2,
} from './position-alpha-season-start-v2.js';
import {
  derivePositionAlphaSeasonReviewV2,
  derivePositionAlphaCareerCompletionV2,
  type PositionAlphaSeasonReviewV2,
} from './position-alpha-season-review-v2.js';
import {
  initializeWorldAlphaPostseason,
  resolveNextWorldAlphaPostseasonRound,
  type WorldAlphaSeasonState,
} from './world-alpha.js';
import {
  POSITION_ALPHA_REGULAR_WEEK_COUNT,
  POSITION_ALPHA_CURRENT_SEASON_WEEK_COUNT,
  positionAlphaSourceCareerWeekIndexV2,
  positionAlphaSourceClockV2,
  projectHistoricalPositionAlphaSeasonClockV2,
  type PositionAlphaSeasonClockV2,
} from './position-alpha-calendar-v2.js';
import {
  appendPositionAlphaNilActionV2,
  replayPositionAlphaNilPlanningV2,
  type PositionAlphaNilActionV2,
  type PositionAlphaNilPlanningProjectionV2,
  type PositionAlphaNilStateV2,
  type PositionAlphaNilWeekV2,
} from './position-alpha-nil-v2.js';
import {
  attemptPositionAlphaEventV2,
  choosePositionAlphaWeeklyEventV2,
  replayPositionAlphaEventV2,
  previousPositionAlphaFootballStats,
  positionAlphaPreparationAfterEvent,
  type PositionAlphaEventWeekV2,
} from './position-alpha-events-v2.js';
import {
  preparePositionAlphaAcademicsV2,
  type PositionAlphaAcademicStateV2,
  type PositionAlphaAcademicWeekV2,
} from './position-alpha-academics-v2.js';
import type { SkillId } from '../skills/ids.js';
import { isRngState, type RngState } from '../random/rng.js';
import { advanceInjuryDuration } from '../injuries/resolution.js';
import { isInjuryChoiceId } from '../injuries/ids.js';
import type { NewInjuryEvidence } from '../injuries/types.js';
import {
  isPositionFocusStateV2,
  createCommonPositionProficiencyUses,
  isPositionFocusAvailable,
  type PositionFocusId,
} from '../weekly/position-focus.js';
import {
  deriveTrainingProficiencyLevel,
  getTrainingProficiencyXpMultiplierPermille,
} from '../weekly/tuning.js';
import {
  preparePositionAlphaWeekV2,
  historicalPositionTrainingFields,
  positionFocusStateFromSource,
  type PositionAlphaPreparationV2,
  type PositionAlphaTrainingV2,
} from './position-alpha-focus-v2.js';
import {
  resolvePositionInjuryWeekChoice,
  validatePositionInjuryWeek,
  type PositionInjuryWeekV1,
} from './position-injury.js';
import { TACTICAL_GAME_RULES_VERSION } from '../games/tactical-alpha-v1.js';
import {
  recordedPositionAlphaRulesVersion,
  startPositionAlphaGame,
  resolvePositionAlphaSnap,
  validatePositionAlphaSession,
  validatePositionAlphaSessionFields,
  validatePositionAlphaWeekSummaryV1,
  settlePositionAlphaFootballWeek,
  derivePositionAlphaFootballConsequences,
  projectCompletedWorldResult,
  resolvePositionAlphaEventEffects,
  commitPositionAlphaOffseason,
  type CompletedPositionGame,
  type PositionAlphaGameState,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionFoundationMechanics,
  type PositionAlphaSessionV1,
  type PositionAlphaSkillStateV1,
} from './position-alpha-session.js';
import {
  equalPositionAlphaEvidence as sameJson,
  createPositionAlphaWeekSourceV2,
  createPositionAlphaWeekSummaryV2,
  validatePositionAlphaWeekSummaryV2,
  assessPositionAlphaPreparedInjury,
  positionAlphaGameContextAfterInjury,
  preparePositionAlphaNilWeekV2,
  type PositionAlphaWeekSummaryV2,
} from './position-alpha-week-evidence-v2.js';

export const POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2 = 2 as const;
/** Current-rules aggregate: identical shape, explicit schema/model markers (see session-v3). */
export const POSITION_ALPHA_SESSION_SCHEMA_VERSION_V3 = 3 as const;

/** Action-time snapshots may differ from today's slots, but cannot borrow future/unowned cards. */
function ownsNilPlanningLoadouts(
  nil: PositionAlphaNilStateV2 | undefined,
  skills: PositionAlphaSkillStateV2,
  careerWeekIndex: number,
): boolean {
  return (
    nil === undefined ||
    nil.planning.every(({ equippedSkillIds }) =>
      equippedSkillIds.every(
        (id) =>
          id === null ||
          (skills.ownedSkillIds.includes(id) &&
            skills.breakthroughHistory.some(
              (acquired) => acquired.skillId === id && acquired.weekIndex <= careerWeekIndex,
            )),
      ),
    )
  );
}

function skillsFollowCurrentWeek(
  previous: PositionAlphaWeekSummaryV2,
  skills: Pick<
    PositionAlphaSkillStateV2,
    'breakthroughGauge' | 'ownedSkillIds' | 'offeredSkillIds'
  >,
  acquisitions: PositionAlphaSkillStateV2['breakthroughHistory'],
): boolean {
  if (skills.breakthroughGauge !== previous.breakthrough.progress.progressAfter) return false;
  const ownedBefore = previous.source.skills.ownedSkillIds;
  const offered = previous.breakthrough.offer?.offeredSkillIds ?? null;
  if (sameJson(skills.ownedSkillIds, ownedBefore)) return sameJson(skills.offeredSkillIds, offered);
  if (
    offered === null ||
    skills.offeredSkillIds !== null ||
    skills.ownedSkillIds.length !== ownedBefore.length + 1 ||
    !sameJson(skills.ownedSkillIds.slice(0, -1), ownedBefore)
  )
    return false;
  const selected = skills.ownedSkillIds.at(-1)!;
  const acquired = acquisitions[ownedBefore.length];
  return (
    offered.includes(selected) &&
    acquired?.skillId === selected &&
    acquired.weekIndex === positionAlphaSourceCareerWeekIndexV2(previous.source, previous.weekIndex)
  );
}

export interface PositionAlphaSkillStateV2 extends Omit<
  PositionAlphaSkillStateV1,
  'model' | 'equippedSkillIds'
> {
  readonly model: 'position_alpha_skill_state_v2';
  readonly equippedSkillIds: readonly [
    SkillId | null,
    SkillId | null,
    SkillId | null,
    SkillId | null,
  ];
}

/** Neutral migration boundary. Direct engine-owned phases are staged before browser activation. */
export interface PositionAlphaGameDayIdleV2 {
  readonly model: 'position_alpha_game_day_v2';
  readonly type: 'IDLE';
}

export interface PositionAlphaGameDayInFlightV2 {
  readonly model: 'position_alpha_game_day_v2';
  readonly type:
    | 'PRACTICE_REVIEW'
    | 'ACADEMIC_REVIEW'
    | 'EVENT_CHOICE'
    | 'EVENT_RESOLVED'
    | 'INJURY_CHOICE'
    | 'INJURY_RESOLVED'
    | 'GAME_PREVIEW'
    | 'ACTIVE_SNAP'
    | 'RESOLVED_SNAP'
    | 'POST_GAME';
  readonly preparation: PositionAlphaPreparationV2;
  readonly rngBefore: RngState;
  readonly decisionIds: readonly string[];
  readonly game: PositionAlphaGameState | null;
  readonly injury: PositionInjuryWeekV1 | null;
  readonly academics: PositionAlphaAcademicWeekV2 | null;
  readonly event: PositionAlphaEventWeekV2 | null;
  readonly nil: PositionAlphaNilWeekV2 | null;
}

export type PositionAlphaGameDayV2 = PositionAlphaGameDayIdleV2 | PositionAlphaGameDayInFlightV2;

export interface PositionAlphaSessionV2 extends Omit<
  PositionAlphaSessionV1,
  'schemaVersion' | 'model' | 'skills' | 'phase' | 'weekHistory' | 'training' | 'postseasonHistory'
> {
  readonly schemaVersion: typeof POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2;
  readonly model: 'position_alpha_session_v2';
  readonly skills: PositionAlphaSkillStateV2;
  readonly gameDay: PositionAlphaGameDayV2;
  readonly training: PositionAlphaTrainingV2;
  readonly academics?: PositionAlphaAcademicStateV2;
  readonly nil?: PositionAlphaNilStateV2;
  readonly seasonClock?: PositionAlphaSeasonClockV2;
  readonly seasonReview?: PositionAlphaSeasonReviewV2;
  readonly seasonStart?: PositionAlphaSeasonStartV2;
  readonly weekHistory: readonly (
    PositionAlphaSessionV1['weekHistory'][number] | PositionAlphaWeekSummaryV2
  )[];
  readonly postseasonHistory: readonly (
    PositionAlphaSessionV1['postseasonHistory'][number] | PositionAlphaWeekSummaryV2
  )[];
  readonly phase:
    | PositionAlphaSessionV1['phase']
    | { readonly type: 'GAME_DAY' | 'POSTSEASON_PLANNING'; readonly weekIndex: number }
    | { readonly type: 'POSTSEASON_REVIEW'; readonly seasonIndex: 0 | 1 };
}

function latestPositionWeek(session: PositionAlphaSessionV2) {
  return session.postseasonHistory.at(-1) ?? session.weekHistory.at(-1);
}

function currentSeasonWeekIndex(session: PositionAlphaSessionV2): number {
  const postseason = session.world.postseason;
  return postseason.type === 'ACTIVE'
    ? 12 + postseason.currentRoundIndex
    : session.phase.type === 'POSTSEASON_REVIEW'
      ? 14
      : session.weekHistory.length;
}

function postseasonFixture(world: WorldAlphaSeasonState, weekIndex: number) {
  if (world.postseason.type === 'PENDING') return undefined;
  return world.postseason.rounds[weekIndex - 12]?.fixtures.find(
    ({ homeProgramId, awayProgramId }) =>
      homeProgramId === world.playerProgramId || awayProgramId === world.playerProgramId,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasCommandMechanics(
  mechanics: PositionAlphaSessionFoundationMechanics,
): mechanics is PositionAlphaSessionCommandMechanics {
  return (
    'trainingActions' in mechanics &&
    'academics' in mechanics &&
    'nil' in mechanics &&
    'skillBuilds' in mechanics &&
    'skillOffers' in mechanics &&
    'injuries' in mechanics &&
    'commonFocuses' in mechanics &&
    'focusInjuryPolicies' in mechanics &&
    'trainingConfig' in mechanics &&
    'lifecycle' in mechanics &&
    'qb' in mechanics &&
    'rb' in mechanics &&
    'cb' in mechanics
  );
}

/** Recovery is derived from the last settled week, never advanced by a review/reload. */
function currentInjury(session: PositionAlphaSessionV2): NewInjuryEvidence | null {
  const latest = latestPositionWeek(session);
  if (latest === undefined) return session.seasonStart?.injury ?? null;
  if (latest?.model !== 'position_alpha_week_summary_v2' || latest.injury.currentInjury === null)
    return null;
  return advanceInjuryDuration(
    latest.injury.currentInjury,
    latest.injury.availability!.recoveryCreditWeeks,
  );
}

function positionWeekFixture(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
  weekIndex: number,
) {
  if (weekIndex >= POSITION_ALPHA_REGULAR_WEEK_COUNT)
    return postseasonFixture(session.world, weekIndex);
  return mechanics.world.regularSeasonRounds
    .find(({ roundNumber }) => roundNumber === weekIndex + 1)
    ?.fixtures.find(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === session.lifecycle.currentProgramId ||
        awayProgramId === session.lifecycle.currentProgramId,
    );
}

/** Bounded replay checks evidence using copies, never publishing RNG or rewards. */
function validateGameDay(
  value: Record<string, unknown>,
  mechanics: PositionAlphaSessionFoundationMechanics,
): boolean {
  const day = value['gameDay'];
  const phase = value['phase'];
  if (!isRecord(day) || !isRecord(phase)) return false;
  if (day['type'] === 'IDLE') {
    return phase['type'] !== 'GAME_DAY' && Object.keys(day).sort().join('|') === 'model|type';
  }
  if (
    !hasCommandMechanics(mechanics) ||
    phase['type'] !== 'GAME_DAY' ||
    Object.keys(phase).sort().join('|') !== 'type|weekIndex' ||
    Object.keys(day).sort().join('|') !==
      'academics|decisionIds|event|game|injury|model|nil|preparation|rngBefore|type' ||
    ![
      'PRACTICE_REVIEW',
      'ACADEMIC_REVIEW',
      'EVENT_CHOICE',
      'EVENT_RESOLVED',
      'INJURY_CHOICE',
      'INJURY_RESOLVED',
      'GAME_PREVIEW',
      'ACTIVE_SNAP',
      'RESOLVED_SNAP',
      'POST_GAME',
    ].includes(String(day['type'])) ||
    !isRecord(day['preparation']) ||
    !isRngState(day['rngBefore']) ||
    !Array.isArray(day['decisionIds']) ||
    day['decisionIds'].length > 5 ||
    day['decisionIds'].some((id: unknown) => typeof id !== 'string')
  )
    return false;
  // All unchanged aggregate fields have passed the historical validator above.
  const session = value as unknown as PositionAlphaSessionV2;
  if (session.skills.offeredSkillIds !== null || session.events.pending !== null) return false;
  const preparation = preparePositionAlphaWeekV2(
    session,
    day['preparation']['actionIds'],
    currentInjury(session),
    mechanics,
    session.phase.type === 'GAME_DAY' ? session.phase.weekIndex : -1,
  );
  if (preparation === null || !sameJson(preparation, day['preparation'])) return false;
  const fixture = gameFixture(session, mechanics);
  if (fixture === undefined) return false;
  if (day['type'] === 'PRACTICE_REVIEW') {
    return (
      day['academics'] === null &&
      day['event'] === null &&
      day['nil'] === null &&
      day['injury'] === null &&
      day['game'] === null &&
      day['decisionIds'].length === 0 &&
      sameJson(session.careerRng, day['rngBefore'])
    );
  }
  if (session.phase.type !== 'GAME_DAY') return false;
  const academics = preparePositionAlphaAcademicsV2(
    session,
    preparation.player.state.gpa,
    session.phase.weekIndex,
    mechanics.academics,
    preparation.nilObligationGpaDeltaMilli,
  );
  if (academics === null || !sameJson(academics, day['academics'])) return false;
  if (day['type'] === 'ACADEMIC_REVIEW')
    return (
      academics.checkpoint !== null &&
      day['event'] === null &&
      day['nil'] === null &&
      day['injury'] === null &&
      day['game'] === null &&
      day['decisionIds'].length === 0 &&
      sameJson(session.careerRng, day['rngBefore'])
    );
  if (!isRecord(day['event'])) return false;
  const event = replayPositionAlphaEventV2(
    {
      ...session,
      previousStats: previousPositionAlphaFootballStats(session),
      careerRng: day['rngBefore'],
    },
    preparation,
    session.phase.weekIndex,
    day['event']['selectedChoiceId'],
    mechanics,
  );
  if (event === null || !sameJson(event, day['event'])) return false;
  if (day['type'] === 'EVENT_CHOICE' || day['type'] === 'EVENT_RESOLVED')
    return (
      (day['type'] === 'EVENT_CHOICE'
        ? event.afterEvents.pending !== null
        : event.selectedChoiceId !== null && event.afterEvents.pending === null) &&
      day['injury'] === null &&
      day['game'] === null &&
      day['decisionIds'].length === 0 &&
      sameJson(session.careerRng, event.rng) &&
      day['nil'] === null
    );
  const effectivePreparation = positionAlphaPreparationAfterEvent(preparation, event);
  if (effectivePreparation === null) return false;
  const injury = day['injury'];
  if (
    !validatePositionInjuryWeek(injury, { lifecycle: mechanics.lifecycle, ...mechanics.injuries })
  )
    return false;
  const assessed = assessPositionAlphaPreparedInjury(
    { ...session, careerRng: event.rng },
    effectivePreparation,
    currentInjury(session),
    session.phase.weekIndex,
    mechanics,
    academics.maximumOpportunities,
  );
  if (assessed === null || !sameJson(assessed.source, injury.source)) return false;
  if (day['type'] === 'INJURY_CHOICE' || day['type'] === 'INJURY_RESOLVED') {
    return (
      (day['type'] === 'INJURY_CHOICE'
        ? injury.availability === null
        : injury.availability !== null) &&
      day['game'] === null &&
      day['nil'] === null &&
      day['decisionIds'].length === 0 &&
      sameJson(session.careerRng, injury.rng)
    );
  }
  const nil = preparePositionAlphaNilWeekV2(
    {
      ...session,
      previousStats: previousPositionAlphaFootballStats(session),
      careerRng: day['rngBefore'],
    },
    preparation,
    event,
    injury,
    session.phase.weekIndex,
    mechanics,
  );
  if (nil === null || !sameJson(nil, day['nil'])) return false;
  if (day['type'] === 'GAME_PREVIEW')
    return (
      injury.availability !== null &&
      day['game'] === null &&
      day['decisionIds'].length === 0 &&
      sameJson(session.careerRng, nil.rng)
    );
  const gameContext = positionAlphaGameContextAfterInjury(
    { ...session, events: event.afterEvents },
    effectivePreparation,
    injury,
  );
  if (gameContext === null) return false;
  const rulesVersion = recordedPositionAlphaRulesVersion(day['game']);
  if (
    rulesVersion === null ||
    (rulesVersion !== undefined &&
      value['schemaVersion'] !== POSITION_ALPHA_SESSION_SCHEMA_VERSION_V3)
  )
    return false;
  let expected = startPositionAlphaGame(
    { ...gameContext, careerRng: nil.rng },
    fixture,
    session.phase.weekIndex,
    positionAlphaActiveMechanicsV2(session, mechanics),
    injury.availability,
    academics.maximumOpportunities,
    rulesVersion,
  );
  for (const decisionId of day['decisionIds']) {
    if (expected === null) return false;
    expected = resolvePositionAlphaSnap(expected, decisionId);
  }
  if (
    expected === null ||
    !sameJson(expected, day['game']) ||
    !sameJson(expected.game.rng, session.careerRng)
  )
    return false;
  if (day['type'] === 'ACTIVE_SNAP') return expected.game.type === 'ACTIVE';
  if (day['type'] === 'POST_GAME') return expected.game.type === 'COMPLETE';
  return day['decisionIds'].length > 0;
}

export function validatePositionAlphaSessionV2(
  value: unknown,
  mechanics: PositionAlphaSessionFoundationMechanics,
): value is PositionAlphaSessionV2 {
  return (
    isRecord(value) &&
    value['schemaVersion'] === POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2 &&
    validatePositionAlphaAggregate(value, mechanics)
  );
}

/**
 * Shared v2/v3 aggregate validator. The two versions have one shape; only v3 may retain games
 * played under the explicitly selected current rules. Runtime values keep their own version, so
 * this is internal to the owning session modules and never a reader alias.
 */
export function validatePositionAlphaAggregate(
  value: unknown,
  mechanics: PositionAlphaSessionFoundationMechanics,
): value is PositionAlphaSessionV2 {
  if (
    !isRecord(value) ||
    !(
      (value['schemaVersion'] === POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2 &&
        value['model'] === 'position_alpha_session_v2') ||
      (value['schemaVersion'] === POSITION_ALPHA_SESSION_SCHEMA_VERSION_V3 &&
        value['model'] === 'position_alpha_session_v3')
    ) ||
    !isRecord(value['gameDay']) ||
    value['gameDay']['model'] !== 'position_alpha_game_day_v2' ||
    !isRecord(value['skills'])
  )
    return false;
  const originalMechanics = mechanics;
  const currentRules = value['schemaVersion'] === POSITION_ALPHA_SESSION_SCHEMA_VERSION_V3;
  let priorSeasonCurrentRules = false;
  let seasonBaseline: PositionAlphaSessionV2 | null = null;
  if (Object.hasOwn(value, 'seasonStart')) {
    const start = value['seasonStart'];
    if (
      !isRecord(start) ||
      start['model'] !== 'position_alpha_season_start_v2' ||
      !hasCommandMechanics(mechanics)
    )
      return false;
    const prior = unpackJsonArchiveV1(start['priorSeason']);
    if (
      !prior.ok ||
      !isRecord(prior.value) ||
      Object.hasOwn(prior.value, 'seasonStart') ||
      !validatePositionAlphaAggregate(prior.value, mechanics) ||
      // A v2 aggregate can only archive a v2 season; v3 may archive either version.
      (!currentRules && prior.value.schemaVersion !== POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2)
    )
      return false;
    priorSeasonCurrentRules = playedCurrentRules(prior.value).includes(true);
    seasonBaseline = derivePositionAlphaSeasonStartV2(
      prior.value,
      start['selectedProgramId'] as ProgramId,
      mechanics,
    );
    if (seasonBaseline === null || !sameJson(start, seasonBaseline.seasonStart)) return false;
    mechanics = positionAlphaActiveMechanicsV2(seasonBaseline, mechanics);
  }
  const skills = value['skills'];
  const equipped = skills['equippedSkillIds'];
  const owned = skills['ownedSkillIds'];
  if (
    skills['model'] !== 'position_alpha_skill_state_v2' ||
    !Array.isArray(equipped) ||
    equipped.length !== 4 ||
    !Array.isArray(owned) ||
    equipped.some(
      (id: unknown) => id !== null && (typeof id !== 'string' || !owned.includes(id)),
    ) ||
    new Set(equipped.filter((id: unknown) => id !== null)).size !==
      equipped.filter((id: unknown) => id !== null).length
  )
    return false;

  // Reuse the exact historical validator for unchanged fields. This projection is
  // validation-only and must never be passed to a gameplay command (slot four matters).
  const historicalFields = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) =>
        key !== 'gameDay' &&
        key !== 'academics' &&
        key !== 'nil' &&
        key !== 'seasonClock' &&
        key !== 'seasonStart' &&
        key !== 'seasonReview',
    ),
  );
  const phase = value['phase'];
  const directPostseason =
    isRecord(phase) &&
    (phase['type'] === 'POSTSEASON_PLANNING' ||
      phase['type'] === 'POSTSEASON_REVIEW' ||
      ((phase['type'] === 'OFFSEASON_DECISION' || phase['type'] === 'CAREER_COMPLETE') &&
        Object.hasOwn(value, 'seasonReview')) ||
      (phase['type'] === 'GAME_DAY' &&
        typeof phase['weekIndex'] === 'number' &&
        phase['weekIndex'] >= 12));
  const validBase = validatePositionAlphaSessionFields(
    {
      ...historicalFields,
      schemaVersion: 1,
      model: 'position_alpha_session_v1',
      training: isRecord(value['training'])
        ? historicalPositionTrainingFields(value['training'] as unknown as PositionAlphaTrainingV2)
        : value['training'],
      phase:
        isRecord(phase) && phase['type'] === 'GAME_DAY' && !directPostseason
          ? { type: 'WEEK_PLANNING', weekIndex: phase['weekIndex'] }
          : phase,
      skills: {
        ...skills,
        model: 'position_alpha_skill_state_v1',
        equippedSkillIds: equipped.slice(0, 3),
      },
    },
    mechanics,
    (entry, index) =>
      validatePositionAlphaWeekSummaryV1(entry, index) ||
      (hasCommandMechanics(mechanics) &&
        validatePositionAlphaWeekSummaryV2(entry, index, mechanics, undefined, currentRules)),
    directPostseason
      ? {
          validateHistoryEntry: (entry, index) => {
            if (!isRecord(value['world']) || !hasCommandMechanics(mechanics)) return false;
            const world = value['world'] as unknown as WorldAlphaSeasonState;
            const fixture = postseasonFixture(world, 12 + index);
            return (
              fixture !== undefined &&
              validatePositionAlphaWeekSummaryV2(
                entry,
                12 + index,
                mechanics,
                fixture,
                currentRules,
              )
            );
          },
          validatePhase: (currentPhase, world, lifecycle) => {
            if (currentPhase['type'] === 'CAREER_COMPLETE')
              return (
                world.postseason.type === 'COMPLETE' &&
                lifecycle.offseason === null &&
                lifecycle.activeSeasonIndex === 1 &&
                currentPhase['seasonIndex'] === 1 &&
                Object.keys(currentPhase).sort().join('|') === 'seasonIndex|type'
              );
            if (currentPhase['type'] === 'OFFSEASON_DECISION')
              return (
                world.postseason.type === 'COMPLETE' &&
                lifecycle.offseason !== null &&
                Object.keys(currentPhase).sort().join('|') === 'seasonIndex|type' &&
                currentPhase['seasonIndex'] === world.seasonIndex
              );
            if (lifecycle.offseason !== null) return false;
            if (world.postseason.type === 'ACTIVE')
              return (
                ['GAME_DAY', 'POSTSEASON_PLANNING'].includes(String(currentPhase['type'])) &&
                Object.keys(currentPhase).sort().join('|') === 'type|weekIndex' &&
                currentPhase['weekIndex'] === 12 + world.postseason.currentRoundIndex
              );
            return (
              world.postseason.type === 'COMPLETE' &&
              currentPhase['type'] === 'POSTSEASON_REVIEW' &&
              Object.keys(currentPhase).sort().join('|') === 'seasonIndex|type' &&
              currentPhase['seasonIndex'] === world.seasonIndex
            );
          },
        }
      : undefined,
  );
  if (!validBase) return false;
  try {
    const session = value as unknown as PositionAlphaSessionV2;
    if (
      session.phase.type === 'CAREER_COMPLETE' &&
      session.lifecycle.activeSeasonIndex === 1 &&
      !Object.hasOwn(session, 'seasonReview')
    )
      return false;
    if (Object.hasOwn(session, 'seasonReview')) {
      const review = session.seasonReview;
      const completion = session.phase.type === 'CAREER_COMPLETE';
      const steps = completion ? 2 : 1;
      if (
        (session.phase.type !== 'OFFSEASON_DECISION' && session.phase.type !== 'CAREER_COMPLETE') ||
        !isRecord(review) ||
        Object.keys(review).sort().join('|') !== 'careerRngBefore|model|worldOffseason' ||
        review.model !== 'position_alpha_season_review_v2' ||
        !isRngState(review.careerRngBefore) ||
        !hasCommandMechanics(mechanics) ||
        session.revision < steps ||
        session.lifecycle.revision < steps
      )
        return false;
      const fields = Object.fromEntries(
        Object.entries(session).filter(([key]) => key !== 'seasonReview'),
      ) as Omit<PositionAlphaSessionV2, 'seasonReview'>;
      const before: PositionAlphaSessionV2 = {
        ...fields,
        revision: session.revision - steps,
        meta: null,
        careerRng: review.careerRngBefore,
        lifecycle: {
          ...session.lifecycle,
          revision: session.lifecycle.revision - steps,
          completedSeasons: session.lifecycle.completedSeasons.slice(0, -1),
          offseason: null,
        },
        worldHistory: {
          ...session.worldHistory,
          detailedSeasons: session.worldHistory.detailedSeasons.filter(
            ({ seasonIndex }) => seasonIndex !== session.world.seasonIndex,
          ),
          summarizedSeasons: session.worldHistory.summarizedSeasons.filter(
            ({ seasonIndex }) => seasonIndex !== session.world.seasonIndex,
          ),
        },
        phase: { type: 'POSTSEASON_REVIEW', seasonIndex: session.phase.seasonIndex },
      };
      if (!validatePositionAlphaAggregate(before, originalMechanics)) return false;
      const derived = derivePositionAlphaSeasonReviewV2(before, mechanics);
      if (derived === null) return false;
      const reviewed: PositionAlphaSessionV2 = {
        ...before,
        ...derived,
        revision: before.revision + 1,
        phase: { type: 'OFFSEASON_DECISION', seasonIndex: session.phase.seasonIndex },
      };
      return sameJson(
        session,
        completion ? derivePositionAlphaCareerCompletionV2(reviewed) : reviewed,
      );
    }
    if (directPostseason && session.world.postseason.type !== 'PENDING') {
      const playerResults = session.world.postseason.rounds
        .flatMap(({ results }) => results)
        .filter((result) => result?.result.model === 'player_game_alpha_v1');
      if (playerResults.length !== session.postseasonHistory.length) return false;
    }
    const clock = positionAlphaSourceClockV2(session);
    // Offset 14 is authorized only by the replayed saved current commitment.
    if (
      (clock === null && session.phase.type !== 'CAREER_COMPLETE') ||
      !sameJson(
        clock,
        seasonBaseline?.seasonClock ??
          projectHistoricalPositionAlphaSeasonClockV2(session.lifecycle.activeSeasonIndex),
      ) ||
      (Object.hasOwn(session, 'seasonClock') &&
        seasonBaseline === null &&
        session.gameDay.type === 'IDLE' &&
        ![...session.weekHistory, ...session.postseasonHistory].some(
          (entry) => entry.model === 'position_alpha_week_summary_v2',
        ))
    )
      return false;
    const currentCareerWeekIndex = positionAlphaSourceCareerWeekIndexV2(
      session,
      currentSeasonWeekIndex(session),
    );
    if (
      Object.hasOwn(session.training, 'sharedProficiencyUses') &&
      (!hasCommandMechanics(mechanics) ||
        !isPositionFocusStateV2(positionFocusStateFromSource(session), mechanics.trainingConfig))
    )
      return false;
    let previousDrawCount = 0;
    let previousInjury: NewInjuryEvidence | null = seasonBaseline?.seasonStart?.injury ?? null;
    let currentHistoryStarted = false;
    let previousSharedUses =
      seasonBaseline?.training.sharedProficiencyUses ?? createCommonPositionProficiencyUses();
    let previousAcademics: PositionAlphaAcademicStateV2 | undefined = seasonBaseline?.academics;
    let previousNil: PositionAlphaNilStateV2 | undefined = seasonBaseline?.nil;
    let previousCurrentWeek: PositionAlphaWeekSummaryV2 | null = null;
    let previousStats: PositionAlphaWeekSummaryV2['stats'] | null = null;
    let previousEvents: PositionAlphaSessionV1['events'] | null = seasonBaseline?.events ?? null;
    let previousRelationships: PositionAlphaWeekSummaryV2['relationships']['tracksAfter'] | null =
      seasonBaseline?.lifecycle.relationships ?? null;
    if (seasonBaseline !== null) {
      if (
        session.revision < seasonBaseline.revision ||
        !sameJson(session.recruiting, seasonBaseline.recruiting) ||
        !sameJson(session.worldHistory, seasonBaseline.worldHistory) ||
        !sameJson(session.lifecycle.completedSeasons, seasonBaseline.lifecycle.completedSeasons) ||
        !sameJson(session.lifecycle.programHistory, seasonBaseline.lifecycle.programHistory) ||
        session.lifecycle.currentProgramId !== seasonBaseline.lifecycle.currentProgramId ||
        session.lifecycle.activeSeasonIndex !== 1 ||
        !sameJson(
          session.skills.breakthroughHistory.slice(
            0,
            seasonBaseline.skills.breakthroughHistory.length,
          ),
          seasonBaseline.skills.breakthroughHistory,
        )
      )
        return false;
      if (session.weekHistory.length === 0) {
        for (const key of [
          'player',
          'room',
          'training',
          'lifecycle',
          'world',
          'events',
          'meta',
        ] as const)
          if (!sameJson(session[key], seasonBaseline[key])) return false;
        if (
          !sameJson(
            { ...session.skills, equippedSkillIds: seasonBaseline.skills.equippedSkillIds },
            seasonBaseline.skills,
          ) ||
          !sameJson(
            session.gameDay.type === 'IDLE' ? session.careerRng : session.gameDay.rngBefore,
            seasonBaseline.careerRng,
          )
        )
          return false;
      }
    }
    for (const entry of [...session.weekHistory, ...session.postseasonHistory]) {
      if (entry.model !== 'position_alpha_week_summary_v2') {
        if (currentHistoryStarted || seasonBaseline !== null) return false;
        if ('relationships' in entry) previousRelationships = entry.relationships.tracksAfter;
        previousStats = entry.stats;
        continue;
      }
      currentHistoryStarted = true;
      if (
        !sameJson(
          entry.source.training.sharedProficiencyUses ?? createCommonPositionProficiencyUses(),
          previousSharedUses,
        )
      )
        return false;
      previousSharedUses = entry.sharedProficiencyUsesAfter;
      if (!sameJson(entry.injury.source.currentInjury, previousInjury)) return false;
      previousInjury =
        entry.injury.currentInjury === null
          ? null
          : advanceInjuryDuration(
              entry.injury.currentInjury,
              entry.injury.availability!.recoveryCreditWeeks,
            );
      const source = entry.source;
      const sourceCareerWeekIndex = positionAlphaSourceCareerWeekIndexV2(source, entry.weekIndex);
      if (sourceCareerWeekIndex === null || !sameJson(source.seasonClock, session.seasonClock))
        return false;
      if (previousCurrentWeek === null) {
        if (seasonBaseline !== null) {
          const expectedSource = createPositionAlphaWeekSourceV2({
            ...seasonBaseline,
            previousStats: previousPositionAlphaFootballStats(seasonBaseline),
            skills: { ...seasonBaseline.skills, equippedSkillIds: source.skills.equippedSkillIds },
            ...(source.nil === undefined ? {} : { nil: source.nil }),
          });
          if (!sameJson(source, expectedSource)) return false;
        }
        if (
          !sameJson(
            source.skills.ownedSkillIds,
            session.skills.ownedSkillIds.slice(0, source.skills.ownedSkillIds.length),
          ) ||
          source.skills.ownedSkillIds.some(
            (id, index) =>
              session.skills.breakthroughHistory[index]?.skillId !== id ||
              session.skills.breakthroughHistory[index]!.weekIndex > sourceCareerWeekIndex,
          )
        )
          return false;
      } else if (
        !skillsFollowCurrentWeek(
          previousCurrentWeek,
          { ...source.skills, offeredSkillIds: null },
          session.skills.breakthroughHistory,
        ) ||
        !sameJson(source.careerRng, previousCurrentWeek.breakthrough.rng)
      )
        return false;
      previousCurrentWeek = entry;
      if (!ownsNilPlanningLoadouts(source.nil, session.skills, sourceCareerWeekIndex)) return false;
      if (
        previousNil === undefined
          ? Object.hasOwn(source, 'nil')
          : source.nil === undefined ||
            source.nil.activatedAtCareerWeekIndex !== previousNil.activatedAtCareerWeekIndex ||
            !sameJson(source.nil.weekStart, previousNil.state)
      )
        return false;
      previousNil = entry.nil.after;
      if (
        !sameJson(
          source.previousStats,
          previousStats ?? previousPositionAlphaFootballStats({ ...source, weekHistory: [] }),
        )
      )
        return false;
      previousStats = entry.stats;
      if (previousEvents !== null && !sameJson(source.events, previousEvents)) return false;
      previousEvents = {
        ...entry.event.afterEvents,
        nextGameModifiers: { clueBonus: 0, decisionScoreFlat: 0, exposureReductionPermille: 0 },
      };
      if (!sameJson(source.academics, previousAcademics)) return false;
      previousAcademics = entry.academics.afterGame;
      if (
        previousRelationships !== null &&
        !sameJson(source.lifecycle.relationships, previousRelationships)
      )
        return false;
      previousRelationships = entry.relationships.tracksAfter;
      const result =
        entry.weekIndex >= 12 && session.world.postseason.type !== 'PENDING'
          ? session.world.postseason.rounds[entry.weekIndex - 12]?.results.find(
              (candidate) => candidate?.result.model === 'player_game_alpha_v1',
            )?.result
          : session.world.regularSeasonResults[entry.weekIndex]?.fixtureResults.find(
              (candidate) => candidate?.model === 'player_game_alpha_v1',
            );
      if (
        source.player.id !== session.player.id ||
        source.player.positionId !== session.player.positionId ||
        source.lifecycle.currentProgramId !== session.world.playerProgramId ||
        source.lifecycle.activeSeasonIndex !== session.world.seasonIndex ||
        source.skills.equippedSkillIds.some(
          (id) => id !== null && !session.skills.ownedSkillIds.includes(id),
        ) ||
        source.careerRng.drawCount < previousDrawCount ||
        entry.completedGame.game.rng.drawCount > session.careerRng.drawCount ||
        result?.homeScore !== (entry.isHome ? entry.playerTeamScore : entry.opponentScore) ||
        result.awayScore !== (entry.isHome ? entry.opponentScore : entry.playerTeamScore)
      )
        return false;
      previousDrawCount = entry.completedGame.game.rng.drawCount;
    }
    if (
      currentHistoryStarted || seasonBaseline?.training.sharedProficiencyUses !== undefined
        ? !sameJson(session.training.sharedProficiencyUses, previousSharedUses)
        : Object.hasOwn(session.training, 'sharedProficiencyUses')
    )
      return false;
    if (currentHistoryStarted && !sameJson(session.lifecycle.relationships, previousRelationships))
      return false;
    if (currentHistoryStarted && !sameJson(session.events, previousEvents)) return false;
    if (
      previousCurrentWeek !== null &&
      (!skillsFollowCurrentWeek(
        previousCurrentWeek,
        session.skills,
        session.skills.breakthroughHistory,
      ) ||
        !sameJson(
          previousCurrentWeek.breakthrough.rng,
          session.gameDay.type === 'IDLE' ? session.careerRng : session.gameDay.rngBefore,
        ) ||
        (session.gameDay.type !== 'IDLE' && session.skills.offeredSkillIds !== null))
    )
      return false;
    if (currentHistoryStarted || seasonBaseline?.nil !== undefined) {
      if (currentCareerWeekIndex === null) return false;
      if (
        !ownsNilPlanningLoadouts(session.nil, session.skills, currentCareerWeekIndex) ||
        session.nil === undefined ||
        previousNil === undefined ||
        session.nil.activatedAtCareerWeekIndex !== previousNil.activatedAtCareerWeekIndex ||
        !sameJson(session.nil.weekStart, previousNil.state) ||
        !hasCommandMechanics(mechanics) ||
        replayPositionAlphaNilPlanningV2(session, currentCareerWeekIndex, mechanics.nil) === null
      )
        return false;
    } else if (Object.hasOwn(session, 'nil')) return false;
    if (
      currentHistoryStarted || seasonBaseline !== null
        ? !sameJson(session.academics, previousAcademics)
        : Object.hasOwn(session, 'academics')
    )
      return false;
    if (!validateGameDay(value, mechanics)) return false;
    // Current rules are selected only for new games: once used, no later game may revert.
    const played = [priorSeasonCurrentRules, ...playedCurrentRules(session)];
    return played.every((current, index) => current || !played.slice(0, index).includes(true));
  } catch {
    return false;
  }
}

/** Chronological rules evidence for completed and in-flight games (historical summaries: false). */
function playedCurrentRules(session: PositionAlphaSessionV2): boolean[] {
  const inFlight =
    session.gameDay.type !== 'IDLE' && session.gameDay.game !== null ? [session.gameDay.game] : [];
  return [
    ...[...session.weekHistory, ...session.postseasonHistory].map((entry) =>
      entry.model === 'position_alpha_week_summary_v2' ? entry.completedGame : null,
    ),
    ...inFlight,
  ].map((game) => game !== null && recordedPositionAlphaRulesVersion(game) !== undefined);
}

export type PositionAlphaCommandResultV2 =
  | { readonly ok: true; readonly session: PositionAlphaSessionV2 }
  | { readonly ok: false; readonly reason: 'position_alpha_session.invalid_command' };

const invalidCommand = (): PositionAlphaCommandResultV2 =>
  deepFreeze({ ok: false as const, reason: 'position_alpha_session.invalid_command' as const });

function publish(
  session: PositionAlphaSessionV2,
  gameDay: PositionAlphaGameDayInFlightV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    session.phase.type !== 'WEEK_PLANNING' &&
    session.phase.type !== 'POSTSEASON_PLANNING' &&
    session.phase.type !== 'GAME_DAY'
  )
    return invalidCommand();
  // Historical engines may express a zero Body cost as -0. Current publication
  // uses JSON-stable zero without changing their historical return contracts.
  const played = gameDay.game;
  if (played?.game.type === 'COMPLETE' && Object.is(played.game.growth.requestedBodyDelta, -0)) {
    gameDay = {
      ...gameDay,
      game: {
        ...played,
        game: {
          ...played.game,
          growth: { ...played.game.growth, requestedBodyDelta: 0 },
        },
      } as PositionAlphaGameState,
    };
  }
  // Private to commands that already validated the full input. Only these four
  // fields change; replay their new Game Day evidence without replaying unchanged
  // historical weeks again. Public readers still validate the entire aggregate.
  const next: PositionAlphaSessionV2 = {
    ...session,
    revision: session.revision + 1,
    careerRng:
      gameDay.game?.game.rng ??
      gameDay.nil?.rng ??
      gameDay.injury?.rng ??
      gameDay.event?.rng ??
      session.careerRng,
    phase: { type: 'GAME_DAY', weekIndex: session.phase.weekIndex },
    gameDay,
  };
  return Number.isSafeInteger(next.revision) &&
    validateGameDay(next as unknown as Record<string, unknown>, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** Shared zero-draw planning normalization; never publishes a revision or caller mutation. */
function preparePositionAlphaPlanningSourceV2(
  input: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaSessionV2 | null {
  let session = input;
  if (
    (session?.phase?.type !== 'WEEK_PLANNING' && session?.phase?.type !== 'POSTSEASON_PLANNING') ||
    session.gameDay?.type !== 'IDLE' ||
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null
  )
    return null;
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(
    session,
    currentSeasonWeekIndex(session),
  );
  if (careerWeekIndex === null) return null;
  if (
    session.nil?.state.pendingOffers.some(
      ({ expiresAfterWeekIndex }) => careerWeekIndex > expiresAfterWeekIndex,
    )
  ) {
    const nil = appendPositionAlphaNilActionV2(
      session,
      { type: 'EXPIRE' },
      careerWeekIndex,
      mechanics.nil,
    );
    if (nil === null) return null;
    session = { ...session, nil };
    if (!validatePositionAlphaAggregate(session, mechanics)) return null;
  }
  if (
    !Object.hasOwn(session, 'seasonClock') &&
    ![...session.weekHistory, ...session.postseasonHistory].some(
      (entry) => entry.model === 'position_alpha_week_summary_v2',
    )
  ) {
    const seasonClock = positionAlphaSourceClockV2(session);
    if (seasonClock === null) return null;
    session = { ...session, seasonClock };
  }
  if (session.phase.type !== 'WEEK_PLANNING' && session.phase.type !== 'POSTSEASON_PLANNING')
    return null;
  if (
    session.phase.type === 'POSTSEASON_PLANNING' &&
    postseasonFixture(session.world, session.phase.weekIndex) === undefined
  )
    return null;
  return session;
}

export interface PositionAlphaPlanningProjectionV2 {
  readonly actions: readonly {
    readonly actionId: string;
    readonly available: boolean;
    readonly proficiency: null | {
      readonly proficiencyId: string;
      readonly uses: number;
      readonly level: number;
      readonly xpMultiplierPermille: number;
      readonly nextThreshold: number | null;
      readonly usesToNextLevel: number | null;
      readonly nextXpMultiplierPermille: number | null;
    };
  }[];
  readonly currentInjury: NewInjuryEvidence | null;
  readonly preparation: PositionAlphaPreparationV2 | null;
}

/** Exact chosen-plan consequences and current availability; no gameplay RNG or persistence. */
export function projectPositionAlphaPlanningV2(
  input: PositionAlphaSessionV2,
  actionIds: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaPlanningProjectionV2 | null {
  const session = preparePositionAlphaPlanningSourceV2(input, mechanics);
  if (
    session === null ||
    (session.phase.type !== 'WEEK_PLANNING' && session.phase.type !== 'POSTSEASON_PLANNING')
  )
    return null;
  const injury = currentInjury(session);
  const counts: Readonly<Record<string, number | undefined>> = {
    ...createCommonPositionProficiencyUses(),
    ...session.training.sharedProficiencyUses,
    ...session.training.proficiencyUses,
  };
  const actions = [
    ...mechanics.trainingActions.filter(
      ({ positionId }) => positionId === session.player.positionId,
    ),
    ...mechanics.commonFocuses,
  ].map((action) => {
    const uses = action.proficiencyId === null ? 0 : (counts[action.proficiencyId] ?? 0);
    const level = deriveTrainingProficiencyLevel(uses, mechanics.trainingConfig);
    const nextThreshold = mechanics.trainingConfig.proficiencyUseThresholds[level + 1] ?? null;
    return {
      actionId: action.id,
      available: isPositionFocusAvailable(
        action.id as PositionFocusId,
        injury,
        mechanics.focusInjuryPolicies,
      ),
      proficiency:
        action.proficiencyId === null
          ? null
          : {
              proficiencyId: action.proficiencyId,
              uses,
              level,
              xpMultiplierPermille: getTrainingProficiencyXpMultiplierPermille(
                level,
                mechanics.trainingConfig,
              ),
              nextThreshold,
              usesToNextLevel: nextThreshold === null ? null : nextThreshold - uses,
              nextXpMultiplierPermille:
                nextThreshold === null
                  ? null
                  : getTrainingProficiencyXpMultiplierPermille(
                      deriveTrainingProficiencyLevel(nextThreshold, mechanics.trainingConfig),
                      mechanics.trainingConfig,
                    ),
            },
    };
  });
  return deepFreeze(
    cloneSerializable({
      actions,
      currentInjury: injury,
      preparation: preparePositionAlphaWeekV2(
        session,
        actionIds,
        injury,
        mechanics,
        session.phase.weekIndex,
      ),
    }),
  );
}

export function commitPositionAlphaFocusPlanV2(
  input: PositionAlphaSessionV2,
  actionIds: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  const session = preparePositionAlphaPlanningSourceV2(input, mechanics);
  if (
    session === null ||
    (session.phase.type !== 'WEEK_PLANNING' && session.phase.type !== 'POSTSEASON_PLANNING')
  )
    return invalidCommand();
  const preparation = preparePositionAlphaWeekV2(
    session,
    actionIds,
    currentInjury(session),
    mechanics,
    session.phase.weekIndex,
  );
  if (preparation === null) return invalidCommand();
  return publish(
    session,
    {
      model: 'position_alpha_game_day_v2',
      type: 'PRACTICE_REVIEW',
      preparation,
      rngBefore: session.careerRng,
      decisionIds: [],
      game: null,
      injury: null,
      academics: null,
      event: null,
      nil: null,
    },
    mechanics,
  );
}

/** Resolve an already-saved pre-migration event with the shared four-slot rules. */
export function resolvePositionAlphaEventV2(
  session: PositionAlphaSessionV2,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (session?.gameDay?.type === 'EVENT_CHOICE') {
    if (!validatePositionAlphaAggregate(session, mechanics) || session.gameDay.event === null)
      return invalidCommand();
    const event = choosePositionAlphaWeeklyEventV2(
      { ...session, previousStats: previousPositionAlphaFootballStats(session) },
      session.gameDay.preparation,
      session.gameDay.event,
      choiceId,
      mechanics,
    );
    return event === null
      ? invalidCommand()
      : publish(session, { ...session.gameDay, event, type: 'EVENT_RESOLVED' }, mechanics);
  }
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.gameDay.type !== 'IDLE' ||
    session.events.pending === null
  )
    return invalidCommand();
  const effects = resolvePositionAlphaEventEffects(session, choiceId, mechanics);
  if (effects === null) return invalidCommand();
  const next: PositionAlphaSessionV2 = {
    ...cloneSerializable(session),
    ...effects,
    revision: session.revision + 1,
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** Resolve a saved three-card offer without RNG; fill only the first open slot. */
export function choosePositionAlphaSkillV2(
  session: PositionAlphaSessionV2,
  skillId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.gameDay.type !== 'IDLE' ||
    !['WEEK_PLANNING', 'SEASON_REVIEW', 'POSTSEASON_PLANNING', 'POSTSEASON_REVIEW'].includes(
      session.phase.type,
    ) ||
    typeof skillId !== 'string' ||
    session.skills.offeredSkillIds === null ||
    !session.skills.offeredSkillIds.includes(skillId as SkillId)
  )
    return invalidCommand();
  const selected = skillId as SkillId;
  const acquisitionWeekIndex = positionAlphaSourceCareerWeekIndexV2(
    session,
    latestPositionWeek(session)?.model === 'position_alpha_week_summary_v2'
      ? (latestPositionWeek(session) as PositionAlphaWeekSummaryV2).weekIndex
      : session.weekHistory.length - 1,
  );
  if (acquisitionWeekIndex === null) return invalidCommand();
  const equipped: [SkillId | null, SkillId | null, SkillId | null, SkillId | null] = [
    ...session.skills.equippedSkillIds,
  ];
  const firstOpenSlot = equipped.findIndex((id) => id === null);
  if (firstOpenSlot >= 0) equipped[firstOpenSlot] = selected;
  const next: PositionAlphaSessionV2 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    skills: {
      ...cloneSerializable(session.skills),
      breakthroughGauge:
        latestPositionWeek(session)?.model === 'position_alpha_week_summary_v2'
          ? session.skills.breakthroughGauge
          : Math.max(0, session.skills.breakthroughGauge - 100),
      ownedSkillIds: [...session.skills.ownedSkillIds, selected],
      equippedSkillIds: equipped,
      offeredSkillIds: null,
      breakthroughHistory: [
        ...session.skills.breakthroughHistory,
        {
          weekIndex: acquisitionWeekIndex,
          skillId: selected,
        },
      ],
    },
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: next })
    : invalidCommand();
}

/** Explicit planning-only set/move/clear across all four slots. Ownership never changes. */
export function equipPositionAlphaSkillV2(
  session: PositionAlphaSessionV2,
  skillId: unknown,
  slotIndex: unknown,
  mechanics: PositionAlphaSessionFoundationMechanics,
): PositionAlphaCommandResultV2 {
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    (session.phase.type !== 'WEEK_PLANNING' && session.phase.type !== 'POSTSEASON_PLANNING') ||
    session.gameDay.type !== 'IDLE' ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null ||
    (skillId !== null &&
      (typeof skillId !== 'string' ||
        !session.skills.ownedSkillIds.includes(skillId as SkillId))) ||
    typeof slotIndex !== 'number' ||
    !Number.isSafeInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex > 3
  )
    return invalidCommand();
  const equipped = session.skills.equippedSkillIds.map((entry) =>
    entry === skillId ? null : entry,
  ) as [SkillId | null, SkillId | null, SkillId | null, SkillId | null];
  equipped[slotIndex] = skillId as SkillId | null;
  const next: PositionAlphaSessionV2 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    skills: { ...cloneSerializable(session.skills), equippedSkillIds: equipped },
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: next })
    : invalidCommand();
}

/** Shared kickoff initialization; caller validates the aggregate before entering this path. */
function prepareCurrentGameStartV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
  /** Kickoff selects current rules for a v3 aggregate; public previews read rule-independent facts. */
  selectRules: boolean,
) {
  const day = session.gameDay;
  if (session.phase.type !== 'GAME_DAY' || day.type !== 'GAME_PREVIEW') return null;
  const fixture = gameFixture(session, mechanics);
  if (
    fixture === undefined ||
    day.injury === null ||
    day.academics === null ||
    day.event === null ||
    day.nil === null
  )
    return null;
  const preparation = positionAlphaPreparationAfterEvent(day.preparation, day.event);
  if (preparation === null) return null;
  const context = positionAlphaGameContextAfterInjury(
    { ...session, events: day.event.afterEvents },
    preparation,
    day.injury,
  );
  if (context === null) return null;
  const game = startPositionAlphaGame(
    { ...context, careerRng: day.nil.rng },
    fixture,
    session.phase.weekIndex,
    positionAlphaActiveMechanicsV2(session, mechanics),
    day.injury.availability,
    day.academics.maximumOpportunities,
    selectRules && (session.schemaVersion as number) === POSITION_ALPHA_SESSION_SCHEMA_VERSION_V3
      ? TACTICAL_GAME_RULES_VERSION
      : undefined,
  );
  return game === null ? null : { game, context };
}

export interface PositionAlphaGamePreviewV2 {
  readonly playerProgramId: ProgramId;
  readonly opponentProgramId: ProgramId;
  readonly isHome: boolean;
  readonly opportunityCount: number;
  readonly playerState: PlayerState;
  readonly rank: number;
  readonly roleId: DepthRoleId;
}

/** Public pregame evidence only; no hidden patterns, rolls, clues, probabilities or scores. */
export function projectPositionAlphaGamePreviewV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaGamePreviewV2 | null {
  if (
    session?.gameDay?.type !== 'GAME_PREVIEW' ||
    !validatePositionAlphaAggregate(session, mechanics)
  )
    return null;
  const started = prepareCurrentGameStartV2(session, mechanics, false);
  if (started === null || !sameJson(started.game.game.rng, session.careerRng)) return null;
  const game = started.game.game;
  const evidence = game.type === 'ACTIVE' ? game.input : game.summary;
  return deepFreeze(
    cloneSerializable({
      playerProgramId: evidence.playerProgramId,
      opponentProgramId: evidence.opponentProgramId,
      isHome: evidence.isHome,
      opportunityCount: evidence.opportunityCount,
      playerState: started.context.player.state,
      rank: started.context.room.projection.rank,
      roleId: started.context.room.projection.roleId,
    }),
  );
}

/** Current direct boundaries over the same position-owned football engines. */
export function advancePositionAlphaGameDayV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  // Wrong-phase commands cannot publish state; reject before replaying the career history.
  if (
    ![
      'PRACTICE_REVIEW',
      'ACADEMIC_REVIEW',
      'EVENT_RESOLVED',
      'INJURY_RESOLVED',
      'GAME_PREVIEW',
      'RESOLVED_SNAP',
    ].includes(session?.gameDay?.type)
  )
    return invalidCommand();
  if (!validatePositionAlphaAggregate(session, mechanics) || session.phase.type !== 'GAME_DAY')
    return invalidCommand();
  const day = session.gameDay;
  if (
    day.type === 'PRACTICE_REVIEW' ||
    day.type === 'ACADEMIC_REVIEW' ||
    day.type === 'EVENT_RESOLVED'
  ) {
    const academics =
      day.type === 'PRACTICE_REVIEW'
        ? preparePositionAlphaAcademicsV2(
            session,
            day.preparation.player.state.gpa,
            session.phase.weekIndex,
            mechanics.academics,
            day.preparation.nilObligationGpaDeltaMilli,
          )
        : day.academics;
    if (academics === null) return invalidCommand();
    if (day.type === 'PRACTICE_REVIEW' && academics.checkpoint !== null)
      return publish(session, { ...day, academics, type: 'ACADEMIC_REVIEW' }, mechanics);
    const event =
      day.event ??
      attemptPositionAlphaEventV2(
        {
          ...session,
          previousStats: previousPositionAlphaFootballStats(session),
          careerRng: day.rngBefore,
        },
        day.preparation,
        session.phase.weekIndex,
        mechanics,
      );
    if (event === null) return invalidCommand();
    if (event.afterEvents.pending !== null)
      return publish(session, { ...day, academics, event, type: 'EVENT_CHOICE' }, mechanics);
    const effectivePreparation = positionAlphaPreparationAfterEvent(day.preparation, event);
    if (effectivePreparation === null) return invalidCommand();
    const injury = assessPositionAlphaPreparedInjury(
      { ...session, careerRng: event.rng },
      effectivePreparation,
      currentInjury(session),
      session.phase.weekIndex,
      mechanics,
      academics.maximumOpportunities,
    );
    if (injury === null) return invalidCommand();
    const nil =
      injury.availability === null
        ? null
        : preparePositionAlphaNilWeekV2(
            {
              ...session,
              previousStats: previousPositionAlphaFootballStats(session),
              careerRng: day.rngBefore,
            },
            day.preparation,
            event,
            injury,
            session.phase.weekIndex,
            mechanics,
          );
    if (injury.availability !== null && nil === null) return invalidCommand();
    return publish(
      session,
      {
        ...day,
        injury,
        academics,
        event,
        nil,
        type: injury.availability === null ? 'INJURY_CHOICE' : 'GAME_PREVIEW',
      },
      mechanics,
    );
  }
  if (day.type === 'INJURY_RESOLVED' && day.injury !== null && day.event !== null) {
    const nil = preparePositionAlphaNilWeekV2(
      {
        ...session,
        previousStats: previousPositionAlphaFootballStats(session),
        careerRng: day.rngBefore,
      },
      day.preparation,
      day.event,
      day.injury,
      session.phase.weekIndex,
      mechanics,
    );
    return nil === null
      ? invalidCommand()
      : publish(session, { ...day, nil, type: 'GAME_PREVIEW' }, mechanics);
  }
  if (day.type === 'GAME_PREVIEW') {
    const game = prepareCurrentGameStartV2(session, mechanics, true)?.game ?? null;
    return game === null
      ? invalidCommand()
      : publish(
          session,
          { ...day, game, type: game.game.type === 'ACTIVE' ? 'ACTIVE_SNAP' : 'POST_GAME' },
          mechanics,
        );
  }
  if (day.type === 'RESOLVED_SNAP' && day.game !== null) {
    return publish(
      session,
      { ...day, type: day.game.game.type === 'ACTIVE' ? 'ACTIVE_SNAP' : 'POST_GAME' },
      mechanics,
    );
  }
  return invalidCommand();
}

export function resolvePositionAlphaInjuryChoiceV2(
  session: PositionAlphaSessionV2,
  choiceId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (session?.gameDay?.type !== 'INJURY_CHOICE') return invalidCommand();
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.gameDay.type !== 'INJURY_CHOICE' ||
    session.gameDay.injury === null ||
    !isInjuryChoiceId(choiceId)
  )
    return invalidCommand();
  const injury = resolvePositionInjuryWeekChoice(session.gameDay.injury, choiceId, {
    lifecycle: mechanics.lifecycle,
    ...mechanics.injuries,
  });
  return injury === null
    ? invalidCommand()
    : publish(session, { ...session.gameDay, injury, type: 'INJURY_RESOLVED' }, mechanics);
}

export interface PositionAlphaNilChoicesV2 {
  readonly careerWeekIndex: number;
  readonly current: PositionAlphaNilPlanningProjectionV2;
  readonly choices: readonly {
    readonly action: PositionAlphaNilActionV2;
    readonly after: PositionAlphaNilPlanningProjectionV2;
  }[];
}

/** Preview only commands the owning boundary accepts; never publish revisions or draw RNG. */
export function projectPositionAlphaNilChoicesV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaNilChoicesV2 | null {
  if (
    (session?.phase?.type !== 'WEEK_PLANNING' && session?.phase?.type !== 'POSTSEASON_PLANNING') ||
    session.gameDay?.type !== 'IDLE' ||
    !validatePositionAlphaAggregate(session, mechanics)
  )
    return null;
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(session, session.phase.weekIndex);
  if (careerWeekIndex === null) return null;
  const current = replayPositionAlphaNilPlanningV2(session, careerWeekIndex, mechanics.nil);
  if (current === null) return null;
  const candidates: PositionAlphaNilActionV2[] = [
    ...current.state.pendingOffers.flatMap(({ offerId }): PositionAlphaNilActionV2[] => [
      { type: 'ACCEPT', offerId },
      { type: 'DECLINE', offerId },
    ]),
    { type: 'FULFILL' },
    { type: 'DEFAULT' },
    { type: 'EXPIRE' },
  ];
  const choices: PositionAlphaNilChoicesV2['choices'][number][] = [];
  for (const action of candidates) {
    const result = resolvePositionAlphaNilPlanningV2(session, action, mechanics);
    if (!result.ok) continue;
    const after = replayPositionAlphaNilPlanningV2(result.session, careerWeekIndex, mechanics.nil);
    if (after === null) return null;
    choices.push({ action, after });
  }
  return deepFreeze(cloneSerializable({ careerWeekIndex, current, choices }));
}

/** NIL planning effects stay projected until the ordinary once-only weekly settlement. */
export function resolvePositionAlphaNilPlanningV2(
  session: PositionAlphaSessionV2,
  action: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    (session?.phase?.type !== 'WEEK_PLANNING' && session?.phase?.type !== 'POSTSEASON_PLANNING') ||
    session.gameDay?.type !== 'IDLE' ||
    !validatePositionAlphaAggregate(session, mechanics)
  )
    return invalidCommand();
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(session, session.phase.weekIndex);
  if (careerWeekIndex === null) return invalidCommand();
  const nil = appendPositionAlphaNilActionV2(session, action, careerWeekIndex, mechanics.nil);
  if (nil === null) return invalidCommand();
  const next: PositionAlphaSessionV2 = { ...session, revision: session.revision + 1, nil };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

export function resolvePositionAlphaGameDaySnapV2(
  session: PositionAlphaSessionV2,
  decisionId: unknown,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (session?.gameDay?.type !== 'ACTIVE_SNAP') return invalidCommand();
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.gameDay.type !== 'ACTIVE_SNAP' ||
    session.gameDay.game === null ||
    typeof decisionId !== 'string'
  )
    return invalidCommand();
  const game = resolvePositionAlphaSnap(session.gameDay.game, decisionId);
  return game === null
    ? invalidCommand()
    : publish(
        session,
        {
          ...session.gameDay,
          type: 'RESOLVED_SNAP',
          decisionIds: [...session.gameDay.decisionIds, decisionId],
          game,
        },
        mechanics,
      );
}

function gameFixture(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
) {
  return session.phase.type === 'GAME_DAY'
    ? positionWeekFixture(session, mechanics, session.phase.weekIndex)
    : undefined;
}

export interface PositionAlphaWeekContextV2 {
  readonly seasonIndex: 0 | 1;
  readonly weekIndex: number;
  readonly fixture: {
    readonly id: string;
    readonly homeProgramId: ProgramId;
    readonly awayProgramId: ProgramId;
  } | null;
}

/** Cheap evidence selection over an already validated session, not save validation or a game preview. */
export function selectPositionAlphaWeekContextV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaWeekContextV2 | null {
  if (
    session.phase.type !== 'WEEK_PLANNING' &&
    session.phase.type !== 'GAME_DAY' &&
    session.phase.type !== 'POSTSEASON_PLANNING'
  )
    return null;
  const { weekIndex } = session.phase;
  const seasonIndex = session.lifecycle.activeSeasonIndex;
  if (
    (seasonIndex !== 0 && seasonIndex !== 1) ||
    !Number.isInteger(weekIndex) ||
    weekIndex < 0 ||
    weekIndex >= POSITION_ALPHA_CURRENT_SEASON_WEEK_COUNT
  )
    return null;
  const fixture = positionWeekFixture(session, mechanics, weekIndex);
  return deepFreeze({
    seasonIndex,
    weekIndex,
    fixture:
      fixture === undefined
        ? null
        : {
            id: fixture.id,
            homeProgramId: fixture.homeProgramId,
            awayProgramId: fixture.awayProgramId,
          },
  });
}

/** Publish completed football and the world round exactly once, retaining genuine snap history. */
export function settlePositionAlphaGameDayV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (session?.gameDay?.type !== 'POST_GAME') return invalidCommand();
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.phase.type !== 'GAME_DAY' ||
    session.gameDay.type !== 'POST_GAME' ||
    session.gameDay.game?.game.type !== 'COMPLETE'
  )
    return invalidCommand();
  const day = session.gameDay;
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(session, session.phase.weekIndex);
  if (careerWeekIndex === null) return invalidCommand();
  const completed = day.game as CompletedPositionGame;
  if (day.injury === null || day.injury.availability === null) return invalidCommand();
  if (day.event === null || day.nil === null) return invalidCommand();
  const effectivePreparation = positionAlphaPreparationAfterEvent(day.preparation, day.event);
  if (effectivePreparation === null) return invalidCommand();
  const source = createPositionAlphaWeekSourceV2({
    ...session,
    previousStats: previousPositionAlphaFootballStats(session),
    careerRng: day.rngBefore,
  });
  const summary = createPositionAlphaWeekSummaryV2(
    source,
    day.preparation,
    completed,
    day.decisionIds,
    positionAlphaActiveMechanicsV2(session, mechanics),
    day.injury,
    day.event,
    day.nil,
  );
  const nilPlanning = replayPositionAlphaNilPlanningV2(session, careerWeekIndex, mechanics.nil);
  if (nilPlanning === null) return invalidCommand();
  const settleFootball =
    session.phase.weekIndex < 12
      ? settlePositionAlphaFootballWeek
      : settlePositionAlphaPostseasonFootballV2;
  const settlement = settleFootball(
    {
      ...session,
      player: { ...session.player, state: nilPlanning.playerState },
      lifecycle: {
        ...session.lifecycle,
        playerState: nilPlanning.playerState,
        relationships: nilPlanning.relationships,
      },
    },
    effectivePreparation,
    completed,
    positionAlphaActiveMechanicsV2(session, mechanics),
    day.preparation.relationships,
    day.preparation.relationshipSkillGain.multiplierPermille,
  );
  if (summary === null || settlement === null) return invalidCommand();
  const nextPlayer = {
    ...settlement.player,
    state: {
      ...settlement.player.state,
      body: summary.rollover.bodyAfter,
      preparation: summary.rollover.preparationAfter,
    },
  };
  const next: PositionAlphaSessionV2 = {
    ...cloneSerializable(session),
    revision: session.revision + 1,
    careerRng: summary.breakthrough.rng,
    player: nextPlayer,
    academics: summary.academics.afterGame,
    nil: day.nil.after,
    room: settlement.room,
    training: {
      ...settlement.training,
      state: {
        body: nextPlayer.state.body,
        preparation: nextPlayer.state.preparation,
        confidence: nextPlayer.state.confidence,
      },
    },
    lifecycle: { ...settlement.lifecycle, playerState: nextPlayer.state },
    world: settlement.world,
    skills: {
      ...cloneSerializable(session.skills),
      breakthroughGauge: summary.breakthrough.progress.progressAfter,
      offeredSkillIds: summary.breakthrough.offer?.offeredSkillIds ?? null,
    },
    events: {
      ...cloneSerializable(day.event.afterEvents),
      nextGameModifiers: { clueBonus: 0, decisionScoreFlat: 0, exposureReductionPermille: 0 },
    },
    weekHistory:
      session.phase.weekIndex < 12 ? [...session.weekHistory, summary] : session.weekHistory,
    postseasonHistory:
      session.phase.weekIndex >= 12
        ? [...session.postseasonHistory, summary]
        : session.postseasonHistory,
    gameDay: { model: 'position_alpha_game_day_v2', type: 'IDLE' },
    phase:
      session.phase.weekIndex >= 12
        ? nextPostseasonPhase(settlement.world)
        : session.phase.weekIndex === 11
          ? { type: 'SEASON_REVIEW', seasonIndex: session.lifecycle.activeSeasonIndex as 0 | 1 }
          : { type: 'WEEK_PLANNING', weekIndex: session.phase.weekIndex + 1 },
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

function nextPostseasonPhase(world: WorldAlphaSeasonState): PositionAlphaSessionV2['phase'] {
  return world.postseason.type === 'ACTIVE'
    ? { type: 'POSTSEASON_PLANNING', weekIndex: 12 + world.postseason.currentRoundIndex }
    : { type: 'POSTSEASON_REVIEW', seasonIndex: world.seasonIndex as 0 | 1 };
}

/** Same football effects and world bracket; no automatic player decision strategy. */
function settlePositionAlphaPostseasonFootballV2(
  ...args: Parameters<typeof settlePositionAlphaFootballWeek>
): ReturnType<typeof settlePositionAlphaFootballWeek> {
  const [session, preparation, completed, mechanics, relationships, relationshipGain] = args;
  if (session.world.postseason.type !== 'ACTIVE') return null;
  const weekIndex = 12 + session.world.postseason.currentRoundIndex;
  const fixture = postseasonFixture(session.world, weekIndex);
  if (fixture === undefined) return null;
  const worldResult = projectCompletedWorldResult(completed, fixture);
  const consequences = derivePositionAlphaFootballConsequences(
    session,
    preparation,
    completed,
    weekIndex,
    mechanics,
    relationships,
    relationshipGain,
  );
  if (worldResult === null || consequences === null) return null;
  const world = resolveNextWorldAlphaPostseasonRound(session.world, mechanics.world, worldResult);
  return world.ok ? { ...consequences, world: world.value } : null;
}

/** Qualification is world-owned; initialization consumes no career or world draws. */
export function beginPositionAlphaPostseasonV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.phase.type !== 'SEASON_REVIEW' ||
    session.gameDay.type !== 'IDLE' ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null
  )
    return invalidCommand();
  const initialized = initializeWorldAlphaPostseason(
    session.world,
    positionAlphaActiveMechanicsV2(session, mechanics).world,
  );
  if (!initialized.ok) return invalidCommand();
  const next: PositionAlphaSessionV2 = {
    ...session,
    revision: session.revision + 1,
    world: initialized.value,
    phase: nextPostseasonPhase(initialized.value),
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** A non-participating round resolves only world fixtures, never player RNG or rewards. */
export function advancePositionAlphaPostseasonRoundV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.phase.type !== 'POSTSEASON_PLANNING' ||
    session.gameDay.type !== 'IDLE' ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null ||
    postseasonFixture(session.world, session.phase.weekIndex) !== undefined
  )
    return invalidCommand();
  const world = resolveNextWorldAlphaPostseasonRound(
    session.world,
    positionAlphaActiveMechanicsV2(session, mechanics).world,
  );
  if (!world.ok) return invalidCommand();
  const next: PositionAlphaSessionV2 = {
    ...session,
    revision: session.revision + 1,
    world: world.value,
    phase: nextPostseasonPhase(world.value),
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** Freeze current history/build and the existing deterministic shortlist exactly once. */
export function reviewPositionAlphaSeasonV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    !validatePositionAlphaAggregate(session, mechanics) ||
    session.phase.type !== 'POSTSEASON_REVIEW' ||
    session.gameDay.type !== 'IDLE' ||
    Object.hasOwn(session, 'seasonReview')
  )
    return invalidCommand();
  const derived = derivePositionAlphaSeasonReviewV2(
    session,
    positionAlphaActiveMechanicsV2(session, mechanics),
  );
  if (derived === null) return invalidCommand();
  const next: PositionAlphaSessionV2 = {
    ...session,
    ...derived,
    revision: session.revision + 1,
    phase: { type: 'OFFSEASON_DECISION', seasonIndex: session.phase.seasonIndex },
  };
  return validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** Commit a saved option; neutral historical boundaries retain their literal transition. */
export function commitPositionAlphaOffseasonV2(
  session: PositionAlphaSessionV2,
  selectedProgramId: ProgramId,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    session?.phase?.type !== 'OFFSEASON_DECISION' ||
    !validatePositionAlphaAggregate(session, mechanics)
  )
    return invalidCommand();
  if (!Object.hasOwn(session, 'seasonReview')) {
    // Only undo the neutral migration additions. Any current-only fields remain
    // present and must fail the exact v1 validator; never truncate current evidence.
    if (session.gameDay.type !== 'IDLE' || session.skills.equippedSkillIds[3] !== null)
      return invalidCommand();
    const literal = {
      ...Object.fromEntries(Object.entries(session).filter(([key]) => key !== 'gameDay')),
      schemaVersion: 1,
      model: 'position_alpha_session_v1',
      skills: {
        ...session.skills,
        model: 'position_alpha_skill_state_v1',
        equippedSkillIds: session.skills.equippedSkillIds.slice(0, 3),
      },
    };
    if (!validatePositionAlphaSession(literal, mechanics)) return invalidCommand();
    // The runtime validator above establishes the complete literal v1 contract.
    const committed = commitPositionAlphaOffseason(
      literal as unknown as PositionAlphaSessionV1,
      selectedProgramId,
      mechanics,
    );
    if (!committed.ok) return invalidCommand();
    const migrated = migratePositionAlphaSessionV1ToV2(committed.session, mechanics);
    return migrated === null ? invalidCommand() : deepFreeze({ ok: true, session: migrated });
  }
  const next = derivePositionAlphaSeasonStartV2(session, selectedProgramId, mechanics);
  return next !== null && validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

/** Retire the two-season current alpha with actual build/stat history and no RNG or state reset. */
export function completePositionAlphaCareerV2(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionCommandMechanics,
): PositionAlphaCommandResultV2 {
  if (
    session?.phase?.type !== 'OFFSEASON_DECISION' ||
    !validatePositionAlphaAggregate(session, mechanics)
  )
    return invalidCommand();
  const next = derivePositionAlphaCareerCompletionV2(session);
  return next !== null && validatePositionAlphaAggregate(next, mechanics)
    ? deepFreeze({ ok: true, session: cloneSerializable(next) })
    : invalidCommand();
}

export function migratePositionAlphaSessionV1ToV2(
  value: PositionAlphaSessionV1,
  mechanics: PositionAlphaSessionFoundationMechanics,
): PositionAlphaSessionV2 | null {
  if (!validatePositionAlphaSession(value, mechanics)) return null;
  const source = cloneSerializable(value);
  const migrated: PositionAlphaSessionV2 = {
    ...source,
    schemaVersion: POSITION_ALPHA_SESSION_SCHEMA_VERSION_V2,
    model: 'position_alpha_session_v2',
    skills: {
      ...source.skills,
      model: 'position_alpha_skill_state_v2',
      equippedSkillIds: [...source.skills.equippedSkillIds, null],
    },
    gameDay: { model: 'position_alpha_game_day_v2', type: 'IDLE' },
  };
  return validatePositionAlphaSessionV2(migrated, mechanics) ? deepFreeze(migrated) : null;
}

export function parsePositionAlphaSessionV2Json(
  serialized: string,
  mechanics: PositionAlphaSessionFoundationMechanics,
): PositionAlphaSessionV2 | null {
  try {
    let value: unknown = JSON.parse(serialized);
    if (isRecord(value) && value['model'] === 'position_alpha_session_wire_v2') {
      if (
        utf8ByteLength(serialized) >= 1_000_000 ||
        Object.keys(value).sort().join('|') !== 'model|postseasonHistory|session|weekHistory' ||
        !isRecord(value['session']) ||
        Object.hasOwn(value['session'], 'weekHistory') ||
        Object.hasOwn(value['session'], 'postseasonHistory')
      )
        return null;
      const regular = unpackJsonArchiveV1(value['weekHistory']);
      const postseason = unpackJsonArchiveV1(value['postseasonHistory']);
      if (
        !regular.ok ||
        !postseason.ok ||
        !Array.isArray(regular.value) ||
        regular.value.length > 12 ||
        !Array.isArray(postseason.value) ||
        postseason.value.length > 2
      )
        return null;
      value = {
        ...value['session'],
        weekHistory: regular.value,
        postseasonHistory: postseason.value,
      };
    }
    return validatePositionAlphaSessionV2(value, mechanics) ? deepFreeze(value) : null;
  } catch {
    return null;
  }
}

/** Current wire format only; runtime rules retain their complete ordinary evidence objects. */
export function serializePositionAlphaSessionV2Json(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionFoundationMechanics,
): string | null {
  if (!validatePositionAlphaSessionV2(session, mechanics)) return null;
  const weekHistory = packJsonArchiveV1(session.weekHistory);
  const postseasonHistory = packJsonArchiveV1(session.postseasonHistory);
  if (weekHistory === null || postseasonHistory === null) return null;
  const fields = Object.fromEntries(
    Object.entries(session).filter(([key]) => key !== 'weekHistory' && key !== 'postseasonHistory'),
  );
  const serialized = JSON.stringify({
    model: 'position_alpha_session_wire_v2',
    session: fields,
    weekHistory,
    postseasonHistory,
  });
  return utf8ByteLength(serialized) < 1_000_000 ? serialized : null;
}
