import type { OffFieldMechanicsCatalog } from '@project-saturday/game-core';

import type { NilEffectDefinition, OffFieldContent } from '../schema/off-field.js';

const ALL_PROGRAM_BANDS = [
  'program_strength_national',
  'program_strength_contender',
  'program_strength_builder',
] as const;

const state = (
  stateId:
    | 'nil_state_body'
    | 'nil_state_preparation'
    | 'nil_state_confidence'
    | 'nil_state_coach_trust'
    | 'nil_state_brand',
  delta: number,
): NilEffectDefinition => ({ type: 'nil_integer_state_delta', stateId, delta });
const funds = (deltaUsd: number): NilEffectDefinition => ({
  type: 'nil_funds_delta_usd',
  deltaUsd,
});
const gpa = (deltaMilli: number): NilEffectDefinition => ({
  type: 'nil_gpa_delta_milli',
  deltaMilli,
});
const relationship = (
  actorId:
    | 'relationship_actor_position_coach'
    | 'relationship_actor_teammate_leader'
    | 'relationship_actor_direct_competitor',
  delta: number,
): NilEffectDefinition => ({ type: 'nil_relationship_delta', actorId, delta });
const benefit = (
  benefitId:
    | 'off_field_benefit_recovery_access'
    | 'off_field_benefit_training_access'
    | 'off_field_benefit_advisor_insight'
    | 'off_field_benefit_appearance_style'
    | 'off_field_benefit_offer_visibility',
  quantity = 1,
): NilEffectDefinition => ({ type: 'nil_benefit_grant', benefitId, quantity });

