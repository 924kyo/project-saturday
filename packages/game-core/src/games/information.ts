import type { PositionAttributeProgress } from '../player/progression.js';

/**
 * Pre-snap information (how many tells the athlete reads) for every key-snap kernel, in one place:
 * an information score from Football IQ, the position's reading skill and preparation, and two
 * tiers that unlock the first and second tell. Cards and events add whole tells on top.
 *
 * The kernels call this module, so the M12 "next tell" milestone reads the same rule they play by.
 */
export type InformationPositionId =
  'position_qb' | 'position_rb' | 'position_wr' | 'position_cb' | 'position_lb' | 'position_edge';

interface InformationRule {
  readonly iqWeight: number;
  /** The position's reading skill: the mean of these attributes (rounded). */
  readonly readingAttributeIds: readonly string[];
  readonly readingWeight: number;
  readonly preparationWeight: number;
  /** Score for one tell, then for two. */
  readonly tiers: readonly [number, number];
}

export const INFORMATION_RULES: Readonly<Record<InformationPositionId, InformationRule>> =
  Object.freeze({
    position_qb: {
      iqWeight: 400,
      readingAttributeIds: ['attribute_qb_read_progression'],
      readingWeight: 350,
      preparationWeight: 250,
      tiers: [45, 65],
    },
    position_rb: {
      iqWeight: 350,
      readingAttributeIds: ['attribute_rb_vision'],
      readingWeight: 400,
      preparationWeight: 250,
      tiers: [45, 65],
    },
    position_cb: {
      iqWeight: 350,
      readingAttributeIds: ['attribute_cb_man_coverage', 'attribute_cb_zone_coverage'],
      readingWeight: 400,
      preparationWeight: 250,
      tiers: [45, 65],
    },
    position_wr: {
      iqWeight: 400,
      readingAttributeIds: ['attribute_wr_route_running'],
      readingWeight: 250,
      preparationWeight: 350,
      tiers: [42, 62],
    },
    position_lb: {
      iqWeight: 350,
      readingAttributeIds: ['attribute_lb_run_recognition'],
      readingWeight: 400,
      preparationWeight: 250,
      tiers: [42, 62],
    },
    position_edge: {
      iqWeight: 350,
      readingAttributeIds: ['attribute_edge_get_off', 'attribute_edge_edge_setting'],
      readingWeight: 400,
      preparationWeight: 250,
      tiers: [42, 62],
    },
  });

type Ratings = Readonly<Record<string, { readonly rating: number } | undefined>>;

function rating(attributes: Ratings, attributeId: string): number {
  return attributes[attributeId]?.rating ?? 0;
}

/** The position's reading skill (the kernels' "coverage", "vision", "reading" scores). */
export function readingScore(positionId: InformationPositionId, attributes: Ratings): number {
  const ids = INFORMATION_RULES[positionId].readingAttributeIds;
  if (ids.length === 1) return rating(attributes, ids[0]!);
  return Math.round(ids.reduce((sum, id) => sum + rating(attributes, id), 0) / ids.length);
}

/** The information score before relationship modifiers and clamping (0–100 inputs). */
export function informationBaseScore(
  positionId: InformationPositionId,
  attributes: Ratings | PositionAttributeProgress,
  preparation: number,
): number {
  const rule = INFORMATION_RULES[positionId];
  const ratings = attributes as Ratings;
  return Math.round(
    (rating(ratings, 'attribute_football_iq') * rule.iqWeight +
      readingScore(positionId, ratings) * rule.readingWeight +
      preparation * rule.preparationWeight) /
      1_000,
  );
}

/** Tells from the score alone (cards and events add on top). */
export function informationTierTells(positionId: InformationPositionId, score: number): 0 | 1 | 2 {
  const [one, two] = INFORMATION_RULES[positionId].tiers;
  return score >= two ? 2 : score >= one ? 1 : 0;
}
