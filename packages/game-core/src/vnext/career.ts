import { deriveCareerId } from '../player/creation.js';
import { deepFreeze } from '../player/immutable.js';
import type { ProgramId } from '../player/ids.js';
import {
  createPositionPlayerProfile,
  type PositionPlayerCreationIdentity,
} from '../player/position-creation.js';
import {
  derivePositionRecruitingProfile,
  generatePositionRoom,
  updatePositionRoomAfterPractice,
  type PositionRoomContext,
} from '../programs/position-room.js';
import { createRng, nextUint32, type RngSeed, type RngState } from '../random/rng.js';
import type { SkillId } from '../skills/ids.js';
import { derivePositionAlphaRolloverV2 } from '../season/position-alpha-focus-v2.js';
import {
  createWorldAlphaSeason,
  resolveNextWorldAlphaRegularRound,
  type WorldAlphaFixtureMechanics,
  type WorldAlphaSeasonState,
} from '../season/world-alpha.js';
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
import { projectVNextWorldResult, resolveVNextSnap, startVNextGame } from './game.js';
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
  type CareerVNextFailure,
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

const fail = (reason: CareerVNextFailure): CareerVNextResult => deepFreeze({ ok: false, reason });

function publish(
  previous: CareerVNext | null,
  next: Omit<CareerVNext, 'revision'>,
): CareerVNextResult {
  // JSON-canonical publication: saved and in-memory careers are identical by construction
  // (e.g. engine arithmetic may produce -0, which JSON stores as 0).
  const career = JSON.parse(
    JSON.stringify({ ...next, revision: (previous?.revision ?? -1) + 1 }),
  ) as CareerVNext;
  return deepFreeze({ ok: true as const, career });
}

export function isVNextPositionId(value: unknown): value is VNextPositionId {
  return (
    value === 'position_qb' ||
    value === 'position_rb' ||
    value === 'position_wr' ||
    value === 'position_cb'
  );
}

function programRating(
  mechanics: CareerVNextMechanics,
  programId: ProgramId,
  positionId: VNextPositionId,
) {
  return (
    mechanics.world.programProfiles.find((profile) => profile.programId === programId)
      ?.positionRatings[positionId] ?? 66
  );
}

/**
 * VNext room tuning is relative to the recruit: stronger programs stack more talent ahead of a
 * freshman, weaker ones offer an earlier path. Competitor trust grows with class year from a base
 * a freshman can compete with, so the depth climb is live from week one.
 */
export const VNEXT_ROOM_TUNING = Object.freeze({
  neutralProgramRating: 66,
  premiumPerRatingPointPermille: 600,
  premiumOffset: -1,
  talentSpread: 10,
  competitorTrustBase: 16,
  practiceFormBase: 52,
  experienceReadinessBase: 44,
});

/** Named derived stream: the offer preview and the committed room are the same draw sequence. */
function roomFor(
  career: Pick<CareerVNext, 'seed' | 'athlete'>,
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
) {
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const tuning = VNEXT_ROOM_TUNING;
  const config = (roomTalentMean: number) => ({
    programId,
    roomTalentMean,
    roomTalentSpread: tuning.talentSpread,
    trustBase: tuning.competitorTrustBase,
    practiceFormBase: tuning.practiceFormBase,
    experienceReadinessBase: tuning.experienceReadinessBase,
    playerCoachTrustBonus: 0,
    playerPracticeForm: 50,
    playerExperienceReadiness: 45,
  });
  const rng = createRng(`${String(career.seed)}:vnext:room:${programId}`);
  // Zero-cost probe (discarded) reads the recruit's talent fit exactly as the depth model does.
  const probe = generatePositionRoom(
    career.athlete.profile,
    rng,
    mechanics.roomNames,
    mechanics.room,
    config(60),
  );
  if (!probe.ok) return probe;
  const playerTalent =
    probe.generated.context.evaluations.find(
      ({ participantId }) => participantId === probe.generated.context.playerId,
    )?.components.talentFit ?? 50;
  const premium =
    Math.round(
      ((programRating(mechanics, programId, positionId) - tuning.neutralProgramRating) *
        tuning.premiumPerRatingPointPermille) /
        1000,
    ) + tuning.premiumOffset;
  return generatePositionRoom(
    career.athlete.profile,
    rng,
    mechanics.roomNames,
    mechanics.room,
    config(
      Math.max(tuning.talentSpread, Math.min(100 - tuning.talentSpread, playerTalent + premium)),
    ),
  );
}

