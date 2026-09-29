import {
  chooseSkillBreakthrough,
  beginRecruiting,
  derivePassiveBodyRecovery,
  setEquippedSkillSlot,
  type AppliedPassiveBodyRecoverySkillEffect,
  type AppliedWeeklySkillEffect,
  type CareerRun,
  type EquippedSkillSlotIndex,
  type PassiveBodyRecoveryEvidence,
  type SkillCommandResult,
  type SkillFamilyId,
  type SkillGradeId,
  type SkillId,
  type WeeklyActionId,
  type WeeklyActionResult,
  type WeeklySkillEffectAggregates,
  type WeeklySkillEffectAggregatesV2,
} from '@project-saturday/game-core';
import {
  developmentWeekConfig,
  offenseStyleMechanicsDefinitions,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  skillMechanicsDefinitions,
  skills,
} from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import type { WrCareerSurface } from './wr-view';

export const SKILL_UI_CATALOG_FAILURE_REASON = 'skill-ui.missing-shipped-skill' as const;

export interface SkillCardPresentation {
  readonly id: SkillId;
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly gradeId: SkillGradeId;
  readonly gradeNameKey: MessageKey;
  readonly familyId: SkillFamilyId;
  readonly familyNameKey: MessageKey;
  readonly isTradeoff: boolean;
}

export interface OwnedSkillInventoryEntry {
  readonly skillId: SkillId;
  readonly offerIndex: number;
  readonly acquiredWeekIndex: number;
  readonly equippedSlotIndex: EquippedSkillSlotIndex | null;
  readonly presentation: SkillCardPresentation;
}

export interface EquippedSkillSlotPresentation {
  readonly slotIndex: EquippedSkillSlotIndex;
  readonly skillId: SkillId | null;
  readonly presentation: SkillCardPresentation | null;
}

export type EquippedSkillSlotPresentations = readonly [
  EquippedSkillSlotPresentation,
  EquippedSkillSlotPresentation,
  EquippedSkillSlotPresentation,
  EquippedSkillSlotPresentation,
];

export interface AppliedActionSkillEffectPresentation {
  /** Authoritative persisted trace; presentation must not reconstruct its value. */
  readonly evidence: AppliedWeeklySkillEffect;
  readonly skill: SkillCardPresentation;
}

export interface WeeklySkillEffectPresentation {
  readonly actionId: WeeklyActionId;
  readonly actionIndex: number;
  readonly weekIndex: number;
  readonly baseBodyDelta: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly baseGpaDelta: number;
  readonly requestedGpaDelta: number;
  readonly actualGpaDelta: number;
  /** Authoritative persisted aggregate; presentation must not recalculate it from traces. */
  readonly aggregates: WeeklySkillEffectAggregatesV2 | WeeklySkillEffectAggregates;
  readonly appliedEffects: readonly AppliedActionSkillEffectPresentation[];
}

export interface AppliedPassiveSkillEffectPresentation {
  /** Authoritative persisted trace; presentation must not reconstruct its value. */
  readonly evidence: AppliedPassiveBodyRecoverySkillEffect;
  readonly skill: SkillCardPresentation;
}

export interface PassiveRecoverySkillEffectPresentation {
  readonly weekIndex: number;
  readonly bodyBefore: number;
  readonly baseBodyDelta: number;
  readonly requestedBodyDelta: number;
  readonly actualBodyDelta: number;
  readonly bodyAfter: number;
  readonly appliedEffects: readonly AppliedPassiveSkillEffectPresentation[];
}

function createSkillPresentation(skill: (typeof skills)[number]): SkillCardPresentation {
  return Object.freeze({
    id: skill.id,
    nameKey: skill.nameKey,
    descriptionKey: skill.descriptionKey,
    gradeId: skill.gradeId,
    gradeNameKey: skill.gradeNameKey,
    familyId: skill.familyId,
    familyNameKey: skill.familyNameKey,
    isTradeoff: skill.isTradeoff,
  });
}

export const SKILL_CARD_PRESENTATIONS: readonly SkillCardPresentation[] = Object.freeze(
  skills.map(createSkillPresentation),
);

const SKILL_PRESENTATION_BY_ID: ReadonlyMap<SkillId, SkillCardPresentation> = new Map(
  SKILL_CARD_PRESENTATIONS.map((presentation) => [presentation.id, presentation]),
);

if (SKILL_PRESENTATION_BY_ID.size !== SKILL_CARD_PRESENTATIONS.length) {
  throw new Error(SKILL_UI_CATALOG_FAILURE_REASON);
}

/** Resolves only exact shipped stable IDs; absent or removed content fails closed. */
export function getSkillPresentation(skillId: SkillId): SkillCardPresentation {
  const presentation = SKILL_PRESENTATION_BY_ID.get(skillId);
  if (presentation === undefined) {
    throw new Error(SKILL_UI_CATALOG_FAILURE_REASON);
  }
  return presentation;
}

