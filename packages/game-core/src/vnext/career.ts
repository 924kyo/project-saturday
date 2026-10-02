import { brandPermilleVNext, developmentPermilleVNext } from './programs.js';
import { rivalWeekVNext, VNEXT_RIVAL_TUNING } from './rivals.js';
import { withVariedClockVNext } from './clock.js';
import {
  applyAllocationVNext,
  checkAllocationVNext,
  recruitOfferTargetVNext,
  VNEXT_LEGACY_HEAD_START_CAP,
} from './creation.js';
import {
  backgroundProfileVNext,
  campFocusIdsVNext,
  coachSuggestionVNext,
  developmentOfVNext,
  focusDefinitionsVNext,
  grantAttributeXpVNext,
  recommendedCampVNext,
  resolveFocusPlanVNext,
  settleCoachFocusVNext,
  VNEXT_DEVELOPMENT_CALENDAR,
} from './development.js';
import { liveReadScoreVNext } from './frames.js';
import { liveSnapLookVNext, resolveWithLookVNext } from './looks.js';
import { deriveCareerId } from '../player/creation.js';
import type { ProgramId } from '../player/ids.js';
import {
  createPositionPlayerProfile,
  type PositionPlayerCreationIdentity,
} from '../player/position-creation.js';
import {
  derivePositionRecruitingProfile,
  updatePositionRoomAfterPractice,
} from '../programs/position-room.js';
import { createRng, nextUint32, type RngSeed, type RngState } from '../random/rng.js';
import type { SkillId } from '../skills/ids.js';
import { derivePositionAlphaRolloverV2 } from '../season/position-alpha-focus-v2.js';
import { createCommonPositionProficiencyUses } from '../weekly/position-focus.js';
import {
  attemptBreakthroughVNext,
  breakthroughStateVNext,
  VNEXT_BREAKTHROUGH_THRESHOLD,
  VNEXT_BUILD_SLOTS,
} from './build.js';
import {
  createPositionTrainingProficiencyUses,
  derivePositionPracticeGrade,
} from '../weekly/position-training.js';
import {
  fail,
  isVNextPositionId,
  offerFromRoom,
  overallVNext,
  programRating,
  publish,
  roomFor,
} from './common.js';
import {
  afterScheduleStep,
  postseasonRoundVNext,
  resolveWorldRoundVNext,
  scheduledFixtureVNext,
} from './season.js';
import {
  projectVNextWorldResult,
  resolveVNextSnap,
  startVNextGame,
  withStarImpactVNext,
} from './game.js';
import { createSeasonWorldVNext } from './world.js';
import { snapshotLegacyVNext } from './legacy.js';
import { resolveOvertimeVNext } from './overtime.js';
import {
  attemptNilOfferVNext,
  brandFromGameVNext,
  decideNilOfferVNext,
  settleNilWeekVNext,
} from './nil.js';
import { projectGameStakesVNext } from './stakes.js';
import { createSidelineReps, resolveSidelineRep, sidelineCreditFor } from './sideline.js';
import {
  academicCheckpointWeekVNext,
  academicStatusVNext,
  assessInjuryWeekVNext,
  attemptWeeklyEventVNext,
  injuryRiskBreakdownVNext,
  createConditionVNext,
  injuryChoiceAvailabilityVNext,
  NEUTRAL_GAME_MODIFIERS,
  recoverConditionVNext,
  rememberEventVNext,
  resolveWeeklyEventChoiceVNext,
} from './weekly.js';
import type { InjuryAvailabilityEvidence } from '../injuries/types.js';
import {
  CAREER_VNEXT_MIN_GAME_DECISIONS,
  CAREER_VNEXT_MODEL,
  CAREER_VNEXT_REGULAR_SEASON_WEEKS,
  CAREER_VNEXT_VERSION,
  type AlumniVNext,
  type AthleteNameTokensVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type GameDayVNext,
  type GameRecapVNext,
  type GameSlotVNext,
  type HomeRegionIdVNext,
  type RecruitOfferVNext,
  type VNextGameState,
  type VNextPositionId,
} from './types.js';

const CONTENT_VERSION = 1;
export { isVNextPositionId, VNEXT_ROOM_TUNING } from './common.js';

export interface CreateCareerVNextInput {
  readonly seed: RngSeed;
  readonly identity: PositionPlayerCreationIdentity;
  /** The Alumni Wall at creation; saved as a bounded snapshot (information and story only). */
  readonly legacy?: readonly AlumniVNext[];
  /** A generated name from the roster pool, shown in the app language (optional). */
  readonly nameTokens?: AthleteNameTokensVNext;
  /** M12: the player's own point allocation (absent = none) and the preset it started from. */
  readonly allocation?: Readonly<Record<string, number>>;
  readonly presetId?: string | null;
  /** M12: extra allocation points (the capped legacy head start; 0 by default). */
  readonly bonusBudget?: number;
  /** M12: optional home region, story only. */
  readonly homeRegionId?: HomeRegionIdVNext;
}

const HOME_REGIONS: readonly HomeRegionIdVNext[] = [
  'home_region_in_state',
  'home_region_out_of_state',
  'home_region_international',
];

