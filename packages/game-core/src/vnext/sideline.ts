import { createRng, nextUint32, type RngState } from '../random/rng.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  SidelineRepGradeVNext,
  SidelineRepVNext,
  VNextPositionId,
} from './types.js';

/**
 * Sideline reps give reserve and developmental players real Saturday decisions without inventing
 * production: the same authored looks, clues and techniques, graded on the read only. Selection
 * uses a purpose-named stream so the engine's career stream is untouched.
 */
interface SidelinePattern {
  readonly id: string;
  readonly familyId: string;
  readonly clueIds: readonly string[];
  readonly decisionFits: readonly { readonly decisionId: string; readonly fit: number }[];
}

const SOLID_FIT = 65;
const CREDIT: Readonly<Record<SidelineRepGradeVNext, number>> = { SHARP: 3, SOLID: 1, MISSED: -1 };
const MAX_CREDIT = 6;

function patternsFor(positionId: VNextPositionId, mechanics: CareerVNextMechanics) {
  const source =
    positionId === 'position_wr'
      ? mechanics.wr.patterns
      : mechanics[positionId === 'position_qb' ? 'qb' : positionId === 'position_rb' ? 'rb' : 'cb']
          .patterns;
  return [...(source as readonly SidelinePattern[])].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function draw(rng: RngState, bound: number): { value: number; rng: RngState } {
  const sample = nextUint32(rng);
  return { value: sample.value % bound, rng: sample.nextRng };
}

/** Preparation is the lever: film and meetings turn into readable clues on the sideline. */
export function sidelineClueCount(preparation: number): number {
  return preparation >= 75 ? 3 : preparation >= 55 ? 2 : preparation >= 35 ? 1 : 0;
}

export function createSidelineReps(
  career: CareerVNext,
  weekIndex: number,
  count: number,
  mechanics: CareerVNextMechanics,
): readonly SidelineRepVNext[] {
  if (count <= 0) return [];
  const patterns = patternsFor(career.athlete.profile.positionId as VNextPositionId, mechanics);
  let rng = createRng(`${String(career.seed)}:vnext:sideline:${career.season.index}:${weekIndex}`);
  const clues = sidelineClueCount(career.athlete.profile.state.preparation);
  const reps: SidelineRepVNext[] = [];
  for (let repIndex = 0; repIndex < count; repIndex += 1) {
    const picked = draw(rng, patterns.length);
    rng = picked.rng;
    const pattern = patterns[picked.value]!;
    const order = [...pattern.decisionFits];
    // Fisher–Yates on the seeded stream: button position never leaks the best read.
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = draw(rng, index + 1);
      rng = swap.rng;
      [order[index], order[swap.value]] = [order[swap.value]!, order[index]!];
    }
    const best = [...pattern.decisionFits].sort((left, right) => right.fit - left.fit)[0]!;
    reps.push({
      repIndex,
      period: Math.min(4, repIndex + 1) as 1 | 2 | 3 | 4,
      patternId: pattern.id,
      familyId: pattern.familyId,
      decisionIds: [order[0]!.decisionId, order[1]!.decisionId, order[2]!.decisionId],
      revealedClueIds: pattern.clueIds.slice(0, clues),
      chosenDecisionId: null,
      grade: null,
      bestDecisionId: best.decisionId,
      solidDecisionIds: pattern.decisionFits
        .filter(({ decisionId, fit }) => decisionId !== best.decisionId && fit >= SOLID_FIT)
        .map(({ decisionId }) => decisionId),
    });
  }
  return reps;
}

export function resolveSidelineRep(
  rep: SidelineRepVNext,
  decisionId: string,
): SidelineRepVNext | null {
  if (rep.chosenDecisionId !== null || !rep.decisionIds.includes(decisionId)) return null;
  return { ...rep, chosenDecisionId: decisionId, grade: gradeFor(rep, decisionId) };
}

function gradeFor(rep: SidelineRepVNext, decisionId: string): SidelineRepGradeVNext {
  if (decisionId === rep.bestDecisionId) return 'SHARP';
  return rep.solidDecisionIds.includes(decisionId) ? 'SOLID' : 'MISSED';
}

export function sidelineCreditFor(reps: readonly SidelineRepVNext[]): number {
  const total = reps.reduce((sum, rep) => sum + (rep.grade === null ? 0 : CREDIT[rep.grade]), 0);
  return Math.max(-MAX_CREDIT, Math.min(MAX_CREDIT, total));
}