function offerFromRoom(
  programId: ProgramId,
  rating: number,
  room: PositionRoomContext,
): RecruitOfferVNext {
  const rank = room.projection.rank;
  const starterId = room.depthOrderIds[0];
  const starter = room.competitors.find(({ id }) => id === starterId);
  return {
    programId,
    programRating: rating,
    preview: {
      rank,
      roleId: room.projection.roleId,
      opportunity: room.projection,
      playersAhead: rank - 1,
      starterClassYear: starter?.classYear ?? 4,
    },
  };
}

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
    season: { index: 0, weekIndex: 0, world: null, sidelineCredit: 0 },
    condition: createConditionVNext(),
    flow: { type: 'RECRUITING' },
    log: [],
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
  const world = createWorldAlphaSeason(
    mechanics.world,
    createRng(`${String(career.seed)}:vnext:world:0`),
    0,
    programId,
  );
  if (!world.ok) return fail('career_vnext.engine_failed');
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
    season: { ...career.season, world: world.value },
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
  const practiceScore = Math.max(0, Math.min(100, grade.score + career.season.sidelineCredit));
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
          ...profile.state,
          ...state.training.state,
          gpa: state.gpa,
          coachTrust: updated.evidence.coachTrust.after,
        },
      },
      proficiencyUses: state.training.proficiencyUses,
      sharedProficiencyUses: state.sharedProficiencyUses,
      breakthroughGauge: gaugeAfter,
    },
    program: { ...career.program, room: updated.context },
    season: { ...career.season, sidelineCredit: 0 },
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
      },
    },
  });
}

export function scheduledFixtureVNext(
  career: Pick<CareerVNext, 'program' | 'season'>,
  mechanics: CareerVNextMechanics,
): WorldAlphaFixtureMechanics | null {
  const programId = career.program?.programId;
  if (programId === undefined) return null;
  return (
    mechanics.world.regularSeasonRounds
      .find(({ roundNumber }) => roundNumber === career.season.weekIndex + 1)
      ?.fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === programId || awayProgramId === programId,
      ) ?? null
  );
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
  return injuryStep(career, trainingLoad, mechanics);
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
  const fixture = mechanics.world.regularSeasonRounds
    .flatMap(({ fixtures }) => fixtures)
    .find(({ id }) => id === game.fixtureId);
  if (fixture === undefined) return fail('career_vnext.engine_failed');
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
  const fixture = mechanics.world.regularSeasonRounds
    .flatMap(({ fixtures }) => fixtures)
    .find(({ id }) => id === game.fixtureId);
  const world = career.season.world;
  if (fixture === undefined || world === null || career.program === null)
    return fail('career_vnext.engine_failed');
  const playerResult = projectVNextWorldResult(completed, fixture);
  const resolvedWorld = resolveNextWorldAlphaRegularRound(world, mechanics.world, playerResult);
  if (!resolvedWorld.ok) return fail('career_vnext.engine_failed');
  const worldAfter: WorldAlphaSeasonState = resolvedWorld.value.state;
  const record = worldAfter.programRecords.find(
    ({ programId }) => programId === career.program!.programId,
  );
  const rank = worldAfter.rankings.find(({ programId }) => programId === career.program!.programId);
  const profile = career.athlete.profile;
  const stakes = projectGameStakesVNext(career, game.opponentProgramId, game.isHome, mechanics);
  const recap: GameRecapVNext = {
    weekIndex: game.weekIndex,
    opponentProgramId: game.opponentProgramId,
    isHome: game.isHome,
    playerScore: summary.playerTeamScore,
    opponentScore: summary.opponentScore,
    resultId: summary.resultId,
    liveSnapCount: summary.opportunityCount,
    sideline: game.sideline,
    engine: completed,
    coachTrust: { before: growth.coachTrustBefore, after: growth.coachTrustAfter },
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
          coachTrust: next.state.coachTrust,
        },
      },
    },
    program: {
      ...career.program,
      room: { ...career.program.room, playerCoachTrust: next.state.coachTrust },
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
  return publish(career, {
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
    flow:
      weekIndex >= CAREER_VNEXT_REGULAR_SEASON_WEEKS
        ? { type: 'SEASON_END' }
        : { type: 'WEEK_PLAN' },
  });
}

export function nextWeekVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'POST_GAME') return fail('career_vnext.invalid_phase');
  return advanceWeek(career, mechanics);
}
