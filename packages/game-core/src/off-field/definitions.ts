import { isPlayerTagId } from '../player/ids.js';
import { compareCodeUnits } from '../player/order.js';
import { isProgramStrengthBandId } from '../programs/ids.js';
import { isWeeklyActionId } from '../weekly/ids.js';
import {
  ACADEMIC_CHECKPOINT_IDS,
  OFF_FIELD_BENEFIT_IDS,
  OFFSEASON_COACH_CHANGE_IDS,
  RELATIONSHIP_ACTOR_IDS,
  TRANSFER_CONFIDENCE_TIER_IDS,
  TRANSFER_PROJECTION_FACTOR_IDS,
  isAcademicCheckpointId,
  isNilCategoryId,
  isNilObligationId,
  isNilObligationTypeId,
  isNilOfferId,
  isOffFieldBenefitId,
  isOffseasonCoachChangeId,
  isRelationshipActorId,
  isTransferConfidenceTierId,
  isTransferProjectionFactorId,
} from './ids.js';
import type {
  AcademicTuningDefinition,
  NilEffect,
  NilOfferMechanicsDefinition,
  OffFieldMechanicsCatalog,
  OffseasonTuningDefinition,
  RelationshipActorMechanicsDefinition,
} from './types.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: UnknownRecord, keys: readonly string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort(compareCodeUnits)) ===
    JSON.stringify([...keys].sort(compareCodeUnits))
  );
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function exactCanonicalIds<T extends { readonly id: string }>(
  values: readonly T[],
  expected: readonly string[],
): boolean {
  return JSON.stringify(values.map(({ id }) => id)) === JSON.stringify(expected);
}

function isRelationshipActorDefinition(
  value: unknown,
): value is RelationshipActorMechanicsDefinition {
  if (
    !record(value) ||
    !exact(value, [
      'id',
      'initialValue',
      'lowThreshold',
      'highThreshold',
      'coachTrustWeightPermille',
      'informationWeightPermille',
      'opportunityWeightPermille',
    ]) ||
    !isRelationshipActorId(value['id']) ||
    !integer(value['initialValue'], 0, 100) ||
    !integer(value['lowThreshold'], 0, 100) ||
    !integer(value['highThreshold'], 0, 100) ||
    !integer(value['coachTrustWeightPermille'], 0, 1_000) ||
    !integer(value['informationWeightPermille'], 0, 1_000) ||
    !integer(value['opportunityWeightPermille'], 0, 1_000)
  ) {
    return false;
  }
  return (
    value['lowThreshold'] < value['initialValue'] &&
    value['initialValue'] < value['highThreshold'] &&
    value['coachTrustWeightPermille'] +
      value['informationWeightPermille'] +
      value['opportunityWeightPermille'] ===
      1_000
  );
}

export function isAcademicTuning(value: unknown): value is AcademicTuningDefinition {
  return (
    record(value) &&
    exact(value, [
      'model',
      'eligibleGpaMilli',
      'warningGpaMilli',
      'restrictionGames',
      'checkpoints',
    ]) &&
    value['model'] === 'academic_v1' &&
    integer(value['warningGpaMilli'], 0, 4_000) &&
    integer(value['eligibleGpaMilli'], 0, 4_000) &&
    value['warningGpaMilli'] < value['eligibleGpaMilli'] &&
    integer(value['restrictionGames'], 1, 3) &&
    Array.isArray(value['checkpoints']) &&
    value['checkpoints'].length === ACADEMIC_CHECKPOINT_IDS.length &&
    value['checkpoints'].every(
      (checkpoint) =>
        record(checkpoint) &&
        exact(checkpoint, ['id', 'weekIndex']) &&
        isAcademicCheckpointId(checkpoint['id']) &&
        integer(checkpoint['weekIndex'], 1, 64),
    ) &&
    exactCanonicalIds(value['checkpoints'], ACADEMIC_CHECKPOINT_IDS) &&
    value['checkpoints'].every(
      (checkpoint, index, checkpoints) =>
        index === 0 || checkpoint.weekIndex > checkpoints[index - 1]!.weekIndex,
    )
  );
}