export function createCareerVNext(
  input: CreateCareerVNextInput,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (!isVNextPositionId(input?.identity?.positionId)) return fail('career_vnext.invalid_input');
  const created = createPositionPlayerProfile({
    careerSeed: input.seed,
    identity: input.identity,
    mechanics: mechanics.creation,
  });
  if (!created.ok) return fail('career_vnext.invalid_input');
  // M12: the player's allocation, checked against the budget and caps, then applied.
  const allocation = input.allocation ?? {};
  const bonusBudget = input.bonusBudget ?? 0;
  if (
    !Number.isInteger(bonusBudget) ||
    bonusBudget < 0 ||
    bonusBudget > VNEXT_LEGACY_HEAD_START_CAP ||
    !checkAllocationVNext(created.player, allocation, bonusBudget).ok ||
    (input.homeRegionId !== undefined && !HOME_REGIONS.includes(input.homeRegionId))
  )
    return fail('career_vnext.invalid_input');
  const profile = applyAllocationVNext(created.player, allocation);
  // M12: the recruiting background sets the recruit's standing (better or later first offers).
  const recruiting = derivePositionRecruitingProfile(
    profile,
    mechanics.room,
    backgroundProfileVNext(profile.recruitingBackgroundId).recruitStanding,
  );
  if (recruiting === undefined) return fail('career_vnext.invalid_input');
  const positionId = profile.positionId as VNextPositionId;
  const tokens = input.nameTokens;
  const givenIds = [
    ...(mechanics.roomNames.givenNameIds as readonly string[]),
    ...(mechanics.suggestedNames?.givenNameIds ?? []),
  ];
  const familyIds = [
    ...(mechanics.roomNames.familyNameIds as readonly string[]),
    ...(mechanics.suggestedNames?.familyNameIds ?? []),
  ];
  if (
    tokens !== undefined &&
    (!givenIds.includes(tokens.givenNameId) || !familyIds.includes(tokens.familyNameId))
  )
    return fail('career_vnext.invalid_input');
  const athlete = {
    profile,
    ...(input.allocation === undefined &&
    input.presetId === undefined &&
    input.homeRegionId === undefined &&
    bonusBudget === 0
      ? {}
      : {
          creation: {
            allocation: Object.fromEntries(
              Object.entries(allocation).filter(([, delta]) => delta !== 0),
            ),
            presetId: input.presetId ?? null,
            bonusBudget,
            ...(input.homeRegionId === undefined ? {} : { homeRegionId: input.homeRegionId }),
          },
        }),
    proficiencyUses: createPositionTrainingProficiencyUses(positionId),
    sharedProficiencyUses: createCommonPositionProficiencyUses(),
    breakthroughGauge: 0,
    ...(tokens === undefined
      ? {}
      : { nameTokens: { givenNameId: tokens.givenNameId, familyNameId: tokens.familyNameId } }),
  };
  // Four realistic suitors around the recruit's level: a reach, two fits and an early-role path.
  const target = recruitOfferTargetVNext(recruiting.recruitScore);
  const ranked = mechanics.world.programProfiles
    .map(({ programId }) => ({
      programId,
      rating: programRating(mechanics, programId, positionId),
    }))
    .sort(
      (left, right) => left.rating - right.rating || left.programId.localeCompare(right.programId),
    );
  const bands: readonly (readonly [number, number])[] = [
    [target + 6, target + 16],
    [target - 1, target + 5],
    [target - 6, target - 2],
    [target - 20, target - 7],
  ];
  let rng: RngState = createRng(`${String(input.seed)}:vnext:recruiting`);
  const chosen: (typeof ranked)[number][] = [];
  for (const [low, high] of bands) {
    const open = ranked.filter((entry) => !chosen.includes(entry));
    const inBand = open.filter(({ rating }) => rating >= low && rating <= high);
    const pool =
      inBand.length > 0
        ? inBand
        : [...open]
            .sort(
              (left, right) =>
                Math.abs(left.rating - (low + high) / 2) -
                Math.abs(right.rating - (low + high) / 2),
            )
            .slice(0, 3);
    const sample = nextUint32(rng);
    rng = sample.nextRng;
    chosen.push(pool[sample.value % pool.length]!);
  }
  const offers: RecruitOfferVNext[] = [];
  for (const { programId, rating } of chosen.sort((a, b) => b.rating - a.rating)) {
    const room = roomFor({ seed: input.seed, athlete }, programId, mechanics);
    if (!room.ok) return fail('career_vnext.invalid_input');
    offers.push(offerFromRoom(programId, rating, room.generated.context));
  }
  return publish(null, {
    model: CAREER_VNEXT_MODEL,
    version: CAREER_VNEXT_VERSION,
    careerId: deriveCareerId(input.seed),
    seed: input.seed,
    contentVersion: CONTENT_VERSION,
    rng: { career: createRng(`${String(input.seed)}:vnext:career`) },
    athlete,
    build: { equippedSkillIds: [null, null, null, null], ownedSkillIds: [] },
    ...(input.legacy === undefined || input.legacy.length === 0
      ? {}
      : { legacy: snapshotLegacyVNext(input.legacy) }),
    recruiting: { offers, committedProgramId: null },
    program: null,
    season: {
      index: 0,
      weekIndex: 0,
      world: null,
      sidelineCredit: 0,
      startOverall: overallVNext(profile, mechanics),
      startRank: 1,
    },
    condition: createConditionVNext(),
    flow: { type: 'RECRUITING' },
    log: [],
    history: [],
  });
}

export function commitProgramVNext(
  career: CareerVNext,
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'RECRUITING') return fail('career_vnext.invalid_phase');
  if (!career.recruiting.offers.some((offer) => offer.programId === programId))
    return fail('career_vnext.invalid_choice');
  const room = roomFor(career, programId, mechanics);
  if (!room.ok) return fail('career_vnext.engine_failed');
  const world = createSeasonWorldVNext(String(career.seed), 0, programId, mechanics);
  if (world === null) return fail('career_vnext.engine_failed');
  const context = room.generated.context;
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...career.athlete.profile,
        state: { ...career.athlete.profile.state, coachTrust: context.playerCoachTrust },
      },
    },
    recruiting: { ...career.recruiting, committedProgramId: programId },
    program: { programId, room: context },
    season: { ...career.season, world, startRank: context.projection.rank },
    development: developmentOfVNext(career),
    // M12: every season opens with preseason camp.
    flow: { type: 'CAMP', report: null },
  });
}

export { focusDefinitionsVNext };

