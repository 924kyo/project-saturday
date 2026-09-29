import { describe, expect, it } from 'vitest';
import type {
  CareerRun,
  PassiveBodyRecoveryEvidence,
  SkillId,
  WeeklyActionId,
  WeeklyActionResult,
} from '@project-saturday/game-core';
import { derivePassiveBodyRecovery } from '@project-saturday/game-core';
import {
  developmentWeekConfig,
  skillMechanicsDefinitions,
} from '@project-saturday/game-content/content';

import {
  advanceCareerWeek,
  commitCareerActionDraft,
  commitCareerProgramChoice,
  createCareerFromDraft,
  createDefaultCreationDraft,
  resolveCareerNextAction,
} from './career-ui';
import {
  SKILL_CARD_PRESENTATIONS,
  SKILL_UI_CATALOG_FAILURE_REASON,
  chooseCareerSkillBreakthrough,
  getEquippedSkillSlots,
  getOwnedSkillInventory,
  getPendingPassiveRecoveryPresentation,
  getPassiveRecoverySkillEffectPresentation,
  getSkillPresentation,
  getWeeklySkillEffectPresentation,
  setCareerEquippedSkillSlot,
} from './skill-ui';
import { completeShippedGame } from '../test/game-fixture';

function createCareer(careerSeed = 'skill-ui-test-seed'): CareerRun {
  const result = createCareerFromDraft(
    {
      ...createDefaultCreationDraft(),
      displayName: 'Skill UI Test',
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
    },
    careerSeed,
  );
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  if (result.career.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected recruiting offers after career creation.');
  }
  const committed = commitCareerProgramChoice(
    result.career,
    result.career.recruitingState.offers[0].programId,
  );
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  return committed.career;
}

type BreakthroughCareer = CareerRun & {
  readonly phase: Extract<CareerRun['phase'], { readonly type: 'SKILL_BREAKTHROUGH' }>;
};

function createBreakthroughCareer(
  careerSeed?: string,
  plan: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId] = [
    'action_route_drills',
    'action_recovery',
    'action_study_hall',
  ],
): BreakthroughCareer {
  let career = createCareer(careerSeed);
  for (let week = 0; week < 13; week += 1) {
    const committed = commitCareerActionDraft(career, plan);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    career = committed.career;
    for (let index = 0; index < 3; index += 1) {
      const resolved = resolveCareerNextAction(career);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      career = resolved.career;
    }
    career = completeShippedGame(career);
    const advanced = advanceCareerWeek(career);
    if (!advanced.ok) {
      throw new Error(advanced.reason);
    }
    if (advanced.career.phase.type === 'SKILL_BREAKTHROUGH') {
      return advanced.career as BreakthroughCareer;
    }
    career = advanced.career;
  }
  throw new Error('Expected a deterministic gauge breakthrough fixture.');
}

function findBreakthroughOffering(
  skillId: SkillId,
  plan?: readonly [WeeklyActionId, WeeklyActionId, WeeklyActionId],
): BreakthroughCareer {
  for (let seedIndex = 0; seedIndex < 128; seedIndex += 1) {
    const career = createBreakthroughCareer(`skill-offer-search-${skillId}-${seedIndex}`, plan);
    if (career.phase.offer.offeredSkillIds.includes(skillId)) {
      return career;
    }
  }
  throw new Error(`Could not find a deterministic offer for ${skillId}.`);
}

function acquireFirstOffer(): { readonly before: BreakthroughCareer; readonly after: CareerRun } {
  const before = createBreakthroughCareer();
  const selectedSkillId = before.phase.offer.offeredSkillIds[0];
  const chosen = chooseCareerSkillBreakthrough(before, selectedSkillId);
  if (!chosen.ok) {
    throw new Error(chosen.reason);
  }
  return { before, after: chosen.career };
}

