import {
  derivePositionOverall,
  getPlayableAttributeIds,
  type PositionAttributeProgress,
} from '../player/progression.js';
import type { CreatedPositionPlayerProfile } from '../player/position-creation.js';
import type { PositionCreationMechanics } from '../player/position-creation.js';
import { derivePositionRecruitingProfile } from '../programs/position-room.js';
import { backgroundProfileVNext, overallWeightsVNext } from './development.js';
import type { CareerVNextMechanics } from './types.js';

/**
 * M12 creation (playtest report "Player creation and starting attributes"): each source of a
 * starting rating has one job and is shown on its own line.
 * - position base and play style: the distribution of core skills;
 * - recruiting background: small starting tweaks, plus standing and potential (development.ts);
 * - personality: small starting tweaks, plus story choices (narrative, Phase 6);
 * - the player's own allocation: a visible budget, caps, and refunds for lowering a rating.
 * Appearance, home region and name never touch a rating.
 */
export const VNEXT_ALLOCATION_TUNING = Object.freeze({
  budget: 10,
  /** Per attribute: at most this many points up, or down. */
  maxRaise: 5,
  maxLower: 3,
  /** Points refunded by lowering, in total. */
  maxRefund: 6,
  /** No starting rating above this after allocation (an elite rating is earned in college). */
  ceiling: 85,
  floor: 20,
});

export type AllocationVNext = Readonly<Record<string, number>>;

/** The largest allocation bonus a legacy head start can add (Phase 8; never raises the caps). */
export const VNEXT_LEGACY_HEAD_START_CAP = 3;

export interface AllocationCheckVNext {
  readonly ok: boolean;
  /** Points spent on raises. */
  readonly spent: number;
  /** Points refunded by lowering (capped). */
  readonly refunded: number;
  /** Budget left: budget + bonus + refunded − spent. */
  readonly remaining: number;
  readonly issues: readonly (
    | 'allocation.unknown_attribute'
    | 'allocation.not_integer'
    | 'allocation.raise_cap'
    | 'allocation.lower_cap'
    | 'allocation.refund_cap'
    | 'allocation.over_budget'
    | 'allocation.rating_bounds'
  )[];
}

function ratingsOf(attributes: PositionAttributeProgress): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(attributes as Readonly<Record<string, { rating: number }>>).map(
      ([id, value]) => [id, value.rating],
    ),
  );
}

/** Checks an allocation against the rules and the profile it would apply to. */
export function checkAllocationVNext(
  profile: Pick<CreatedPositionPlayerProfile, 'positionId' | 'attributes'>,
  allocation: AllocationVNext,
  bonusBudget = 0,
): AllocationCheckVNext {
  const tuning = VNEXT_ALLOCATION_TUNING;
  const playable = getPlayableAttributeIds(profile.positionId) as readonly string[];
  const ratings = ratingsOf(profile.attributes);
  const issues = new Set<AllocationCheckVNext['issues'][number]>();
  let spent = 0;
  let lowered = 0;
  for (const [attributeId, delta] of Object.entries(allocation)) {
    if (!playable.includes(attributeId)) issues.add('allocation.unknown_attribute');
    if (!Number.isInteger(delta)) {
      issues.add('allocation.not_integer');
      continue;
    }
    if (delta > tuning.maxRaise) issues.add('allocation.raise_cap');
    if (delta < -tuning.maxLower) issues.add('allocation.lower_cap');
    if (delta > 0) spent += delta;
    if (delta < 0) lowered += -delta;
    const after = (ratings[attributeId] ?? 0) + delta;
    if (delta !== 0 && (after > tuning.ceiling || after < tuning.floor))
      issues.add('allocation.rating_bounds');
  }
  if (lowered > tuning.maxRefund) issues.add('allocation.refund_cap');
  const refunded = Math.min(lowered, tuning.maxRefund);
  const remaining = tuning.budget + Math.max(0, bonusBudget) + refunded - spent;
  if (remaining < 0) issues.add('allocation.over_budget');
  return { ok: issues.size === 0, spent, refunded, remaining, issues: [...issues] };
}

