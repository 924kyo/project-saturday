import { describe, expect, it } from 'vitest';
import { chooseSkillBreakthrough } from '@project-saturday/game-core';

import { completeShippedGame } from '../test/game-fixture';

import {
  addDraftAction,
  advanceCareerWeek,
  canAddPersonalityTrait,
  commitCareerActionDraft,
  commitCareerProgramChoice,
  createCareerFromDraft,
  createDefaultCreationDraft,
  getAppearanceSummary,
  getArchetypeEmphasisAttributeIds,
  getAttributeProgressPresentation,
  getAttributeSummary,
  getTrainingProficiencyProgress,
  getTrainingProficiencySummary,
  moveDraftAction,
  removeDraftAction,
  resolveCareerNextAction,
  togglePersonalityTrait,
} from './career-ui';

function validDraft() {
  return {
    ...createDefaultCreationDraft(),
    displayName: 'Saturday WR',
    personalityTraitIds: ['personality_competitive', 'personality_leader'] as const,
  };
}

function choosingCareer() {
  const result = createCareerFromDraft(validDraft(), 'career-ui-test-seed');
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.career;
}

function createdCareer() {
  const choosing = choosingCareer();
  if (choosing.recruitingState.type !== 'CHOOSING') {
    throw new Error('Expected a recruiting shortlist.');
  }
  const committed = commitCareerProgramChoice(
    choosing,
    choosing.recruitingState.offers[0].programId,
  );
  if (!committed.ok) {
    throw new Error(committed.reason);
  }
  return committed.career;
}

describe('pure creation UI orchestration', () => {
  it('enforces exactly two distinct compatible traits', () => {
    expect(canAddPersonalityTrait([], 'personality_quiet')).toBe(true);
    expect(canAddPersonalityTrait(['personality_quiet'], 'personality_social')).toBe(false);
    expect(canAddPersonalityTrait(['personality_quiet'], 'personality_quiet')).toBe(true);
    expect(togglePersonalityTrait(['personality_quiet'], 'personality_social')).toEqual([
      'personality_quiet',
    ]);
    expect(togglePersonalityTrait(['personality_competitive'], 'personality_leader')).toEqual([
      'personality_competitive',
      'personality_leader',
    ]);
    expect(
      togglePersonalityTrait(
        ['personality_competitive', 'personality_leader'],
        'personality_leader',
      ),
    ).toEqual(['personality_competitive']);
  });

  it('returns focused validation failures before core creation', () => {
    expect(createCareerFromDraft(createDefaultCreationDraft(), 'invalid')).toEqual({
      issues: ['creation-ui.invalid-name', 'creation-ui.invalid-personalities'],
      ok: false,
    });
    expect(
      createCareerFromDraft(
        {
          ...validDraft(),
          heightCm: 220,
          personalityTraitIds: ['personality_quiet', 'personality_social'],
        },
        'invalid-pair',
      ),
    ).toEqual({
      issues: ['creation-ui.invalid-personalities', 'creation-ui.invalid-body'],
      ok: false,
    });
    expect(
      createCareerFromDraft(
        {
          ...validDraft(),
          personalityTraitIds: ['personality_leader', 'personality_leader'],
        },
        'duplicate-pair',
      ),
    ).toEqual({ issues: ['creation-ui.invalid-personalities'], ok: false });
  });

  it('creates a core-valid metric CareerRun with the supplied stable seed', () => {
    const result = createCareerFromDraft(validDraft(), 'stable-web-seed');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.career.careerSeed).toBe('stable-web-seed');
      expect(result.career.player.heightCm).toBe(183);
      expect(result.career.player.weightKg).toBe(86);
      expect(getAttributeSummary(result.career)).toHaveLength(16);
      expect(getAppearanceSummary(result.career.player.appearance)).toHaveLength(13);
      expect(result.career.revision).toBe(1);
      expect(result.career.rng.drawCount).toBe(0);
      expect(result.career.recruitingState.type).toBe('CHOOSING');
      if (result.career.recruitingState.type === 'CHOOSING') {
        expect(result.career.recruitingState.recruitAbilityScore).toBe(54);
        expect(result.career.recruitingState.backgroundModifier).toBe(12);
        expect(result.career.recruitingState.recruitScore).toBe(66);
        expect(result.career.recruitingState.recruitTierId).toBe('recruit_tier_national');
        expect(result.career.recruitingState.offers).toHaveLength(5);
        expect(
          new Set(result.career.recruitingState.offers.map(({ programId }) => programId)).size,
        ).toBe(5);
      }
    }
  });

  it('delegates offered program commitment and exact seeded room generation to core', () => {
    const choosing = choosingCareer();
    if (choosing.recruitingState.type !== 'CHOOSING') {
      throw new Error('Expected a recruiting shortlist.');
    }
    const selectedProgramId = choosing.recruitingState.offers[0].programId;
    const committed = commitCareerProgramChoice(choosing, selectedProgramId);
    expect(committed.ok).toBe(true);
    if (committed.ok) {
      expect(committed.career.programId).toBe(selectedProgramId);
      expect(committed.career.recruitingState.type).toBe('COMMITTED');
      expect(committed.career.programContext?.competitors).toHaveLength(7);
      expect(committed.career.programContext?.depthOrderIds).toHaveLength(8);
      expect(committed.career.rng.drawCount - choosing.rng.drawCount).toBe(35);
    }
  });
});

