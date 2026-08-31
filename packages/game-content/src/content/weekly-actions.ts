import type {
  DevelopmentWeekConfig,
  WeeklyActionContent,
  WeeklyActionDefinition,
  WeeklyActionMechanicsDefinition,
  WeeklyActionPositionId,
} from '../schema/weekly-actions.js';

export const developmentWeekConfig = {
  bodyXpEfficiencyMinPermille: 600,
  bodyXpEfficiencyPerBodyPoint: 4,
  passiveBodyRecovery: 10,
  proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
  proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
} as const satisfies DevelopmentWeekConfig;

export const weeklyActions = [
  {
    attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 26 }],
    bodyDelta: -8,
    descriptionKey: 'weeklyActions.routeDrills.description',
    gpaDelta: 0,
    id: 'action_route_drills',
    nameKey: 'weeklyActions.routeDrills.name',
    proficiencyId: 'proficiency_route_drills',
    requirements: { positionIds: ['position_wr'] },
    tags: ['action_family_training', 'action_scope_wr', 'action_focus_route_running'],
  },
  {
    attributeXp: [{ attributeId: 'attribute_wr_release', baseXp: 26 }],
    bodyDelta: -9,
    descriptionKey: 'weeklyActions.releaseDrills.description',
    gpaDelta: 0,
    id: 'action_release_drills',
    nameKey: 'weeklyActions.releaseDrills.name',
    proficiencyId: 'proficiency_release_drills',
    requirements: { positionIds: ['position_wr'] },
    tags: ['action_family_training', 'action_scope_wr', 'action_focus_release'],
  },
  {
    attributeXp: [{ attributeId: 'attribute_wr_hands', baseXp: 26 }],
    bodyDelta: -8,
    descriptionKey: 'weeklyActions.handsCatchWork.description',
    gpaDelta: 0,
    id: 'action_hands_catch_work',
    nameKey: 'weeklyActions.handsCatchWork.name',
    proficiencyId: 'proficiency_hands_catch_work',
    requirements: { positionIds: ['position_wr'] },
    tags: ['action_family_training', 'action_scope_wr', 'action_focus_catching'],
  },
  {
    attributeXp: [
      { attributeId: 'attribute_strength', baseXp: 24 },
      { attributeId: 'attribute_durability', baseXp: 8 },
    ],
    bodyDelta: -14,
    descriptionKey: 'weeklyActions.weightRoom.description',
    gpaDelta: 0,
    id: 'action_weight_room',
    nameKey: 'weeklyActions.weightRoom.name',
    proficiencyId: 'proficiency_weight_room',
    requirements: { positionIds: [] },
    tags: ['action_family_training', 'action_scope_common', 'action_focus_strength'],
  },
  {
    attributeXp: [
      { attributeId: 'attribute_speed', baseXp: 20 },
      { attributeId: 'attribute_burst', baseXp: 14 },
    ],
    bodyDelta: -15,
    descriptionKey: 'weeklyActions.speedWork.description',
    gpaDelta: 0,
    id: 'action_speed_work',
    nameKey: 'weeklyActions.speedWork.name',
    proficiencyId: 'proficiency_speed_work',
    requirements: { positionIds: [] },
    tags: ['action_family_training', 'action_scope_common', 'action_focus_speed'],
  },
  {
    attributeXp: [{ attributeId: 'attribute_football_iq', baseXp: 24 }],
    bodyDelta: -3,
    descriptionKey: 'weeklyActions.filmStudy.description',
    gpaDelta: 0,
    id: 'action_film_study',
    nameKey: 'weeklyActions.filmStudy.name',
    proficiencyId: 'proficiency_film_study',
    requirements: { positionIds: [] },
    tags: ['action_family_training', 'action_scope_common', 'action_focus_film_study'],
  },
  {
    attributeXp: [
      { attributeId: 'attribute_wr_route_running', baseXp: 10 },
      { attributeId: 'attribute_wr_release', baseXp: 10 },
      { attributeId: 'attribute_wr_hands', baseXp: 10 },
    ],
    bodyDelta: -17,
    descriptionKey: 'weeklyActions.extraPractice.description',
    gpaDelta: 0,
    id: 'action_extra_practice',
    nameKey: 'weeklyActions.extraPractice.name',
    proficiencyId: 'proficiency_extra_practice',
    requirements: { positionIds: ['position_wr'] },
    tags: ['action_family_training', 'action_scope_wr', 'action_focus_multi_skill'],
  },
  {
    attributeXp: [],
    bodyDelta: 32,
    descriptionKey: 'weeklyActions.recovery.description',
    gpaDelta: 0,
    id: 'action_recovery',
    nameKey: 'weeklyActions.recovery.name',
    proficiencyId: null,
    requirements: { positionIds: [] },
    tags: ['action_family_recovery', 'action_scope_common', 'action_focus_body'],
  },
  {
    attributeXp: [],
    bodyDelta: 0,
    descriptionKey: 'weeklyActions.studyHall.description',
    gpaDelta: 0.15,
    id: 'action_study_hall',
    nameKey: 'weeklyActions.studyHall.name',
    proficiencyId: null,
    requirements: { positionIds: [] },
    tags: ['action_family_academics', 'action_scope_common', 'action_focus_gpa'],
  },
] as const satisfies WeeklyActionContent;

