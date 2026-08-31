import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import type { CareerRun } from '../player/types.js';
import { validateCareerRun } from '../player/validation.js';
import { isSkillId, type SkillId } from './ids.js';
import { EQUIPPED_SKILL_SLOT_COUNT } from './types.js';

export const SKILL_COMMAND_FAILURE_REASONS = Object.freeze([
  'skill.invalid_career',
  'skill.invalid_phase',
  'skill.invalid_skill_id',
  'skill.selection_not_offered',
  'skill.invalid_slot_index',
  'skill.skill_not_owned',
  'skill.duplicate_equipped',
  'skill.no_change',
  'skill.revision_exhausted',
  'skill.internal_invariant_failure',
] as const);

export type SkillCommandFailureReason = (typeof SKILL_COMMAND_FAILURE_REASONS)[number];

export type SkillCommandResult =
  | { readonly ok: true; readonly career: CareerRun }
  | {
      readonly ok: false;
      readonly career: CareerRun;
      readonly reason: SkillCommandFailureReason;
    };

function failure(career: CareerRun, reason: SkillCommandFailureReason): SkillCommandResult {
  return Object.freeze({ ok: false, career, reason });
}

function success(previousCareer: CareerRun, nextCareer: CareerRun): SkillCommandResult {
  if (!validateCareerRun(nextCareer).ok) {
    return failure(previousCareer, 'skill.internal_invariant_failure');
  }
  return deepFreeze({ ok: true, career: nextCareer });
}

function canIncrementRevision(career: CareerRun): boolean {
  return career.revision < Number.MAX_SAFE_INTEGER;
}

export function chooseSkillBreakthrough(
  career: CareerRun,
  selectedSkillId: SkillId,
): SkillCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'skill.invalid_career');
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'skill.revision_exhausted');
  }
  if (career.phase.type !== 'SKILL_BREAKTHROUGH') {
    return failure(career, 'skill.invalid_phase');
  }
  if (!isSkillId(selectedSkillId)) {
    return failure(career, 'skill.invalid_skill_id');
  }
  if (!career.phase.offer.offeredSkillIds.some((skillId) => skillId === selectedSkillId)) {
    return failure(career, 'skill.selection_not_offered');
  }

  const ownedSkillIds = new Set(
    career.player.skillState.acquisitions.map(({ selectedSkillId: ownedId }) => ownedId),
  );
  if (ownedSkillIds.has(selectedSkillId)) {
    return failure(career, 'skill.internal_invariant_failure');
  }

  const cloned = cloneSerializable(career);
  const equippedSkillIds = [...cloned.player.skillState.equippedSkillIds] as [
    SkillId | null,
    SkillId | null,
    SkillId | null,
    SkillId | null,
  ];
  const firstOpenSlot = equippedSkillIds.findIndex((skillId) => skillId === null);
  if (firstOpenSlot >= 0) {
    equippedSkillIds[firstOpenSlot] = selectedSkillId;
  }
  const offer = cloneSerializable(career.phase.offer);
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    phase: { type: 'PLAN_ACTIONS' },
    player: {
      ...cloned.player,
      skillState: {
        acquisitions: [...cloned.player.skillState.acquisitions, { ...offer, selectedSkillId }],
        equippedSkillIds,
      },
    },
  };
  return success(career, nextCareer);
}

export function setEquippedSkillSlot(
  career: CareerRun,
  slotIndex: number,
  skillId: SkillId | null,
): SkillCommandResult {
  if (!validateCareerRun(career).ok) {
    return failure(career, 'skill.invalid_career');
  }
  if (career.phase.type !== 'PLAN_ACTIONS') {
    return failure(career, 'skill.invalid_phase');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= EQUIPPED_SKILL_SLOT_COUNT) {
    return failure(career, 'skill.invalid_slot_index');
  }
  if (skillId !== null && !isSkillId(skillId)) {
    return failure(career, 'skill.invalid_skill_id');
  }

  const currentSkillId = career.player.skillState.equippedSkillIds[slotIndex];
  if (currentSkillId === skillId) {
    return failure(career, 'skill.no_change');
  }
  if (skillId !== null) {
    const ownedSkillIds = new Set(
      career.player.skillState.acquisitions.map(({ selectedSkillId }) => selectedSkillId),
    );
    if (!ownedSkillIds.has(skillId)) {
      return failure(career, 'skill.skill_not_owned');
    }
    if (
      career.player.skillState.equippedSkillIds.some(
        (equippedSkillId, index) => index !== slotIndex && equippedSkillId === skillId,
      )
    ) {
      return failure(career, 'skill.duplicate_equipped');
    }
  }
  if (!canIncrementRevision(career)) {
    return failure(career, 'skill.revision_exhausted');
  }

  const cloned = cloneSerializable(career);
  const equippedSkillIds = [...cloned.player.skillState.equippedSkillIds] as [
    SkillId | null,
    SkillId | null,
    SkillId | null,
    SkillId | null,
  ];
  equippedSkillIds[slotIndex] = skillId;
  const nextCareer: CareerRun = {
    ...cloned,
    revision: career.revision + 1,
    player: {
      ...cloned.player,
      skillState: {
        ...cloned.player.skillState,
        equippedSkillIds,
      },
    },
  };
  return success(career, nextCareer);
}