/** The profile with the allocation applied (call after a passing check). */
export function applyAllocationVNext<T extends CreatedPositionPlayerProfile>(
  profile: T,
  allocation: AllocationVNext,
): T {
  const attributes = { ...(profile.attributes as Record<string, { rating: number; xp: number }>) };
  for (const [attributeId, delta] of Object.entries(allocation)) {
    const current = attributes[attributeId];
    if (current === undefined || delta === 0) continue;
    attributes[attributeId] = { rating: current.rating + delta, xp: current.xp };
  }
  const derived = derivePositionOverall(
    profile.positionId,
    attributes as unknown as PositionAttributeProgress,
  );
  return {
    ...profile,
    attributes: attributes as unknown as PositionAttributeProgress,
    overall: derived.ok ? derived.overall : profile.overall,
  };
}

export type AllocationPresetIdVNext =
  'preset_recommended' | 'preset_specialist' | 'preset_athletic' | 'preset_none';

/**
 * Role presets: a guided start is enough for a first career (playtest report). Recommended spreads
 * the budget over the four attributes that move overall most; Specialist stacks the top two and
 * pays for it with the least-weighted attribute; Athletic builds the physical base.
 */
export function allocationPresetsVNext(
  profile: Pick<CreatedPositionPlayerProfile, 'positionId' | 'attributes'>,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
  bonusBudget = 0,
): readonly { readonly id: AllocationPresetIdVNext; readonly allocation: AllocationVNext }[] {
  const weights = overallWeightsVNext({ athlete: { profile } } as never, mechanics);
  const key = weights.map(({ attributeId }) => attributeId);
  const playable = getPlayableAttributeIds(profile.positionId) as readonly string[];
  const budget = VNEXT_ALLOCATION_TUNING.budget + Math.max(0, bonusBudget);
  const spread = (ids: readonly string[], shares: readonly number[]) => {
    const total = shares.reduce((sum, value) => sum + value, 0);
    const out: Record<string, number> = {};
    let left = budget;
    ids.forEach((id, index) => {
      const points =
        index === ids.length - 1
          ? left
          : Math.min(left, Math.round((budget * shares[index]!) / total));
      out[id] = Math.min(VNEXT_ALLOCATION_TUNING.maxRaise, (out[id] ?? 0) + points);
      left -= points;
    });
    return out;
  };
  const leastWeighted = [...playable]
    .filter((id) => !key.slice(0, 4).includes(id))
    .sort(
      (left, right) =>
        (weights.find(({ attributeId }) => attributeId === left)?.weightPermille ?? 0) -
          (weights.find(({ attributeId }) => attributeId === right)?.weightPermille ?? 0) ||
        left.localeCompare(right),
    )[0];
  const physical = [
    'attribute_speed',
    'attribute_strength',
    'attribute_agility',
    'attribute_burst',
  ].filter((id) => playable.includes(id));
  const presets: { id: AllocationPresetIdVNext; allocation: AllocationVNext }[] = [
    { id: 'preset_recommended', allocation: spread(key.slice(0, 4), [3, 3, 2, 2]) },
    {
      id: 'preset_specialist',
      allocation: {
        ...(leastWeighted === undefined ? {} : { [leastWeighted]: -3 }),
        [key[0]!]: VNEXT_ALLOCATION_TUNING.maxRaise,
        [key[1]!]: VNEXT_ALLOCATION_TUNING.maxRaise,
        ...(key[2] === undefined
          ? {}
          : {
              [key[2]]: Math.min(
                VNEXT_ALLOCATION_TUNING.maxRaise,
                budget +
                  (leastWeighted === undefined ? 0 : 3) -
                  2 * VNEXT_ALLOCATION_TUNING.maxRaise,
              ),
            }),
      },
    },
    {
      id: 'preset_athletic',
      allocation: spread(
        physical,
        physical.map(() => 1),
      ),
    },
    { id: 'preset_none', allocation: {} },
  ];
  // Keep only presets that pass the rules for this profile (the ceiling can bind at high ratings).
  return presets
    .map((preset) => ({
      ...preset,
      allocation: Object.fromEntries(
        Object.entries(preset.allocation).filter(([, value]) => value !== 0),
      ),
    }))
    .filter((preset) => checkAllocationVNext(profile, preset.allocation, bonusBudget).ok);
}

export interface CreationSourceRowVNext {
  readonly attributeId: string;
  readonly base: number;
  readonly style: number;
  readonly background: number;
  readonly personality: number;
  readonly allocation: number;
  readonly total: number;
  /** The attribute's share of overall, permille (0 when it does not count). */
  readonly overallWeightPermille: number;
}