export function isNilEffect(value: unknown): value is NilEffect {
  if (!record(value)) return false;
  if (value['type'] === 'nil_integer_state_delta') {
    return (
      exact(value, ['type', 'stateId', 'delta']) &&
      [
        'nil_state_body',
        'nil_state_preparation',
        'nil_state_confidence',
        'nil_state_coach_trust',
        'nil_state_brand',
      ].includes(String(value['stateId'])) &&
      integer(value['delta'], -12, 12) &&
      value['delta'] !== 0
    );
  }
  if (value['type'] === 'nil_gpa_delta_milli') {
    return (
      exact(value, ['type', 'deltaMilli']) &&
      integer(value['deltaMilli'], -250, 250) &&
      value['deltaMilli'] !== 0
    );
  }
  if (value['type'] === 'nil_funds_delta_usd') {
    return (
      exact(value, ['type', 'deltaUsd']) &&
      integer(value['deltaUsd'], -500, 2_500) &&
      value['deltaUsd'] !== 0
    );
  }
  if (value['type'] === 'nil_relationship_delta') {
    return (
      exact(value, ['type', 'actorId', 'delta']) &&
      isRelationshipActorId(value['actorId']) &&
      integer(value['delta'], -12, 12) &&
      value['delta'] !== 0
    );
  }
  return (
    value['type'] === 'nil_benefit_grant' &&
    exact(value, ['type', 'benefitId', 'quantity']) &&
    isOffFieldBenefitId(value['benefitId']) &&
    integer(value['quantity'], 1, 3)
  );
}

function isEffectList(
  value: unknown,
  minimum: number,
  maximum: number,
): value is readonly NilEffect[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return false;
  if (!value.every(isNilEffect)) return false;
  const targets = value.map((effect) =>
    effect.type === 'nil_integer_state_delta'
      ? effect.stateId
      : effect.type === 'nil_relationship_delta'
        ? `${effect.type}:${effect.actorId}`
        : effect.type === 'nil_benefit_grant'
          ? `${effect.type}:${effect.benefitId}`
          : effect.type,
  );
  return new Set(targets).size === targets.length;
}

function isNilOffer(value: unknown): value is NilOfferMechanicsDefinition {
  if (
    !record(value) ||
    !exact(value, [
      'id',
      'categoryId',
      'weight',
      'expirationWeeks',
      'requirements',
      'rewardEffects',
      'obligation',
    ]) ||
    !isNilOfferId(value['id']) ||
    !isNilCategoryId(value['categoryId']) ||
    !integer(value['weight'], 1, 1_000) ||
    !integer(value['expirationWeeks'], 1, 4) ||
    !record(value['requirements']) ||
    !exact(value['requirements'], [
      'minimumBrand',
      'maximumDepthRank',
      'minimumGpaMilli',
      'programStrengthBandIds',
      'requiredTagIds',
    ]) ||
    !integer(value['requirements']['minimumBrand'], 0, 100) ||
    !integer(value['requirements']['maximumDepthRank'], 1, 8) ||
    !integer(value['requirements']['minimumGpaMilli'], 0, 4_000) ||
    !Array.isArray(value['requirements']['programStrengthBandIds']) ||
    value['requirements']['programStrengthBandIds'].length < 1 ||
    value['requirements']['programStrengthBandIds'].length > 3 ||
    !value['requirements']['programStrengthBandIds'].every(isProgramStrengthBandId) ||
    new Set(value['requirements']['programStrengthBandIds']).size !==
      value['requirements']['programStrengthBandIds'].length ||
    !Array.isArray(value['requirements']['requiredTagIds']) ||
    value['requirements']['requiredTagIds'].length > 4 ||
    !value['requirements']['requiredTagIds'].every(isPlayerTagId) ||
    new Set(value['requirements']['requiredTagIds']).size !==
      value['requirements']['requiredTagIds'].length ||
    !isEffectList(value['rewardEffects'], 1, 4) ||
    !record(value['obligation']) ||
    !exact(value['obligation'], [
      'id',
      'typeId',
      'durationWeeks',
      'focusCost',
      'weeklyEffects',
      'defaultEffects',
    ]) ||
    !isNilObligationId(value['obligation']['id']) ||
    !isNilObligationTypeId(value['obligation']['typeId']) ||
    !integer(value['obligation']['durationWeeks'], 1, 3) ||
    !integer(value['obligation']['focusCost'], 1, 2) ||
    !isEffectList(value['obligation']['weeklyEffects'], 1, 3) ||
    !isEffectList(value['obligation']['defaultEffects'], 1, 3)
  ) {
    return false;
  }
  return value['rewardEffects'].some(
    (effect) =>
      effect.type === 'nil_benefit_grant' ||
      (effect.type === 'nil_funds_delta_usd' && effect.deltaUsd > 0) ||
      (effect.type === 'nil_integer_state_delta' &&
        effect.stateId === 'nil_state_brand' &&
        effect.delta > 0),
  );
}

