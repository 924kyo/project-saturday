import { transferMarketVNext } from './offers.js';
import { developmentPermilleVNext, roomMechanicsVNext, VNEXT_PROGRAM_TUNING } from './programs.js';
import type { ProgramId } from '../player/ids.js';
import {
  buildPositionRoomSeason,
  type PositionRoomCompetitor,
  type PositionRoomContext,
} from '../programs/position-room.js';
import { createRng, nextUint32, type RngState } from '../random/rng.js';
import type {
  WorldAlphaFixtureMechanics,
  WorldAlphaPlayerGameResult,
} from '../season/world-alpha.js';
import {
  VNEXT_ROOM_TUNING,
  fail,
  offerFromRoom,
  overallVNext,
  programRating,
  publish,
  roomFor,
} from './common.js';
import {
  CAREER_VNEXT_REGULAR_SEASON_WEEKS,
  CAREER_VNEXT_SEASONS,
  type AlumniVNext,
  type CareerEndingVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type OffseasonOptionVNext,
  type PostseasonRoundVNext,
  type SeasonFinishVNext,
  type SeasonReviewVNext,
  type StatTotalVNext,
  type VNextPositionId,
} from './types.js';
import { createConditionVNext, VNEXT_CAREER_WEEK_STRIDE } from './weekly.js';
import { VNEXT_RIVAL_TUNING } from './rivals.js';
import {
  developmentOfVNext,
  grantAttributeXpVNext,
  isOffseasonProgramIdVNext,
  offseasonProgramXpVNext,
  offseasonStartStateVNext,
} from './development.js';
import type { OffseasonProgramIdVNext } from './types.js';
import { canDeclareVNext, draftStockVNext, runDraftVNext } from './draft.js';
import { seasonAwardsVNext } from './awards.js';
import { VNEXT_NIL_TUNING } from './nil.js';
import {
  activePostseasonRoundVNext,
  conferenceChampionVNext,
  createSeasonWorldVNext,
  initializePostseasonVNext,
  postseasonRoundCountVNext,
  resolvePostseasonRoundVNext,
  resolveRegularRoundVNext,
  seasonFinishVNext,
  worldDefinitionVNext,
  type WorldStateVNext,
} from './world.js';

/**
 * The season arc: regular season → the 12-team bracket (first round, quarterfinal, semifinal,
 * final; a pre-M8 season in progress keeps its four-team bracket) → season review → offseason
 * (stay or transfer) → the next season, for four seasons, then the Alumni Wall.
 * World results stay in the world kernel; each new season and room draws from a named stream.
 */
const FINISH_ORDER: readonly SeasonFinishVNext[] = [
  'CHAMPION',
  'RUNNER_UP',
  'SEMIFINAL',
  'QUARTERFINAL',
  'FIRST_ROUND',
  'MISSED',
];

function includesProgram(
  fixture: { readonly homeProgramId: ProgramId; readonly awayProgramId: ProgramId },
  programId: ProgramId,
) {
  return fixture.homeProgramId === programId || fixture.awayProgramId === programId;
}

export function postseasonRoundVNext(
  career: Pick<CareerVNext, 'season'>,
): PostseasonRoundVNext | null {
  if (career.season.weekIndex < CAREER_VNEXT_REGULAR_SEASON_WEEKS) return null;
  return activePostseasonRoundVNext(career.season.world)?.round ?? null;
}

/** This week's fixture for the player's program: a regular round or the current postseason round. */
export function scheduledFixtureVNext(
  career: Pick<CareerVNext, 'program' | 'season'>,
  mechanics: CareerVNextMechanics,
): WorldAlphaFixtureMechanics | null {
  const programId = career.program?.programId;
  if (programId === undefined) return null;
  if (career.season.weekIndex < CAREER_VNEXT_REGULAR_SEASON_WEEKS)
    return (
      worldDefinitionVNext(career.season.world, mechanics)
        .regularSeasonRounds.find(({ roundNumber }) => roundNumber === career.season.weekIndex + 1)
        ?.fixtures.find((fixture) => includesProgram(fixture, programId)) ?? null
    );
  return (
    activePostseasonRoundVNext(career.season.world)?.fixtures.find((fixture) =>
      includesProgram(fixture, programId),
    ) ?? null
  );
}