describe('pure skill command adapters', () => {
  it('preserves core choice results, failure reasons, and immutable input identity', () => {
    const breakthrough = createBreakthroughCareer();
    const originalSnapshot = structuredClone(breakthrough);
    const missing = chooseCareerSkillBreakthrough(breakthrough, 'skill_not_offered');
    expect(missing).toEqual({
      career: breakthrough,
      ok: false,
      reason: 'skill.selection_not_offered',
    });
    if (!missing.ok) {
      expect(missing.career).toBe(breakthrough);
    }

    const selectedSkillId = breakthrough.phase.offer.offeredSkillIds[1];
    const chosen = chooseCareerSkillBreakthrough(breakthrough, selectedSkillId);
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) {
      return;
    }
    expect(chosen.career.revision).toBe(breakthrough.revision + 1);
    expect(chosen.career.phase.type).toBe('PLAN_ACTIONS');
    expect(chosen.career.player.skillState.acquisitions.at(-1)?.selectedSkillId).toBe(
      selectedSkillId,
    );
    expect(chosen.career.player.skillState.equippedSkillIds).toEqual([
      selectedSkillId,
      null,
      null,
      null,
    ]);
    expect(breakthrough).toEqual(originalSnapshot);
  });

  it('preserves exact slot command semantics and keeps failures mutation-free', () => {
    const { after } = acquireFirstOffer();
    const skillId = after.player.skillState.acquisitions[0]?.selectedSkillId;
    if (skillId === undefined) {
      throw new Error('Missing acquired skill fixture.');
    }

    const cleared = setCareerEquippedSkillSlot(after, 0, null);
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) {
      return;
    }
    expect(cleared.career.player.skillState.equippedSkillIds).toEqual([null, null, null, null]);
    expect(after.player.skillState.equippedSkillIds[0]).toBe(skillId);

    const moved = setCareerEquippedSkillSlot(cleared.career, 2, skillId);
    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      return;
    }
    expect(moved.career.player.skillState.equippedSkillIds).toEqual([null, null, skillId, null]);

    const noChange = setCareerEquippedSkillSlot(moved.career, 2, skillId);
    expect(noChange.ok).toBe(false);
    if (!noChange.ok) {
      expect(noChange.reason).toBe('skill.no_change');
      expect(noChange.career).toBe(moved.career);
    }
    const invalidSlot = setCareerEquippedSkillSlot(moved.career, 4, null);
    expect(invalidSlot.ok).toBe(false);
    if (!invalidSlot.ok) {
      expect(invalidSlot.reason).toBe('skill.invalid_slot_index');
      expect(invalidSlot.career).toBe(moved.career);
    }
  });
});