function isOffseasonTuning(value: unknown): value is OffseasonTuningDefinition {
  if (
    !record(value) ||
    !exact(value, [
      'model',
      'transferShortlistSize',
      'stayFamiliarityBonus',
      'transferCoachTrustRetentionPermille',
      'relationshipResetValue',
      'pressureMaximumInclusive',
      'pressurePointsPerDepthRank',
      'neutralTransferDepthRank',
      'transferFamiliarityScore',
      'transferInformationBaseScore',
      'brandInformationDivisor',
      'advisorInsightInformationBonus',
      'projectionFactors',
      'confidenceTiers',
      'coachChanges',
    ]) ||
    value['model'] !== 'offseason_v1' ||
    value['transferShortlistSize'] !== 3 ||
    !integer(value['stayFamiliarityBonus'], 0, 20) ||
    !integer(value['transferCoachTrustRetentionPermille'], 0, 1_000) ||
    !integer(value['relationshipResetValue'], 0, 100) ||
    !integer(value['pressureMaximumInclusive'], 1, 30) ||
    !integer(value['pressurePointsPerDepthRank'], 1, 20) ||
    !integer(value['neutralTransferDepthRank'], 1, 8) ||
    !integer(value['transferFamiliarityScore'], 0, 100) ||
    !integer(value['transferInformationBaseScore'], 0, 100) ||
    !integer(value['brandInformationDivisor'], 1, 100) ||
    !integer(value['advisorInsightInformationBonus'], 0, 100) ||
    !Array.isArray(value['projectionFactors']) ||
    !Array.isArray(value['confidenceTiers']) ||
    !Array.isArray(value['coachChanges'])
  ) {
    return false;
  }
  const projectionFactorsValid =
    value['projectionFactors'].length === TRANSFER_PROJECTION_FACTOR_IDS.length &&
    value['projectionFactors'].every(
      (factor) =>
        record(factor) &&
        exact(factor, ['id', 'weightPermille']) &&
        isTransferProjectionFactorId(factor['id']) &&
        integer(factor['weightPermille'], 1, 1_000),
    ) &&
    exactCanonicalIds(value['projectionFactors'], TRANSFER_PROJECTION_FACTOR_IDS) &&
    value['projectionFactors'].reduce((total, factor) => total + factor.weightPermille, 0) ===
      1_000;
  const confidenceTiersValid =
    value['confidenceTiers'].length === TRANSFER_CONFIDENCE_TIER_IDS.length &&
    value['confidenceTiers'].every(
      (tier) =>
        record(tier) &&
        exact(tier, ['id', 'minimumInformationScore', 'uncertaintyPoints']) &&
        isTransferConfidenceTierId(tier['id']) &&
        integer(tier['minimumInformationScore'], 0, 100) &&
        integer(tier['uncertaintyPoints'], 0, 30),
    ) &&
    exactCanonicalIds(value['confidenceTiers'], TRANSFER_CONFIDENCE_TIER_IDS) &&
    value['confidenceTiers'].every(
      (tier, index, tiers) =>
        index === 0 ||
        (tier.minimumInformationScore < tiers[index - 1]!.minimumInformationScore &&
          tier.uncertaintyPoints > tiers[index - 1]!.uncertaintyPoints),
    );
  const coachChangesValid =
    value['coachChanges'].length === OFFSEASON_COACH_CHANGE_IDS.length &&
    value['coachChanges'].every(
      (change) =>
        record(change) &&
        exact(change, [
          'id',
          'weight',
          'coachTrustRetentionPermille',
          'resetRelationshipActorIds',
          'changesScheme',
        ]) &&
        isOffseasonCoachChangeId(change['id']) &&
        integer(change['weight'], 1, 1_000) &&
        integer(change['coachTrustRetentionPermille'], 0, 1_000) &&
        Array.isArray(change['resetRelationshipActorIds']) &&
        change['resetRelationshipActorIds'].every(isRelationshipActorId) &&
        new Set(change['resetRelationshipActorIds']).size ===
          change['resetRelationshipActorIds'].length &&
        typeof change['changesScheme'] === 'boolean',
    ) &&
    exactCanonicalIds(value['coachChanges'], OFFSEASON_COACH_CHANGE_IDS) &&
    value['coachChanges'].reduce((total, change) => total + change.weight, 0) === 1_000;
  return projectionFactorsValid && confidenceTiersValid && coachChangesValid;
}

