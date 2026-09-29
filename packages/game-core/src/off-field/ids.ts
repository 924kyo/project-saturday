import { isStableDomainId } from '../player/ids.js';

export const RELATIONSHIP_ACTOR_IDS = [
  'relationship_actor_position_coach',
  'relationship_actor_teammate_leader',
  'relationship_actor_direct_competitor',
] as const;

export const RELATIONSHIP_SOURCE_IDS = [
  'relationship_source_bootstrap',
  'relationship_source_weekly_action',
  'relationship_source_event',
  'relationship_source_game_performance',
  'relationship_source_depth_review',
  'relationship_source_nil_obligation',
  'relationship_source_offseason',
  'relationship_source_transfer_commitment',
] as const;

export const RELATIONSHIP_CONTEXT_TAG_IDS = [
  'tag_relationship_position_coach_high',
  'tag_relationship_position_coach_low',
  'tag_relationship_teammate_leader_high',
  'tag_relationship_teammate_leader_low',
  'tag_relationship_direct_competitor_high',
  'tag_relationship_direct_competitor_low',
] as const;

export const OFF_FIELD_COMMAND_FAILURE_REASONS = [
  'off_field.invalid_career',
  'off_field.invalid_phase',
  'off_field.invalid_definitions',
  'off_field.invalid_skill_definitions',
  'off_field.not_due',
  'off_field.already_resolved',
  'off_field.offer_pending',
  'off_field.offer_not_found',
  'off_field.offer_expired',
  'off_field.obligation_active',
  'off_field.obligation_not_due',
  'off_field.invalid_choice',
  'off_field.revision_exhausted',
  'off_field.internal_invariant_failure',
] as const;

export const ACADEMIC_STATUS_IDS = [
  'academic_status_eligible',
  'academic_status_warning',
  'academic_status_ineligible',
] as const;

export const ACADEMIC_CHECKPOINT_IDS = [
  'academic_checkpoint_midterm',
  'academic_checkpoint_final',
] as const;

export const OFF_FIELD_BENEFIT_IDS = [
  'off_field_benefit_recovery_access',
  'off_field_benefit_training_access',
  'off_field_benefit_advisor_insight',
  'off_field_benefit_appearance_style',
  'off_field_benefit_offer_visibility',
] as const;

export const NIL_CATEGORY_IDS = [
  'nil_category_local_business',
  'nil_category_community',
  'nil_category_equipment',
  'nil_category_media',
  'nil_category_regional',
] as const;

export const NIL_OBLIGATION_TYPE_IDS = [
  'nil_obligation_type_appearance',
  'nil_obligation_type_community_visit',
  'nil_obligation_type_product_feedback',
  'nil_obligation_type_media_session',
  'nil_obligation_type_campaign_work',
] as const;

export const OFFSEASON_COACH_CHANGE_IDS = [
  'offseason_coach_change_continuity',
  'offseason_coach_change_position_staff',
  'offseason_coach_change_scheme_shift',
] as const;

export const TRANSFER_PROJECTION_FACTOR_IDS = [
  'transfer_factor_role',
  'transfer_factor_snaps',
  'transfer_factor_scheme_fit',
  'transfer_factor_development',
  'transfer_factor_program_outlook',
  'transfer_factor_nil',
  'transfer_factor_academics',
  'transfer_factor_relationships',
  'transfer_factor_familiarity',
] as const;

export const TRANSFER_CONFIDENCE_TIER_IDS = [
  'transfer_confidence_high',
  'transfer_confidence_medium',
  'transfer_confidence_low',
] as const;

export type RelationshipActorId = (typeof RELATIONSHIP_ACTOR_IDS)[number];
export type RelationshipSourceId = (typeof RELATIONSHIP_SOURCE_IDS)[number];
export type RelationshipContextTagId = (typeof RELATIONSHIP_CONTEXT_TAG_IDS)[number];
export type OffFieldCommandFailureReason = (typeof OFF_FIELD_COMMAND_FAILURE_REASONS)[number];
export type AcademicStatusId = (typeof ACADEMIC_STATUS_IDS)[number];
export type AcademicCheckpointId = (typeof ACADEMIC_CHECKPOINT_IDS)[number];
export type OffFieldBenefitId = (typeof OFF_FIELD_BENEFIT_IDS)[number];
export type NilCategoryId = (typeof NIL_CATEGORY_IDS)[number];
export type NilObligationTypeId = (typeof NIL_OBLIGATION_TYPE_IDS)[number];
export type NilOfferId = `nil_offer_${string}`;
export type NilObligationId = `nil_obligation_${string}`;
export type NilEffectSourceId =
  | 'nil_effect_source_offer_reward'
  | 'nil_effect_source_obligation_weekly'
  | 'nil_effect_source_obligation_default';
export type NilOfferDecisionId = 'ACCEPT' | 'DECLINE';
export type NilObligationResolutionId = 'FULFILL' | 'DEFAULT';
export type OffseasonCoachChangeId = (typeof OFFSEASON_COACH_CHANGE_IDS)[number];
export type TransferProjectionFactorId = (typeof TRANSFER_PROJECTION_FACTOR_IDS)[number];
export type TransferConfidenceTierId = (typeof TRANSFER_CONFIDENCE_TIER_IDS)[number];

function includes<const TValue extends readonly string[]>(
  values: TValue,
  value: unknown,
): value is TValue[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export const isRelationshipActorId = (value: unknown): value is RelationshipActorId =>
  includes(RELATIONSHIP_ACTOR_IDS, value);
export const isRelationshipSourceId = (value: unknown): value is RelationshipSourceId =>
  includes(RELATIONSHIP_SOURCE_IDS, value);
export const isRelationshipContextTagId = (value: unknown): value is RelationshipContextTagId =>
  includes(RELATIONSHIP_CONTEXT_TAG_IDS, value);
export const isAcademicStatusId = (value: unknown): value is AcademicStatusId =>
  includes(ACADEMIC_STATUS_IDS, value);
export const isAcademicCheckpointId = (value: unknown): value is AcademicCheckpointId =>
  includes(ACADEMIC_CHECKPOINT_IDS, value);
export const isOffFieldBenefitId = (value: unknown): value is OffFieldBenefitId =>
  includes(OFF_FIELD_BENEFIT_IDS, value);
export const isNilCategoryId = (value: unknown): value is NilCategoryId =>
  includes(NIL_CATEGORY_IDS, value);
export const isNilObligationTypeId = (value: unknown): value is NilObligationTypeId =>
  includes(NIL_OBLIGATION_TYPE_IDS, value);
export const isOffseasonCoachChangeId = (value: unknown): value is OffseasonCoachChangeId =>
  includes(OFFSEASON_COACH_CHANGE_IDS, value);
export const isTransferProjectionFactorId = (value: unknown): value is TransferProjectionFactorId =>
  includes(TRANSFER_PROJECTION_FACTOR_IDS, value);
export const isTransferConfidenceTierId = (value: unknown): value is TransferConfidenceTierId =>
  includes(TRANSFER_CONFIDENCE_TIER_IDS, value);

export function isNilOfferId(value: unknown): value is NilOfferId {
  return (
    isStableDomainId(value) && value.startsWith('nil_offer_') && value.length > 'nil_offer_'.length
  );
}

export function isNilObligationId(value: unknown): value is NilObligationId {
  return (
    isStableDomainId(value) &&
    value.startsWith('nil_obligation_') &&
    !value.startsWith('nil_obligation_type_') &&
    value.length > 'nil_obligation_'.length
  );
}
