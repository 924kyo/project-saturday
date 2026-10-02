import { createRng, nextUint32 } from '../random/rng.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  CombineResultVNext,
  DraftResultVNext,
  DraftStockBandVNext,
  DraftStockVNext,
  SeasonReviewVNext,
  VNextPositionId,
} from './types.js';
import { programRating } from './common.js';
import { awardStockPointsVNext } from './awards.js';
import { draftExposureBonusVNext } from './programs.js';

/**
 * Pro Draft stock (fictional pro framing). Stock is a transparent weighted blend of saved facts,
 * never overall alone: ability, production (the staff's grades), program exposure, starting
 * experience, big games and durability. The projection is a band, not a pick; the draft itself
 * adds one bounded draw on its own named stream, so a projection can slide or climb a little.
 */
export const VNEXT_DRAFT_TUNING = Object.freeze({
  weightsPermille: {
    ability: 450,
    production: 200,
    exposure: 100,
    experience: 150,
    bigGames: 100,
  },
  injuryPenalty: 2,
  maximumInjuryPenalty: 8,
  /**
   * Bands over the stock score (projection shown to the player). Playtest round 2: grades now weigh
   * the read, which lifts Production for a decent reader by about 12 (+2.4 stock), so bands and
   * floors moved up 2 to keep the draft a real outcome for some careers, not all.
   */
  bands: { round1: 80, rounds2to3: 72, rounds4to7: 63 },
  /** Draft-day draw applied to the stock, inclusive. */
  variance: 4,
  /** Minimum drafted score per round 1..7; below the last is undrafted. */
  roundFloors: [82, 78, 74, 70, 67, 65, 63],
  picksPerRound: 32,
  /** A declaration is open after the junior season (from the fourth year's offseason on). */
  declareFromSeasonIndex: 2,
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function draftBandVNext(score: number): DraftStockBandVNext {
  const { bands } = VNEXT_DRAFT_TUNING;
  return score >= bands.round1
    ? 'ROUND_1'
    : score >= bands.rounds2to3
      ? 'ROUNDS_2_3'
      : score >= bands.rounds4to7
        ? 'ROUNDS_4_7'
        : 'UNDRAFTED';
}

/** Stock after a season, over the career so far (the finished seasons plus this review). */
export function draftStockVNext(
  career: Pick<CareerVNext, 'athlete'>,
  reviews: readonly SeasonReviewVNext[],
  mechanics: CareerVNextMechanics,
): DraftStockVNext {
  const latest = reviews.at(-1);
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const ability = latest?.overall.end ?? 50;
  const graded = reviews.filter(({ averageGrade }) => typeof averageGrade === 'number');
  const production =
    graded.length === 0
      ? 50
      : Math.round(
          graded.reduce((sum, { averageGrade, liveGames }) => sum + averageGrade! * liveGames, 0) /
            Math.max(
              1,
              graded.reduce((sum, { liveGames }) => sum + liveGames, 0),
            ),
        );
  // M12: a program's exposure tier moves how widely scouts have seen him.
  const exposure =
    latest === undefined
      ? 60
      : Math.max(
          0,
          Math.min(
            100,
            programRating(mechanics, latest.programId, positionId) +
              draftExposureBonusVNext(mechanics, latest.programId),
          ),
        );
  const games = reviews.reduce((sum, { games: count }) => sum + count, 0);
  const live = reviews.reduce((sum, { liveGames }) => sum + liveGames, 0);
  const starts = reviews.filter(({ depthRank }) => depthRank.end === 1).length;
  const experience = clamp(
    Math.round((games === 0 ? 0 : (live * 60) / games) + starts * 10),
    0,
    100,
  );
  const bigGames = clamp(
    reviews.reduce(
      (sum, { finish, conferenceChampion }) =>
        sum +
        (finish === 'CHAMPION'
          ? 45
          : finish === 'RUNNER_UP'
            ? 35
            : finish === 'SEMIFINAL'
              ? 25
              : finish === 'QUARTERFINAL'
                ? 18
                : finish === 'FIRST_ROUND'
                  ? 12
                  : 0) +
        (conferenceChampion === true ? 10 : 0),
      30,
    ),
    0,
    100,
  );
  const awards = awardStockPointsVNext(reviews);
  const injuries = reviews.reduce((sum, { injuries: count }) => sum + count, 0);
  const durability = -Math.min(
    VNEXT_DRAFT_TUNING.maximumInjuryPenalty,
    injuries * VNEXT_DRAFT_TUNING.injuryPenalty,
  );
  const weights = VNEXT_DRAFT_TUNING.weightsPermille;
  const score = clamp(
    Math.round(
      (ability * weights.ability +
        production * weights.production +
        exposure * weights.exposure +
        experience * weights.experience +
        bigGames * weights.bigGames) /
        1000,
    ) +
      durability +
      awards,
    0,
    100,
  );
  return {
    score,
    band: draftBandVNext(score),
    factors: { ability, production, exposure, experience, bigGames, durability, awards },
  };
}

export function canDeclareVNext(career: Pick<CareerVNext, 'season' | 'flow'>): boolean {
  return (
    career.flow.type === 'OFFSEASON' &&
    career.season.index >= VNEXT_DRAFT_TUNING.declareFromSeasonIndex
  );
}

/** The Pro Draft: the latest stock plus one bounded draw from the career's draft stream. */
/**
 * The Pro Combine (M12 CAR-02): measurements from the athlete's ratings (no draw), and a small
 * stock effect from how far the workout ratings sit from a draftable baseline of 60.
 */
export const VNEXT_COMBINE_TUNING = Object.freeze({
  baseline: 60,
  /** Average points above or below the baseline per stock point, and the bound. */
  pointsPerStock: 6,
  maxStockDelta: 2,
});

export function combineVNext(career: Pick<CareerVNext, 'athlete'>): CombineResultVNext {
  const ratings = career.athlete.profile.attributes as unknown as Readonly<
    Record<string, { readonly rating: number } | undefined>
  >;
  const rating = (id: string) => ratings[id]?.rating ?? 50;
  const speed = rating('attribute_speed');
  const burst = rating('attribute_burst');
  const strength = rating('attribute_strength');
  const agility = rating('attribute_agility');
  const iq = rating('attribute_football_iq');
  const tuning = VNEXT_COMBINE_TUNING;
  const average = (speed + burst + strength + agility + iq) / 5;
  return {
    fortyHundredths: clamp(Math.round(530 - (speed - 40) * 1.8), 425, 560),
    verticalTenths: clamp(Math.round(240 + (burst - 40) * 3.5), 200, 440),
    benchReps: clamp(Math.round(8 + (strength - 40) * 0.4), 0, 40),
    shuttleHundredths: clamp(Math.round(470 - (agility - 40) * 1.2), 390, 500),
    footballTest: iq,
    // `|| 0`: JSON saves never hold -0, so neither may the in-memory result.
    stockDelta:
      clamp(
        Math.round((average - tuning.baseline) / tuning.pointsPerStock),
        -tuning.maxStockDelta,
        tuning.maxStockDelta,
      ) || 0,
  };
}

export function runDraftVNext(
  career: Pick<CareerVNext, 'seed' | 'history'> & Partial<Pick<CareerVNext, 'athlete'>>,
): DraftResultVNext {
  const stock = career.history.at(-1)?.draftStock;
  const score = stock?.score ?? 0;
  const tuning = VNEXT_DRAFT_TUNING;
  // M12: the Combine's bounded stock effect counts on draft day.
  const combine = career.athlete === undefined ? null : combineVNext({ athlete: career.athlete });
  const rng = createRng(`${String(career.seed)}:vnext:draft`);
  const swing = nextUint32(rng);
  const pickDraw = nextUint32(swing.nextRng);
  const span = tuning.variance * 2 + 1;
  const adjusted = score + (combine?.stockDelta ?? 0) + (swing.value % span) - tuning.variance;
  const roundIndex = tuning.roundFloors.findIndex((floor) => adjusted >= floor);
  const withCombine = combine === null ? {} : { combine };
  if (roundIndex === -1) return { round: null, pick: null, stockScore: score, ...withCombine };
  const pickInRound = (pickDraw.value % tuning.picksPerRound) + 1;
  return {
    round: roundIndex + 1,
    pick: roundIndex * tuning.picksPerRound + pickInRound,
    stockScore: score,
    ...withCombine,
  };
}
