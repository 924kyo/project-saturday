import { withMasteryVNext } from './cards.js';
import { studyGpaPermilleVNext } from './programs.js';
import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';
import {
  INFORMATION_RULES,
  informationBaseScore,
  informationTierTells,
  type InformationPositionId,
} from '../games/information.js';
import { getPlayableAttributeIds, type PositionAttributeProgress } from '../player/progression.js';
import type { PlayerState } from '../player/types.js';
import type { PositionFocusEvidenceV2, PositionFocusId } from '../weekly/position-focus.js';
import { resolvePositionFocusWithSkills } from '../weekly/position-focus-skills.js';
import { loadoutVNext, skillDefinitionsVNext } from './build.js';
import { readQuality } from './frames.js';
import type {
  CareerVNext,
  CareerVNextMechanics,
  CoachFocusVNext,
  CoachFocusWeekVNext,
  DevelopmentVNext,
  MidseasonReviewVNext,
  OffseasonProgramIdVNext,
  VNextPositionId,
} from './types.js';

/**
 * M12 development: potential (a background's growth curve), the calendar around the weekly plan
 * (preseason camp, the midseason coach focus, the offseason program) and the explanations the
 * planner shows (plan preview, injury-risk parts, next milestones). Every number the UI shows comes
 * from these functions, which apply the same rules the commands do.
 */

// ---------------------------------------------------------------------------------------------
// Potential: what a recruiting background means after creation.

export interface BackgroundProfileVNext {
  /** Added to the recruit score that sets the first offers (−20…20). */
  readonly recruitStanding: number;
  /** Focus, camp and offseason XP multiplier by season (freshman → senior), permille. */
  readonly potentialPermille: readonly [number, number, number, number];
}

/**
 * Different, not ranked: a higher start buys better first offers and a flatter curve; a lower
 * start grows more later. Sums of the curve plus standing are close by design.
 */
export const VNEXT_BACKGROUND_PROFILES: Readonly<Record<string, BackgroundProfileVNext>> =
  Object.freeze({
    background_blue_chip_star: { recruitStanding: 8, potentialPermille: [1000, 1000, 950, 950] },
    background_legacy_recruit: { recruitStanding: 4, potentialPermille: [1050, 1050, 1000, 1000] },
    background_small_town_star: { recruitStanding: 0, potentialPermille: [1000, 1050, 1050, 1050] },
    background_late_bloomer: { recruitStanding: -6, potentialPermille: [950, 1100, 1200, 1200] },
    background_under_recruited_athlete: {
      recruitStanding: -8,
      potentialPermille: [1100, 1100, 1100, 1100],
    },
  });

const NEUTRAL_BACKGROUND: BackgroundProfileVNext = {
  recruitStanding: 0,
  potentialPermille: [1000, 1000, 1000, 1000],
};

export function backgroundProfileVNext(backgroundId: string): BackgroundProfileVNext {
  return VNEXT_BACKGROUND_PROFILES[backgroundId] ?? NEUTRAL_BACKGROUND;
}

/** This season's potential multiplier for the athlete (permille). */
export function potentialPermilleVNext(career: Pick<CareerVNext, 'athlete' | 'season'>): number {
  const curve = backgroundProfileVNext(career.athlete.profile.recruitingBackgroundId);
  return curve.potentialPermille[Math.min(3, Math.max(0, career.season.index))]!;
}

// ---------------------------------------------------------------------------------------------
// Focus resolution shared by the weekly plan and camp.

/** Focus catalog for the athlete's position: position training plus shared focuses. */
export function focusDefinitionsVNext(career: CareerVNext, mechanics: CareerVNextMechanics) {
  const positionId = career.athlete.profile.positionId;
  return [
    ...mechanics.trainingActions.filter((action) => action.positionId === positionId),
    ...mechanics.commonFocuses,
  ];
}