/** Resolves the world round the player's game belongs to. */
export function resolveWorldRoundVNext(
  world: WorldStateVNext,
  mechanics: CareerVNextMechanics,
  playerResult: WorldAlphaPlayerGameResult | null,
  weekIndex: number,
): WorldStateVNext | null {
  return weekIndex < CAREER_VNEXT_REGULAR_SEASON_WEEKS
    ? resolveRegularRoundVNext(world, mechanics, playerResult)
    : resolvePostseasonRoundVNext(world, mechanics, playerResult);
}

function overallOf(career: CareerVNext, mechanics: CareerVNextMechanics): number {
  return overallVNext(career.athlete.profile, mechanics);
}

function statTotals(career: CareerVNext, seasonIndex: number): readonly StatTotalVNext[] {
  const totals = new Map<string, number>();
  for (const recap of career.log) {
    if ((recap.seasonIndex ?? 0) !== seasonIndex || recap.engine.game.type !== 'COMPLETE') continue;
    for (const [field, value] of Object.entries(
      recap.engine.game.summary.statLine as unknown as Record<string, number>,
    ))
      if (typeof value === 'number') totals.set(field, (totals.get(field) ?? 0) + value);
  }
  return [...totals.entries()]
    .filter(([, value]) => value !== 0)
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([field, value]) => ({ field, value }));
}

function seasonReview(
  career: CareerVNext,
  world: WorldStateVNext,
  mechanics: CareerVNextMechanics,
): SeasonReviewVNext | null {
  const programId = career.program?.programId;
  const finish = programId === undefined ? null : seasonFinishVNext(world, programId);
  if (programId === undefined || finish === null || world.postseason.type !== 'COMPLETE')
    return null;
  const postseason = world.postseason;
  const record = world.programRecords.find((entry) => entry.programId === programId);
  const rank = world.rankings.find((entry) => entry.programId === programId)?.rank ?? null;
  const seasonIndex = career.season.index;
  const games = career.log.filter((recap) => (recap.seasonIndex ?? 0) === seasonIndex);
  const weekLow = seasonIndex * VNEXT_CAREER_WEEK_STRIDE;
  const grades = games
    .map(({ coachGrade }) => coachGrade)
    .filter((grade): grade is number => typeof grade === 'number');
  const review: SeasonReviewVNext = {
    seasonIndex,
    programId,
    record: { wins: record?.wins ?? 0, losses: record?.losses ?? 0, ties: record?.ties ?? 0 },
    finalRank: rank,
    finish,
    championProgramId: postseason.championProgramId,
    conferenceChampion: conferenceChampionVNext(world, programId),
    games: games.length,
    liveGames: games.filter(({ liveSnapCount }) => liveSnapCount > 0).length,
    statTotals: statTotals(career, seasonIndex),
    overall: { start: career.season.startOverall, end: overallOf(career, mechanics) },
    depthRank: { start: career.season.startRank, end: career.program!.room.projection.rank },
    cardsOwned: career.build.ownedSkillIds.length,
    injuries: career.condition.injuryHistory.filter(
      ({ startedWeekIndex }) =>
        startedWeekIndex >= weekLow && startedWeekIndex < weekLow + VNEXT_CAREER_WEEK_STRIDE,
    ).length,
    averageGrade:
      grades.length === 0
        ? null
        : Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length),
  };
  const awarded: SeasonReviewVNext = {
    ...review,
    awards: seasonAwardsVNext(review, career.athlete.profile.positionId as VNextPositionId, games),
  };
  return {
    ...awarded,
    draftStock: draftStockVNext(career, [...career.history, awarded], mechanics),
  };
}

/**
 * After the regular season or a postseason game: run the world until the player's program has a
 * postseason game this week (→ plan that week) or the postseason is complete (→ season review).
 */