export function chooseCareerSkillBreakthrough(
  career: CareerRun,
  selectedSkillId: SkillId,
): SkillCommandResult {
  const chosen = chooseSkillBreakthrough(career, selectedSkillId);
  if (
    !chosen.ok ||
    chosen.career.phase.type !== 'PLAN_ACTIONS' ||
    chosen.career.recruitingState.type !== 'NOT_STARTED'
  ) {
    return chosen;
  }
  const recruiting = beginRecruiting(
    chosen.career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  return recruiting.ok
    ? { career: recruiting.career, ok: true }
    : { career, ok: false, reason: 'skill.internal_invariant_failure' };
}

export function setCareerEquippedSkillSlot(
  career: CareerRun,
  slotIndex: number,
  skillId: SkillId | null,
): SkillCommandResult {
  return setEquippedSkillSlot(career, slotIndex, skillId);
}

export function getOwnedSkillInventory(
  career: WrCareerSurface,
): readonly OwnedSkillInventoryEntry[] {
  return Object.freeze(
    career.player.skillState.acquisitions.map((acquisition) => {
      const equippedIndex = career.player.skillState.equippedSkillIds.findIndex(
        (skillId) => skillId === acquisition.selectedSkillId,
      );
      return Object.freeze({
        skillId: acquisition.selectedSkillId,
        offerIndex: acquisition.offerIndex,
        acquiredWeekIndex: acquisition.weekIndex,
        equippedSlotIndex: equippedIndex < 0 ? null : (equippedIndex as EquippedSkillSlotIndex),
        presentation: getSkillPresentation(acquisition.selectedSkillId),
      });
    }),
  );
}

function getEquippedSkillSlot(
  career: WrCareerSurface,
  slotIndex: EquippedSkillSlotIndex,
): EquippedSkillSlotPresentation {
  const skillId = career.player.skillState.equippedSkillIds[slotIndex];
  return Object.freeze({
    slotIndex,
    skillId,
    presentation: skillId === null ? null : getSkillPresentation(skillId),
  });
}

export function getEquippedSkillSlots(career: WrCareerSurface): EquippedSkillSlotPresentations {
  return Object.freeze([
    getEquippedSkillSlot(career, 0),
    getEquippedSkillSlot(career, 1),
    getEquippedSkillSlot(career, 2),
    getEquippedSkillSlot(career, 3),
  ]);
}

export function getWeeklySkillEffectPresentation(
  result: WeeklyActionResult,
): WeeklySkillEffectPresentation {
  return Object.freeze({
    actionId: result.actionId,
    actionIndex: result.actionIndex,
    weekIndex: result.weekIndex,
    baseBodyDelta: result.baseBodyDelta,
    requestedBodyDelta: result.requestedBodyDelta,
    actualBodyDelta: result.actualBodyDelta,
    baseGpaDelta: result.baseGpaDelta,
    requestedGpaDelta: result.requestedGpaDelta,
    actualGpaDelta: result.actualGpaDelta,
    aggregates: result.skillEffectAggregates,
    appliedEffects: Object.freeze(
      result.appliedSkillEffects.map((evidence) =>
        Object.freeze({ evidence, skill: getSkillPresentation(evidence.skillId) }),
      ),
    ),
  });
}

export function getPassiveRecoverySkillEffectPresentation(
  evidence: PassiveBodyRecoveryEvidence | null,
): PassiveRecoverySkillEffectPresentation | null {
  if (evidence === null) {
    return null;
  }
  return Object.freeze({
    weekIndex: evidence.weekIndex,
    bodyBefore: evidence.bodyBefore,
    baseBodyDelta: evidence.baseBodyDelta,
    requestedBodyDelta: evidence.requestedBodyDelta,
    actualBodyDelta: evidence.actualBodyDelta,
    bodyAfter: evidence.bodyAfter,
    appliedEffects: Object.freeze(
      evidence.appliedSkillEffects.map((appliedEvidence) =>
        Object.freeze({
          evidence: appliedEvidence,
          skill: getSkillPresentation(appliedEvidence.skillId),
        }),
      ),
    ),
  });
}

/** Uses the authoritative core rule to preview the recovery that advancing this career would apply. */
export function getPendingPassiveRecoveryPresentation(
  career: WrCareerSurface,
): PassiveRecoverySkillEffectPresentation {
  const derived = derivePassiveBodyRecovery(
    career.player.state.body,
    developmentWeekConfig.passiveBodyRecovery,
    career.player.skillState,
    skillMechanicsDefinitions,
    career.weekIndex,
  );
  if (!derived.ok) {
    throw new Error(derived.reason);
  }
  const presentation = getPassiveRecoverySkillEffectPresentation(derived.evidence);
  if (presentation === null) {
    throw new Error('skill_registry.invalid_context');
  }
  return presentation;
}
