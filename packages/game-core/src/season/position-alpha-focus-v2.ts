import type { NewInjuryEvidence } from '../injuries/types.js';
import {
  positionAlphaSourceCareerWeekIndexV2,
  type PositionAlphaCalendarSourceV2,
} from './position-alpha-calendar-v2.js';
import { resolvePositionFocusWithSkills } from '../weekly/position-focus-skills.js';
import {
  positionSkillEffectLoadout,
  type PositionAlphaSkillBuildMechanics,
} from './position-alpha-skill-builds.js';
import { collectEquippedLifeHooks, derivePassiveBodyRecovery } from '../skills/effects.js';
import {
  derivePositiveLifeSkillMultiplier,
  type PositiveLifeSkillMultiplier,
} from '../skills/positive-life-effects.js';
import type { PassiveBodyRecoveryEvidence } from '../skills/types.js';
import type { SkillId } from '../skills/ids.js';
import {
  projectPositionAlphaOpportunityV2,
  type PositionAlphaOpportunityEvidenceV2,
} from './position-alpha-opportunity-v2.js';
import {
  replayPositionAlphaNilPlanningV2,
  type PositionAlphaNilStateV2,
} from './position-alpha-nil-v2.js';
import { COACH_TRUST_BOUNDS } from '../player/bounds.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { PlayerState } from '../player/types.js';
import {
  resolvePositionRelationshipWeek,
  type PositionRelationshipWeekEvidenceV1,
} from './position-lifecycle.js';
import {
  createCommonPositionProficiencyUses,
  isPositionFocusStateV2,
  type CommonPositionProficiencyUses,
  type PositionFocusEvidenceV2,
  type PositionFocusId,
  type PositionFocusStateV2,
} from '../weekly/position-focus.js';
import type { PositionTrainingState } from '../weekly/position-training.js';
import { deriveNextWeekPreparation, type DevelopmentWeekConfig } from '../weekly/tuning.js';
import {
  finishPositionAlphaWeekPreparation,
  type PositionAlphaPreparation,
  type PositionAlphaSessionCommandMechanics,
  type PositionAlphaSessionV1,
} from './position-alpha-session.js';

/** Absent on literal migration; all current committed weeks activate the shared counters. */
export interface PositionAlphaTrainingV2 extends PositionTrainingState {
  readonly sharedProficiencyUses?: CommonPositionProficiencyUses;
}
export type PositionAlphaPreparationV2 = PositionAlphaPreparation<
  PositionFocusId,
  PositionFocusEvidenceV2,
  PositionAlphaTrainingV2 & { readonly sharedProficiencyUses: CommonPositionProficiencyUses }
> & {
  readonly relationships: PositionRelationshipWeekEvidenceV1;
  readonly relationshipSkillGain: PositiveLifeSkillMultiplier;
  readonly opportunity: PositionAlphaOpportunityEvidenceV2;
  readonly nilObligationGpaDeltaMilli: number;
  readonly relationshipTrust: {
    readonly before: number;
    readonly requestedDelta: number;
    readonly actualDelta: number;
    readonly after: number;
  };
};
type FocusSource = Pick<PositionAlphaSessionV1, 'player' | 'room' | 'lifecycle'> &
  PositionAlphaCalendarSourceV2 & {
    readonly skills: { readonly equippedSkillIds: readonly (SkillId | null)[] };
    readonly training: PositionAlphaTrainingV2;
    readonly nil?: PositionAlphaNilStateV2;
  };

export function historicalPositionTrainingFields(
  training: PositionAlphaTrainingV2,
): PositionTrainingState {
  return Object.fromEntries(
    Object.entries(training).filter(([key]) => key !== 'sharedProficiencyUses'),
  ) as unknown as PositionTrainingState;
}

export function positionFocusStateFromSource(
  source: Pick<FocusSource, 'player' | 'training'>,
): PositionFocusStateV2 {
  return {
    model: 'position_focus_state_v2',
    training: historicalPositionTrainingFields(source.training),
    sharedProficiencyUses: Object.hasOwn(source.training, 'sharedProficiencyUses')
      ? source.training.sharedProficiencyUses!
      : createCommonPositionProficiencyUses(),
    gpa: source.player.state.gpa,
  };
}

