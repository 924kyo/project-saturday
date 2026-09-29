import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { positionAlphaSourceClockV2 } from './position-alpha-calendar-v2.js';
import type { PlayerState } from '../player/types.js';
import type { ProgramId } from '../player/ids.js';
import type { ProgramStrengthBandId } from '../programs/ids.js';
import type { RngState } from '../random/rng.js';
import { isNilOfferId, type NilOfferId, type RelationshipActorId } from '../off-field/ids.js';
import { isOffFieldMechanicsCatalog } from '../off-field/definitions.js';
import { applyNilEffectsFromContext } from '../off-field/nil-effects.js';
import { selectNilOfferFromContext } from '../off-field/nil-selection.js';
import type {
  ActiveNilCareerStateV1,
  NilHistoryEvidenceV1,
  NilOfferEligibilityContextV1,
  NilOfferSelectionEvidenceV1,
  OffFieldMechanicsCatalog,
} from '../off-field/types.js';
import {
  derivePositionEligibilityContext,
  type PositionRelationshipActorId,
  type PositionCareerLifecycleV1,
} from './position-lifecycle.js';
import type { PositionAlphaEventSourceV2 } from './position-alpha-events-v2.js';
import { collectEquippedLifeHooks } from '../skills/effects.js';
import { derivePositiveLifeSkillMultiplier } from '../skills/positive-life-effects.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import type { SkillId } from '../skills/ids.js';
import { positionSkillEffectLoadout } from './position-alpha-skill-builds.js';

export interface PositionAlphaNilMechanicsV2 {
  readonly skillDefinitions: readonly SkillMechanicsDefinition[];
  readonly skillIds: readonly SkillId[];
  readonly catalog: OffFieldMechanicsCatalog;
  readonly programStrengthBands: readonly {
    readonly programId: ProgramId;
    readonly strengthBandId: ProgramStrengthBandId;
  }[];
}
export type PositionAlphaNilActionV2 =
  | { readonly type: 'ACCEPT' | 'DECLINE'; readonly offerId: NilOfferId }
  | { readonly type: 'EXPIRE' | 'FULFILL' | 'DEFAULT' };

export interface PositionAlphaNilPlanningEntryV2 {
  readonly action: PositionAlphaNilActionV2;
  readonly equippedSkillIds: readonly (SkillId | null)[];
}