export interface ResolvedFocusPlanVNext {
  readonly attributes: PositionAttributeProgress;
  readonly proficiencyUses: CareerVNext['athlete']['proficiencyUses'];
  readonly sharedProficiencyUses: CareerVNext['athlete']['sharedProficiencyUses'];
  readonly state: {
    readonly body: number;
    readonly preparation: number;
    readonly confidence: number;
  };
  readonly gpa: number;
  readonly evidence: readonly [
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
    PositionFocusEvidenceV2,
  ];
}

export const STUDY_HALL_FOCUS_ID = 'action_study_hall';

/** Scales a focus's XP by `permille` (potential, camp); never below 1 XP per attribute. */
function scaledDefinition<
  T extends { readonly attributeXp: readonly { readonly baseXp: number }[] },
>(definition: T, permille: number): T {
  if (permille === 1000) return definition;
  return {
    ...definition,
    attributeXp: definition.attributeXp.map((entry) => ({
      ...entry,
      baseXp: Math.max(1, Math.round((entry.baseXp * permille) / 1000)),
    })),
  };
}

/** Resolves three focuses in order, through the skill-aware resolver, at an XP multiplier. */
export function resolveFocusPlanVNext(
  career: CareerVNext,
  focusIds: readonly string[],
  mechanics: CareerVNextMechanics,
  xpPermille: number,
): ResolvedFocusPlanVNext | null {
  if (!Array.isArray(focusIds) || focusIds.length !== 3) return null;
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
  const cards = skillDefinitionsVNext(withMasteryVNext(career, mechanics));
  for (const [index, focusId] of focusIds.entries()) {
    const found = definitions.find(({ id }) => id === focusId);
    const tagIds = mechanics.skillBuilds.actionTags[focusId as PositionFocusId];
    if (found === undefined || tagIds === undefined) return null;
    const definition = scaledDefinition(found, xpPermille);
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
    if (!resolved.ok) return null;
    state = resolved.next;
    evidence.push(resolved.evidence);
  }
  // M12: the program's academic support scales what a study-hall week earns.
  const gained = state.gpa - profile.state.gpa;
  const gpa =
    gained > 0 && focusIds.includes(STUDY_HALL_FOCUS_ID)
      ? Math.min(
          4,
          Math.round(
            (profile.state.gpa +
              (gained * studyGpaPermilleVNext(mechanics, career.program?.programId ?? null)) /
                1000) *
              1000,
          ) / 1000,
        )
      : state.gpa;
  return {
    attributes: state.training.attributes,
    proficiencyUses: state.training.proficiencyUses,
    sharedProficiencyUses: state.sharedProficiencyUses,
    state: state.training.state,
    gpa,
    evidence: [evidence[0]!, evidence[1]!, evidence[2]!],
  };
}

/** Adds XP to one attribute, ticking ratings at the shared 100-XP rule (cap 100). */
export function grantAttributeXpVNext(
  attributes: PositionAttributeProgress,
  attributeId: string,
  xp: number,
): PositionAttributeProgress {
  const current = (
    attributes as Readonly<Record<string, { rating: number; xp: number } | undefined>>
  )[attributeId];
  if (current === undefined || xp <= 0) return attributes;
  let rating = current.rating;
  let pool = current.xp + xp;
  while (rating < 100 && pool >= ATTRIBUTE_XP_PER_RATING) {
    rating += 1;
    pool -= ATTRIBUTE_XP_PER_RATING;
  }
  return { ...attributes, [attributeId]: { rating, xp: rating >= 100 ? 0 : pool } };
}

// ---------------------------------------------------------------------------------------------
// The calendar.

export const VNEXT_DEVELOPMENT_CALENDAR = Object.freeze({
  /** Camp work counts for half again a practice week's XP. */
  campXpPermille: 1500,
  /** Recovery and study hall have no place in a summer camp. */
  campExcludedFocusIds: ['action_recovery', 'action_study_hall'] as readonly string[],
  /** Teammates' camp week draws `:vnext:rivals:<season>:99`, apart from the in-season weeks. */
  campRivalWeek: 99,
  /** The midseason checkpoint follows this many regular-season games. */
  midseasonWeek: 6,
  focusWindowWeeks: 3,
  focusRequiredWeeks: 2,
  focusReward: { trust: 3, xp: 60, gauge: 10 },
  focusMissTrust: -1,
  /** A season with this many missed live reads gets a film focus instead. */
  missedReadsForFilmFocus: 3,
  historyLimit: 12,
});