describe('pure weekly UI orchestration', () => {
  it('derives rating and proficiency progress from authoritative tuning', () => {
    expect(getAttributeProgressPresentation({ rating: 72, xp: 37 })).toEqual({
      currentXp: 37,
      nextRating: 73,
      progressPermille: 370,
      remainingXp: 63,
      requiredXp: 100,
    });
    expect(getAttributeProgressPresentation({ rating: 100, xp: 0 })).toEqual({
      currentXp: 100,
      nextRating: null,
      progressPermille: 1000,
      remainingXp: 0,
      requiredXp: 100,
    });
    expect(
      getTrainingProficiencyProgress('action_route_drills', 'proficiency_route_drills', 5),
    ).toEqual({
      actionId: 'action_route_drills',
      currentMultiplierPermille: 1140,
      currentThreshold: 5,
      level: 2,
      nextLevel: 3,
      nextMultiplierPermille: 1180,
      nextThreshold: 9,
      proficiencyId: 'proficiency_route_drills',
      progressPermille: 0,
      remainingUses: 4,
      uses: 5,
    });
    expect(
      getTrainingProficiencyProgress('action_route_drills', 'proficiency_route_drills', 20),
    ).toMatchObject({
      currentMultiplierPermille: 1230,
      level: 5,
      nextLevel: null,
      nextMultiplierPermille: null,
      nextThreshold: null,
      progressPermille: 1000,
      remainingUses: 0,
    });

    const career = createdCareer();
    expect(getArchetypeEmphasisAttributeIds(career)).toEqual([
      'attribute_speed',
      'attribute_burst',
    ]);
    expect(getTrainingProficiencySummary(career)).toHaveLength(7);
    expect(getTrainingProficiencySummary(career)[0]).toMatchObject({
      actionId: 'action_route_drills',
      level: 0,
      nextThreshold: 2,
      remainingUses: 2,
    });
  });

  it('preserves duplicate action IDs and ordered local draft edits', () => {
    let draft = addDraftAction([], 'action_route_drills');
    draft = addDraftAction(draft, 'action_route_drills');
    draft = addDraftAction(draft, 'action_recovery');
    expect(draft).toEqual(['action_route_drills', 'action_route_drills', 'action_recovery']);
    expect(addDraftAction(draft, 'action_study_hall')).toBe(draft);
    expect(moveDraftAction(draft, 2, 0)).toEqual([
      'action_recovery',
      'action_route_drills',
      'action_route_drills',
    ]);
    expect(removeDraftAction(draft, 1)).toEqual(['action_route_drills', 'action_recovery']);
  });

  it('delegates the complete phase sequence and shipped breakthrough catalogs to core', () => {
    const start = createdCareer();
    const committed = commitCareerActionDraft(start, [
      'action_route_drills',
      'action_route_drills',
      'action_recovery',
    ]);
    expect(committed.ok).toBe(true);
    if (!committed.ok) {
      return;
    }
    expect(committed.career.phase.type).toBe('RESOLVE_ACTIONS');
    let career = committed.career;
    for (let index = 0; index < 3; index += 1) {
      const resolved = resolveCareerNextAction(career);
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) {
        return;
      }
      career = resolved.career;
    }
    expect(career.phase.type).toBe('WEEK_END');
    expect(advanceCareerWeek(career).ok).toBe(false);
    career = completeShippedGame(career);
    expect(career.phase.type).toBe('POST_GAME');
    const advanced = advanceCareerWeek(career);
    expect(advanced.ok).toBe(true);
    if (advanced.ok) {
      expect(advanced.career.phase.type).toBe('PLAN_ACTIONS');
      expect(advanced.career.weekIndex).toBe(1);
      expect(advanced.career.player.skillState.breakthroughGauge.progress).toBeGreaterThan(0);
      expect(start.phase.type).toBe('PLAN_ACTIONS');
      expect(start.revision).toBe(2);
      let breakthrough = advanced.career;
      for (let week = 1; week < 13 && breakthrough.phase.type !== 'SKILL_BREAKTHROUGH'; week += 1) {
        const nextPlan = commitCareerActionDraft(breakthrough, [
          'action_route_drills',
          'action_route_drills',
          'action_recovery',
        ]);
        if (!nextPlan.ok) {
          throw new Error(nextPlan.reason);
        }
        breakthrough = nextPlan.career;
        for (let action = 0; action < 3; action += 1) {
          const nextAction = resolveCareerNextAction(breakthrough);
          if (!nextAction.ok) {
            throw new Error(nextAction.reason);
          }
          breakthrough = nextAction.career;
        }
        breakthrough = completeShippedGame(breakthrough);
        const nextWeek = advanceCareerWeek(breakthrough);
        if (!nextWeek.ok) {
          throw new Error(nextWeek.reason);
        }
        breakthrough = nextWeek.career;
      }
      expect(breakthrough.phase.type).toBe('SKILL_BREAKTHROUGH');
      if (breakthrough.phase.type !== 'SKILL_BREAKTHROUGH') {
        return;
      }

      const acquired = chooseSkillBreakthrough(
        breakthrough,
        breakthrough.phase.offer.offeredSkillIds[0],
      );
      expect(acquired.ok).toBe(true);
      if (!acquired.ok) {
        return;
      }
      const nextCommit = commitCareerActionDraft(acquired.career, [
        'action_route_drills',
        'action_route_drills',
        'action_route_drills',
      ]);
      expect(nextCommit.ok).toBe(true);
      if (!nextCommit.ok) {
        return;
      }

      // An equipped card requires the shipped registry even if its effects do not match this action.
      const resolvedWithEquippedSkill = resolveCareerNextAction(nextCommit.career);
      expect(resolvedWithEquippedSkill.ok).toBe(true);
      expect(acquired.career.phase.type).toBe('PLAN_ACTIONS');
    }
  });
});
