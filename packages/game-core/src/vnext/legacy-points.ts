import type { AlumniVNext, GearIdVNext } from './types.js';

/**
 * Legacy points and perks (M12 Phase 8, conflict K2). A completed career earns points from what it
 * achieved (role, honors, team success, academics, relationships, the draft and a Hall of Fame
 * induction), each category capped, claimed once per career ID into a device-level store. Points
 * buy permanent unlocks that change how a later career can start; starting power is capped at
 * +3 allocation points and stat caps never change, so a first career is the baseline.
 */
export const VNEXT_LEGACY_POINT_TUNING = Object.freeze({
  categories: {
    role: { starter: 2, rotation: 1, cap: 2 },
    honors: { perAward: 1, cap: 3 },
    team: { perChampionship: 2, perConferenceTitle: 1, cap: 3 },
    academics: { gpa: 3.0, points: 1, cap: 1 },
    relationships: { captain: 1, perTwoGoals: 1, cap: 2 },
    draft: { earlyRounds: 2, lateRounds: 1, cap: 2 },
    hallOfFame: { points: 2, cap: 2 },
  },
  hallOfFame: {
    threshold: 6,
    perAward: 2,
    perChampionship: 3,
    perConferenceTitle: 1,
    firstRound: 3,
    earlyRounds: 1,
    captain: 1,
  },
});

export type LegacyCategoryIdVNext = keyof typeof VNEXT_LEGACY_POINT_TUNING.categories;

export interface LegacyPointRowVNext {
  readonly categoryId: LegacyCategoryIdVNext;
  readonly points: number;
  /** The fact the points come from (for the summary copy). */
  readonly value: number;
}

/** Hall of Fame: a deterministic score from the plaque against a fixed bar. */
export function hallOfFameScoreVNext(plaque: AlumniVNext): number {
  const tuning = VNEXT_LEGACY_POINT_TUNING.hallOfFame;
  const round = plaque.draft?.round ?? null;
  return (
    (plaque.awards?.length ?? 0) * tuning.perAward +
    plaque.championships * tuning.perChampionship +
    (plaque.conferenceTitles ?? 0) * tuning.perConferenceTitle +
    (round === 1 ? tuning.firstRound : round !== null && round <= 3 ? tuning.earlyRounds : 0) +
    ((plaque.honors ?? []).includes('honor_captain') ? tuning.captain : 0)
  );
}

export function inductsHallOfFameVNext(plaque: AlumniVNext): boolean {
  return hallOfFameScoreVNext(plaque) >= VNEXT_LEGACY_POINT_TUNING.hallOfFame.threshold;
}

/** Points by category, from the plaque alone (zero rows left out). */
export function legacyPointsVNext(plaque: AlumniVNext): readonly LegacyPointRowVNext[] {
  const c = VNEXT_LEGACY_POINT_TUNING.categories;
  const awards = plaque.awards?.length ?? 0;
  const round = plaque.draft?.round ?? null;
  const goals = plaque.goalsMet ?? 0;
  const captain = (plaque.honors ?? []).includes('honor_captain');
  const rows: LegacyPointRowVNext[] = [
    {
      categoryId: 'role',
      value: plaque.bestDepthRank,
      points: Math.min(
        c.role.cap,
        plaque.bestDepthRank === 1
          ? c.role.starter
          : plaque.bestDepthRank <= 3
            ? c.role.rotation
            : 0,
      ),
    },
    {
      categoryId: 'honors',
      value: awards,
      points: Math.min(c.honors.cap, awards * c.honors.perAward),
    },
    {
      categoryId: 'team',
      value: plaque.championships + (plaque.conferenceTitles ?? 0),
      points: Math.min(
        c.team.cap,
        plaque.championships * c.team.perChampionship +
          (plaque.conferenceTitles ?? 0) * c.team.perConferenceTitle,
      ),
    },
    {
      categoryId: 'academics',
      value: Math.round((plaque.finalGpa ?? 0) * 100),
      points: (plaque.finalGpa ?? 0) >= c.academics.gpa ? c.academics.points : 0,
    },
    {
      categoryId: 'relationships',
      value: goals,
      points: Math.min(
        c.relationships.cap,
        (captain ? c.relationships.captain : 0) +
          Math.floor(goals / 2) * c.relationships.perTwoGoals,
      ),
    },
    {
      categoryId: 'draft',
      value: round ?? 0,
      points:
        round === null
          ? 0
          : Math.min(c.draft.cap, round <= 3 ? c.draft.earlyRounds : c.draft.lateRounds),
    },
    {
      categoryId: 'hallOfFame',
      value: plaque.hallOfFame === true ? 1 : 0,
      points: plaque.hallOfFame === true ? c.hallOfFame.points : 0,
    },
  ];
  return rows.filter(({ points }) => points > 0);
}