export function planWeekVNext(
  career: CareerVNext,
  focusIds: readonly string[],
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN' || career.program === null)
    return fail('career_vnext.invalid_phase');
  if (!Array.isArray(focusIds) || focusIds.length !== 3) return fail('career_vnext.invalid_choice');
  const definitions = focusDefinitionsVNext(career, mechanics);
  const profile = career.athlete.profile;
  // M12: the background's potential and the program's development tier scale this season's XP.
  const resolved = resolveFocusPlanVNext(
    career,
    focusIds,
    mechanics,
    developmentPermilleVNext(career, mechanics),
  );
  if (resolved === null) return fail('career_vnext.invalid_choice');
  const evidence = resolved.evidence;
  const state = {
    training: { attributes: resolved.attributes, state: resolved.state },
    gpa: resolved.gpa,
  };
  // The room practices too: teammates' form and growth move before the depth update reads them.
  const room = rivalWeekVNext(
    career.program.room,
    career.seed,
    career.season.index,
    career.season.weekIndex,
    mechanics.room,
  );
  const grade = derivePositionPracticeGrade(
    [evidence[0]!, evidence[1]!, evidence[2]!],
    room.projection.roleId,
  );
  // Off-field week: NIL obligation time and effects, the locker room, one-use benefits.
  const offField = settleNilWeekVNext(
    career,
    {
      ...profile.state,
      ...state.training.state,
      gpa: state.gpa,
    },
    focusIds,
    definitions.filter((entry) => 'positionId' in entry).map(({ id }) => id),
    mechanics,
  );
  if (offField === null) return fail('career_vnext.engine_failed');
  const practiceScore = Math.max(
    0,
    Math.min(100, grade.score + career.season.sidelineCredit + offField.practiceDelta),
  );
  const updated = updatePositionRoomAfterPractice(
    room,
    state.training.attributes,
    practiceScore,
    mechanics.room,
  );
  if (!updated.ok) return fail('career_vnext.engine_failed');
  // M12: the coach's midseason focus counts this week and settles (reward or miss) when due.
  const focus = settleCoachFocusVNext(
    developmentOfVNext(career),
    career.season.index,
    career.season.weekIndex,
    focusIds,
  );
  const coachFocus = focus.week;
  const focusAttributeId = career.development?.focus?.attributeId ?? null;
  const attributesAfter =
    coachFocus !== null && coachFocus.xp > 0 && focusAttributeId !== null
      ? grantAttributeXpVNext(state.training.attributes, focusAttributeId, coachFocus.xp)
      : state.training.attributes;
  const coachTrustAfter = Math.max(
    0,
    Math.min(100, updated.evidence.coachTrust.after + (coachFocus?.trustDelta ?? 0)),
  );
  const gaugeBefore = career.athlete.breakthroughGauge;
  // A complete collection holds the gauge at full rather than filling toward nothing.
  const gaugeCap = breakthroughStateVNext(career, mechanics).complete
    ? VNEXT_BREAKTHROUGH_THRESHOLD
    : 160;
  const gaugeAfter = Math.min(
    gaugeCap,
    gaugeBefore + grade.breakthroughGaugePoints + (coachFocus?.gauge ?? 0),
  );
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        attributes: attributesAfter,
        state: {
          ...offField.state,
          coachTrust: coachTrustAfter,
        },
      },
      proficiencyUses: resolved.proficiencyUses,
      sharedProficiencyUses: resolved.sharedProficiencyUses,
      breakthroughGauge: gaugeAfter,
    },
    program: {
      ...career.program,
      room: { ...updated.context, playerCoachTrust: coachTrustAfter },
    },
    season: { ...career.season, sidelineCredit: 0 },
    nil: offField.nil,
    ...(career.development === undefined && coachFocus === null
      ? {}
      : { development: focus.development }),
    flow: {
      type: 'PRACTICE_REPORT',
      report: {
        weekIndex: career.season.weekIndex,
        focuses: [evidence[0]!, evidence[1]!, evidence[2]!],
        grade,
        sidelineCredit: career.season.sidelineCredit,
        practiceScore,
        depth: updated.evidence,
        gaugeBefore,
        gaugeAfter,
        offFieldDelta: offField.practiceDelta,
        benefitsUsed: offField.benefitsUsed,
        obligationApplied: offField.obligationApplied,
        ...(coachFocus === null ? {} : { coachFocus }),
      },
    },
  });
}

/**
 * Preseason camp (M12): three emphases from the week's catalog (no recovery or study hall) at camp
 * XP, a first role battle against the room's own camp week, and the gauge points of a practice
 * week. Camp includes its own recovery: Body and Preparation stand where they were.
 */
export function chooseCampVNext(
  career: CareerVNext,
  focusIds: readonly string[],
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'CAMP' || career.flow.report !== null || career.program === null)
    return fail('career_vnext.invalid_phase');
  const open = campFocusIdsVNext(career, mechanics);
  if (
    !Array.isArray(focusIds) ||
    focusIds.length !== 3 ||
    !focusIds.every((id) => open.includes(id))
  )
    return fail('career_vnext.invalid_choice');
  const xpPermille = Math.round(
    (developmentPermilleVNext(career, mechanics) * VNEXT_DEVELOPMENT_CALENDAR.campXpPermille) /
      1000,
  );
  const resolved = resolveFocusPlanVNext(career, focusIds, mechanics, xpPermille);
  if (resolved === null) return fail('career_vnext.invalid_choice');
  const room = rivalWeekVNext(
    career.program.room,
    career.seed,
    career.season.index,
    VNEXT_DEVELOPMENT_CALENDAR.campRivalWeek,
    mechanics.room,
    VNEXT_RIVAL_TUNING.campGrowthDraws,
  );
  const grade = derivePositionPracticeGrade(
    [resolved.evidence[0], resolved.evidence[1], resolved.evidence[2]],
    room.projection.roleId,
  );
  const practiceScore = Math.max(0, Math.min(100, grade.score));
  const updated = updatePositionRoomAfterPractice(
    room,
    resolved.attributes,
    practiceScore,
    mechanics.room,
  );
  if (!updated.ok) return fail('career_vnext.engine_failed');
  const profile = career.athlete.profile;
  const gaugeBefore = career.athlete.breakthroughGauge;
  const gaugeCap = breakthroughStateVNext(career, mechanics).complete
    ? VNEXT_BREAKTHROUGH_THRESHOLD
    : 160;
  const gaugeAfter = Math.min(gaugeCap, gaugeBefore + grade.breakthroughGaugePoints);
  const development = developmentOfVNext(career);
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        attributes: resolved.attributes,
        state: {
          ...profile.state,
          confidence: resolved.state.confidence,
          coachTrust: updated.evidence.coachTrust.after,
        },
      },
      proficiencyUses: resolved.proficiencyUses,
      sharedProficiencyUses: resolved.sharedProficiencyUses,
      breakthroughGauge: gaugeAfter,
    },
    program: { ...career.program, room: updated.context },
    season: { ...career.season, startRank: updated.context.projection.rank },
    development: {
      ...development,
      camps: [
        ...development.camps,
        { seasonIndex: career.season.index, focusIds: [...focusIds], practiceScore },
      ],
    },
    flow: {
      type: 'CAMP',
      report: {
        seasonIndex: career.season.index,
        focuses: resolved.evidence,
        grade,
        practiceScore,
        depth: updated.evidence,
        gaugeBefore,
        gaugeAfter,
        xpPermille,
      },
    },
  });
}