describe('pure skill presentation projections', () => {
  it('provides a complete frozen catalog and fails closed for absent stable IDs', () => {
    expect(SKILL_CARD_PRESENTATIONS).toHaveLength(40);
    expect(new Set(SKILL_CARD_PRESENTATIONS.map(({ id }) => id)).size).toBe(40);
    expect(Object.isFrozen(SKILL_CARD_PRESENTATIONS)).toBe(true);
    const route = getSkillPresentation('skill_route_notebook_c');
    expect(route).toEqual({
      descriptionKey: 'skills.routeNotebookC.description',
      familyId: 'skill_family_development',
      familyNameKey: 'skills.family.development',
      gradeId: 'skill_grade_c',
      gradeNameKey: 'skills.grade.c',
      id: 'skill_route_notebook_c',
      isTradeoff: false,
      nameKey: 'skills.routeNotebookC.name',
    });
    expect(Object.isFrozen(route)).toBe(true);
    expect(() => getSkillPresentation('skill_absent_from_catalog' as SkillId)).toThrow(
      SKILL_UI_CATALOG_FAILURE_REASON,
    );
  });

  it('derives owned inventory from acquisitions and always returns exactly four slots', () => {
    const { after, before } = acquireFirstOffer();
    const selectedSkillId = after.player.skillState.acquisitions[0]?.selectedSkillId;
    if (selectedSkillId === undefined) {
      throw new Error('Missing acquired skill fixture.');
    }
    expect(getOwnedSkillInventory(after)).toEqual([
      {
        acquiredWeekIndex: before.phase.offer.weekIndex,
        equippedSlotIndex: 0,
        offerIndex: 0,
        presentation: getSkillPresentation(selectedSkillId),
        skillId: selectedSkillId,
      },
    ]);
    const slots = getEquippedSkillSlots(after);
    expect(slots).toHaveLength(4);
    expect(slots.map(({ slotIndex }) => slotIndex)).toEqual([0, 1, 2, 3]);
    expect(slots[0]).toEqual({
      presentation: getSkillPresentation(selectedSkillId),
      skillId: selectedSkillId,
      slotIndex: 0,
    });
    expect(
      slots
        .slice(1)
        .every(({ presentation, skillId }) => presentation === null && skillId === null),
    ).toBe(true);

    const cleared = setCareerEquippedSkillSlot(after, 0, null);
    if (!cleared.ok) {
      throw new Error(cleared.reason);
    }
    expect(getOwnedSkillInventory(cleared.career)[0]?.equippedSlotIndex).toBeNull();
    expect(getEquippedSkillSlots(cleared.career).map(({ skillId }) => skillId)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('projects persisted action traces and aggregates without recalculating them', () => {
    const trace = Object.freeze({
      effectIndex: 0,
      multiplierPermille: 1150,
      skillId: 'skill_route_notebook_c',
      slotIndex: 0,
      type: 'action_xp_multiplier',
    } as const);
    const aggregates = Object.freeze({
      bodyCostMultiplierPermille: 1000,
      bodyDeltaFlat: 0,
      gpaDeltaMilli: 0,
      xpMultiplierPermille: 1150,
    });
    const result: WeeklyActionResult = {
      actionId: 'action_route_drills',
      actionIndex: 0,
      weekIndex: 2,
      effectIds: ['effect_attribute_progress', 'effect_body_change'],
      bodyBefore: 73,
      baseBodyDelta: -8,
      requestedBodyDelta: -8,
      actualBodyDelta: -8,
      bodyAfter: 65,
      bodyXpEfficiencyPermille: 892,
      gpaBefore: 3.1,
      baseGpaDelta: 0,
      requestedGpaDelta: 0,
      actualGpaDelta: 0,
      gpaAfter: 3.1,
      attributeXp: [],
      proficiency: null,
      skillEffectAggregates: aggregates,
      appliedSkillEffects: [trace],
      practiceImpact: 0,
    };

    const projected = getWeeklySkillEffectPresentation(result);
    expect(projected).toMatchObject({
      actionId: 'action_route_drills',
      actionIndex: 0,
      weekIndex: 2,
      baseBodyDelta: -8,
      requestedBodyDelta: -8,
      actualBodyDelta: -8,
      baseGpaDelta: 0,
      requestedGpaDelta: 0,
      actualGpaDelta: 0,
    });
    expect(projected.aggregates).toBe(aggregates);
    expect(projected.appliedEffects).toEqual([
      { evidence: trace, skill: getSkillPresentation('skill_route_notebook_c') },
    ]);
    expect(projected.appliedEffects[0]?.evidence).toBe(trace);
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.isFrozen(projected.appliedEffects)).toBe(true);
  });

  it('projects persisted passive recovery evidence and handles its explicit null state', () => {
    const trace = Object.freeze({
      delta: -6,
      effectIndex: 1,
      skillId: 'skill_compressed_recovery_s',
      slotIndex: 2,
      type: 'passive_body_recovery_flat',
    } as const);
    const evidence: PassiveBodyRecoveryEvidence = {
      weekIndex: 5,
      bodyBefore: 70,
      baseBodyDelta: 10,
      requestedBodyDelta: 4,
      actualBodyDelta: 4,
      bodyAfter: 74,
      appliedSkillEffects: [trace],
    };

    expect(getPassiveRecoverySkillEffectPresentation(null)).toBeNull();
    const projected = getPassiveRecoverySkillEffectPresentation(evidence);
    expect(projected).not.toBeNull();
    expect(projected).toMatchObject({
      weekIndex: 5,
      bodyBefore: 70,
      baseBodyDelta: 10,
      requestedBodyDelta: 4,
      actualBodyDelta: 4,
      bodyAfter: 74,
    });
    expect(projected?.appliedEffects).toEqual([
      { evidence: trace, skill: getSkillPresentation('skill_compressed_recovery_s') },
    ]);
    expect(projected?.appliedEffects[0]?.evidence).toBe(trace);
  });

  it('projects the core-derived pending passive recovery without duplicating its rules', () => {
    const breakthrough = findBreakthroughOffering('skill_compressed_recovery_s', [
      'action_recovery',
      'action_weight_room',
      'action_weight_room',
    ]);
    expect(breakthrough.phase.offer.offeredSkillIds).toContain('skill_compressed_recovery_s');
    const chosen = chooseCareerSkillBreakthrough(breakthrough, 'skill_compressed_recovery_s');
    if (!chosen.ok) {
      throw new Error(chosen.reason);
    }
    const committed = commitCareerActionDraft(chosen.career, [
      'action_route_drills',
      'action_recovery',
      'action_study_hall',
    ]);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    let career = committed.career;
    for (let index = 0; index < 3; index += 1) {
      const resolved = resolveCareerNextAction(career);
      if (!resolved.ok) {
        throw new Error(resolved.reason);
      }
      career = resolved.career;
    }
    expect(career.phase.type).toBe('WEEK_END');
    const authoritative = derivePassiveBodyRecovery(
      career.player.state.body,
      developmentWeekConfig.passiveBodyRecovery,
      career.player.skillState,
      skillMechanicsDefinitions,
      career.weekIndex,
    );
    expect(authoritative.ok).toBe(true);
    if (!authoritative.ok) {
      return;
    }

    const projected = getPendingPassiveRecoveryPresentation(career);
    expect(projected).toEqual(getPassiveRecoverySkillEffectPresentation(authoritative.evidence));
    expect(projected.weekIndex).toBe(career.weekIndex);
    expect(projected.requestedBodyDelta).toBe(4);
    expect(projected.appliedEffects).toHaveLength(1);
    expect(projected.appliedEffects[0]?.evidence).toMatchObject({
      delta: -6,
      skillId: 'skill_compressed_recovery_s',
      type: 'passive_body_recovery_flat',
    });
  });
});