export function legacyTotalVNext(plaque: AlumniVNext): number {
  return legacyPointsVNext(plaque).reduce((sum, { points }) => sum + points, 0);
}

// ---------------------------------------------------------------------------------------------
// The device-level legacy store: points, unlocks and claimed careers.

export type LegacyPerkIdVNext =
  'perk_head_start' | 'perk_mentor_choice' | 'perk_legacy_offer' | 'perk_commemorative_gear';

export const VNEXT_LEGACY_PERKS = Object.freeze({
  /** Each level allows +1 allocation point at creation (three levels: the +3 cap). */
  perk_head_start: { cost: 3, maxLevel: 3 },
  /** Choose a former player as your mentor: they check in wherever you play. */
  perk_mentor_choice: { cost: 2, maxLevel: 1 },
  /** A guaranteed first offer from a program a former player played for. */
  perk_legacy_offer: { cost: 3, maxLevel: 1 },
  /** Start a career already owning a commemorative gear cosmetic. */
  perk_commemorative_gear: { cost: 2, maxLevel: 1 },
} satisfies Record<LegacyPerkIdVNext, { readonly cost: number; readonly maxLevel: number }>);

export const LEGACY_PERK_IDS_VNEXT = Object.keys(
  VNEXT_LEGACY_PERKS,
) as readonly LegacyPerkIdVNext[];

/** The commemorative gear a perk grants. */
export const VNEXT_COMMEMORATIVE_GEAR: GearIdVNext = 'gear_gold_trim';

export interface LegacyStoreVNext {
  readonly model: 'career_vnext_legacy';
  readonly version: 1;
  readonly earned: number;
  readonly spent: number;
  readonly claimedCareerIds: readonly string[];
  readonly perks: Readonly<Partial<Record<LegacyPerkIdVNext, number>>>;
}

export function emptyLegacyStoreVNext(): LegacyStoreVNext {
  return {
    model: 'career_vnext_legacy',
    version: 1,
    earned: 0,
    spent: 0,
    claimedCareerIds: [],
    perks: {},
  };
}

export function legacyBalanceVNext(store: LegacyStoreVNext): number {
  return store.earned - store.spent;
}

/** Credits a completed career's points once; a second claim for the same career changes nothing. */
export function claimLegacyVNext(store: LegacyStoreVNext, plaque: AlumniVNext): LegacyStoreVNext {
  if (store.claimedCareerIds.includes(plaque.careerId)) return store;
  return {
    ...store,
    earned: store.earned + legacyTotalVNext(plaque),
    claimedCareerIds: [...store.claimedCareerIds, plaque.careerId],
  };
}

export type LegacyUnlockFailureVNext = 'not_enough_points' | 'max_level';

export function unlockPerkVNext(
  store: LegacyStoreVNext,
  perkId: LegacyPerkIdVNext,
): LegacyStoreVNext | LegacyUnlockFailureVNext {
  const perk = VNEXT_LEGACY_PERKS[perkId];
  const level = store.perks[perkId] ?? 0;
  if (level >= perk.maxLevel) return 'max_level';
  if (legacyBalanceVNext(store) < perk.cost) return 'not_enough_points';
  return {
    ...store,
    spent: store.spent + perk.cost,
    perks: { ...store.perks, [perkId]: level + 1 },
  };
}

/** Defensive read of a stored legacy record (device storage). */
export function isLegacyStoreVNext(value: unknown): value is LegacyStoreVNext {
  const store = value as LegacyStoreVNext | undefined;
  return (
    typeof store === 'object' &&
    store !== null &&
    store.model === 'career_vnext_legacy' &&
    store.version === 1 &&
    Number.isSafeInteger(store.earned) &&
    Number.isSafeInteger(store.spent) &&
    store.spent <= store.earned &&
    Array.isArray(store.claimedCareerIds) &&
    typeof store.perks === 'object' &&
    store.perks !== null
  );
}
