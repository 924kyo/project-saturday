import {
  DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  isPositionId,
  type PositionId,
  type PositionRoomMechanics,
} from '@project-saturday/game-core';

import { positionAlphaContent } from './positions.js';

/** Projects validated schema-9 position data into the browser-independent staged room engine. */
export function buildPositionRoomMechanics(positionId: unknown): PositionRoomMechanics | undefined {
  if (!isPositionId(positionId)) return undefined;
  const definition = positionAlphaContent.positions.find(({ id }) => id === positionId);
  if (definition === undefined) return undefined;
  return Object.freeze({
    positionId: definition.id,
    archetypeIds: [...definition.archetypeIds] as PositionRoomMechanics['archetypeIds'],
    recruitingAbilityWeightsPermille: { ...definition.recruitingAbilityWeightsPermille },
    schemeFitByArchetype: { ...definition.schemeFitByArchetype },
    depthEvaluationWeightsPermille: { ...definition.depthEvaluationWeightsPermille },
    opportunityByRole: {
      depth_role_starter: { ...definition.opportunityByRole.depth_role_starter },
      depth_role_rotation: { ...definition.opportunityByRole.depth_role_rotation },
      depth_role_reserve: { ...definition.opportunityByRole.depth_role_reserve },
      depth_role_developmental: { ...definition.opportunityByRole.depth_role_developmental },
    },
    hysteresisThresholdMilli: DEPTH_HYSTERESIS_THRESHOLD_MILLI,
  });
}

export const positionRoomMechanicsPositionIds = Object.freeze(
  positionAlphaContent.positions.map(({ id }) => id) as PositionId[],
);