export function afterScheduleStep(
  previous: CareerVNext,
  next: Omit<CareerVNext, 'revision'>,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  let world = next.season.world;
  const programId = next.program?.programId;
  if (world === null || programId === undefined) return fail('career_vnext.engine_failed');
  if (world.postseason.type === 'PENDING') {
    const initialized = initializePostseasonVNext(world, mechanics);
    if (initialized === null) return fail('career_vnext.engine_failed');
    world = initialized;
  }
  // A bye or elimination runs the bracket on without the player (no player game, no career RNG).
  for (let guard = 0; guard <= postseasonRoundCountVNext(world); guard += 1) {
    const active = activePostseasonRoundVNext(world);
    if (active === null) break;
    if (active.fixtures.some((fixture) => includesProgram(fixture, programId)))
      return publish(previous, {
        ...next,
        season: {
          ...next.season,
          world,
          weekIndex: CAREER_VNEXT_REGULAR_SEASON_WEEKS + active.index,
        },
        flow: { type: 'WEEK_PLAN' },
      });
    const resolved: WorldStateVNext | null = resolvePostseasonRoundVNext(world, mechanics, null);
    if (resolved === null) return fail('career_vnext.engine_failed');
    world = resolved;
  }
  const withWorld = { ...next, season: { ...next.season, world } } as CareerVNext;
  const review = seasonReview(withWorld, world, mechanics);
  if (review === null) return fail('career_vnext.engine_failed');
  return publish(previous, {
    ...withWorld,
    flow: { type: 'SEASON_REVIEW', review },
    history: [...next.history, review],
  });
}

/** Offseason trust carry-over: most of it stays with the staff you know, little travels. */
function carriedTrust(career: CareerVNext, stay: boolean, mechanics: CareerVNextMechanics) {
  const trust = career.athlete.profile.state.coachTrust;
  const lifecycle = mechanics.lifecycle;
  return stay
    ? Math.round((trust * lifecycle.stayTrustRetentionPermille) / 1_000)
    : Math.min(
        100,
        lifecycle.transferRelationshipBaseline +
          Math.round((trust * lifecycle.transferTrustRetentionPermille) / 1_000),
      );
}

/**
 * M12 (playtest report: after one promotion every later season was a starter's): the transfer
 * portal. Each offseason the strongest incoming freshman's slot goes instead to an experienced
 * transfer near the athlete's level, plus the program's talent premium, drawn from
 * `:vnext:portal:<season>:<program>`. A starter's job is re-earned in camp; a weak program's
 * newcomer rarely beats an incumbent, a strong program's often can.
 */
export const VNEXT_PORTAL_TUNING = Object.freeze({
  /** Talent around the athlete's: ability + premium + (0…spread) − below. */
  spread: 8,
  below: 0,
  /** The staff recruited him: trust and experience of an established upperclassman. */
  trustBonus: 22,
  experienceBonus: 20,
});

export function withPortalArrivalVNext(
  career: CareerVNext,
  programId: ProgramId,
  competitors: readonly PositionRoomCompetitor[],
  seasonIndex: number,
  mechanics: CareerVNextMechanics,
): readonly PositionRoomCompetitor[] {
  const freshmen = competitors
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.classYear === 1);
  if (freshmen.length === 0) return competitors;
  const target = freshmen.sort(
    (left, right) => right.entry.talentFit - left.entry.talentFit || left.index - right.index,
  )[0]!;
  const tuning = VNEXT_PORTAL_TUNING;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const premium =
    Math.round(
      ((programRating(mechanics, programId, positionId) - VNEXT_ROOM_TUNING.neutralProgramRating) *
        VNEXT_ROOM_TUNING.premiumPerRatingPointPermille) /
        1000,
    ) + VNEXT_ROOM_TUNING.premiumOffset;
  const draw =
    nextUint32(createRng(`${String(career.seed)}:vnext:portal:${seasonIndex}:${programId}`)).value %
    (tuning.spread + 1);
  const talent = Math.max(
    10,
    Math.min(95, overallOf(career, mechanics) + premium + draw - tuning.below),
  );
  const portal: PositionRoomCompetitor = {
    ...target.entry,
    classYear: 3,
    talentFit: Math.max(target.entry.talentFit, talent),
    coachTrust: Math.min(100, VNEXT_ROOM_TUNING.competitorTrustBase + tuning.trustBonus),
    experienceReadiness: Math.min(
      100,
      VNEXT_ROOM_TUNING.experienceReadinessBase + tuning.experienceBonus,
    ),
  };
  return competitors.map((entry, index) => (index === target.index ? portal : entry));
}