/** Every playable attribute, source by source (sums to the created rating plus allocation). */
export function creationBreakdownVNext(
  positionId: CreatedPositionPlayerProfile['positionId'],
  creation: PositionCreationMechanics,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
  allocation: AllocationVNext = {},
): readonly CreationSourceRowVNext[] {
  const delta = (
    modifiers: readonly { readonly attributeId: string; readonly delta: number }[],
    attributeId: string,
  ) => modifiers.find((entry) => entry.attributeId === attributeId)?.delta ?? 0;
  const weights = mechanics.room.recruitingAbilityWeightsPermille as Readonly<
    Record<string, number | undefined>
  >;
  return (getPlayableAttributeIds(positionId) as readonly string[]).map((attributeId) => {
    const base =
      (creation.baseAttributeRatings as Readonly<Record<string, number | undefined>>)[
        attributeId
      ] ?? 0;
    const style = delta(creation.archetypeProfile.attributeModifiers, attributeId);
    const background = delta(creation.backgroundProfile.attributeModifiers, attributeId);
    const personality = creation.personalityProfiles.reduce(
      (sum, profile) => sum + delta(profile.attributeModifiers, attributeId),
      0,
    );
    const own = allocation[attributeId] ?? 0;
    return {
      attributeId,
      base,
      style,
      background,
      personality,
      allocation: own,
      total: base + style + background + personality + own,
      overallWeightPermille: weights[attributeId] ?? 0,
    };
  });
}

/** The program rating a recruit's first offers centre on (a reach, two fits and a role path). */
export function recruitOfferTargetVNext(recruitScore: number): number {
  return 50 + Math.round((recruitScore - 50) * 0.6);
}

export interface ScoutingReportVNext {
  readonly overall: number;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recruitScore: number;
  readonly recruitStanding: number;
  /** The program rating the first offers centre on (the same target offers are drawn around). */
  readonly offerTarget: number;
  readonly potentialPermille: readonly [number, number, number, number];
}

/** A scouting report from the same numbers recruiting and development use. */
export function scoutingReportVNext(
  profile: CreatedPositionPlayerProfile,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): ScoutingReportVNext | null {
  const background = backgroundProfileVNext(profile.recruitingBackgroundId);
  const recruiting = derivePositionRecruitingProfile(
    profile,
    mechanics.room,
    background.recruitStanding,
  );
  if (recruiting === undefined) return null;
  const ratings = ratingsOf(profile.attributes);
  const keys = overallWeightsVNext({ athlete: { profile } } as never, mechanics)
    .slice(0, 6)
    .map(({ attributeId }) => attributeId);
  const byRating = [...keys].sort(
    (left, right) => (ratings[right] ?? 0) - (ratings[left] ?? 0) || left.localeCompare(right),
  );
  return {
    overall: recruiting.abilityScore,
    strengths: byRating.slice(0, 2),
    weaknesses: byRating.slice(-2).reverse(),
    recruitScore: recruiting.recruitScore,
    recruitStanding: background.recruitStanding,
    offerTarget: recruitOfferTargetVNext(recruiting.recruitScore),
    potentialPermille: background.potentialPermille,
  };
}

export interface OverallContributionVNext {
  readonly attributeId: string;
  readonly rating: number;
  readonly weightPermille: number;
  /** rating × weight, in thousandths of an overall point. */
  readonly contributionMilli: number;
}

/**
 * Overall, attribute by attribute (M12, playtest report "Explain OVR"): the coaches' talent score
 * is Σ rating × weight. The rounded sum is exactly `overallVNext`.
 */
export function overallContributionsVNext(
  profile: Pick<CreatedPositionPlayerProfile, 'positionId' | 'attributes'>,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): { readonly total: number; readonly entries: readonly OverallContributionVNext[] } {
  const ratings = ratingsOf(profile.attributes);
  const entries = overallWeightsVNext({ athlete: { profile } } as never, mechanics).map(
    ({ attributeId, weightPermille }) => ({
      attributeId,
      rating: ratings[attributeId] ?? 0,
      weightPermille,
      contributionMilli: (ratings[attributeId] ?? 0) * weightPermille,
    }),
  );
  return {
    total: Math.round(entries.reduce((sum, entry) => sum + entry.contributionMilli, 0) / 1000),
    entries,
  };
}
