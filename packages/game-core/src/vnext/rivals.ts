import { derivePositionCoachTrustChange } from '../programs/position-room.js';
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
 * has a practice week of their own (form moves toward a weekly score, trust follows it, M12) and the
 * youngest grow a little.
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
  /**
   * M12 parity: the athlete gets camp, a coach's focus and an offseason program, so the room
   * grows in those windows too. Camp is three growth draws per teammate; each returning
   * teammate gains this much talent over the offseason (was +2).
   */
  campGrowthDraws: 3,
  offseasonTalentGain: 3,
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
  /** Growth draws per teammate this week (camp uses `campGrowthDraws`). */
  growthDraws = 1,
): PositionRoomContext {
  const tuning = VNEXT_RIVAL_TUNING;
  const weights = mechanics.depthEvaluationWeightsPermille;
  let rng = createRng(`${String(seed)}:vnext:rivals:${seasonIndex}:${weekIndex}`);
  const competitors = room.competitors.map((competitor) => {
    const week = draw(rng, tuning.weeklySpread);
    rng = week.rng;
    let grown = 0;
    for (let index = 0; index < growthDraws; index += 1) {
      const growth = draw(rng, 1000);
      rng = growth.rng;
      if (growth.value < tuning.growthPermilleByClass[competitor.classYear - 1]!) grown += 1;
    }
    const weekly = tuning.weeklyBase + week.value;
    const practiceForm = Math.round(
      (competitor.practiceForm * tuning.previousWeightPermille +
        weekly * (1000 - tuning.previousWeightPermille)) /
        1000,
    );
    // M12: teammates earn trust the way the athlete does, from their own practice week. Before,
    // only the athlete's trust moved, so every promotion was permanent and every later season a
    // starter's (balance harness: 36 of 36 sophomore-to-senior seasons).
    const trust = derivePositionCoachTrustChange(competitor.coachTrust, weekly);
    return {
      ...competitor,
      practiceForm: Math.max(0, Math.min(100, practiceForm)),
      talentFit: Math.min(100, competitor.talentFit + grown),
      coachTrust: trust?.after ?? competitor.coachTrust,
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
      coachTrust: competitor.coachTrust,
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