export function emptyDevelopmentVNext(): DevelopmentVNext {
  return { camps: [], reviews: [], focus: null, focusHistory: [], offseason: [] };
}

export function developmentOfVNext(career: Pick<CareerVNext, 'development'>): DevelopmentVNext {
  return career.development ?? emptyDevelopmentVNext();
}

/** The focuses open at camp (the week's catalog minus recovery and study hall). */
export function campFocusIdsVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly string[] {
  return focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id as string)
    .filter((id) => !VNEXT_DEVELOPMENT_CALENDAR.campExcludedFocusIds.includes(id));
}

/** The position's attribute weights in overall (the coaches' talent evaluation). */
export function overallWeightsVNext(
  career: Pick<CareerVNext, 'athlete'>,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): readonly { readonly attributeId: string; readonly weightPermille: number }[] {
  return Object.entries(mechanics.room.recruitingAbilityWeightsPermille)
    .map(([attributeId, weightPermille]) => ({ attributeId, weightPermille: weightPermille ?? 0 }))
    .filter(({ weightPermille }) => weightPermille > 0)
    .filter(({ attributeId }) =>
      (getPlayableAttributeIds(career.athlete.profile.positionId) as readonly string[]).includes(
        attributeId,
      ),
    )
    .sort(
      (left, right) =>
        right.weightPermille - left.weightPermille ||
        left.attributeId.localeCompare(right.attributeId),
    );
}

function ratingOf(career: CareerVNext, attributeId: string): number {
  return (
    (career.athlete.profile.attributes as Readonly<Record<string, { rating: number } | undefined>>)[
      attributeId
    ]?.rating ?? 0
  );
}

/** The focus that trains `attributeId` hardest (null when none does). */
function focusTraining(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  attributeId: string,
): string | null {
  let best: { id: string; xp: number } | null = null;
  for (const definition of focusDefinitionsVNext(career, mechanics))
    for (const entry of definition.attributeXp)
      if (entry.attributeId === attributeId && (best === null || entry.baseXp > best.xp))
        best = { id: definition.id, xp: entry.baseXp };
  return best?.id ?? null;
}

/** This season's missed live reads so far (from the saved recaps). */
function missedReadsThisSeason(career: CareerVNext): number {
  return career.log
    .filter((recap) => (recap.seasonIndex ?? 0) === career.season.index)
    .reduce(
      (sum, recap) =>
        sum +
        (
          recap.engine.game.keyPlayLog as unknown as readonly { readonly decisionFit?: number }[]
        ).filter((play) => readQuality(play.decisionFit ?? 0) === 'MISSED').length,
      0,
    );
}

/**
 * The coach's suggestion: a film focus after repeated missed reads, otherwise the drill for the key
 * attribute with the most overall to gain (weight × room to grow).
 */
export function coachSuggestionVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): MidseasonReviewVNext['suggestion'] {
  const film = 'action_film_study';
  if (
    missedReadsThisSeason(career) >= VNEXT_DEVELOPMENT_CALENDAR.missedReadsForFilmFocus &&
    focusDefinitionsVNext(career, mechanics).some(({ id }) => id === film)
  )
    return { focusId: film, attributeId: 'attribute_football_iq', reason: 'MISSED_READS' };
  const ranked = overallWeightsVNext(career, mechanics)
    .map(({ attributeId, weightPermille }) => ({
      attributeId,
      upside: weightPermille * (100 - ratingOf(career, attributeId)),
      focusId: focusTraining(career, mechanics, attributeId),
    }))
    .filter((entry): entry is typeof entry & { focusId: string } => entry.focusId !== null)
    .sort(
      (left, right) =>
        right.upside - left.upside || left.attributeId.localeCompare(right.attributeId),
    );
  const top = ranked[0];
  return top === undefined
    ? { focusId: film, attributeId: 'attribute_football_iq', reason: 'KEY_ATTRIBUTE' }
    : { focusId: top.focusId, attributeId: top.attributeId, reason: 'KEY_ATTRIBUTE' };
}