export const offFieldContent = {
  id: 'off_field_wr_vertical_slice_v1',
  model: 'off_field_v1',
  relationships: {
    actors: [
      {
        id: 'relationship_actor_position_coach',
        nameKey: 'offField.relationships.positionCoach.name',
        descriptionKey: 'offField.relationships.positionCoach.description',
        initialValue: 50,
        lowThreshold: 35,
        highThreshold: 65,
        coachTrustWeightPermille: 600,
        informationWeightPermille: 250,
        opportunityWeightPermille: 150,
      },
      {
        id: 'relationship_actor_teammate_leader',
        nameKey: 'offField.relationships.teammateLeader.name',
        descriptionKey: 'offField.relationships.teammateLeader.description',
        initialValue: 50,
        lowThreshold: 35,
        highThreshold: 65,
        coachTrustWeightPermille: 100,
        informationWeightPermille: 500,
        opportunityWeightPermille: 400,
      },
      {
        id: 'relationship_actor_direct_competitor',
        nameKey: 'offField.relationships.directCompetitor.name',
        descriptionKey: 'offField.relationships.directCompetitor.description',
        initialValue: 50,
        lowThreshold: 35,
        highThreshold: 65,
        coachTrustWeightPermille: 250,
        informationWeightPermille: 200,
        opportunityWeightPermille: 550,
      },
    ],
    sources: [
      {
        id: 'relationship_source_bootstrap',
        nameKey: 'offField.relationshipSources.bootstrap.name',
        descriptionKey: 'offField.relationshipSources.bootstrap.description',
      },
      {
        id: 'relationship_source_weekly_action',
        nameKey: 'offField.relationshipSources.weeklyAction.name',
        descriptionKey: 'offField.relationshipSources.weeklyAction.description',
      },
      {
        id: 'relationship_source_event',
        nameKey: 'offField.relationshipSources.event.name',
        descriptionKey: 'offField.relationshipSources.event.description',
      },
      {
        id: 'relationship_source_game_performance',
        nameKey: 'offField.relationshipSources.gamePerformance.name',
        descriptionKey: 'offField.relationshipSources.gamePerformance.description',
      },
      {
        id: 'relationship_source_depth_review',
        nameKey: 'offField.relationshipSources.depthReview.name',
        descriptionKey: 'offField.relationshipSources.depthReview.description',
      },
      {
        id: 'relationship_source_nil_obligation',
        nameKey: 'offField.relationshipSources.nilObligation.name',
        descriptionKey: 'offField.relationshipSources.nilObligation.description',
      },
      {
        id: 'relationship_source_offseason',
        nameKey: 'offField.relationshipSources.offseason.name',
        descriptionKey: 'offField.relationshipSources.offseason.description',
      },
      {
        id: 'relationship_source_transfer_commitment',
        nameKey: 'offField.relationshipSources.transferCommitment.name',
        descriptionKey: 'offField.relationshipSources.transferCommitment.description',
      },
    ],
    weeklyRules: [
      {
        actionId: 'action_route_drills',
        effects: [{ actorId: 'relationship_actor_direct_competitor', delta: 1 }],
      },
      {
        actionId: 'action_hands_catch_work',
        effects: [{ actorId: 'relationship_actor_teammate_leader', delta: 2 }],
      },
      {
        actionId: 'action_film_study',
        effects: [{ actorId: 'relationship_actor_position_coach', delta: 1 }],
      },
      {
        actionId: 'action_extra_practice',
        effects: [
          { actorId: 'relationship_actor_position_coach', delta: 2 },
          { actorId: 'relationship_actor_direct_competitor', delta: -1 },
        ],
      },
    ],
  },
  academics: {
    statuses: [
      {
        id: 'academic_status_eligible',
        nameKey: 'offField.academics.statuses.eligible.name',
        descriptionKey: 'offField.academics.statuses.eligible.description',
      },
      {
        id: 'academic_status_warning',
        nameKey: 'offField.academics.statuses.warning.name',
        descriptionKey: 'offField.academics.statuses.warning.description',
      },
      {
        id: 'academic_status_ineligible',
        nameKey: 'offField.academics.statuses.ineligible.name',
        descriptionKey: 'offField.academics.statuses.ineligible.description',
      },
    ],
    checkpoints: [
      {
        id: 'academic_checkpoint_midterm',
        nameKey: 'offField.academics.checkpoints.midterm.name',
        descriptionKey: 'offField.academics.checkpoints.midterm.description',
        weekIndex: 5,
      },
      {
        id: 'academic_checkpoint_final',
        nameKey: 'offField.academics.checkpoints.final.name',
        descriptionKey: 'offField.academics.checkpoints.final.description',
        weekIndex: 11,
      },
    ],
    tuning: {
      model: 'academic_v1',
      eligibleGpaMilli: 2_300,
      warningGpaMilli: 2_000,
      restrictionGames: 1,
    },
  },
  benefits: [
    {
      id: 'off_field_benefit_recovery_access',
      nameKey: 'offField.benefits.recoveryAccess.name',
      descriptionKey: 'offField.benefits.recoveryAccess.description',
      maximumStack: 3,
    },
    {
      id: 'off_field_benefit_training_access',
      nameKey: 'offField.benefits.trainingAccess.name',
      descriptionKey: 'offField.benefits.trainingAccess.description',
      maximumStack: 3,
    },
    {
      id: 'off_field_benefit_advisor_insight',
      nameKey: 'offField.benefits.advisorInsight.name',
      descriptionKey: 'offField.benefits.advisorInsight.description',
      maximumStack: 2,
    },
    {
      id: 'off_field_benefit_appearance_style',
      nameKey: 'offField.benefits.appearanceStyle.name',
      descriptionKey: 'offField.benefits.appearanceStyle.description',
      maximumStack: 9,
    },
    {
      id: 'off_field_benefit_offer_visibility',
      nameKey: 'offField.benefits.offerVisibility.name',
      descriptionKey: 'offField.benefits.offerVisibility.description',
      maximumStack: 2,
    },
  ],
  nil: {
    categories: [
      {
        id: 'nil_category_local_business',
        nameKey: 'offField.nil.categories.localBusiness.name',
        descriptionKey: 'offField.nil.categories.localBusiness.description',
      },
      {
        id: 'nil_category_community',
        nameKey: 'offField.nil.categories.community.name',
        descriptionKey: 'offField.nil.categories.community.description',
      },
      {
        id: 'nil_category_equipment',
        nameKey: 'offField.nil.categories.equipment.name',
        descriptionKey: 'offField.nil.categories.equipment.description',
      },
      {
        id: 'nil_category_media',
        nameKey: 'offField.nil.categories.media.name',
        descriptionKey: 'offField.nil.categories.media.description',
      },
      {
        id: 'nil_category_regional',
        nameKey: 'offField.nil.categories.regional.name',
        descriptionKey: 'offField.nil.categories.regional.description',
      },
    ],
    offers: [
      {
        id: 'nil_offer_neighborhood_breakfast_feature',
        nameKey: 'offField.nil.offers.neighborhoodBreakfast.name',
        descriptionKey: 'offField.nil.offers.neighborhoodBreakfast.description',
        categoryId: 'nil_category_local_business',
        weight: 160,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 15,
          maximumDepthRank: 8,
          minimumGpaMilli: 2_000,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(350), state('nil_state_brand', 3)],
        obligation: {
          id: 'nil_obligation_neighborhood_breakfast_feature',
          typeId: 'nil_obligation_type_appearance',
          nameKey: 'offField.nil.obligations.neighborhoodBreakfast.name',
          descriptionKey: 'offField.nil.obligations.neighborhoodBreakfast.description',
          durationWeeks: 1,
          focusCost: 1,
          weeklyEffects: [state('nil_state_body', -2)],
          defaultEffects: [state('nil_state_brand', -4)],
        },
      },
      {
        id: 'nil_offer_corner_store_game_card',
        nameKey: 'offField.nil.offers.cornerStoreCard.name',
        descriptionKey: 'offField.nil.offers.cornerStoreCard.description',
        categoryId: 'nil_category_local_business',
        weight: 145,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 22,
          maximumDepthRank: 6,
          minimumGpaMilli: 2_000,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(500), benefit('off_field_benefit_appearance_style')],
        obligation: {
          id: 'nil_obligation_corner_store_game_card',
          typeId: 'nil_obligation_type_campaign_work',
          nameKey: 'offField.nil.obligations.cornerStoreCard.name',
          descriptionKey: 'offField.nil.obligations.cornerStoreCard.description',
          durationWeeks: 2,
          focusCost: 1,
          weeklyEffects: [state('nil_state_preparation', -2)],
          defaultEffects: [funds(-150), state('nil_state_brand', -3)],
        },
      },
      {
        id: 'nil_offer_youth_route_clinic',
        nameKey: 'offField.nil.offers.youthRouteClinic.name',
        descriptionKey: 'offField.nil.offers.youthRouteClinic.description',
        categoryId: 'nil_category_community',
        weight: 150,
        expirationWeeks: 3,
        requirements: {
          minimumBrand: 18,
          maximumDepthRank: 8,
          minimumGpaMilli: 2_100,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(250), relationship('relationship_actor_teammate_leader', 4)],
        obligation: {
          id: 'nil_obligation_youth_route_clinic',
          typeId: 'nil_obligation_type_community_visit',
          nameKey: 'offField.nil.obligations.youthRouteClinic.name',
          descriptionKey: 'offField.nil.obligations.youthRouteClinic.description',
          durationWeeks: 1,
          focusCost: 2,
          weeklyEffects: [state('nil_state_body', -3), state('nil_state_preparation', -2)],
          defaultEffects: [relationship('relationship_actor_teammate_leader', -5)],
        },
      },
      {
        id: 'nil_offer_campus_arts_collaboration',
        nameKey: 'offField.nil.offers.campusArts.name',
        descriptionKey: 'offField.nil.offers.campusArts.description',
        categoryId: 'nil_category_community',
        weight: 95,
        expirationWeeks: 3,
        requirements: {
          minimumBrand: 24,
          maximumDepthRank: 8,
          minimumGpaMilli: 2_200,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: ['tag_brand_outgoing'],
        },
        rewardEffects: [state('nil_state_brand', 6), benefit('off_field_benefit_appearance_style')],
        obligation: {
          id: 'nil_obligation_campus_arts_collaboration',
          typeId: 'nil_obligation_type_campaign_work',
          nameKey: 'offField.nil.obligations.campusArts.name',
          descriptionKey: 'offField.nil.obligations.campusArts.description',
          durationWeeks: 2,
          focusCost: 1,
          weeklyEffects: [gpa(-80)],
          defaultEffects: [state('nil_state_brand', -6), state('nil_state_confidence', -2)],
        },
      },
      {
        id: 'nil_offer_receiver_glove_workshop',
        nameKey: 'offField.nil.offers.gloveWorkshop.name',
        descriptionKey: 'offField.nil.offers.gloveWorkshop.description',
        categoryId: 'nil_category_equipment',
        weight: 125,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 20,
          maximumDepthRank: 6,
          minimumGpaMilli: 2_000,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(450), benefit('off_field_benefit_training_access')],
        obligation: {
          id: 'nil_obligation_receiver_glove_workshop',
          typeId: 'nil_obligation_type_product_feedback',
          nameKey: 'offField.nil.obligations.gloveWorkshop.name',
          descriptionKey: 'offField.nil.obligations.gloveWorkshop.description',
          durationWeeks: 2,
          focusCost: 1,
          weeklyEffects: [state('nil_state_body', -2)],
          defaultEffects: [funds(-200), state('nil_state_brand', -2)],
        },
      },
      {
        id: 'nil_offer_reusable_bottle_field_test',
        nameKey: 'offField.nil.offers.bottleFieldTest.name',
        descriptionKey: 'offField.nil.offers.bottleFieldTest.description',
        categoryId: 'nil_category_equipment',
        weight: 135,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 12,
          maximumDepthRank: 8,
          minimumGpaMilli: 2_000,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(300), benefit('off_field_benefit_recovery_access')],
        obligation: {
          id: 'nil_obligation_reusable_bottle_field_test',
          typeId: 'nil_obligation_type_product_feedback',
          nameKey: 'offField.nil.obligations.bottleFieldTest.name',
          descriptionKey: 'offField.nil.obligations.bottleFieldTest.description',
          durationWeeks: 1,
          focusCost: 1,
          weeklyEffects: [state('nil_state_preparation', -1)],
          defaultEffects: [funds(-100), state('nil_state_brand', -2)],
        },
      },
      {
        id: 'nil_offer_hometown_audio_diary',
        nameKey: 'offField.nil.offers.hometownAudio.name',
        descriptionKey: 'offField.nil.offers.hometownAudio.description',
        categoryId: 'nil_category_media',
        weight: 90,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 28,
          maximumDepthRank: 7,
          minimumGpaMilli: 2_000,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: ['tag_recruiting_hometown_attention'],
        },
        rewardEffects: [funds(650), state('nil_state_brand', 5)],
        obligation: {
          id: 'nil_obligation_hometown_audio_diary',
          typeId: 'nil_obligation_type_media_session',
          nameKey: 'offField.nil.obligations.hometownAudio.name',
          descriptionKey: 'offField.nil.obligations.hometownAudio.description',
          durationWeeks: 3,
          focusCost: 1,
          weeklyEffects: [state('nil_state_preparation', -2), gpa(-50)],
          defaultEffects: [state('nil_state_brand', -7)],
        },
      },
      {
        id: 'nil_offer_game_week_notebook',
        nameKey: 'offField.nil.offers.gameWeekNotebook.name',
        descriptionKey: 'offField.nil.offers.gameWeekNotebook.description',
        categoryId: 'nil_category_media',
        weight: 100,
        expirationWeeks: 1,
        requirements: {
          minimumBrand: 32,
          maximumDepthRank: 5,
          minimumGpaMilli: 2_200,
          programStrengthBandIds: ['program_strength_national', 'program_strength_contender'],
          requiredTagIds: [],
        },
        rewardEffects: [funds(800), benefit('off_field_benefit_advisor_insight')],
        obligation: {
          id: 'nil_obligation_game_week_notebook',
          typeId: 'nil_obligation_type_media_session',
          nameKey: 'offField.nil.obligations.gameWeekNotebook.name',
          descriptionKey: 'offField.nil.obligations.gameWeekNotebook.description',
          durationWeeks: 2,
          focusCost: 2,
          weeklyEffects: [state('nil_state_preparation', -4)],
          defaultEffects: [state('nil_state_coach_trust', -4), state('nil_state_brand', -4)],
        },
      },
      {
        id: 'nil_offer_regional_travel_story',
        nameKey: 'offField.nil.offers.regionalTravel.name',
        descriptionKey: 'offField.nil.offers.regionalTravel.description',
        categoryId: 'nil_category_regional',
        weight: 85,
        expirationWeeks: 3,
        requirements: {
          minimumBrand: 38,
          maximumDepthRank: 5,
          minimumGpaMilli: 2_300,
          programStrengthBandIds: ALL_PROGRAM_BANDS,
          requiredTagIds: [],
        },
        rewardEffects: [funds(1_100), benefit('off_field_benefit_offer_visibility')],
        obligation: {
          id: 'nil_obligation_regional_travel_story',
          typeId: 'nil_obligation_type_campaign_work',
          nameKey: 'offField.nil.obligations.regionalTravel.name',
          descriptionKey: 'offField.nil.obligations.regionalTravel.description',
          durationWeeks: 2,
          focusCost: 2,
          weeklyEffects: [state('nil_state_body', -4), gpa(-100)],
          defaultEffects: [funds(-300), state('nil_state_brand', -6)],
        },
      },
      {
        id: 'nil_offer_alumni_market_showcase',
        nameKey: 'offField.nil.offers.alumniMarket.name',
        descriptionKey: 'offField.nil.offers.alumniMarket.description',
        categoryId: 'nil_category_regional',
        weight: 75,
        expirationWeeks: 2,
        requirements: {
          minimumBrand: 45,
          maximumDepthRank: 4,
          minimumGpaMilli: 2_300,
          programStrengthBandIds: ['program_strength_national', 'program_strength_contender'],
          requiredTagIds: [],
        },
        rewardEffects: [funds(1_400), state('nil_state_brand', 7)],
        obligation: {
          id: 'nil_obligation_alumni_market_showcase',
          typeId: 'nil_obligation_type_appearance',
          nameKey: 'offField.nil.obligations.alumniMarket.name',
          descriptionKey: 'offField.nil.obligations.alumniMarket.description',
          durationWeeks: 2,
          focusCost: 2,
          weeklyEffects: [state('nil_state_body', -3), state('nil_state_preparation', -3)],
          defaultEffects: [relationship('relationship_actor_position_coach', -4), funds(-400)],
        },
      },
    ],
  },
  offseason: {
    coachChanges: [
      {
        id: 'offseason_coach_change_continuity',
        nameKey: 'offField.offseason.coachChanges.continuity.name',
        descriptionKey: 'offField.offseason.coachChanges.continuity.description',
        weight: 700,
        coachTrustRetentionPermille: 1_000,
        resetRelationshipActorIds: [],
        changesScheme: false,
      },
      {
        id: 'offseason_coach_change_position_staff',
        nameKey: 'offField.offseason.coachChanges.positionStaff.name',
        descriptionKey: 'offField.offseason.coachChanges.positionStaff.description',
        weight: 180,
        coachTrustRetentionPermille: 600,
        resetRelationshipActorIds: ['relationship_actor_position_coach'],
        changesScheme: false,
      },
      {
        id: 'offseason_coach_change_scheme_shift',
        nameKey: 'offField.offseason.coachChanges.schemeShift.name',
        descriptionKey: 'offField.offseason.coachChanges.schemeShift.description',
        weight: 120,
        coachTrustRetentionPermille: 750,
        resetRelationshipActorIds: ['relationship_actor_position_coach'],
        changesScheme: true,
      },
    ],
    projectionFactors: [
      {
        id: 'transfer_factor_role',
        nameKey: 'offField.transfer.factors.role.name',
        descriptionKey: 'offField.transfer.factors.role.description',
        weightPermille: 200,
      },
      {
        id: 'transfer_factor_snaps',
        nameKey: 'offField.transfer.factors.snaps.name',
        descriptionKey: 'offField.transfer.factors.snaps.description',
        weightPermille: 160,
      },
      {
        id: 'transfer_factor_scheme_fit',
        nameKey: 'offField.transfer.factors.schemeFit.name',
        descriptionKey: 'offField.transfer.factors.schemeFit.description',
        weightPermille: 130,
      },
      {
        id: 'transfer_factor_development',
        nameKey: 'offField.transfer.factors.development.name',
        descriptionKey: 'offField.transfer.factors.development.description',
        weightPermille: 120,
      },
      {
        id: 'transfer_factor_program_outlook',
        nameKey: 'offField.transfer.factors.programOutlook.name',
        descriptionKey: 'offField.transfer.factors.programOutlook.description',
        weightPermille: 100,
      },
      {
        id: 'transfer_factor_nil',
        nameKey: 'offField.transfer.factors.nil.name',
        descriptionKey: 'offField.transfer.factors.nil.description',
        weightPermille: 80,
      },
      {
        id: 'transfer_factor_academics',
        nameKey: 'offField.transfer.factors.academics.name',
        descriptionKey: 'offField.transfer.factors.academics.description',
        weightPermille: 70,
      },
      {
        id: 'transfer_factor_relationships',
        nameKey: 'offField.transfer.factors.relationships.name',
        descriptionKey: 'offField.transfer.factors.relationships.description',
        weightPermille: 70,
      },
      {
        id: 'transfer_factor_familiarity',
        nameKey: 'offField.transfer.factors.familiarity.name',
        descriptionKey: 'offField.transfer.factors.familiarity.description',
        weightPermille: 70,
      },
    ],
    confidenceTiers: [
      {
        id: 'transfer_confidence_high',
        nameKey: 'offField.transfer.confidence.high.name',
        descriptionKey: 'offField.transfer.confidence.high.description',
        minimumInformationScore: 70,
        uncertaintyPoints: 4,
      },
      {
        id: 'transfer_confidence_medium',
        nameKey: 'offField.transfer.confidence.medium.name',
        descriptionKey: 'offField.transfer.confidence.medium.description',
        minimumInformationScore: 40,
        uncertaintyPoints: 8,
      },
      {
        id: 'transfer_confidence_low',
        nameKey: 'offField.transfer.confidence.low.name',
        descriptionKey: 'offField.transfer.confidence.low.description',
        minimumInformationScore: 0,
        uncertaintyPoints: 14,
      },
    ],
    tuning: {
      model: 'offseason_v1',
      advisorInsightInformationBonus: 20,
      brandInformationDivisor: 4,
      neutralTransferDepthRank: 4,
      pressureMaximumInclusive: 12,
      pressurePointsPerDepthRank: 6,
      transferShortlistSize: 3,
      stayFamiliarityBonus: 8,
      transferCoachTrustRetentionPermille: 250,
      transferFamiliarityScore: 20,
      transferInformationBaseScore: 30,
      relationshipResetValue: 50,
    },
  },
} as const satisfies OffFieldContent;