/** Camp report: on to the first week's plan. */
export function continueCampVNext(career: CareerVNext): CareerVNextResult {
  if (career.flow.type !== 'CAMP' || career.flow.report === null)
    return fail('career_vnext.invalid_phase');
  return publish(career, { ...career, flow: { type: 'WEEK_PLAN' } });
}

/**
 * The midseason checkpoint (M12): accept the coach's focus (run it in two of the next three weeks
 * for trust, XP and gauge; miss it and trust slips a point) or decline it. Either way the season
 * continues at the week planner.
 */
export function decideMidseasonVNext(career: CareerVNext, accept: boolean): CareerVNextResult {
  if (career.flow.type !== 'MIDSEASON' || career.flow.review.decision !== null)
    return fail('career_vnext.invalid_phase');
  if (typeof accept !== 'boolean') return fail('career_vnext.invalid_choice');
  const review = career.flow.review;
  const development = developmentOfVNext(career);
  const tuning = VNEXT_DEVELOPMENT_CALENDAR;
  return publish(career, {
    ...career,
    development: {
      ...development,
      reviews: [
        ...development.reviews,
        { seasonIndex: review.seasonIndex, decision: accept ? 'ACCEPTED' : 'DECLINED' },
      ],
      focus: accept
        ? {
            seasonIndex: review.seasonIndex,
            ...review.suggestion,
            fromWeek: review.weekIndex,
            untilWeek: review.weekIndex + tuning.focusWindowWeeks,
            required: tuning.focusRequiredWeeks,
            done: 0,
            outcome: 'ACTIVE',
          }
        : development.focus,
    },
    flow: { type: 'WEEK_PLAN' },
  });
}

/**
 * Advances the week toward kickoff: practice report -> optional event -> injury check -> Game Day.
 * Each step stops only where the player has something to read or decide.
 */
export function toGameDayVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.program === null) return fail('career_vnext.invalid_phase');
  const flow = career.flow;
  if (flow.type === 'PRACTICE_REPORT') {
    if (scheduledFixtureVNext(career, mechanics) === null) return advanceWeek(career, mechanics);
    const [first, , third] = flow.report.focuses;
    const trainingLoad = Math.max(0, first.bodyBefore - third.bodyAfter);
    const offer = attemptBreakthroughVNext(career, mechanics);
    if (offer !== null)
      return publish(career, { ...career, flow: { type: 'BREAKTHROUGH', offer, trainingLoad } });
    return eventStep(career, trainingLoad, mechanics);
  }
  if (flow.type === 'BREAKTHROUGH') {
    if (flow.offer.chosenSkillId === null) return fail('career_vnext.invalid_phase');
    return eventStep(career, flow.trainingLoad, mechanics);
  }
  if (flow.type === 'EVENT') {
    if (flow.event.chosenChoiceId === null) return fail('career_vnext.invalid_phase');
    return nilStep(career, flow.trainingLoad, mechanics);
  }
  if (flow.type === 'NIL') {
    if (flow.offer.decision === null) return fail('career_vnext.invalid_phase');
    return injuryStep(career, flow.trainingLoad, mechanics);
  }
  if (flow.type === 'INJURY') {
    if (flow.report.availability === null) return fail('career_vnext.invalid_phase');
    return gameStep(career, mechanics);
  }
  return fail('career_vnext.invalid_phase');
}

function eventStep(
  career: CareerVNext,
  trainingLoad: number,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  const event = attemptWeeklyEventVNext(career, mechanics);
  if (event !== null)
    return publish(career, { ...career, flow: { type: 'EVENT', event, trainingLoad } });
  return nilStep(career, trainingLoad, mechanics);
}

function nilStep(
  career: CareerVNext,
  trainingLoad: number,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  const attempt = attemptNilOfferVNext(career, mechanics);
  if (attempt !== null)
    return publish(career, {
      ...career,
      nil: attempt.nil,
      flow: { type: 'NIL', offer: attempt.scene, trainingLoad },
    });
  return injuryStep(career, trainingLoad, mechanics);
}

/** Accepts or declines this week's NIL offer; the week then continues toward kickoff. */
export function chooseNilVNext(
  career: CareerVNext,
  accept: boolean,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'NIL' || career.flow.offer.decision !== null)
    return fail('career_vnext.invalid_phase');
  if (typeof accept !== 'boolean') return fail('career_vnext.invalid_choice');
  const decided = decideNilOfferVNext(career, career.flow.offer, accept, mechanics);
  if (decided === null) return fail('career_vnext.invalid_choice');
  return publish(career, {
    ...career,
    athlete: { ...career.athlete, profile: { ...career.athlete.profile, state: decided.state } },
    program:
      career.program === null
        ? null
        : {
            ...career.program,
            room: { ...career.program.room, playerCoachTrust: decided.state.coachTrust },
          },
    nil: decided.nil,
    flow: { ...career.flow, offer: decided.scene },
  });
}