/**
 * Settles the coach's focus for one planned week. Returns the next development state and, when a
 * focus is active this week, what the week did (the reward or the miss applies on the settling
 * week only).
 */
export function settleCoachFocusVNext(
  development: DevelopmentVNext,
  seasonIndex: number,
  weekIndex: number,
  focusIds: readonly string[],
): { readonly development: DevelopmentVNext; readonly week: CoachFocusWeekVNext | null } {
  const focus = development.focus;
  if (
    focus === null ||
    focus.outcome !== 'ACTIVE' ||
    focus.seasonIndex !== seasonIndex ||
    weekIndex < focus.fromWeek
  )
    return { development, week: null };
  const counted = focusIds.includes(focus.focusId);
  const done = focus.done + (counted ? 1 : 0);
  const tuning = VNEXT_DEVELOPMENT_CALENDAR;
  const met = done >= focus.required;
  const lastWeek = weekIndex >= focus.untilWeek - 1;
  const outcome: CoachFocusVNext['outcome'] = met ? 'MET' : lastWeek ? 'MISSED' : 'ACTIVE';
  const next: CoachFocusVNext = { ...focus, done, outcome };
  const week: CoachFocusWeekVNext = {
    counted,
    done,
    required: focus.required,
    outcome,
    trustDelta:
      outcome === 'MET'
        ? tuning.focusReward.trust
        : outcome === 'MISSED'
          ? tuning.focusMissTrust
          : 0,
    xp: outcome === 'MET' ? tuning.focusReward.xp : 0,
    gauge: outcome === 'MET' ? tuning.focusReward.gauge : 0,
  };
  return {
    development:
      outcome === 'ACTIVE'
        ? { ...development, focus: next }
        : {
            ...development,
            focus: null,
            focusHistory: [...development.focusHistory, next].slice(-tuning.historyLimit),
          },
    week,
  };
}

// ---------------------------------------------------------------------------------------------
// Offseason programs.

export interface OffseasonProgramDefinitionVNext {
  readonly id: OffseasonProgramIdVNext;
  /** Fixed attributes, or `KEY` for the position's two most heavily weighted attributes. */
  readonly xp: readonly { readonly attributeId: string | 'KEY'; readonly xp: number }[];
  /** Where next season starts (absent = the usual full Body and 50 Preparation). */
  readonly bodyStart?: number;
  readonly preparationStart?: number;
  readonly gpaDelta?: number;
  readonly brandDelta?: number;
}

export const VNEXT_OFFSEASON_PROGRAMS: readonly OffseasonProgramDefinitionVNext[] = Object.freeze([
  {
    id: 'offseason_strength',
    xp: [
      { attributeId: 'attribute_strength', xp: 150 },
      { attributeId: 'attribute_durability', xp: 100 },
    ],
    bodyStart: 90,
  },
  {
    id: 'offseason_speed',
    xp: [
      { attributeId: 'attribute_speed', xp: 150 },
      { attributeId: 'attribute_agility', xp: 100 },
    ],
    bodyStart: 92,
  },
  {
    id: 'offseason_film',
    xp: [{ attributeId: 'attribute_football_iq', xp: 120 }],
    preparationStart: 70,
    gpaDelta: -0.05,
  },
  {
    id: 'offseason_clinic',
    xp: [
      { attributeId: 'KEY', xp: 120 },
      { attributeId: 'KEY', xp: 120 },
    ],
    brandDelta: -3,
  },
  {
    id: 'offseason_classes',
    xp: [{ attributeId: 'attribute_football_iq', xp: 60 }],
    gpaDelta: 0.25,
  },
]);

export function isOffseasonProgramIdVNext(value: unknown): value is OffseasonProgramIdVNext {
  return VNEXT_OFFSEASON_PROGRAMS.some(({ id }) => id === value);
}