/** Strict mechanical projections accepted directly by game-core commands. */
export const weeklyActionDefinitions = weeklyActions.map(
  ({ attributeXp, bodyDelta, gpaDelta, id, proficiencyId, tags }) => ({
    attributeXp,
    bodyDelta,
    gpaDelta,
    id,
    proficiencyId,
    tagIds: tags,
  }),
) satisfies readonly WeeklyActionMechanicsDefinition[];

const weeklyActionDefinitionById = new Map(
  weeklyActionDefinitions.map((definition) => [definition.id, definition]),
);

export interface AvailableWeeklyActionEntry {
  readonly definition: WeeklyActionMechanicsDefinition;
  readonly presentation: WeeklyActionDefinition;
}

function cloneMechanicsDefinition(
  definition: WeeklyActionMechanicsDefinition,
): WeeklyActionMechanicsDefinition {
  return {
    attributeXp: definition.attributeXp.map(({ attributeId, baseXp }) => ({
      attributeId,
      baseXp,
    })),
    bodyDelta: definition.bodyDelta,
    gpaDelta: definition.gpaDelta,
    id: definition.id,
    proficiencyId: definition.proficiencyId,
    tagIds: [...definition.tagIds],
  };
}

function clonePresentation(action: WeeklyActionDefinition): WeeklyActionDefinition {
  return {
    attributeXp: action.attributeXp.map(({ attributeId, baseXp }) => ({ attributeId, baseXp })),
    bodyDelta: action.bodyDelta,
    descriptionKey: action.descriptionKey,
    gpaDelta: action.gpaDelta,
    id: action.id,
    nameKey: action.nameKey,
    proficiencyId: action.proficiencyId,
    requirements: { positionIds: [...action.requirements.positionIds] },
    tags: [...action.tags],
  };
}

/** Returns position-eligible UI copy paired by stable ID with its game-core definition. */
export function getAvailableWeeklyActionEntries(
  positionId: WeeklyActionPositionId,
): readonly AvailableWeeklyActionEntry[] {
  return weeklyActions
    .filter(
      ({ requirements }) =>
        requirements.positionIds.length === 0 || requirements.positionIds.includes(positionId),
    )
    .map((presentation) => {
      const definition = weeklyActionDefinitionById.get(presentation.id);
      if (definition === undefined) {
        throw new Error(`Weekly action ${presentation.id} is missing its mechanical definition.`);
      }
      return {
        definition: cloneMechanicsDefinition(definition),
        presentation: clonePresentation(presentation),
      };
    });
}