export function isOffFieldMechanicsCatalog(value: unknown): value is OffFieldMechanicsCatalog {
  if (
    !record(value) ||
    !exact(value, [
      'model',
      'relationshipActors',
      'relationshipWeeklyRules',
      'academics',
      'benefits',
      'nilOffers',
      'offseason',
    ]) ||
    value['model'] !== 'off_field_v1' ||
    !Array.isArray(value['relationshipActors']) ||
    value['relationshipActors'].length !== RELATIONSHIP_ACTOR_IDS.length ||
    !value['relationshipActors'].every(isRelationshipActorDefinition) ||
    !exactCanonicalIds(value['relationshipActors'], RELATIONSHIP_ACTOR_IDS) ||
    !Array.isArray(value['relationshipWeeklyRules']) ||
    value['relationshipWeeklyRules'].length < 1 ||
    value['relationshipWeeklyRules'].length > 9 ||
    !value['relationshipWeeklyRules'].every(
      (rule) =>
        record(rule) &&
        exact(rule, ['actionId', 'effects']) &&
        isWeeklyActionId(rule['actionId']) &&
        Array.isArray(rule['effects']) &&
        rule['effects'].length >= 1 &&
        rule['effects'].length <= 3 &&
        rule['effects'].every(
          (effect) =>
            record(effect) &&
            exact(effect, ['actorId', 'delta']) &&
            isRelationshipActorId(effect['actorId']) &&
            integer(effect['delta'], -5, 5) &&
            effect['delta'] !== 0,
        ) &&
        new Set(rule['effects'].map((effect) => effect.actorId)).size === rule['effects'].length,
    ) ||
    !isAcademicTuning(value['academics']) ||
    !Array.isArray(value['benefits']) ||
    value['benefits'].length !== OFF_FIELD_BENEFIT_IDS.length ||
    !value['benefits'].every(
      (benefit) =>
        record(benefit) &&
        exact(benefit, ['id', 'maximumStack']) &&
        isOffFieldBenefitId(benefit['id']) &&
        integer(benefit['maximumStack'], 1, 9),
    ) ||
    !exactCanonicalIds(value['benefits'], OFF_FIELD_BENEFIT_IDS) ||
    !Array.isArray(value['nilOffers']) ||
    value['nilOffers'].length !== 10 ||
    !value['nilOffers'].every(isNilOffer) ||
    !isOffseasonTuning(value['offseason'])
  ) {
    return false;
  }
  const offerIds = value['nilOffers'].map(({ id }) => id);
  const obligationIds = value['nilOffers'].map(({ obligation }) => obligation.id);
  return (
    new Set(offerIds).size === offerIds.length &&
    new Set(obligationIds).size === obligationIds.length &&
    new Set(value['nilOffers'].map(({ categoryId }) => categoryId)).size === 5 &&
    new Set(value['relationshipWeeklyRules'].map(({ actionId }) => actionId)).size ===
      value['relationshipWeeklyRules'].length
  );
}