/** Next season's room: returning players age a year, seniors graduate, freshmen arrive. */
export function nextSeasonRoomVNext(
  career: CareerVNext,
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
): { readonly room: PositionRoomContext; readonly coachTrust: number } | null {
  if (career.program === null) return null;
  const stay = programId === career.program.programId;
  const seasonIndex = career.season.index + 1;
  const coachTrust = carriedTrust(career, stay, mechanics);
  const experienceReadiness = Math.min(100, 45 + 8 * seasonIndex);
  const profile = career.athlete.profile;
  const generated = roomFor(
    {
      seed: career.seed,
      athlete: {
        ...career.athlete,
        profile: { ...profile, state: { ...profile.state, coachTrust } },
      },
    },
    programId,
    mechanics,
    { seasonIndex, experienceReadiness },
  );
  if (!generated.ok) return null;
  const fresh = generated.generated.context.competitors.map((competitor) => ({
    ...competitor,
    id: `${competitor.id}_s${seasonIndex}` as PositionRoomCompetitor['id'],
  }));
  let competitors: readonly PositionRoomCompetitor[] = fresh;
  if (stay) {
    const returning = career.program.room.competitors
      .filter(({ classYear }) => classYear < 4)
      .map((competitor) => ({
        ...competitor,
        classYear: (competitor.classYear + 1) as 2 | 3 | 4,
        talentFit: Math.min(100, competitor.talentFit + VNEXT_RIVAL_TUNING.offseasonTalentGain),
        coachTrust: Math.min(100, competitor.coachTrust + 5),
        experienceReadiness: Math.min(100, competitor.experienceReadiness + 8),
      }));
    const names = new Set(returning.map((entry) => `${entry.givenNameId}|${entry.familyNameId}`));
    const incoming = fresh
      .filter((entry) => !names.has(`${entry.givenNameId}|${entry.familyNameId}`))
      .map((entry) => ({
        ...entry,
        classYear: 1 as const,
        coachTrust: VNEXT_ROOM_TUNING.competitorTrustBase,
        experienceReadiness: Math.max(0, VNEXT_ROOM_TUNING.experienceReadinessBase - 8),
      }));
    competitors = [...returning, ...incoming].slice(0, fresh.length);
    if (competitors.length < fresh.length) return null;
    competitors = withPortalArrivalVNext(career, programId, competitors, seasonIndex, mechanics);
  }
  // M12: a new coordinator can change the scheme, so every style's fit is re-read for the season.
  const roomMechanics = roomMechanicsVNext(
    mechanics,
    career.seed,
    programId,
    profile.positionId,
    seasonIndex,
  );
  const room = buildPositionRoomSeason(
    {
      programId,
      playerId: profile.id,
      playerAttributes: profile.attributes,
      playerArchetypeId: profile.archetypeId,
      playerCoachTrust: coachTrust,
      playerPracticeForm: 50,
      playerExperienceReadiness: experienceReadiness,
      competitors: competitors.map((competitor) => ({
        ...competitor,
        schemeFit:
          roomMechanics.schemeFitByArchetype[competitor.archetypeId] ?? competitor.schemeFit,
      })),
    },
    roomMechanics,
  );
  return room === undefined ? null : { room, coachTrust };
}

