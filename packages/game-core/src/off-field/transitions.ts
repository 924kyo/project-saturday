import { deepFreeze } from '../player/immutable.js';
import { isPlayerTagId, type PlayerTagId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import type { CareerRun } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { isProgramStrengthBandId, type ProgramStrengthBandId } from '../programs/ids.js';
import { collectEquippedLifeHooks } from '../skills/effects.js';
import { isSkillMechanicsDefinitionCatalog } from '../skills/definition.js';
import type { SkillMechanicsDefinition } from '../skills/types.js';
import { isOffFieldMechanicsCatalog } from './definitions.js';
import { deriveAcademicCheckpointEvidence, initialAcademicStatus } from './academics.js';
import { selectNilOfferFromContext } from './nil-selection.js';
import { applyNilEffectsFromContext } from './nil-effects.js';
import {
  derivePositiveLifeSkillMultiplier,
  scalePositiveRelationshipDelta,
} from '../skills/positive-life-effects.js';
import {
  RELATIONSHIP_ACTOR_IDS,
  isNilOfferId,
  type OffFieldCommandFailureReason,
  type NilEffectSourceId,
  type NilOfferDecisionId,
  type NilOfferId,
  type NilObligationResolutionId,
  type RelationshipContextTagId,
} from './ids.js';
import type {
  ActiveNilCareerStateV1,
  ActiveNilObligationV1,
  ActiveRelationshipCareerStateV1,
  NilBenefitStackV1,
  NilEffect,
  NilEffectApplicationEvidenceV1,
  NilOfferEligibilityContextV1,
  OffFieldMechanicsCatalog,
  RelationshipContextProjectionV1,
  RelationshipFootballEffectsV1,
  RelationshipTrackV1,
  WeeklyRelationshipResolutionEvidenceV1,
} from './types.js';

export interface NilOfferSelectionContext {
  readonly programStrengthBandId: ProgramStrengthBandId;
  readonly additionalTagIds: readonly PlayerTagId[];
}

export type OffFieldCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: OffFieldCommandFailureReason;
    };

function failure(career: CareerRun, reason: OffFieldCommandFailureReason): OffFieldCommandResult {
  return deepFreeze({ ok: false, career, reason });
}

