import { describe, expect, it } from 'vitest';
import { chooseSkillBreakthrough } from '@project-saturday/game-core';

import {
  addDraftAction,
  advanceCareerWeek,
  canAddPersonalityTrait,
  commitCareerActionDraft,
  createCareerFromDraft,
  createDefaultCreationDraft,
  getAppearanceSummary,
  getAttributeSummary,
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

function createdCareer() {
  const result = createCareerFromDraft(validDraft(), 'career-ui-test-seed');
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.career;
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
    }
  });
});

describe('pure weekly UI orchestration', () => {
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
    const advanced = advanceCareerWeek(career);
    expect(advanced.ok).toBe(true);
    if (advanced.ok) {
      expect(advanced.career.phase.type).toBe('SKILL_BREAKTHROUGH');
      expect(advanced.career.weekIndex).toBe(1);
      expect(start.phase.type).toBe('PLAN_ACTIONS');
      expect(start.revision).toBe(0);
      if (advanced.career.phase.type !== 'SKILL_BREAKTHROUGH') {
        return;
      }

      const acquired = chooseSkillBreakthrough(
        advanced.career,
        advanced.career.phase.offer.offeredSkillIds[0],
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