/** Stay plus three transfer destinations around the athlete's level (a reach, a fit, a role). */
export function offseasonOptionsVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly OffseasonOptionVNext[] | null {
  if (career.program === null) return null;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const current = career.program.programId;
  // M12: the market reads ability plus what the season showed (awards, role, grades, exposure).
  const market = transferMarketVNext(career, mechanics);
  if (market === null) return null;
  const target = market.target;
  const ranked = mechanics.world.programProfiles
    .filter(({ programId }) => programId !== current)
    .map(({ programId }) => ({
      programId,
      rating: programRating(mechanics, programId, positionId),
    }))
    .sort(
      (left, right) => left.rating - right.rating || (left.programId < right.programId ? -1 : 1),
    );
  const bands: readonly (readonly [number, number])[] = [
    [target + 4, target + 14],
    [target - 3, target + 3],
    [target - 12, target - 4],
  ];
  let rng: RngState = createRng(`${String(career.seed)}:vnext:transfer:${career.season.index}`);
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
  const options: OffseasonOptionVNext[] = [];
  for (const [kind, programId] of [
    ['STAY', current] as const,
    ...chosen
      .sort((left, right) => right.rating - left.rating)
      .map(({ programId }) => ['TRANSFER', programId] as const),
  ]) {
    const next = nextSeasonRoomVNext(career, programId, mechanics);
    if (next === null) return null;
    const rating = programRating(mechanics, programId, positionId);
    options.push({ kind, ...offerFromRoom(programId, rating, next.room) });
  }
  return options;
}

function alumniFor(career: CareerVNext, ending: CareerEndingVNext): AlumniVNext {
  const history = career.history;
  const totals = new Map<string, number>();
  for (const review of history)
    for (const { field, value } of review.statTotals)
      totals.set(field, (totals.get(field) ?? 0) + value);
  const programIds: ProgramId[] = [];
  for (const { programId } of history)
    if (!programIds.includes(programId)) programIds.push(programId);
  const profile = career.athlete.profile;
  return {
    careerId: career.careerId,
    displayName: profile.displayName,
    positionId: profile.positionId as VNextPositionId,
    archetypeId: profile.archetypeId,
    programIds,
    seasons: history.length,
    championships: history.filter(({ finish }) => finish === 'CHAMPION').length,
    bestFinish:
      FINISH_ORDER.find((finish) => history.some((review) => review.finish === finish)) ?? 'MISSED',
    record: history.reduce(
      (sum, { record }) => ({
        wins: sum.wins + record.wins,
        losses: sum.losses + record.losses,
        ties: sum.ties + record.ties,
      }),
      { wins: 0, losses: 0, ties: 0 },
    ),
    liveGames: history.reduce((sum, { liveGames }) => sum + liveGames, 0),
    statTotals: [...totals.entries()]
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([field, value]) => ({ field, value })),
    finalOverall: history.at(-1)?.overall.end ?? profile.overall,
    bestDepthRank: Math.min(...history.map(({ depthRank }) => depthRank.end), 8),
    awards: history.flatMap(({ awards = [] }) => awards),
    conferenceTitles: history.filter(({ conferenceChampion }) => conferenceChampion === true)
      .length,
    ending,
    // Retiring leaves football; graduating or declaring goes through the Pro Draft.
    ...(ending === 'RETIRED' ? {} : { draft: runDraftVNext(career) }),
  };
}

/** Review → offseason decision, or the Alumni Wall after the senior season. */
export function continueSeasonReviewVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): CareerVNextResult {
  if (career.flow.type !== 'SEASON_REVIEW') return fail('career_vnext.invalid_phase');
  if (career.season.index + 1 >= CAREER_VNEXT_SEASONS)
    return publish(career, {
      ...career,
      flow: { type: 'CAREER_COMPLETE', alumni: alumniFor(career, 'GRADUATED') },
    });
  const options = offseasonOptionsVNext(career, mechanics);
  if (options === null) return fail('career_vnext.engine_failed');
  return publish(career, { ...career, flow: { type: 'OFFSEASON', options } });
}

/** Ends the career early from the offseason; the record goes to the Alumni Wall. */
export function retireVNext(career: CareerVNext): CareerVNextResult {
  if (career.flow.type !== 'OFFSEASON') return fail('career_vnext.invalid_phase');
  return publish(career, {
    ...career,
    flow: { type: 'CAREER_COMPLETE', alumni: alumniFor(career, 'RETIRED') },
  });
}