export const offFieldMechanicsCatalog = {
  model: offFieldContent.model,
  relationshipActors: offFieldContent.relationships.actors.map((actor) => ({
    id: actor.id,
    initialValue: actor.initialValue,
    lowThreshold: actor.lowThreshold,
    highThreshold: actor.highThreshold,
    coachTrustWeightPermille: actor.coachTrustWeightPermille,
    informationWeightPermille: actor.informationWeightPermille,
    opportunityWeightPermille: actor.opportunityWeightPermille,
  })),
  relationshipWeeklyRules: offFieldContent.relationships.weeklyRules,
  academics: {
    ...offFieldContent.academics.tuning,
    checkpoints: offFieldContent.academics.checkpoints.map(({ id, weekIndex }) => ({
      id,
      weekIndex,
    })),
  },
  benefits: offFieldContent.benefits.map(({ id, maximumStack }) => ({ id, maximumStack })),
  nilOffers: offFieldContent.nil.offers.map((offer) => ({
    id: offer.id,
    categoryId: offer.categoryId,
    weight: offer.weight,
    expirationWeeks: offer.expirationWeeks,
    requirements: offer.requirements,
    rewardEffects: offer.rewardEffects,
    obligation: {
      id: offer.obligation.id,
      typeId: offer.obligation.typeId,
      durationWeeks: offer.obligation.durationWeeks,
      focusCost: offer.obligation.focusCost,
      weeklyEffects: offer.obligation.weeklyEffects,
      defaultEffects: offer.obligation.defaultEffects,
    },
  })),
  offseason: {
    ...offFieldContent.offseason.tuning,
    coachChanges: offFieldContent.offseason.coachChanges.map((change) => ({
      id: change.id,
      weight: change.weight,
      coachTrustRetentionPermille: change.coachTrustRetentionPermille,
      resetRelationshipActorIds: change.resetRelationshipActorIds,
      changesScheme: change.changesScheme,
    })),
    projectionFactors: offFieldContent.offseason.projectionFactors.map((factor) => ({
      id: factor.id,
      weightPermille: factor.weightPermille,
    })),
    confidenceTiers: offFieldContent.offseason.confidenceTiers.map((tier) => ({
      id: tier.id,
      minimumInformationScore: tier.minimumInformationScore,
      uncertaintyPoints: tier.uncertaintyPoints,
    })),
  },
} satisfies OffFieldMechanicsCatalog;