/** Week-start player state remains in the aggregate. Only NIL state/requests live here. */
export interface PositionAlphaNilStateV2 {
  readonly model: 'position_alpha_nil_v2';
  readonly activatedAtCareerWeekIndex: number;
  readonly weekStart: ActiveNilCareerStateV1;
  readonly planning: readonly PositionAlphaNilPlanningEntryV2[];
  readonly state: ActiveNilCareerStateV1;
}
export interface PositionAlphaNilPlanningProjectionV2 {
  readonly state: ActiveNilCareerStateV1;
  readonly playerState: PlayerState;
  readonly relationships: PositionCareerLifecycleV1['relationships'];
  readonly obligationGpaDeltaMilli: number;
}
export interface PositionAlphaNilWeekV2 {
  readonly model: 'position_alpha_nil_week_v2';
  readonly careerWeekIndex: number;
  readonly context: NilOfferEligibilityContextV1;
  readonly before: ActiveNilCareerStateV1;
  readonly reason:
    'SELECTED' | 'EMPTY_POOL' | 'PENDING_OFFER' | 'ACTIVE_OBLIGATION' | 'SEASON_CUTOFF';
  readonly selection: NilOfferSelectionEvidenceV1 | null;
  readonly after: PositionAlphaNilStateV2;
  readonly rngBefore: RngState;
  readonly rng: RngState;
}
const ACTORS: Readonly<Record<PositionRelationshipActorId, RelationshipActorId>> = {
  POSITION_COACH: 'relationship_actor_position_coach',
  ROOM_LEADER: 'relationship_actor_teammate_leader',
  DIRECT_COMPETITOR: 'relationship_actor_direct_competitor',
};
const TAG_ALIASES: Readonly<Record<string, `tag_${string}`>> = {
  tag_relationship_coach_high: 'tag_relationship_position_coach_high',
  tag_relationship_coach_low: 'tag_relationship_position_coach_low',
  tag_relationship_room_high: 'tag_relationship_teammate_leader_high',
  tag_relationship_room_low: 'tag_relationship_teammate_leader_low',
  tag_relationship_competitor_high: 'tag_relationship_direct_competitor_high',
  tag_relationship_competitor_low: 'tag_relationship_direct_competitor_low',
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function createPositionAlphaNilBaselineV2(): ActiveNilCareerStateV1 {
  return deepFreeze({
    model: 'nil_v1',
    bootstrapStatus: 'ACTIVE',
    fictionalFundsUsd: 0,
    benefitStacks: [],
    pendingOffers: [],
    activeObligation: null,
    lastOfferAttempt: null,
    history: [],
  });
}

function validAction(value: unknown): value is PositionAlphaNilActionV2 {
  if (!record(value)) return false;
  if (value['type'] === 'ACCEPT' || value['type'] === 'DECLINE')
    return Object.keys(value).sort().join('|') === 'offerId|type' && isNilOfferId(value['offerId']);
  return (
    Object.keys(value).join('|') === 'type' &&
    ['EXPIRE', 'FULFILL', 'DEFAULT'].includes(String(value['type']))
  );
}

function validPlanningEntry(
  value: unknown,
  mechanics: PositionAlphaNilMechanicsV2,
): value is PositionAlphaNilPlanningEntryV2 {
  if (
    !record(value) ||
    Object.keys(value).sort().join('|') !== 'action|equippedSkillIds' ||
    !validAction(value['action']) ||
    !Array.isArray(value['equippedSkillIds']) ||
    value['equippedSkillIds'].length !== 4
  )
    return false;
  const seen = new Set<SkillId>();
  for (const id of value['equippedSkillIds']) {
    if (id === null) continue;
    if (!mechanics.skillIds.includes(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

function applyPlanningAction(
  current: PositionAlphaNilPlanningProjectionV2,
  entry: PositionAlphaNilPlanningEntryV2,
  careerWeekIndex: number,
  mechanics: PositionAlphaNilMechanicsV2,
): PositionAlphaNilPlanningProjectionV2 | null {
  const action = entry.action;
  const state = current.state;
  if (action.type === 'EXPIRE') {
    const expired = state.pendingOffers.filter(
      ({ expiresAfterWeekIndex }) => careerWeekIndex > expiresAfterWeekIndex,
    );
    if (expired.length === 0) return null;
    return {
      ...current,
      state: {
        ...state,
        pendingOffers: state.pendingOffers.filter(
          ({ expiresAfterWeekIndex }) => careerWeekIndex <= expiresAfterWeekIndex,
        ),
        history: [
          ...state.history,
          ...expired.map((offer) => ({
            model: 'nil_offer_expiration_v1' as const,
            weekIndex: careerWeekIndex,
            offer,
          })),
        ],
      },
    };
  }
  const offerId =
    action.type === 'ACCEPT' || action.type === 'DECLINE'
      ? action.offerId
      : state.activeObligation?.offerId;
  const definition = mechanics.catalog.nilOffers.find(({ id }) => id === offerId);
  if (definition === undefined) return null;
  let evidence: NilHistoryEvidenceV1;
  const hooks = collectEquippedLifeHooks(
    positionSkillEffectLoadout(entry.equippedSkillIds, mechanics.skillDefinitions),
    mechanics.skillDefinitions,
  );
  if (!hooks.ok) return null;
  const reward = derivePositiveLifeSkillMultiplier(
    action.type === 'ACCEPT' ? hooks.hooks : [],
    'life_hook_nil_reward_multiplier',
  );
  let nextState: ActiveNilCareerStateV1;
  let effects = definition.rewardEffects;
  let sourceId:
    | 'nil_effect_source_offer_reward'
    | 'nil_effect_source_obligation_weekly'
    | 'nil_effect_source_obligation_default' = 'nil_effect_source_offer_reward';
  if (action.type === 'ACCEPT' || action.type === 'DECLINE') {
    const pending = state.pendingOffers.find((offer) => offer.offerId === action.offerId);
    if (
      pending === undefined ||
      careerWeekIndex > pending.expiresAfterWeekIndex ||
      state.activeObligation !== null
    )
      return null;
    if (action.type === 'DECLINE') effects = [];
    evidence = {
      model: 'nil_offer_decision_v1',
      weekIndex: careerWeekIndex,
      decisionId: action.type,
      offer: pending,
      appliedSkillEffects: reward.appliedSkillEffects,
      rewardMultiplierPermille: reward.multiplierPermille,
      appliedEffects: [],
    };
    nextState = {
      ...state,
      pendingOffers: state.pendingOffers.filter(({ offerId: id }) => id !== action.offerId),
      activeObligation:
        action.type === 'DECLINE'
          ? null
          : {
              offerId: definition.id,
              obligationId: definition.obligation.id,
              acceptedWeekIndex: careerWeekIndex,
              remainingWeeks: definition.obligation.durationWeeks,
              lastResolvedWeekIndex: null,
            },
    };
  } else {
    const obligation = state.activeObligation;
    if (
      obligation === null ||
      obligation.obligationId !== definition.obligation.id ||
      careerWeekIndex < obligation.acceptedWeekIndex ||
      obligation.lastResolvedWeekIndex === careerWeekIndex
    )
      return null;
    const remainingWeeksAfter =
      action.type === 'FULFILL' ? Math.max(0, obligation.remainingWeeks - 1) : 0;
    sourceId =
      action.type === 'FULFILL'
        ? 'nil_effect_source_obligation_weekly'
        : 'nil_effect_source_obligation_default';
    effects =
      action.type === 'FULFILL'
        ? definition.obligation.weeklyEffects
        : definition.obligation.defaultEffects;
    evidence = {
      model: 'nil_obligation_resolution_v1',
      weekIndex: careerWeekIndex,
      resolutionId: action.type,
      offerId: obligation.offerId,
      obligationId: obligation.obligationId,
      focusCost: definition.obligation.focusCost,
      remainingWeeksBefore: obligation.remainingWeeks,
      remainingWeeksAfter,
      appliedEffects: [],
    };
    nextState = {
      ...state,
      activeObligation:
        remainingWeeksAfter === 0
          ? null
          : {
              ...obligation,
              remainingWeeks: remainingWeeksAfter,
              lastResolvedWeekIndex: careerWeekIndex,
            },
    };
  }
  const applied = applyNilEffectsFromContext(
    {
      playerState: current.playerState,
      relationshipTracks: current.relationships.map(({ actorId, value }) => ({
        actorId: ACTORS[actorId],
        value,
      })),
      fictionalFundsUsd: state.fictionalFundsUsd,
      benefitStacks: state.benefitStacks,
    },
    effects,
    sourceId,
    mechanics.catalog.benefits,
    reward.multiplierPermille,
  );
  if (applied === null) return null;
  evidence = { ...evidence, appliedEffects: applied.appliedEffects };
  return {
    state: {
      ...nextState,
      fictionalFundsUsd: applied.fictionalFundsUsd,
      benefitStacks: applied.benefitStacks,
      history: [...state.history, evidence],
    },
    playerState: applied.playerState,
    relationships: current.relationships.map((track) => ({
      ...track,
      value: applied.relationshipTracks.find(({ actorId }) => actorId === ACTORS[track.actorId])!
        .value,
    })) as unknown as PositionCareerLifecycleV1['relationships'],
    obligationGpaDeltaMilli:
      current.obligationGpaDeltaMilli +
      (evidence.model === 'nil_obligation_resolution_v1'
        ? applied.appliedEffects
            .filter(({ effect }) => effect.type === 'nil_gpa_delta_milli')
            .reduce((sum, effect) => sum + effect.actualDelta, 0)
        : 0),
  };
}

/** Internal replay borrows readonly inputs; public projections/publication clone them. */
export function replayPositionAlphaNilPlanningV2(
  source: {
    readonly nil?: PositionAlphaNilStateV2;
    readonly player: { readonly state: PlayerState };
    readonly lifecycle: { readonly relationships: PositionCareerLifecycleV1['relationships'] };
  },
  careerWeekIndex: number,
  mechanics: PositionAlphaNilMechanicsV2,
): PositionAlphaNilPlanningProjectionV2 | null {
  if (
    !isOffFieldMechanicsCatalog(mechanics.catalog) ||
    !Number.isSafeInteger(careerWeekIndex) ||
    careerWeekIndex < 0 ||
    careerWeekIndex > 28
  )
    return null;
  let current: PositionAlphaNilPlanningProjectionV2 = {
    state: createPositionAlphaNilBaselineV2(),
    playerState: source.player.state,
    relationships: source.lifecycle.relationships,
    obligationGpaDeltaMilli: 0,
  };
  if (!Object.hasOwn(source, 'nil')) return current;
  const nil = source.nil;
  if (
    !record(nil) ||
    Object.keys(nil).sort().join('|') !==
      'activatedAtCareerWeekIndex|model|planning|state|weekStart' ||
    nil.model !== 'position_alpha_nil_v2' ||
    !Number.isInteger(nil.activatedAtCareerWeekIndex) ||
    nil.activatedAtCareerWeekIndex < 0 ||
    nil.activatedAtCareerWeekIndex > careerWeekIndex ||
    !Array.isArray(nil.planning) ||
    nil.planning.length > 4
  )
    return null;
  current = { ...current, state: nil.weekStart };
  try {
    for (const entry of nil.planning) {
      if (!validPlanningEntry(entry, mechanics)) return null;
      const next = applyPlanningAction(current, entry, careerWeekIndex, mechanics);
      if (next === null) return null;
      current = next;
    }
    return same(current.state, nil.state) ? current : null;
  } catch {
    return null;
  }
}

export function projectPositionAlphaNilPlanningV2(
  ...args: Parameters<typeof replayPositionAlphaNilPlanningV2>
): PositionAlphaNilPlanningProjectionV2 | null {
  const projection = replayPositionAlphaNilPlanningV2(...args);
  return projection === null ? null : deepFreeze(cloneSerializable(projection));
}

export function appendPositionAlphaNilActionV2(
  source: Parameters<typeof projectPositionAlphaNilPlanningV2>[0] & {
    readonly skills: { readonly equippedSkillIds: readonly (SkillId | null)[] };
  },
  action: unknown,
  careerWeekIndex: number,
  mechanics: PositionAlphaNilMechanicsV2,
): PositionAlphaNilStateV2 | null {
  if (source.nil === undefined || !validAction(action)) return null;
  const entry = { action, equippedSkillIds: source.skills.equippedSkillIds };
  if (!validPlanningEntry(entry, mechanics)) return null;
  const current = replayPositionAlphaNilPlanningV2(source, careerWeekIndex, mechanics);
  if (current === null) return null;
  const next = applyPlanningAction(current, entry, careerWeekIndex, mechanics);
  return next === null
    ? null
    : deepFreeze(
        cloneSerializable({
          ...source.nil,
          planning: [...source.nil.planning, entry],
          state: next.state,
        }),
      );
}

export function attemptPositionAlphaNilWeekV2(
  source: PositionAlphaEventSourceV2 & { readonly nil?: PositionAlphaNilStateV2 },
  careerWeekIndex: number,
  mechanics: PositionAlphaNilMechanicsV2,
): PositionAlphaNilWeekV2 | null {
  if (!isOffFieldMechanicsCatalog(mechanics.catalog)) return null;
  const clock = positionAlphaSourceClockV2(source);
  if (clock === null) return null;
  const seasonWeekIndex = careerWeekIndex - clock.careerWeekOffset;
  const program = mechanics.programStrengthBands.find(
    ({ programId }) => programId === source.lifecycle.currentProgramId,
  );
  const eligibility = derivePositionEligibilityContext(
    source.player.positionId,
    source.room.projection.roleId,
    source.player.state.brand,
    Math.round(source.player.state.gpa * 1000),
    source.previousStats,
    source.lifecycle.relationships,
  );
  if (
    program === undefined ||
    eligibility === null ||
    !Number.isInteger(careerWeekIndex) ||
    seasonWeekIndex < 0 ||
    seasonWeekIndex > 13
  )
    return null;
  const context: NilOfferEligibilityContextV1 = {
    brand: source.player.state.brand,
    depthRank: source.room.projection.rank,
    gpaMilli: Math.round(source.player.state.gpa * 1000),
    programStrengthBandId: program.strengthBandId,
    tagIds: [
      ...new Set([
        ...source.player.tagIds,
        ...eligibility.tagIds,
        ...eligibility.tagIds.flatMap((tag) =>
          TAG_ALIASES[tag] === undefined ? [] : [TAG_ALIASES[tag]!],
        ),
      ]),
    ].sort(),
  };
  const before = source.nil?.state ?? createPositionAlphaNilBaselineV2();
  let state = before;
  let rng = source.careerRng;
  let selection: NilOfferSelectionEvidenceV1 | null = null;
  let reason: PositionAlphaNilWeekV2['reason'];
  if (seasonWeekIndex >= 9) reason = 'SEASON_CUTOFF';
  else if (before.pendingOffers.length > 0) reason = 'PENDING_OFFER';
  else if (before.activeObligation !== null) reason = 'ACTIVE_OBLIGATION';
  else {
    // Even acceptance on the authored inclusive expiry must leave enough regular
    // planning weeks to finish. Historical WR offer timing remains unchanged.
    const feasibleOffers = mechanics.catalog.nilOffers.filter(
      (offer) => seasonWeekIndex + offer.expirationWeeks + offer.obligation.durationWeeks <= 12,
    );
    const selected = selectNilOfferFromContext(
      before,
      context,
      feasibleOffers,
      careerWeekIndex,
      source.careerRng,
    );
    state = selected.nil;
    rng = selected.rng;
    selection = selected.evidence;
    reason = selection.selectedOfferId === null ? 'EMPTY_POOL' : 'SELECTED';
  }
  // Private engine orchestration borrows readonly source state; the publishing
  // command/summary creates the detached immutable saved record exactly once.
  return {
    model: 'position_alpha_nil_week_v2',
    careerWeekIndex,
    context,
    before,
    reason,
    selection,
    after: {
      model: 'position_alpha_nil_v2',
      activatedAtCareerWeekIndex: source.nil?.activatedAtCareerWeekIndex ?? careerWeekIndex,
      weekStart: state,
      planning: [],
      state,
    },
    rngBefore: source.careerRng,
    rng,
  };
}