function success(previous: CareerRun, next: CareerRun): OffFieldCommandResult {
  if (!validateCareerRun(next).ok) {
    return failure(previous, 'off_field.internal_invariant_failure');
  }
  return deepFreeze({ ok: true, career: next });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function canIncrementRevision(career: CareerRun): boolean {
  return Number.isSafeInteger(career.revision) && career.revision < Number.MAX_SAFE_INTEGER;
}

export function bootstrapOffFieldSystems(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  if (
    career.phase.type !== 'PLAN_ACTIONS' ||
    career.recruitingState.type !== 'COMMITTED' ||
    career.programId === null ||
    career.programContext === null ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    career.offFieldCareerState.academics.bootstrapStatus !== 'PENDING' ||
    career.offFieldCareerState.relationships.bootstrapStatus !== 'PENDING'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');
  const gpaMilli = Math.round(career.player.state.gpa * 1_000);
  const next: CareerRun = {
    ...career,
    revision: career.revision + 1,
    offFieldCareerState: {
      ...career.offFieldCareerState,
      academics: {
        model: 'academic_v1',
        bootstrapStatus: 'ACTIVE',
        termIndex: 1,
        eligibilityStatus: initialAcademicStatus(gpaMilli, definitions.academics),
        nextCheckpointIndex: 0,
        restrictionGamesRemaining: 0,
        lastCheckpoint: null,
        checkpointHistory: [],
        lastGameRestriction: null,
        gameRestrictionHistory: [],
      },
      relationships: {
        model: 'relationships_v1',
        bootstrapStatus: 'ACTIVE',
        tracks: definitions.relationshipActors.map(({ id, initialValue }) => ({
          actorId: id,
          value: initialValue,
        })),
        lastProcessedWeekIndex: null,
        history: [],
      },
      nil: {
        model: 'nil_v1',
        bootstrapStatus: 'ACTIVE',
        fictionalFundsUsd: 0,
        benefitStacks: [],
        pendingOffers: [],
        activeObligation: null,
        lastOfferAttempt: null,
        history: [],
      },
      programHistory: [
        {
          programId: career.programId,
          startSeasonIndex: career.seasonCareerState.seasonsCompleted,
          endSeasonIndex: null,
        },
      ],
    },
  };
  return success(career, next);
}

function validNilSelectionContext(context: NilOfferSelectionContext): boolean {
  return (
    isProgramStrengthBandId(context.programStrengthBandId) &&
    Array.isArray(context.additionalTagIds) &&
    context.additionalTagIds.length <= 32 &&
    context.additionalTagIds.every(isPlayerTagId) &&
    new Set(context.additionalTagIds).size === context.additionalTagIds.length
  );
}

export function selectNilOffer(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
  selectionContext: NilOfferSelectionContext,
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions) || !validNilSelectionContext(selectionContext)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  const nil = career.offFieldCareerState.nil;
  if (
    career.phase.type !== 'WEEK_END' ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    career.programContext === null ||
    !('bootstrapStatus' in nil) ||
    nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  if (nil.pendingOffers.length > 0) return failure(career, 'off_field.offer_pending');
  if (nil.activeObligation !== null) return failure(career, 'off_field.obligation_active');
  if (nil.lastOfferAttempt?.weekIndex === career.weekIndex) {
    return failure(career, 'off_field.already_resolved');
  }
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');

  const tagIds = [...new Set([...career.player.tagIds, ...selectionContext.additionalTagIds])].sort(
    compareCodeUnits,
  );
  const context: NilOfferEligibilityContextV1 = {
    brand: career.player.state.brand,
    depthRank: career.programContext.projection.rank,
    gpaMilli: Math.round(career.player.state.gpa * 1_000),
    programStrengthBandId: selectionContext.programStrengthBandId,
    tagIds,
  };
  const selected = selectNilOfferFromContext(
    nil,
    context,
    definitions.nilOffers,
    career.weekIndex,
    career.rng,
  );
  return success(career, {
    ...career,
    rng: selected.rng,
    revision: career.revision + 1,
    offFieldCareerState: {
      ...career.offFieldCareerState,
      nil: selected.nil,
    },
  });
}

interface NilEffectAccumulator {
  readonly playerState: CareerRun['player']['state'];
  readonly relationships: ActiveRelationshipCareerStateV1;
  readonly fictionalFundsUsd: number;
  readonly benefitStacks: readonly NilBenefitStackV1[];
  readonly appliedEffects: readonly NilEffectApplicationEvidenceV1[];
}

function applyNilEffects(
  career: CareerRun,
  nil: ActiveNilCareerStateV1,
  effects: readonly NilEffect[],
  sourceId: NilEffectSourceId,
  definitions: OffFieldMechanicsCatalog,
  rewardMultiplierPermille: number,
): NilEffectAccumulator | null {
  const activeRelationships = career.offFieldCareerState.relationships;
  if (activeRelationships.bootstrapStatus !== 'ACTIVE') return null;
  const result = applyNilEffectsFromContext(
    {
      playerState: career.player.state,
      relationshipTracks: activeRelationships.tracks,
      fictionalFundsUsd: nil.fictionalFundsUsd,
      benefitStacks: nil.benefitStacks,
    },
    effects,
    sourceId,
    definitions.benefits,
    rewardMultiplierPermille,
  );
  if (result === null) return null;
  return {
    playerState: result.playerState,
    relationships: { ...activeRelationships, tracks: result.relationshipTracks },
    fictionalFundsUsd: result.fictionalFundsUsd,
    benefitStacks: result.benefitStacks,
    appliedEffects: result.appliedEffects,
  };
}

export function decideNilOffer(
  career: CareerRun,
  offerId: NilOfferId,
  decisionId: NilOfferDecisionId,
  definitions: OffFieldMechanicsCatalog,
  skillDefinitions: readonly SkillMechanicsDefinition[],
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return failure(career, 'off_field.invalid_skill_definitions');
  }
  if (!isNilOfferId(offerId) || (decisionId !== 'ACCEPT' && decisionId !== 'DECLINE')) {
    return failure(career, 'off_field.invalid_choice');
  }
  const nil = career.offFieldCareerState.nil;
  if (
    career.phase.type !== 'PLAN_ACTIONS' ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    !('bootstrapStatus' in nil) ||
    nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  const pending = nil.pendingOffers.find((offer) => offer.offerId === offerId);
  if (pending === undefined) return failure(career, 'off_field.offer_not_found');
  if (career.weekIndex > pending.expiresAfterWeekIndex) {
    return failure(career, 'off_field.offer_expired');
  }
  if (nil.activeObligation !== null) return failure(career, 'off_field.obligation_active');
  const definition = definitions.nilOffers.find(({ id }) => id === offerId);
  if (definition === undefined) return failure(career, 'off_field.invalid_definitions');
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');

  const lifeHooks = collectEquippedLifeHooks(career.player.skillState, skillDefinitions);
  if (!lifeHooks.ok) return failure(career, 'off_field.invalid_skill_definitions');
  const { appliedSkillEffects, multiplierPermille: rewardMultiplierPermille } =
    derivePositiveLifeSkillMultiplier(
      decisionId === 'ACCEPT' ? lifeHooks.hooks : [],
      'life_hook_nil_reward_multiplier',
    );
  const applied =
    decisionId === 'ACCEPT'
      ? applyNilEffects(
          career,
          nil,
          definition.rewardEffects,
          'nil_effect_source_offer_reward',
          definitions,
          rewardMultiplierPermille,
        )
      : {
          playerState: career.player.state,
          relationships: career.offFieldCareerState.relationships,
          fictionalFundsUsd: nil.fictionalFundsUsd,
          benefitStacks: nil.benefitStacks,
          appliedEffects: [],
        };
  if (applied === null || applied.relationships.bootstrapStatus !== 'ACTIVE') {
    return failure(career, 'off_field.internal_invariant_failure');
  }
  const activeObligation: ActiveNilObligationV1 | null =
    decisionId === 'ACCEPT'
      ? {
          offerId,
          obligationId: definition.obligation.id,
          acceptedWeekIndex: career.weekIndex,
          remainingWeeks: definition.obligation.durationWeeks,
          lastResolvedWeekIndex: null,
        }
      : null;
  const evidence = {
    model: 'nil_offer_decision_v1',
    weekIndex: career.weekIndex,
    decisionId,
    offer: pending,
    appliedSkillEffects,
    rewardMultiplierPermille,
    appliedEffects: applied.appliedEffects,
  } as const;
  return success(career, {
    ...career,
    revision: career.revision + 1,
    player: { ...career.player, state: applied.playerState },
    offFieldCareerState: {
      ...career.offFieldCareerState,
      relationships: applied.relationships,
      nil: {
        ...nil,
        fictionalFundsUsd: applied.fictionalFundsUsd,
        benefitStacks: applied.benefitStacks,
        pendingOffers: nil.pendingOffers.filter((offer) => offer.offerId !== offerId),
        activeObligation,
        history: [...nil.history, evidence],
      },
    },
  });
}

export function expireNilOffers(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  const nil = career.offFieldCareerState.nil;
  if (
    career.phase.type !== 'PLAN_ACTIONS' ||
    !('bootstrapStatus' in nil) ||
    nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  const expired = nil.pendingOffers.filter(
    ({ expiresAfterWeekIndex }) => career.weekIndex > expiresAfterWeekIndex,
  );
  if (expired.length === 0) return failure(career, 'off_field.not_due');
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');
  return success(career, {
    ...career,
    revision: career.revision + 1,
    offFieldCareerState: {
      ...career.offFieldCareerState,
      nil: {
        ...nil,
        pendingOffers: nil.pendingOffers.filter(
          ({ expiresAfterWeekIndex }) => career.weekIndex <= expiresAfterWeekIndex,
        ),
        history: [
          ...nil.history,
          ...expired.map((offer) => ({
            model: 'nil_offer_expiration_v1' as const,
            weekIndex: career.weekIndex,
            offer,
          })),
        ],
      },
    },
  });
}

export function resolveNilObligation(
  career: CareerRun,
  resolutionId: NilObligationResolutionId,
  definitions: OffFieldMechanicsCatalog,
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  if (resolutionId !== 'FULFILL' && resolutionId !== 'DEFAULT') {
    return failure(career, 'off_field.invalid_choice');
  }
  const nil = career.offFieldCareerState.nil;
  if (
    career.phase.type !== 'PLAN_ACTIONS' ||
    !('bootstrapStatus' in nil) ||
    nil.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  const obligation = nil.activeObligation;
  if (obligation === null) return failure(career, 'off_field.obligation_not_due');
  if (
    career.weekIndex < obligation.acceptedWeekIndex ||
    obligation.lastResolvedWeekIndex === career.weekIndex
  ) {
    return failure(career, 'off_field.obligation_not_due');
  }
  const offer = definitions.nilOffers.find(
    ({ id, obligation: candidate }) =>
      id === obligation.offerId && candidate.id === obligation.obligationId,
  );
  if (offer === undefined) return failure(career, 'off_field.invalid_definitions');
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');
  const sourceId: NilEffectSourceId =
    resolutionId === 'FULFILL'
      ? 'nil_effect_source_obligation_weekly'
      : 'nil_effect_source_obligation_default';
  const applied = applyNilEffects(
    career,
    nil,
    resolutionId === 'FULFILL' ? offer.obligation.weeklyEffects : offer.obligation.defaultEffects,
    sourceId,
    definitions,
    1_000,
  );
  if (applied === null) return failure(career, 'off_field.internal_invariant_failure');
  const remainingWeeksAfter =
    resolutionId === 'FULFILL' ? Math.max(0, obligation.remainingWeeks - 1) : 0;
  const nextObligation: ActiveNilObligationV1 | null =
    remainingWeeksAfter === 0
      ? null
      : {
          ...obligation,
          remainingWeeks: remainingWeeksAfter,
          lastResolvedWeekIndex: career.weekIndex,
        };
  const evidence = {
    model: 'nil_obligation_resolution_v1',
    weekIndex: career.weekIndex,
    resolutionId,
    offerId: obligation.offerId,
    obligationId: obligation.obligationId,
    focusCost: offer.obligation.focusCost,
    remainingWeeksBefore: obligation.remainingWeeks,
    remainingWeeksAfter,
    appliedEffects: applied.appliedEffects,
  } as const;
  return success(career, {
    ...career,
    revision: career.revision + 1,
    player: { ...career.player, state: applied.playerState },
    offFieldCareerState: {
      ...career.offFieldCareerState,
      relationships: applied.relationships,
      nil: {
        ...nil,
        fictionalFundsUsd: applied.fictionalFundsUsd,
        benefitStacks: applied.benefitStacks,
        activeObligation: nextObligation,
        history: [...nil.history, evidence],
      },
    },
  });
}

export function resolveAcademicCheckpoint(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
  obligationGpaDeltaMilli = 0,
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  if (!Number.isSafeInteger(obligationGpaDeltaMilli) || Math.abs(obligationGpaDeltaMilli) > 1_000) {
    return failure(career, 'off_field.invalid_definitions');
  }
  const academics = career.offFieldCareerState.academics;
  if (
    career.phase.type !== 'WEEK_END' ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    academics.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  const checkpoint = definitions.academics.checkpoints[academics.nextCheckpointIndex];
  if (checkpoint === undefined || checkpoint.weekIndex !== career.weekIndex) {
    return failure(career, 'off_field.not_due');
  }
  if (
    academics.checkpointHistory.some(
      (evidence) =>
        evidence.termIndex === academics.termIndex && evidence.checkpointId === checkpoint.id,
    )
  ) {
    return failure(career, 'off_field.already_resolved');
  }
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');
  const gpaMilli = Math.round(career.player.state.gpa * 1_000);
  const evidence = deriveAcademicCheckpointEvidence(
    {
      termIndex: academics.termIndex,
      weekIndex: career.weekIndex,
      gpaMilli,
      obligationGpaDeltaMilli,
      statusBefore: academics.eligibilityStatus,
      restrictionGamesBefore: academics.restrictionGamesRemaining,
    },
    definitions.academics,
  );
  if (evidence === null) return failure(career, 'off_field.internal_invariant_failure');
  return success(career, {
    ...career,
    revision: career.revision + 1,
    offFieldCareerState: {
      ...career.offFieldCareerState,
      academics: {
        ...academics,
        eligibilityStatus: evidence.statusAfter,
        nextCheckpointIndex: academics.nextCheckpointIndex + 1,
        restrictionGamesRemaining: evidence.restrictionGamesAfter,
        lastCheckpoint: evidence,
        checkpointHistory: [...academics.checkpointHistory, evidence],
      },
    },
  });
}

export function deriveRelationshipFootballEffects(
  relationships: ActiveRelationshipCareerStateV1,
  definitions: OffFieldMechanicsCatalog,
): RelationshipFootballEffectsV1 | null {
  if (!isOffFieldMechanicsCatalog(definitions)) return null;
  if (
    relationships.tracks.length !== definitions.relationshipActors.length ||
    relationships.tracks.some(
      (track, index) => track.actorId !== definitions.relationshipActors[index]!.id,
    )
  ) {
    return null;
  }
  const weighted = definitions.relationshipActors.reduce(
    (totals, actor, index) => {
      const deviation = relationships.tracks[index]!.value - actor.initialValue;
      return {
        coach: totals.coach + deviation * actor.coachTrustWeightPermille,
        information: totals.information + deviation * actor.informationWeightPermille,
        opportunity: totals.opportunity + deviation * actor.opportunityWeightPermille,
      };
    },
    { coach: 0, information: 0, opportunity: 0 },
  );
  return deepFreeze({
    coachTrustModifier: clamp(Math.round(weighted.coach / 5_000), -10, 10),
    informationScoreModifier: clamp(Math.round(weighted.information / 4_000), -12, 12),
    opportunitySnapBonusPermille: clamp(Math.round(weighted.opportunity / 500), -100, 100),
  });
}

export function deriveRelationshipContextProjection(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
): RelationshipContextProjectionV1 | null {
  if (!validateCareerRun(career).ok) return null;
  const relationships = career.offFieldCareerState.relationships;
  if (relationships.bootstrapStatus !== 'ACTIVE') return null;
  const footballEffects = deriveRelationshipFootballEffects(relationships, definitions);
  if (footballEffects === null) return null;
  const tagIds: RelationshipContextTagId[] = [];
  for (const [index, actor] of definitions.relationshipActors.entries()) {
    const value = relationships.tracks[index]!.value;
    const stem = actor.id.replace('relationship_actor_', 'tag_relationship_');
    if (value >= actor.highThreshold) tagIds.push(`${stem}_high` as RelationshipContextTagId);
    if (value <= actor.lowThreshold) tagIds.push(`${stem}_low` as RelationshipContextTagId);
  }
  return deepFreeze({ tagIds, footballEffects });
}

function weeklyBaseDeltaByActor(
  actionIds: readonly string[],
  definitions: OffFieldMechanicsCatalog,
): ReadonlyMap<string, number> {
  const totals = new Map<string, number>(RELATIONSHIP_ACTOR_IDS.map((actorId) => [actorId, 0]));
  for (const actionId of actionIds) {
    const rule = definitions.relationshipWeeklyRules.find(
      (candidate) => candidate.actionId === actionId,
    );
    if (rule === undefined) continue;
    for (const effect of rule.effects) {
      totals.set(effect.actorId, (totals.get(effect.actorId) ?? 0) + effect.delta);
    }
  }
  return totals;
}

export function resolveWeeklyRelationships(
  career: CareerRun,
  definitions: OffFieldMechanicsCatalog,
  skillDefinitions: readonly SkillMechanicsDefinition[],
): OffFieldCommandResult {
  if (!validateCareerRun(career).ok) return failure(career, 'off_field.invalid_career');
  if (!isOffFieldMechanicsCatalog(definitions)) {
    return failure(career, 'off_field.invalid_definitions');
  }
  if (!isSkillMechanicsDefinitionCatalog(skillDefinitions)) {
    return failure(career, 'off_field.invalid_skill_definitions');
  }
  const relationships = career.offFieldCareerState.relationships;
  if (
    career.phase.type !== 'WEEK_END' ||
    career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
    relationships.bootstrapStatus !== 'ACTIVE'
  ) {
    return failure(career, 'off_field.invalid_phase');
  }
  if (relationships.lastProcessedWeekIndex === career.weekIndex) {
    return failure(career, 'off_field.already_resolved');
  }
  if (!canIncrementRevision(career)) return failure(career, 'off_field.revision_exhausted');
  const lifeHooks = collectEquippedLifeHooks(career.player.skillState, skillDefinitions);
  if (!lifeHooks.ok) return failure(career, 'off_field.invalid_skill_definitions');
  const { appliedSkillEffects, multiplierPermille: gainMultiplierPermille } =
    derivePositiveLifeSkillMultiplier(lifeHooks.hooks, 'life_hook_relationship_gain_multiplier');
  const actionIds = career.phase.results.map(({ actionId }) => actionId) as [
    (typeof career.phase.results)[number]['actionId'],
    (typeof career.phase.results)[number]['actionId'],
    (typeof career.phase.results)[number]['actionId'],
  ];
  const baseDeltaByActor = weeklyBaseDeltaByActor(actionIds, definitions);
  const changes = definitions.relationshipActors.map((actor, index) => {
    const valueBefore = relationships.tracks[index]!.value;
    const baseDelta = baseDeltaByActor.get(actor.id) ?? 0;
    const requestedDelta = scalePositiveRelationshipDelta(baseDelta, gainMultiplierPermille);
    const valueAfter = clamp(valueBefore + requestedDelta, 0, 100);
    return {
      actorId: actor.id,
      valueBefore,
      baseDelta,
      gainMultiplierPermille: baseDelta > 0 ? gainMultiplierPermille : 1_000,
      requestedDelta,
      actualDelta: valueAfter - valueBefore,
      valueAfter,
    };
  });
  const nextTracks: readonly RelationshipTrackV1[] = changes.map(({ actorId, valueAfter }) => ({
    actorId,
    value: valueAfter,
  }));
  const footballEffectsBefore = deriveRelationshipFootballEffects(relationships, definitions);
  const nextRelationshipState: ActiveRelationshipCareerStateV1 = {
    ...relationships,
    tracks: nextTracks,
    lastProcessedWeekIndex: career.weekIndex,
    history: relationships.history,
  };
  const footballEffectsAfter = deriveRelationshipFootballEffects(
    nextRelationshipState,
    definitions,
  );
  if (footballEffectsBefore === null || footballEffectsAfter === null) {
    return failure(career, 'off_field.invalid_definitions');
  }
  const requestedCoachTrustDelta = clamp(
    Math.round(
      changes.reduce(
        (total, change, index) =>
          total +
          change.actualDelta * definitions.relationshipActors[index]!.coachTrustWeightPermille,
        0,
      ) / 1_000,
    ),
    -4,
    4,
  );
  const coachTrustBefore = career.player.state.coachTrust;
  const coachTrustAfter = clamp(coachTrustBefore + requestedCoachTrustDelta, 0, 100);
  const evidence: WeeklyRelationshipResolutionEvidenceV1 = {
    model: 'relationship_week_v1',
    sourceId: 'relationship_source_weekly_action',
    weekIndex: career.weekIndex,
    actionIds,
    changes,
    appliedSkillEffects,
    footballEffectsBefore,
    footballEffectsAfter,
    coachTrustBefore,
    requestedCoachTrustDelta,
    actualCoachTrustDelta: coachTrustAfter - coachTrustBefore,
    coachTrustAfter,
  };
  return success(career, {
    ...career,
    revision: career.revision + 1,
    player: {
      ...career.player,
      state: { ...career.player.state, coachTrust: coachTrustAfter },
    },
    offFieldCareerState: {
      ...career.offFieldCareerState,
      relationships: {
        ...nextRelationshipState,
        history: [...relationships.history, evidence],
      },
    },
  });
}