/** The XP an offseason program grants this athlete (attribute IDs resolved, potential applied). */
export function offseasonProgramXpVNext(
  career: CareerVNext,
  programId: OffseasonProgramIdVNext,
  mechanics: CareerVNextMechanics,
  potentialPermille: number,
): readonly { readonly attributeId: string; readonly xp: number }[] {
  const program = VNEXT_OFFSEASON_PROGRAMS.find(({ id }) => id === programId);
  if (program === undefined) return [];
  const keys = overallWeightsVNext(career, mechanics).map(({ attributeId }) => attributeId);
  const playable = getPlayableAttributeIds(career.athlete.profile.positionId) as readonly string[];
  let keyIndex = 0;
  return program.xp
    .map(({ attributeId, xp }) => ({
      attributeId:
        attributeId === 'KEY' ? (keys[keyIndex++] ?? 'attribute_football_iq') : attributeId,
      xp: Math.round((xp * potentialPermille) / 1000),
    }))
    .filter(({ attributeId }) => playable.includes(attributeId));
}

// ---------------------------------------------------------------------------------------------
// Explanations: milestones the planner shows.

export interface InformationOutlookVNext {
  /** The information score at the current Football IQ, reading skill and Preparation. */
  readonly score: number;
  /** Tells from the score alone; cards and events can add more on a given snap. */
  readonly tells: 0 | 1 | 2;
  /** The score for the next tell (null at two). */
  readonly nextAt: number | null;
  /** Preparation points that alone would reach it (null when Preparation cannot). */
  readonly preparationNeeded: number | null;
  /** Football IQ rating points that alone would reach it (null when IQ cannot). */
  readonly iqNeeded: number | null;
}

export function informationOutlookVNext(career: CareerVNext): InformationOutlookVNext {
  const positionId = career.athlete.profile.positionId as InformationPositionId;
  const attributes = career.athlete.profile.attributes;
  const preparation = career.athlete.profile.state.preparation;
  const score = Math.max(
    0,
    Math.min(100, informationBaseScore(positionId, attributes, preparation)),
  );
  const tells = informationTierTells(positionId, score);
  const [one, two] = INFORMATION_RULES[positionId].tiers;
  const nextAt = tells === 0 ? one : tells === 1 ? two : null;
  if (nextAt === null) return { score, tells, nextAt, preparationNeeded: null, iqNeeded: null };
  let preparationNeeded: number | null = null;
  for (let delta = 1; preparation + delta <= 100; delta += 1)
    if (informationBaseScore(positionId, attributes, preparation + delta) >= nextAt) {
      preparationNeeded = delta;
      break;
    }
  let iqNeeded: number | null = null;
  const iq = ratingOf(career, 'attribute_football_iq');
  for (let delta = 1; iq + delta <= 100; delta += 1) {
    const raised = grantAttributeXpVNext(
      attributes,
      'attribute_football_iq',
      delta * ATTRIBUTE_XP_PER_RATING,
    );
    if (informationBaseScore(positionId, raised, preparation) >= nextAt) {
      iqNeeded = delta;
      break;
    }
  }
  return { score, tells, nextAt, preparationNeeded, iqNeeded };
}

export interface NextPointVNext {
  readonly attributeId: string;
  readonly rating: number;
  readonly xpToNext: number;
  readonly weightPermille: number;
}

/** The three attributes that move overall most, with the XP each needs for its next point. */
export function nextPointsVNext(
  career: CareerVNext,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): readonly NextPointVNext[] {
  const attributes = career.athlete.profile.attributes as Readonly<
    Record<string, { rating: number; xp: number } | undefined>
  >;
  return overallWeightsVNext(career, mechanics)
    .slice(0, 3)
    .flatMap(({ attributeId, weightPermille }) => {
      const current = attributes[attributeId];
      return current === undefined
        ? []
        : [
            {
              attributeId,
              rating: current.rating,
              xpToNext: current.rating >= 100 ? 0 : ATTRIBUTE_XP_PER_RATING - current.xp,
              weightPermille,
            },
          ];
    });
}