/** Takes one offered card: it joins the collection and fills the first open slot, if any. */
export function chooseBreakthroughVNext(career: CareerVNext, skillId: string): CareerVNextResult {
  if (career.flow.type !== 'BREAKTHROUGH' || career.flow.offer.chosenSkillId !== null)
    return fail('career_vnext.invalid_phase');
  const offer = career.flow.offer;
  if (!offer.skillIds.includes(skillId) || career.build.ownedSkillIds.includes(skillId as SkillId))
    return fail('career_vnext.invalid_choice');
  const equipped = [...career.build.equippedSkillIds];
  const open = equipped.indexOf(null);
  if (open >= 0) equipped[open] = skillId as SkillId;
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      breakthroughGauge: career.athlete.breakthroughGauge - VNEXT_BREAKTHROUGH_THRESHOLD,
    },
    build: {
      equippedSkillIds: equipped as unknown as CareerVNext['build']['equippedSkillIds'],
      ownedSkillIds: [...career.build.ownedSkillIds, skillId as SkillId],
    },
    flow: {
      ...career.flow,
      offer: { ...offer, chosenSkillId: skillId, slotIndex: open >= 0 ? open : null },
    },
  });
}

/** Build edits happen while planning the week: put an owned card in a slot, or clear a slot. */
export function equipSkillVNext(
  career: CareerVNext,
  slotIndex: number,
  skillId: string | null,
): CareerVNextResult {
  if (career.flow.type !== 'WEEK_PLAN') return fail('career_vnext.invalid_phase');
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= VNEXT_BUILD_SLOTS)
    return fail('career_vnext.invalid_choice');
  if (skillId !== null && !career.build.ownedSkillIds.includes(skillId as SkillId))
    return fail('career_vnext.invalid_choice');
  // A card lives in one slot: equipping it elsewhere moves it.
  const equipped = career.build.equippedSkillIds.map((id) => (id === skillId ? null : id));
  equipped[slotIndex] = skillId as SkillId | null;
  return publish(career, {
    ...career,
    build: {
      ...career.build,
      equippedSkillIds: equipped as unknown as CareerVNext['build']['equippedSkillIds'],
    },
  });
}

export function chooseEventVNext(
  career: CareerVNext,
  choiceId: string,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'EVENT' || career.flow.event.chosenChoiceId !== null)
    return fail('career_vnext.invalid_phase');
  const resolved = resolveWeeklyEventChoiceVNext(career, career.flow.event, choiceId, mechanics);
  if (resolved === null) return fail('career_vnext.invalid_choice');
  const profile = career.athlete.profile;
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: { ...profile, state: resolved.state },
      breakthroughGauge: resolved.gaugeAfter,
    },
    program:
      career.program === null
        ? null
        : {
            ...career.program,
            room: { ...career.program.room, playerCoachTrust: resolved.state.coachTrust },
          },
    condition: rememberEventVNext(career.condition, resolved.event, resolved.modifiers),
    flow: { ...career.flow, event: resolved.event },
  });
}

function withAvailability(career: CareerVNext, availability: InjuryAvailabilityEvidence) {
  const profile = career.athlete.profile;
  return {
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        state: {
          ...profile.state,
          body: availability.bodyAfter,
          confidence: availability.confidenceAfter,
          coachTrust: availability.coachTrustAfter,
        },
      },
    },
    program:
      career.program === null
        ? null
        : {
            ...career.program,
            room: { ...career.program.room, playerCoachTrust: availability.coachTrustAfter },
          },
    condition: { ...career.condition, availability },
  };
}

function injuryStep(
  career: CareerVNext,
  trainingLoad: number,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  const week = assessInjuryWeekVNext(career, trainingLoad, mechanics);
  if (week === null) return fail('career_vnext.engine_failed');
  if (week.outcome === 'NO_INJURY' || week.injury === null)
    return gameStep(
      { ...career, condition: { ...career.condition, availability: null } },
      mechanics,
    );
  const injury = week.injury;
  const next: CareerVNext = {
    ...career,
    condition: {
      ...career.condition,
      injury,
      injuryHistory:
        week.outcome === 'INJURY'
          ? [...career.condition.injuryHistory, injury]
          : career.condition.injuryHistory,
      availability: null,
    },
  };
  return publish(career, {
    ...next,
    ...(week.availability === null ? {} : withAvailability(next, week.availability)),
    flow: {
      type: 'INJURY',
      report: {
        weekIndex: career.season.weekIndex,
        outcome: week.outcome,
        injury,
        availability: week.availability,
      },
    },
  });
}

export function chooseInjuryVNext(
  career: CareerVNext,
  choiceId: string,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'INJURY' || career.flow.report.availability !== null)
    return fail('career_vnext.invalid_phase');
  const availability = injuryChoiceAvailabilityVNext(career, choiceId, mechanics);
  if (availability === null) return fail('career_vnext.invalid_choice');
  return publish(career, {
    ...career,
    ...withAvailability(career, availability),
    flow: { type: 'INJURY', report: { ...career.flow.report, availability } },
  });
}

function gameStep(career: CareerVNext, mechanics: CareerVNextMechanics): CareerVNextResult {
  const fixture = scheduledFixtureVNext(career, mechanics);
  if (fixture === null || career.program === null) return fail('career_vnext.engine_failed');
  const isHome = fixture.homeProgramId === career.program.programId;
  const round = postseasonRoundVNext(career);
  // Academic checkpoint weeks read the GPA after practice and events (the shipped rule).
  const academicHold =
    academicCheckpointWeekVNext(career.season.weekIndex, mechanics) &&
    academicStatusVNext(career.athlete.profile.state.gpa, mechanics) === 'INELIGIBLE';
  return publish(career, {
    ...career,
    flow: {
      type: 'GAME',
      game: {
        ...(academicHold ? { academicHold: true } : {}),
        ...(round === null ? {} : { round }),
        weekIndex: career.season.weekIndex,
        fixtureId: fixture.id,
        opponentProgramId: isHome ? fixture.awayProgramId : fixture.homeProgramId,
        isHome,
        stage: 'PREGAME',
        engine: null,
        sideline: [],
        slots: [],
        cursor: 0,
      },
    },
  });
}

