import type {
  PositionDepthEvaluation,
  PositionRoomContext,
  PositionRoomMechanics,
} from '../programs/position-room.js';
import { depthRoleIdForRank } from '../programs/tuning.js';
import { createRng, nextUint32, type RngSeed, type RngState } from '../random/rng.js';

/**
 * Playtest round 1: the room competes too. Before, teammates' depth scores stood still all season
 * while the athlete grew, so a spot once won was never lost. Each practice week every teammate now
 * has a practice week of their own (form moves toward a weekly score) and the youngest grow a little.
 * Drawn from `:vnext:rivals:<season>:<week>`, so no other stream moves.
 */
export const VNEXT_RIVAL_TUNING = Object.freeze({
  /** Weekly practice score: base + a uniform draw of `spread` points. Mean 58 around the room. */
  weeklyBase: 42,
  weeklySpread: 33,
  /** Form keeps 40% of last week, like the athlete's own. */
  previousWeightPermille: 400,
  /** Chance per week of +1 talent fit, by class year (freshmen grow fastest). */
  growthPermilleByClass: [300, 220, 120, 60] as const,
});

function draw(rng: RngState, bound: number): { value: number; rng: RngState } {
  const sample = nextUint32(rng);
  return { value: sample.value % bound, rng: sample.nextRng };
}

export function rivalWeekVNext(
  room: PositionRoomContext,
  seed: RngSeed,
  seasonIndex: number,
  weekIndex: number,
  mechanics: PositionRoomMechanics,
): PositionRoomContext {
  const tuning = VNEXT_RIVAL_TUNING;
  const weights = mechanics.depthEvaluationWeightsPermille;
  let rng = createRng(`${String(seed)}:vnext:rivals:${seasonIndex}:${weekIndex}`);
  const competitors = room.competitors.map((competitor) => {
    const week = draw(rng, tuning.weeklySpread);
    const growth = draw(week.rng, 1000);
    rng = growth.rng;
    const weekly = tuning.weeklyBase + week.value;
    const practiceForm = Math.round(
      (competitor.practiceForm * tuning.previousWeightPermille +
        weekly * (1000 - tuning.previousWeightPermille)) /
        1000,
    );
    const grows = growth.value < tuning.growthPermilleByClass[competitor.classYear - 1]!;
    return {
      ...competitor,
      practiceForm: Math.max(0, Math.min(100, practiceForm)),
      talentFit: Math.min(100, competitor.talentFit + (grows ? 1 : 0)),
    };
  });
  const byId = new Map(competitors.map((competitor) => [competitor.id as string, competitor]));
  const rescored = room.evaluations.map((entry): PositionDepthEvaluation => {
    const competitor = byId.get(entry.participantId);
    if (competitor === undefined) return entry;
    const components = {
      ...entry.components,
      practiceForm: competitor.practiceForm,
      talentFit: competitor.talentFit,
    };
    const contributions = {
      talentFitMilli: components.talentFit * weights.talentFit,
      coachTrustMilli: components.coachTrust * weights.coachTrust,
      practiceFormMilli: components.practiceForm * weights.practiceForm,
      schemeFitMilli: components.schemeFit * weights.schemeFit,
      experienceReadinessMilli: components.experienceReadiness * weights.experienceReadiness,
    };
    return {
      ...entry,
      components,
      contributions,
      totalScoreMilli: Object.values(contributions).reduce((total, value) => total + value, 0),
    };
  });
  // Teammates re-sort among themselves; the athlete keeps their slot until practice moves him.
  const playerIndex = rescored.findIndex(({ participantId }) => participantId === room.playerId);
  const others = rescored
    .filter((_, index) => index !== playerIndex)
    .sort(
      (left, right) =>
        right.totalScoreMilli - left.totalScoreMilli ||
        (left.participantId < right.participantId ? -1 : 1),
    );
  const ordered = [
    ...others.slice(0, playerIndex),
    rescored[playerIndex]!,
    ...others.slice(playerIndex),
  ];
  const evaluations = ordered.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    roleId: depthRoleIdForRank(index + 1),
  }));
  return {
    ...room,
    competitors,
    depthOrderIds: evaluations.map(({ participantId }) => participantId),
    evaluations,
  };
}