/** The weakest draft-stock factor after the last completed season (null before one). */
export function draftWeakestFactorVNext(career: Pick<CareerVNext, 'history'>): {
  readonly factor: 'ability' | 'production' | 'exposure' | 'bigGames';
  readonly value: number;
} | null {
  const stock = career.history.at(-1)?.draftStock;
  if (stock === undefined) return null;
  const factors = (['ability', 'production', 'exposure', 'bigGames'] as const).map((factor) => ({
    factor,
    value: stock.factors[factor],
  }));
  return factors.sort((left, right) => left.value - right.value)[0]!;
}

/** State the next season starts with after an offseason program (the usual reset otherwise). */
export function offseasonStartStateVNext(
  state: PlayerState,
  programId: OffseasonProgramIdVNext | null,
): Pick<PlayerState, 'body' | 'preparation' | 'gpa' | 'brand'> {
  const program = VNEXT_OFFSEASON_PROGRAMS.find(({ id }) => id === programId);
  return {
    body: program?.bodyStart ?? 100,
    preparation: program?.preparationStart ?? 50,
    gpa: Math.max(0, Math.min(4, Math.round((state.gpa + (program?.gpaDelta ?? 0)) * 1000) / 1000)),
    brand: Math.max(0, Math.min(100, state.brand + (program?.brandDelta ?? 0))),
  };
}

/**
 * The coach's recommended camp: the two position drills with the most overall to gain (attribute
 * weight × room to grow, over what each drill trains), then film study.
 */
export function recommendedCampVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly string[] {
  const open = campFocusIdsVNext(career, mechanics);
  const weights = new Map(
    overallWeightsVNext(career, mechanics).map(({ attributeId, weightPermille }) => [
      attributeId,
      weightPermille,
    ]),
  );
  const drills = focusDefinitionsVNext(career, mechanics)
    .filter((entry) => 'positionId' in entry && open.includes(entry.id))
    .map((entry) => ({
      id: entry.id as string,
      value: entry.attributeXp.reduce(
        (sum, { attributeId, baseXp }) =>
          sum + (weights.get(attributeId) ?? 0) * (100 - ratingOf(career, attributeId)) * baseXp,
        0,
      ),
    }))
    .sort((left, right) => right.value - left.value || left.id.localeCompare(right.id))
    .map(({ id }) => id);
  const plan = drills.slice(0, 2);
  const film = 'action_film_study';
  plan.push(open.includes(film) ? film : (open.find((id) => !plan.includes(id)) ?? drills[0]!));
  while (plan.length < 3) plan.push(open.find((id) => !plan.includes(id))!);
  return plan;
}

export interface DepthOutlookVNext {
  readonly direction: 'ADVANCEMENT_TARGET' | 'ROLE_PRESSURE';
  /** The teammate above (to pass) or below (pressing you). */
  readonly neighborParticipantId: string;
  /**
   * Depth points (0–100 scale, one decimal) the athlete must gain on that teammate to move up, or
   * (at the top) how many the teammate below must gain to move past: the gap plus the hysteresis
   * margin a change of order needs.
   */
  readonly pointsToMove: number;
  /** The component the athlete trails most in (null when nothing trails). */
  readonly leadingDeficit: string | null;
}

/** The next depth move in plain points, from the same rule practice uses. */
export function depthOutlookVNext(
  career: Pick<CareerVNext, 'program'>,
  mechanics: Pick<CareerVNextMechanics, 'room'>,
): DepthOutlookVNext | null {
  const room = career.program?.room;
  if (room === undefined) return null;
  const explanation = room.adjacentExplanation;
  const threshold = mechanics.room.hysteresisThresholdMilli;
  const milli =
    explanation.direction === 'ADVANCEMENT_TARGET'
      ? explanation.scoreGapMilli + threshold
      : -explanation.scoreGapMilli + threshold;
  return {
    direction: explanation.direction,
    neighborParticipantId: explanation.neighborParticipantId,
    pointsToMove: Math.max(0.1, Math.ceil(milli / 100) / 10),
    leadingDeficit: explanation.leadingPlayerDeficit?.componentId ?? null,
  };
}