function liveSnapIndex(engine: VNextGameState): number | null {
  return engine.game.type === 'ACTIVE' ? engine.game.pendingSnap.snapIndex : null;
}

export function kickoffVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (
    career.flow.type !== 'GAME' ||
    career.flow.game.stage !== 'PREGAME' ||
    career.program === null
  )
    return fail('career_vnext.invalid_phase');
  const game = career.flow.game;
  const fixture = scheduledFixtureVNext(career, mechanics);
  if (fixture === null || fixture.id !== game.fixtureId) return fail('career_vnext.engine_failed');
  const started = startVNextGame(
    career,
    fixture,
    game.weekIndex,
    mechanics,
    game.academicHold === true,
  );
  if (started === null) return fail('career_vnext.engine_failed');
  const engine = withVariedClockVNext(started, career.seed, career.season.index, game.weekIndex);
  const liveCount = engine.game.type === 'ACTIVE' ? engine.game.input.opportunityCount : 0;
  const repCount = Math.max(0, CAREER_VNEXT_MIN_GAME_DECISIONS - liveCount);
  const sideline = createSidelineReps(career, game.weekIndex, repCount, mechanics);
  const slots: GameSlotVNext[] = [
    ...sideline.map(({ repIndex }) => ({ kind: 'SIDELINE' as const, repIndex })),
    ...Array.from({ length: liveCount }, (_, snapIndex) => ({ kind: 'LIVE' as const, snapIndex })),
  ];
  // M12 look variety: this game saves its looks and avoids the last two games' looks.
  const avoidLookIds = career.log
    .filter((recap) => (recap.seasonIndex ?? 0) === career.season.index)
    .slice(-2)
    .flatMap(({ lookIds = [] }) => lookIds.filter((id): id is string => id !== null));
  return publish(career, {
    ...career,
    rng: { career: engine.game.rng },
    flow: {
      type: 'GAME',
      game: {
        ...game,
        stage: slots.length === 0 ? 'FINAL' : 'SNAP',
        engine,
        sideline,
        slots,
        cursor: 0,
        lookIds: [],
        avoidLookIds: [...new Set(avoidLookIds)],
      },
    },
  });
}

export function chooseSnapVNext(
  career: CareerVNext,
  decisionId: string,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'GAME' || career.flow.game.stage !== 'SNAP')
    return fail('career_vnext.invalid_phase');
  const game = career.flow.game;
  const slot = game.slots[game.cursor];
  if (slot === undefined || game.engine === null) return fail('career_vnext.invalid_phase');
  if (slot.kind === 'SIDELINE') {
    const rep = game.sideline[slot.repIndex];
    const resolved = rep === undefined ? null : resolveSidelineRep(rep, decisionId);
    if (resolved === null) return fail('career_vnext.invalid_choice');
    const sideline = game.sideline.map((entry, index) =>
      index === slot.repIndex ? resolved : entry,
    );
    return publish(career, {
      ...career,
      flow: { type: 'GAME', game: { ...game, sideline, stage: 'RESULT' } },
    });
  }
  if (liveSnapIndex(game.engine) !== slot.snapIndex) return fail('career_vnext.invalid_phase');
  const pending = game.engine.game.type === 'ACTIVE' ? game.engine.game.pendingSnap : null;
  if (pending === null || !(pending.decisionIds as readonly string[]).includes(decisionId))
    return fail('career_vnext.invalid_choice');
  // The hidden look decides which read wins this snap (M11); the kernel stays literal.
  const look = liveSnapLookVNext(career, game, slot.snapIndex, pending.familyId, mechanics);
  const resolved = resolveWithLookVNext(
    game.engine,
    pending.patternId,
    look,
    (state) => resolveVNextSnap(state, decisionId),
    decisionId,
  );
  if (resolved === null) return fail('career_vnext.engine_failed');
  const engine = withVariedClockVNext(resolved, career.seed, career.season.index, game.weekIndex);
  return publish(career, {
    ...career,
    rng: { career: engine.game.rng },
    flow: {
      type: 'GAME',
      game: {
        ...game,
        engine,
        stage: 'RESULT',
        ...(game.lookIds === undefined ? {} : { lookIds: [...game.lookIds, look?.id ?? null] }),
      },
    },
  });
}

/** RESULT → next decision, or FINAL once the engine has completed; FINAL → post-game. */
export function continueGameVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'GAME') return fail('career_vnext.invalid_phase');
  const game = career.flow.game;
  if (game.stage === 'RESULT') {
    const cursor = game.cursor + 1;
    const stage: GameDayVNext['stage'] = cursor < game.slots.length ? 'SNAP' : 'FINAL';
    return publish(career, { ...career, flow: { type: 'GAME', game: { ...game, cursor, stage } } });
  }
  if (game.stage !== 'FINAL' || game.engine?.game.type !== 'COMPLETE')
    return fail('career_vnext.invalid_phase');
  return settleGame(career, game, mechanics);
}

