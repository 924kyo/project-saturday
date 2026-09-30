import { createRng, nextUint32 } from '../random/rng.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  DraftResultVNext,
  DraftStockBandVNext,
  DraftStockVNext,
  SeasonReviewVNext,
  VNextPositionId,
} from './types.js';
import { programRating } from './common.js';
import { awardStockPointsVNext } from './awards.js';

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
  /** Bands over the stock score (projection shown to the player). */
  bands: { round1: 78, rounds2to3: 70, rounds4to7: 61 },
  /** Draft-day draw applied to the stock, inclusive. */
  variance: 4,
  /** Minimum drafted score per round 1..7; below the last is undrafted. */
  roundFloors: [80, 76, 72, 68, 65, 63, 61],
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
  const exposure =
    latest === undefined ? 60 : programRating(mechanics, latest.programId, positionId);
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
export function runDraftVNext(career: Pick<CareerVNext, 'seed' | 'history'>): DraftResultVNext {
  const stock = career.history.at(-1)?.draftStock;
  const score = stock?.score ?? 0;
  const tuning = VNEXT_DRAFT_TUNING;
  const rng = createRng(`${String(career.seed)}:vnext:draft`);
  const swing = nextUint32(rng);
  const pickDraw = nextUint32(swing.nextRng);
  const span = tuning.variance * 2 + 1;
  const adjusted = score + (swing.value % span) - tuning.variance;
  const roundIndex = tuning.roundFloors.findIndex((floor) => adjusted >= floor);
  if (roundIndex === -1) return { round: null, pick: null, stockScore: score };
  const pickInRound = (pickDraw.value % tuning.picksPerRound) + 1;
  return {
    round: roundIndex + 1,
    pick: roundIndex * tuning.picksPerRound + pickInRound,
    stockScore: score,
  };
}