/** Declares for the Pro Draft from the offseason (after the junior season): the career ends. */
export function declareForDraftVNext(career: CareerVNext): CareerVNextResult {
  if (!canDeclareVNext(career)) return fail('career_vnext.invalid_phase');
  return publish(career, {
    ...career,
    flow: { type: 'CAREER_COMPLETE', alumni: alumniFor(career, 'DECLARED') },
  });
}

/**
 * Commits to staying or transferring, with an optional offseason program (M12). The next season
 * opens at preseason camp.
 */
export function commitOffseasonVNext(
  career: CareerVNext,
  programId: ProgramId,
  mechanics: CareerVNextMechanics,
  offseasonProgramId: OffseasonProgramIdVNext | null = null,
): CareerVNextResult {
  if (career.flow.type !== 'OFFSEASON' || career.program === null)
    return fail('career_vnext.invalid_phase');
  if (!career.flow.options.some((option) => option.programId === programId))
    return fail('career_vnext.invalid_choice');
  if (offseasonProgramId !== null && !isOffseasonProgramIdVNext(offseasonProgramId))
    return fail('career_vnext.invalid_choice');
  const next = nextSeasonRoomVNext(career, programId, mechanics);
  if (next === null) return fail('career_vnext.engine_failed');
  const seasonIndex = career.season.index + 1;
  // Every new season is played in the conference world, including a pre-M8 save's next season.
  const world = createSeasonWorldVNext(String(career.seed), seasonIndex, programId, mechanics);
  if (world === null) return fail('career_vnext.engine_failed');
  const profile = career.athlete.profile;
  // M12 offseason program: XP at next season's potential, and where that season starts.
  const nextSeason = {
    athlete: career.athlete,
    season: { ...career.season, index: seasonIndex },
    program: career.program,
  };
  const programXp =
    offseasonProgramId === null
      ? []
      : offseasonProgramXpVNext(
          career,
          offseasonProgramId,
          mechanics,
          // Trained for the destination: next season's potential × its development tier.
          developmentPermilleVNext(nextSeason, mechanics, programId),
        );
  const attributes = programXp.reduce(
    (current, { attributeId, xp }) => grantAttributeXpVNext(current, attributeId, xp),
    profile.attributes,
  );
  const start = offseasonStartStateVNext(
    {
      ...profile.state,
      // The name fades a little without Saturdays.
      brand: Math.max(0, profile.state.brand - VNEXT_NIL_TUNING.brand.offseasonFade),
    },
    offseasonProgramId,
  );
  const development = developmentOfVNext(career);
  return publish(career, {
    ...career,
    athlete: {
      ...career.athlete,
      profile: {
        ...profile,
        attributes,
        // The offseason heals and resets preparation for a new playbook year (or the program's start).
        state: {
          ...profile.state,
          ...start,
          // M12: a transfer opens camp behind on a new playbook (staying keeps the old one).
          preparation:
            programId === career.program.programId
              ? start.preparation
              : Math.max(0, start.preparation + VNEXT_PROGRAM_TUNING.transferPreparation),
          coachTrust: next.coachTrust,
        },
      },
    },
    program: { programId, room: next.room },
    season: {
      index: seasonIndex,
      weekIndex: 0,
      world,
      sidelineCredit: 0,
      startOverall: overallOf(career, mechanics),
      startRank: next.room.projection.rank,
    },
    condition: {
      ...createConditionVNext(),
      injuryHistory: career.condition.injuryHistory,
      eventHistory: career.condition.eventHistory,
    },
    development: {
      ...development,
      focus: null,
      offseason:
        offseasonProgramId === null
          ? development.offseason
          : [...development.offseason, { seasonIndex, programId: offseasonProgramId }],
    },
    // M12: every season opens with preseason camp.
    flow: { type: 'CAMP', report: null },
    // The log is this season's games; finished seasons live on as reviews in `history`.
    log: [],
  });
}