function settleGame(
  career: CareerVNext,
  game: GameDayVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  const completed = game.engine;
  if (completed === null || completed.game.type !== 'COMPLETE')
    return fail('career_vnext.engine_failed');
  const summary = completed.game.summary;
  const growth = completed.game.growth;
  const next = completed.game.nextPlayer;
  const fixture = scheduledFixtureVNext(career, mechanics);
  const world = career.season.world;
  if (
    fixture === null ||
    fixture.id !== game.fixtureId ||
    world === null ||
    career.program === null
  )
    return fail('career_vnext.engine_failed');
  const regulation = projectVNextWorldResult(completed, fixture);
  if (regulation === null) return fail('career_vnext.engine_failed');
  // No ties on Saturdays: a regulation tie goes to overtime before the world records it.
  // Overtime weighs the same matchup the game was played on (star impact included).
  const { result: playerResult, overtime } = resolveOvertimeVNext(
    career,
    fixture,
    regulation,
    withStarImpactVNext(career, mechanics),
  );
  const playerIsHome = fixture.homeProgramId === career.program.programId;
  const playerScore = playerIsHome ? playerResult.homeScore : playerResult.awayScore;
  const opponentScore = playerIsHome ? playerResult.awayScore : playerResult.homeScore;
  const resultId: GameRecapVNext['resultId'] =
    playerScore > opponentScore
      ? 'game_result_win'
      : playerScore < opponentScore
        ? 'game_result_loss'
        : 'game_result_tie';
  const worldAfter = resolveWorldRoundVNext(world, mechanics, playerResult, game.weekIndex);
  if (worldAfter === null) return fail('career_vnext.engine_failed');
  const record = worldAfter.programRecords.find(
    ({ programId }) => programId === career.program!.programId,
  );
  const rank = worldAfter.rankings.find(({ programId }) => programId === career.program!.programId);
  const profile = career.athlete.profile;
  const stakes = projectGameStakesVNext(career, game.opponentProgramId, game.isHome, mechanics);
  const boxScore = calibratedGradeVNext(profile.positionId as VNextPositionId, summary.gradeScore);
  const readScore = liveReadScoreVNext(completed);
  const coachGrade = coachGradeVNext(
    staffGameScoreVNext(boxScore, readScore),
    summary.opportunityCount,
  );
  const coachTrustAfter = Math.min(
    100,
    Math.max(0, growth.coachTrustBefore + coachTrustDeltaVNext(coachGrade)),
  );
  const recap: GameRecapVNext = {
    seasonIndex: career.season.index,
    ...(game.round === undefined ? {} : { round: game.round }),
    weekIndex: game.weekIndex,
    opponentProgramId: game.opponentProgramId,
    isHome: game.isHome,
    playerScore,
    opponentScore,
    resultId,
    ...(overtime === null ? {} : { overtime: true }),
    ...(game.lookIds === undefined ? {} : { lookIds: game.lookIds }),
    liveSnapCount: summary.opportunityCount,
    sideline: game.sideline,
    engine: completed,
    coachTrust: { before: growth.coachTrustBefore, after: coachTrustAfter },
    coachGrade,
    ...(summary.opportunityCount > 0
      ? {
          gradeParts: {
            box: boxScore,
            reads: readScore === null ? null : Math.round(readScore),
          },
        }
      : {}),
    body: { before: growth.bodyBefore, after: growth.bodyAfter },
    confidence: { before: growth.confidenceBefore, after: growth.confidenceAfter },
    recordAfter: { wins: record?.wins ?? 0, losses: record?.losses ?? 0, ties: record?.ties ?? 0 },
    rankAfter: rank?.rank ?? null,
    stakes,
    availabilityId: career.condition.availability?.availabilityId ?? 'injury_availability_full',
    ...(game.academicHold === true ? { academicHold: true } : {}),
  };
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        attributes: next.attributes,
        state: {
          ...profile.state,
          body: next.state.body,
          confidence: next.state.confidence,
          coachTrust: coachTrustAfter,
          // Saturdays build the name that NIL offers read.
          // A name grows fast early and slower once it is known (gains halve from 50).
          brand: Math.min(
            100,
            profile.state.brand +
              // M12: a program's exposure carries a Saturday further (or not as far).
              Math.floor(
                Math.round(
                  (brandFromGameVNext({
                    played: summary.opportunityCount > 0,
                    won: resultId === 'game_result_win',
                    coachGrade,
                    postseason: game.round !== undefined,
                    opponentRank: stakes?.opponentRank ?? null,
                  }) *
                    brandPermilleVNext(mechanics, career.program.programId)) /
                    1000,
                ) / (profile.state.brand >= 50 ? 2 : 1),
              ),
          ),
        },
      },
    },
    program: {
      ...career.program,
      room: { ...career.program.room, playerCoachTrust: coachTrustAfter },
    },
    season: {
      ...career.season,
      world: worldAfter,
      sidelineCredit: sidelineCreditFor(game.sideline),
    },
    condition: { ...career.condition, nextGameModifiers: NEUTRAL_GAME_MODIFIERS },
    flow: { type: 'POST_GAME', recap },
    log: [...career.log, recap],
  });
}

/**
 * Career-level Saturday evaluation (balance harness, 2026-09-30). Engine grades swing hard on one or
 * two snaps and their shipped trust bands punished the typical game, so trust eroded all season.
 * The staff grade weighs the engine grade toward a neutral 60 by live-snap volume, and trust moves
 * around that neutral. A Saturday of sideline reps only leaves trust alone (practice owns it).
 */
export const VNEXT_COACH_GRADE_TUNING = Object.freeze({ neutral: 60, priorSnaps: 2 });

/**
 * M11: each kernel's box score grades on its own curve (the WR kernel gives +6 per reception, the QB
 * kernel docks completions and sacks). The staff grade puts every role on the defenders' curve, so
 * awards, draft stock and coach trust mean the same thing at every position.
 */
export const VNEXT_GRADE_CALIBRATION: Readonly<Partial<Record<VNextPositionId, number>>> =
  Object.freeze({ position_qb: 11, position_rb: 6, position_wr: -17 });

export function calibratedGradeVNext(positionId: VNextPositionId, gradeScore: number): number {
  return Math.max(0, Math.min(100, gradeScore + (VNEXT_GRADE_CALIBRATION[positionId] ?? 0)));
}

/**
 * Playtest round 1: the staff grades the decision as much as the box score. A right read that the
 * play did not reward still earns credit; a lucky result on a wrong read does not carry the game.
 */
export const VNEXT_READ_GRADE_WEIGHT_PERMILLE = 500;

export function staffGameScoreVNext(boxScore: number, readScore: number | null): number {
  if (readScore === null) return boxScore;
  const weight = VNEXT_READ_GRADE_WEIGHT_PERMILLE;
  return Math.round((boxScore * (1000 - weight) + readScore * weight) / 1000);
}

export function coachGradeVNext(gradeScore: number, liveSnaps: number): number | null {
  if (liveSnaps <= 0) return null;
  const { neutral, priorSnaps } = VNEXT_COACH_GRADE_TUNING;
  return Math.round((gradeScore * liveSnaps + neutral * priorSnaps) / (liveSnaps + priorSnaps));
}

