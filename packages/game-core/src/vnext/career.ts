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
import {
  createCommonPositionProficiencyUses,
  type PositionFocusEvidenceV2,
  type PositionFocusId,
} from '../weekly/position-focus.js';
import { resolvePositionFocusWithSkills } from '../weekly/position-focus-skills.js';
import {
  attemptBreakthroughVNext,
  loadoutVNext,
  skillDefinitionsVNext,
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
import { projectVNextWorldResult, resolveVNextSnap, startVNextGame } from './game.js';
import { createSeasonWorldVNext } from './world.js';
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
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type GameDayVNext,
  type GameRecapVNext,
  type GameSlotVNext,
  type RecruitOfferVNext,
  type VNextGameState,
  type VNextPositionId,
} from './types.js';

const CONTENT_VERSION = 1;
export { isVNextPositionId, VNEXT_ROOM_TUNING } from './common.js';

export interface CreateCareerVNextInput {
  readonly seed: RngSeed;
  readonly identity: PositionPlayerCreationIdentity;
}

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
  const profile = created.player;
  const recruiting = derivePositionRecruitingProfile(profile, mechanics.room, 0);
  if (recruiting === undefined) return fail('career_vnext.invalid_input');
  const positionId = profile.positionId as VNextPositionId;
  const athlete = {
    profile,
    proficiencyUses: createPositionTrainingProficiencyUses(positionId),
    sharedProficiencyUses: createCommonPositionProficiencyUses(),
    breakthroughGauge: 0,
  };
  // Four realistic suitors around the recruit's level: a reach, two fits and an early-role path.
  const target = 50 + Math.round((recruiting.recruitScore - 50) * 0.6);
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
    flow: { type: 'WEEK_PLAN' },
  });
}

/** Focus catalog for the athlete's position: position training plus shared focuses. */
export function focusDefinitionsVNext(career: CareerVNext, mechanics: CareerVNextMechanics) {
  const positionId = career.athlete.profile.positionId;
  return [
    ...mechanics.trainingActions.filter((action) => action.positionId === positionId),
    ...mechanics.commonFocuses,
  ];
}

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
  let state = {
    model: 'position_focus_state_v2' as const,
    training: {
      positionId: profile.positionId as VNextPositionId,
      attributes: profile.attributes,
      proficiencyUses: career.athlete.proficiencyUses,
      state: {
        body: profile.state.body,
        preparation: profile.state.preparation,
        confidence: profile.state.confidence,
      },
    },
    sharedProficiencyUses: career.athlete.sharedProficiencyUses,
    gpa: profile.state.gpa,
  };
  const evidence: PositionFocusEvidenceV2[] = [];
  // Equipped cards shape each focus through the shared skill-aware resolver.
  const loadout = loadoutVNext(career, mechanics);
  const cards = skillDefinitionsVNext(mechanics);
  for (const [index, focusId] of focusIds.entries()) {
    const definition = definitions.find(({ id }) => id === focusId);
    const tagIds = mechanics.skillBuilds.actionTags[focusId as PositionFocusId];
    if (definition === undefined || tagIds === undefined)
      return fail('career_vnext.invalid_choice');
    const resolved = resolvePositionFocusWithSkills(
      state,
      definition,
      mechanics.trainingConfig,
      career.condition.injury,
      mechanics.focusInjuryPolicies,
      loadout,
      cards,
      {
        id: definition.id,
        bodyDelta: definition.bodyDelta,
        attributeXp: definition.attributeXp,
        tagIds,
      } as never,
      {
        body: state.training.state.body,
        actionId: definition.id,
        actionIndex: index as 0 | 1 | 2,
        planActionIds: focusIds,
        previousActionId: index === 0 ? null : focusIds[index - 1]!,
      } as never,
    );
    if (!resolved.ok) return fail('career_vnext.invalid_choice');
    state = resolved.next;
    evidence.push(resolved.evidence);
  }
  const room = career.program.room;
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
  const gaugeBefore = career.athlete.breakthroughGauge;
  const gaugeAfter = Math.min(160, gaugeBefore + grade.breakthroughGaugePoints);
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        attributes: state.training.attributes,
        state: {
          ...offField.state,
          coachTrust: updated.evidence.coachTrust.after,
        },
      },
      proficiencyUses: state.training.proficiencyUses,
      sharedProficiencyUses: state.sharedProficiencyUses,
      breakthroughGauge: gaugeAfter,
    },
    program: { ...career.program, room: updated.context },
    season: { ...career.season, sidelineCredit: 0 },
    nil: offField.nil,
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
      },
    },
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
  const engine = startVNextGame(
    career,
    fixture,
    game.weekIndex,
    mechanics,
    game.academicHold === true,
  );
  if (engine === null) return fail('career_vnext.engine_failed');
  const liveCount = engine.game.type === 'ACTIVE' ? engine.game.input.opportunityCount : 0;
  const repCount = Math.max(0, CAREER_VNEXT_MIN_GAME_DECISIONS - liveCount);
  const sideline = createSidelineReps(career, game.weekIndex, repCount, mechanics);
  const slots: GameSlotVNext[] = [
    ...sideline.map(({ repIndex }) => ({ kind: 'SIDELINE' as const, repIndex })),
    ...Array.from({ length: liveCount }, (_, snapIndex) => ({ kind: 'LIVE' as const, snapIndex })),
  ];
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
      },
    },
  });
}

export function chooseSnapVNext(career: CareerVNext, decisionId: string): CareerVNextResult {
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
  const engine = resolveVNextSnap(game.engine, decisionId);
  if (engine === null) return fail('career_vnext.engine_failed');
  return publish(career, {
    ...career,
    rng: { career: engine.game.rng },
    flow: { type: 'GAME', game: { ...game, engine, stage: 'RESULT' } },
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
  const { result: playerResult, overtime } = resolveOvertimeVNext(
    career,
    fixture,
    regulation,
    mechanics,
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
  const coachGrade = coachGradeVNext(summary.gradeScore, summary.opportunityCount);
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
    liveSnapCount: summary.opportunityCount,
    sideline: game.sideline,
    engine: completed,
    coachTrust: { before: growth.coachTrustBefore, after: coachTrustAfter },
    coachGrade,
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
          brand: Math.min(
            100,
            profile.state.brand +
              brandFromGameVNext({
                played: summary.opportunityCount > 0,
                won: resultId === 'game_result_win',
                coachGrade,
                postseason: game.round !== undefined,
                opponentRank: stakes?.opponentRank ?? null,
              }),
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
        },
      },
    },
    season: { ...career.season, weekIndex },
    condition: recoverConditionVNext(career.condition),
    flow: { type: 'WEEK_PLAN' },
  };
  // After the regular season (and between postseason rounds) the world decides what comes next.
  return weekIndex >= CAREER_VNEXT_REGULAR_SEASON_WEEKS
    ? afterScheduleStep(career, next, mechanics)
    : publish(career, next);
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