export function preparePositionAlphaWeekV2(
  rawSource: FocusSource,
  actionIds: unknown,
  injury: NewInjuryEvidence | null,
  mechanics: PositionAlphaSessionCommandMechanics,
  weekIndex: number,
): PositionAlphaPreparationV2 | null {
  const careerWeekIndex = positionAlphaSourceCareerWeekIndexV2(rawSource, weekIndex);
  if (!Array.isArray(actionIds) || actionIds.length !== 3 || careerWeekIndex === null) return null;
  const nil = replayPositionAlphaNilPlanningV2(rawSource, careerWeekIndex, mechanics.nil);
  if (
    nil === null ||
    (nil.state.activeObligation !== null &&
      nil.state.activeObligation.lastResolvedWeekIndex !== careerWeekIndex)
  )
    return null;
  const source: FocusSource = {
    ...rawSource,
    player: { ...rawSource.player, state: nil.playerState },
    lifecycle: {
      ...rawSource.lifecycle,
      playerState: nil.playerState,
      relationships: nil.relationships,
    },
    room: { ...rawSource.room, playerCoachTrust: nil.playerState.coachTrust },
    training: {
      ...rawSource.training,
      state: {
        body: nil.playerState.body,
        preparation: nil.playerState.preparation,
        confidence: nil.playerState.confidence,
      },
    },
  };
  let state = positionFocusStateFromSource(source);
  if (!isPositionFocusStateV2(state, mechanics.trainingConfig)) return null;
  const evidence: PositionFocusEvidenceV2[] = [];
  const selected: PositionFocusId[] = [];
  const loadout = positionSkillEffectLoadout(
    source.skills.equippedSkillIds,
    mechanics.skillBuilds.definitions,
  );
  for (const id of actionIds) {
    const definition =
      mechanics.trainingActions.find(
        (action) => action.id === id && action.positionId === source.player.positionId,
      ) ?? mechanics.commonFocuses.find((action) => action.id === id);
    if (definition === undefined) return null;
    const tagIds = mechanics.skillBuilds.actionTags[id as PositionFocusId];
    if (tagIds === undefined) return null;
    const result = resolvePositionFocusWithSkills(
      state,
      definition,
      mechanics.trainingConfig,
      injury,
      mechanics.focusInjuryPolicies,
      loadout,
      mechanics.skillBuilds.definitions,
      {
        id: definition.id,
        bodyDelta: definition.bodyDelta,
        attributeXp: definition.attributeXp,
        tagIds,
      },
      {
        body: state.training.state.body,
        actionId: definition.id,
        actionIndex: selected.length as 0 | 1 | 2,
        planActionIds: actionIds,
        previousActionId: selected.at(-1) ?? null,
      },
    );
    if (!result.ok) return null;
    state = result.next;
    evidence.push(result.evidence);
    selected.push(result.evidence.actionId);
  }
  const preparation = finishPositionAlphaWeekPreparation(
    {
      ...source,
      player: { ...source.player, state: { ...source.player.state, gpa: state.gpa } },
    },
    { ...state.training, sharedProficiencyUses: state.sharedProficiencyUses },
    evidence as unknown as PositionAlphaPreparationV2['trainingEvidence'],
    selected as unknown as PositionAlphaPreparationV2['actionIds'],
    mechanics.room,
  );
  if (preparation === null) return null;
  const lifeHooks = collectEquippedLifeHooks(loadout, mechanics.skillBuilds.definitions);
  if (!lifeHooks.ok) return null;
  const relationshipSkillGain = derivePositiveLifeSkillMultiplier(
    lifeHooks.hooks,
    'life_hook_relationship_gain_multiplier',
  );
  const resolvedRelationships = resolvePositionRelationshipWeek(
    source.player.positionId,
    weekIndex,
    source.lifecycle.relationships,
    selected,
    mechanics.lifecycle,
    relationshipSkillGain.multiplierPermille,
  );
  if (resolvedRelationships === null) return null;
  // JSON cannot preserve -0. Current records use canonical zero without changing
  // the historical resolver's output or any numerical football consequence.
  const relationships = {
    ...resolvedRelationships,
    coachTrustModifier: resolvedRelationships.coachTrustModifier || 0,
    informationScoreModifier: resolvedRelationships.informationScoreModifier || 0,
    opportunitySnapBonusPermille: resolvedRelationships.opportunitySnapBonusPermille || 0,
  };
  const before = preparation.player.state.coachTrust;
  const opportunity = projectPositionAlphaOpportunityV2(
    preparation.room.projection,
    relationships.opportunitySnapBonusPermille,
  );
  if (opportunity === null) return null;
  const after = Math.min(
    COACH_TRUST_BOUNDS.max,
    Math.max(COACH_TRUST_BOUNDS.min, before + relationships.coachTrustModifier),
  );
  return deepFreeze(
    cloneSerializable({
      ...preparation,
      relationships,
      relationshipSkillGain,
      opportunity,
      nilObligationGpaDeltaMilli: nil.obligationGpaDeltaMilli,
      relationshipTrust: {
        before,
        requestedDelta: relationships.coachTrustModifier,
        actualDelta: after - before,
        after,
      },
      player: { ...preparation.player, state: { ...preparation.player.state, coachTrust: after } },
      room: { ...preparation.room, playerCoachTrust: after },
    }),
  );
}

export interface PositionAlphaRolloverV2 {
  readonly model: 'position_alpha_rollover_v2';
  readonly bodyBefore: number;
  readonly requestedBodyRecovery: number;
  readonly actualBodyRecovery: number;
  readonly bodyAfter: number;
  readonly preparationBefore: number;
  readonly preparationAfter: number;
  readonly passiveRecovery: PassiveBodyRecoveryEvidence;
}

/** Current-only once-weekly rollover; historical commands retain their exact old results. */
export function derivePositionAlphaRolloverV2(
  state: PlayerState,
  config: DevelopmentWeekConfig,
  equippedSkillIds: readonly (SkillId | null)[],
  skillBuilds: PositionAlphaSkillBuildMechanics,
  weekIndex: number,
): PositionAlphaRolloverV2 | null {
  const recovery = derivePassiveBodyRecovery(
    state.body,
    config.passiveBodyRecovery,
    positionSkillEffectLoadout(equippedSkillIds, skillBuilds.definitions),
    skillBuilds.definitions,
    weekIndex,
  );
  if (!recovery.ok) return null;
  const bodyAfter = recovery.evidence.bodyAfter;
  return deepFreeze(
    cloneSerializable({
      model: 'position_alpha_rollover_v2' as const,
      bodyBefore: state.body,
      requestedBodyRecovery: recovery.evidence.requestedBodyDelta,
      actualBodyRecovery: bodyAfter - state.body,
      bodyAfter,
      preparationBefore: state.preparation,
      preparationAfter: deriveNextWeekPreparation(state.preparation),
      passiveRecovery: recovery.evidence,
    }),
  );
}