export function coachTrustDeltaVNext(coachGrade: number | null): number {
  if (coachGrade === null) return 0;
  return coachGrade >= 80
    ? 3
    : coachGrade >= 68
      ? 2
      : coachGrade >= 58
        ? 1
        : coachGrade >= 48
          ? 0
          : coachGrade >= 38
            ? -1
            : -3;
}

/** Weekly confidence reversion: a fifth of the distance to the anchor, rounded. */
export const VNEXT_CONFIDENCE_TUNING = Object.freeze({ anchor: 60, divisor: 5 });

function advanceWeek(career: CareerVNext, mechanics: CareerVNextMechanics): CareerVNextResult {
  const profile = career.athlete.profile;
  const rollover = derivePositionAlphaRolloverV2(
    profile.state,
    mechanics.trainingConfig,
    career.build.equippedSkillIds as readonly (SkillId | null)[],
    mechanics.skillBuilds,
    career.season.weekIndex,
  );
  if (rollover === null) return fail('career_vnext.engine_failed');
  const weekIndex = career.season.weekIndex + 1;
  const next: CareerVNext = {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        state: {
          ...profile.state,
          body: rollover.bodyAfter,
          preparation: rollover.preparationAfter,
          // Confidence drifts back toward its anchor each week, so it tracks recent form rather
          // than saturating (M10 balance).
          confidence: Math.min(
            100,
            Math.max(
              0,
              profile.state.confidence +
                Math.round(
                  (VNEXT_CONFIDENCE_TUNING.anchor - profile.state.confidence) /
                    VNEXT_CONFIDENCE_TUNING.divisor,
                ),
            ),
          ),
        },
      },
    },
    season: { ...career.season, weekIndex },
    condition: recoverConditionVNext(career.condition),
    flow: { type: 'WEEK_PLAN' },
  };
  // After the regular season (and between postseason rounds) the world decides what comes next.
  if (weekIndex >= CAREER_VNEXT_REGULAR_SEASON_WEEKS)
    return afterScheduleStep(career, next, mechanics);
  // M12: the midseason checkpoint, once a season, after the sixth game.
  const reviewed = developmentOfVNext(career).reviews.some(
    ({ seasonIndex }) => seasonIndex === career.season.index,
  );
  if (weekIndex === VNEXT_DEVELOPMENT_CALENDAR.midseasonWeek && !reviewed)
    return publish(career, {
      ...next,
      development: developmentOfVNext(career),
      flow: { type: 'MIDSEASON', review: midseasonReview(next, mechanics) },
    });
  return publish(career, next);
}

function midseasonReview(career: CareerVNext, mechanics: CareerVNextMechanics) {
  const games = career.log.filter((recap) => (recap.seasonIndex ?? 0) === career.season.index);
  const plays = games.flatMap(
    (recap) => recap.engine.game.keyPlayLog as unknown as readonly { decisionFit?: number }[],
  );
  const grades = games
    .map(({ coachGrade }) => coachGrade)
    .filter((grade): grade is number => typeof grade === 'number');
  const record = games.at(-1)?.recordAfter ?? { wins: 0, losses: 0, ties: 0 };
  return {
    seasonIndex: career.season.index,
    weekIndex: career.season.weekIndex,
    record,
    liveSnaps: plays.length,
    sharpReads: plays.filter((play) => (play.decisionFit ?? 0) >= 85).length,
    averageGrade:
      grades.length === 0
        ? null
        : Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length),
    overall: {
      start: career.season.startOverall,
      now: overallVNext(career.athlete.profile, mechanics),
    },
    depthRank: {
      start: career.season.startRank,
      now: career.program?.room.projection.rank ?? career.season.startRank,
    },
    suggestion: coachSuggestionVNext(career, mechanics),
    decision: null,
  };
}

export function nextWeekVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  // A v2 save may rest at the old SEASON_END stop; it continues straight into the postseason.
  if (career.flow.type === 'SEASON_END') return afterScheduleStep(career, career, mechanics);
  if (career.flow.type !== 'POST_GAME') return fail('career_vnext.invalid_phase');
  return advanceWeek(career, mechanics);
}

/**
 * M12 plan preview: what this exact plan would do to the athlete, from the same command (pure).
 * Only the athlete's own numbers are returned; teammates' practice weeks stay hidden until played.
 */
export function previewWeekPlanVNext(
  career: CareerVNext,
  focusIds: readonly string[],
  mechanics: CareerVNextMechanics,
) {
  const planned = planWeekVNext(career, focusIds, mechanics);
  if (!planned.ok || planned.career.flow.type !== 'PRACTICE_REPORT') return null;
  const report = planned.career.flow.report;
  const [first, , third] = report.focuses;
  const trainingLoad = Math.max(0, first.bodyBefore - third.bodyAfter);
  const state = planned.career.athlete.profile.state;
  return {
    focuses: report.focuses,
    grade: report.grade,
    practiceScore: report.practiceScore,
    body: { before: career.athlete.profile.state.body, after: state.body },
    preparation: { before: career.athlete.profile.state.preparation, after: state.preparation },
    gpa: { before: career.athlete.profile.state.gpa, after: state.gpa },
    gauge: { before: report.gaugeBefore, after: report.gaugeAfter },
    overall: {
      before: overallVNext(career.athlete.profile, mechanics),
      after: overallVNext(planned.career.athlete.profile, mechanics),
    },
    coachFocus: report.coachFocus ?? null,
    risk: injuryRiskBreakdownVNext(planned.career, trainingLoad, mechanics),
  };
}

/**
 * Drives the M12 calendar stops with default choices (the coach's recommended camp, accepting the
 * midseason focus or not): for harnesses, tests and quick play. Null outside camp and midseason.
 */
export function advanceCalendarVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  acceptFocus = true,
): CareerVNextResult | null {
  if (career.flow.type === 'CAMP')
    return career.flow.report === null
      ? chooseCampVNext(career, recommendedCampVNext(career, mechanics), mechanics)
      : continueCampVNext(career);
  if (career.flow.type === 'MIDSEASON') return decideMidseasonVNext(career, acceptFocus);
  return null;
}
