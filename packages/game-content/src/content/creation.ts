import type { CreationContent, PersonalityTraitId } from '../schema/creation.js';
import { appearanceCatalog, defaultWrAppearance, wrBodyMeasurementOptions } from './appearance.js';

export const creationContent = {
  appearanceCatalog,
  baseline: {
    baseAttributeRatings: {
      attribute_agility: 58,
      attribute_burst: 60,
      attribute_composure: 50,
      attribute_conditioning: 56,
      attribute_discipline: 52,
      attribute_durability: 55,
      attribute_football_iq: 52,
      attribute_speed: 62,
      attribute_strength: 50,
      attribute_work_ethic: 54,
      attribute_wr_blocking: 44,
      attribute_wr_catch_in_traffic: 48,
      attribute_wr_hands: 52,
      attribute_wr_release: 50,
      attribute_wr_route_running: 50,
      attribute_wr_yac: 52,
    },
    baseState: {
      state_body: 90,
      state_brand: 5,
      state_coach_trust: 10,
      state_confidence: 50,
      state_gpa: 3,
    },
  },
  bodyMeasurements: wrBodyMeasurementOptions,
  defaultAppearance: defaultWrAppearance,
  personalityTraits: [
    {
      descriptionKey: 'creation.personalities.competitive.description',
      attributeModifiers: [{ attributeId: 'attribute_work_ethic', delta: 2 }],
      grantedTagIds: ['tag_event_seeks_challenge', 'tag_practice_rivalry_driven'],
      id: 'personality_competitive',
      incompatibleTraitIds: [],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.competitive.name',
      stateModifiers: [{ delta: -3, stateId: 'state_body' }],
    },
    {
      descriptionKey: 'creation.personalities.quiet.description',
      attributeModifiers: [{ attributeId: 'attribute_composure', delta: 2 }],
      grantedTagIds: ['tag_event_prefers_low_profile', 'tag_media_reserved'],
      id: 'personality_quiet',
      incompatibleTraitIds: ['personality_social'],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.quiet.name',
      stateModifiers: [{ delta: -3, stateId: 'state_brand' }],
    },
    {
      descriptionKey: 'creation.personalities.leader.description',
      attributeModifiers: [],
      grantedTagIds: ['tag_event_team_voice', 'tag_relationship_group_mediator'],
      id: 'personality_leader',
      incompatibleTraitIds: [],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.leader.name',
      stateModifiers: [
        { delta: 3, stateId: 'state_coach_trust' },
        { delta: -2, stateId: 'state_body' },
      ],
    },
    {
      descriptionKey: 'creation.personalities.hotHeaded.description',
      attributeModifiers: [{ attributeId: 'attribute_discipline', delta: -3 }],
      grantedTagIds: ['tag_event_emotional_flashpoint', 'tag_pressure_volatile'],
      id: 'personality_hot_headed',
      incompatibleTraitIds: ['personality_disciplined'],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.hotHeaded.name',
      stateModifiers: [{ delta: 3, stateId: 'state_confidence' }],
    },
    {
      descriptionKey: 'creation.personalities.disciplined.description',
      attributeModifiers: [{ attributeId: 'attribute_discipline', delta: 3 }],
      grantedTagIds: ['tag_academics_consistent', 'tag_event_routine_focused'],
      id: 'personality_disciplined',
      incompatibleTraitIds: ['personality_hot_headed'],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.disciplined.name',
      stateModifiers: [{ delta: -2, stateId: 'state_confidence' }],
    },
    {
      descriptionKey: 'creation.personalities.social.description',
      attributeModifiers: [],
      grantedTagIds: ['tag_brand_outgoing', 'tag_event_campus_connector'],
      id: 'personality_social',
      incompatibleTraitIds: ['personality_quiet'],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.social.name',
      stateModifiers: [
        { delta: 4, stateId: 'state_brand' },
        { delta: -0.1, stateId: 'state_gpa' },
      ],
    },
    {
      descriptionKey: 'creation.personalities.independent.description',
      attributeModifiers: [{ attributeId: 'attribute_work_ethic', delta: 2 }],
      grantedTagIds: ['tag_event_self_directed', 'tag_relationship_values_space'],
      id: 'personality_independent',
      incompatibleTraitIds: [],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.independent.name',
      stateModifiers: [{ delta: -3, stateId: 'state_coach_trust' }],
    },
    {
      descriptionKey: 'creation.personalities.confident.description',
      attributeModifiers: [{ attributeId: 'attribute_composure', delta: -2 }],
      grantedTagIds: ['tag_event_high_self_belief', 'tag_pressure_welcomes_spotlight'],
      id: 'personality_confident',
      incompatibleTraitIds: [],
      kind: 'personality_trait',
      nameKey: 'creation.personalities.confident.name',
      stateModifiers: [{ delta: 5, stateId: 'state_confidence' }],
    },
  ],
  recruitingBackgrounds: [
    {
      descriptionKey: 'creation.backgrounds.blueChipStar.description',
      attributeModifiers: [
        { attributeId: 'attribute_burst', delta: 2 },
        { attributeId: 'attribute_wr_release', delta: 2 },
        { attributeId: 'attribute_durability', delta: -2 },
        { attributeId: 'attribute_wr_blocking', delta: -2 },
      ],
      grantedTagIds: ['tag_recruiting_high_expectations'],
      id: 'background_blue_chip_star',
      kind: 'recruiting_background',
      nameKey: 'creation.backgrounds.blueChipStar.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.backgrounds.lateBloomer.description',
      attributeModifiers: [
        { attributeId: 'attribute_work_ethic', delta: 4 },
        { attributeId: 'attribute_conditioning', delta: 2 },
        { attributeId: 'attribute_wr_release', delta: -3 },
        { attributeId: 'attribute_wr_route_running', delta: -2 },
      ],
      grantedTagIds: ['tag_recruiting_late_growth'],
      id: 'background_late_bloomer',
      kind: 'recruiting_background',
      nameKey: 'creation.backgrounds.lateBloomer.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.backgrounds.smallTownStar.description',
      attributeModifiers: [
        { attributeId: 'attribute_wr_hands', delta: 3 },
        { attributeId: 'attribute_wr_yac', delta: 2 },
        { attributeId: 'attribute_football_iq', delta: -3 },
        { attributeId: 'attribute_wr_release', delta: -2 },
      ],
      grantedTagIds: ['tag_recruiting_hometown_attention'],
      id: 'background_small_town_star',
      kind: 'recruiting_background',
      nameKey: 'creation.backgrounds.smallTownStar.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.backgrounds.legacyRecruit.description',
      attributeModifiers: [
        { attributeId: 'attribute_football_iq', delta: 4 },
        { attributeId: 'attribute_composure', delta: 2 },
        { attributeId: 'attribute_strength', delta: -2 },
        { attributeId: 'attribute_conditioning', delta: -2 },
      ],
      grantedTagIds: ['tag_recruiting_family_legacy'],
      id: 'background_legacy_recruit',
      kind: 'recruiting_background',
      nameKey: 'creation.backgrounds.legacyRecruit.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.backgrounds.underRecruitedAthlete.description',
      attributeModifiers: [
        { attributeId: 'attribute_agility', delta: 3 },
        { attributeId: 'attribute_work_ethic', delta: 3 },
        { attributeId: 'attribute_wr_route_running', delta: -3 },
        { attributeId: 'attribute_wr_hands', delta: -2 },
      ],
      grantedTagIds: ['tag_recruiting_prove_them_wrong'],
      id: 'background_under_recruited_athlete',
      kind: 'recruiting_background',
      nameKey: 'creation.backgrounds.underRecruitedAthlete.name',
      stateModifiers: [],
    },
  ],
  wrArchetypes: [
    {
      descriptionKey: 'creation.archetypes.deepThreat.description',
      attributeModifiers: [
        { attributeId: 'attribute_speed', delta: 5 },
        { attributeId: 'attribute_burst', delta: 3 },
        { attributeId: 'attribute_wr_hands', delta: -2 },
        { attributeId: 'attribute_wr_catch_in_traffic', delta: -3 },
      ],
      grantedTagIds: ['tag_role_vertical_target'],
      id: 'archetype_wr_deep_threat',
      kind: 'wr_archetype',
      nameKey: 'creation.archetypes.deepThreat.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.archetypes.routeTechnician.description',
      attributeModifiers: [
        { attributeId: 'attribute_wr_route_running', delta: 5 },
        { attributeId: 'attribute_wr_release', delta: 3 },
        { attributeId: 'attribute_speed', delta: -3 },
        { attributeId: 'attribute_strength', delta: -2 },
      ],
      grantedTagIds: ['tag_role_precision_routes'],
      id: 'archetype_wr_route_technician',
      kind: 'wr_archetype',
      nameKey: 'creation.archetypes.routeTechnician.name',
      stateModifiers: [],
    },
    {
      descriptionKey: 'creation.archetypes.possessionReceiver.description',
      attributeModifiers: [
        { attributeId: 'attribute_wr_hands', delta: 4 },
        { attributeId: 'attribute_wr_catch_in_traffic', delta: 4 },
        { attributeId: 'attribute_strength', delta: 2 },
        { attributeId: 'attribute_speed', delta: -4 },
        { attributeId: 'attribute_burst', delta: -3 },
      ],
      grantedTagIds: ['tag_role_chain_mover'],
      id: 'archetype_wr_possession_receiver',
      kind: 'wr_archetype',
      nameKey: 'creation.archetypes.possessionReceiver.name',
      stateModifiers: [],
    },
  ],
} as const satisfies CreationContent;

export function isCompatiblePersonalitySelection(
  traitIds: readonly string[],
): traitIds is readonly [PersonalityTraitId, PersonalityTraitId] {
  if (traitIds.length !== 2 || traitIds[0] === traitIds[1]) {
    return false;
  }

  const [leftId, rightId] = traitIds;
  if (leftId === undefined || rightId === undefined) {
    return false;
  }

  const left = creationContent.personalityTraits.find((trait) => trait.id === leftId);
  const right = creationContent.personalityTraits.find((trait) => trait.id === rightId);
  return (
    left !== undefined &&
    right !== undefined &&
    !left.incompatibleTraitIds.some((id) => id === right.id) &&
    !right.incompatibleTraitIds.some((id) => id === left.id)
  );
}
