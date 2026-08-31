import {
  SKILL_BEHAVIOR_TAG_IDS as CORE_SKILL_BEHAVIOR_TAG_IDS,
  SKILL_EFFECT_CONDITION_TYPES as CORE_SKILL_EFFECT_CONDITION_TYPES,
  SKILL_EFFECT_TYPES as CORE_SKILL_EFFECT_TYPES,
  SKILL_FAMILY_IDS as CORE_SKILL_FAMILY_IDS,
  SKILL_GAME_HOOK_IDS as CORE_SKILL_GAME_HOOK_IDS,
  SKILL_GRADE_IDS as CORE_SKILL_GRADE_IDS,
  isSkillId as isCoreSkillId,
  isSkillMechanicsDefinitionCatalog as isCoreSkillMechanicsDefinitionCatalog,
  isWeeklyActionTagId as isCoreWeeklyActionTagId,
  type SkillMechanicsDefinition as CoreSkillMechanicsDefinition,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  contentManifest,
  skillMechanicsDefinitions,
  skills,
  weeklyActions,
} from '../content/index.js';
import { localeMessages, type SupportedLocale } from '../locales/index.js';
import { CONTENT_COMPATIBILITY_VERSION } from '../schema/content.js';
import {
  SKILL_BEHAVIOR_TAG_IDS,
  SKILL_EFFECT_CONDITION_TYPES,
  SKILL_EFFECT_TYPES,
  SKILL_FAMILY_IDS,
  SKILL_GAME_HOOK_IDS,
  SKILL_GRADE_BASE_OFFER_WEIGHTS,
  SKILL_GRADE_IDS,
  SKILL_IDS,
  SKILL_TRADEOFF_IDS,
  isMechanicallyInferredTradeoff,
  skillMechanicsDefinitionSchema,
} from '../schema/skills.js';
import { WEEKLY_ACTION_TAG_IDS } from '../schema/weekly-actions.js';
import { validateContent } from './content.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type MutableResources = Record<SupportedLocale, Record<string, unknown>>;

function cloneResources(): MutableResources {
  return {
    'en-US': { ...localeMessages['en-US'] },
    'ko-KR': { ...localeMessages['ko-KR'] },
  };
}

function expectIssues(result: ValidationResult): readonly ValidationIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected skill content validation to fail.');
  }
  return result.issues;
}

function manifestWithSkill(skillIndex: number, skill: unknown) {
  const replacements: unknown[] = [...skills];
  replacements[skillIndex] = skill;
  return { ...contentManifest, skills: replacements };
}

function skillById(id: (typeof SKILL_IDS)[number]) {
  const skill = skills.find((candidate) => candidate.id === id);
  if (skill === undefined) {
    throw new Error(`Expected shipped skill ${id}.`);
  }
  return skill;
}

describe('M2 skill content', () => {
  it('ships schema v2 with compatibility v1 and exactly 18 cards in stable order', () => {
    expect(CONTENT_COMPATIBILITY_VERSION).toBe(1);
    expect(contentManifest.contentVersion).toBe(1);
    expect(contentManifest.schemaVersion).toBe(2);
    expect(contentManifest.skills).toBe(skills);
    expect(skills.map(({ id }) => id)).toEqual(SKILL_IDS);
    expect(skills).toHaveLength(18);
    expect(validateContent({ localeResources: localeMessages, manifest: contentManifest })).toEqual(
      { issues: [], ok: true },
    );
  });

  it('keeps the exact family split, grade assignments, and base offer weights', () => {
    expect(
      Object.fromEntries(
        SKILL_FAMILY_IDS.map((familyId) => [
          familyId,
          skills.filter((skill) => skill.familyId === familyId).length,
        ]),
      ),
    ).toEqual({
      skill_family_body: 4,
      skill_family_development: 4,
      skill_family_game_day: 3,
      skill_family_life: 3,
      skill_family_mindset: 4,
    });
    expect(new Set(skills.map(({ gradeId }) => gradeId))).toEqual(new Set(SKILL_GRADE_IDS));
    expect(
      skills.map(({ baseOfferWeight, familyId, gradeId, id }) => [
        id,
        familyId,
        gradeId,
        baseOfferWeight,
      ]),
    ).toEqual([
      ['skill_route_notebook_c', 'skill_family_development', 'skill_grade_c', 100],
      ['skill_first_step_lab_b', 'skill_family_development', 'skill_grade_b', 70],
      ['skill_secure_hands_routine_b', 'skill_family_development', 'skill_grade_b', 70],
      ['skill_full_route_circuit_a', 'skill_family_development', 'skill_grade_a', 35],
      ['skill_recovery_window_c', 'skill_family_body', 'skill_grade_c', 100],
      ['skill_late_set_engine_b', 'skill_family_body', 'skill_grade_b', 70],
      ['skill_empty_tank_reps_a', 'skill_family_body', 'skill_grade_a', 35],
      ['skill_compressed_recovery_s', 'skill_family_body', 'skill_grade_s', 10],
      ['skill_one_more_rep_c', 'skill_family_mindset', 'skill_grade_c', 100],
      ['skill_broad_horizon_b', 'skill_family_mindset', 'skill_grade_b', 70],
      ['skill_edge_of_focus_a', 'skill_family_mindset', 'skill_grade_a', 35],
      ['skill_reset_ritual_b', 'skill_family_mindset', 'skill_grade_b', 70],
      ['skill_coverage_ledger_b', 'skill_family_game_day', 'skill_grade_b', 70],
      ['skill_high_point_wager_a', 'skill_family_game_day', 'skill_grade_a', 35],
      ['skill_open_field_dare_s', 'skill_family_game_day', 'skill_grade_s', 10],
      ['skill_study_buffer_c', 'skill_family_life', 'skill_grade_c', 100],
      ['skill_balanced_calendar_b', 'skill_family_life', 'skill_grade_b', 70],
      ['skill_two_track_week_a', 'skill_family_life', 'skill_grade_a', 35],
    ]);
    for (const skill of skills) {
      expect(skill.baseOfferWeight, skill.id).toBe(SKILL_GRADE_BASE_OFFER_WEIGHTS[skill.gradeId]);
      expect(skill.eligibility.positionIds, skill.id).toEqual(['position_wr']);
    }
  });

  it('uses grade-proportional behavior bonuses without collapsing rarity ratios', () => {
    const bonusByGrade = {
      skill_grade_a: 7,
      skill_grade_b: 14,
      skill_grade_c: 20,
      skill_grade_s: 2,
    } as const;
    for (const skill of skills) {
      expect(skill.behaviorWeightRules).toHaveLength(1);
      expect(skill.behaviorWeightRules[0]?.weightBonus, skill.id).toBe(bonusByGrade[skill.gradeId]);
    }

    for (const occurrenceCount of [1, 6]) {
      const scaledWeights = SKILL_GRADE_IDS.map((gradeId) => {
        const base = SKILL_GRADE_BASE_OFFER_WEIGHTS[gradeId];
        return (base + bonusByGrade[gradeId] * occurrenceCount) / base;
      });
      expect(new Set(scaledWeights)).toEqual(new Set([1 + occurrenceCount * 0.2]));
      expect(
        SKILL_GRADE_BASE_OFFER_WEIGHTS.skill_grade_s + bonusByGrade.skill_grade_s * occurrenceCount,
      ).toBeGreaterThan(SKILL_GRADE_BASE_OFFER_WEIGHTS.skill_grade_s);
    }
  });

  it('keeps all affinities reachable from authored action tags or three derived behaviors', () => {
    const reachableTags = new Set([
      ...weeklyActions.flatMap(({ tags }) => tags),
      ...SKILL_BEHAVIOR_TAG_IDS,
    ]);
    expect(new Set(weeklyActions.flatMap(({ tags }) => tags))).toEqual(
      new Set(WEEKLY_ACTION_TAG_IDS),
    );
    for (const skill of skills) {
      for (const rule of skill.behaviorWeightRules) {
        expect(reachableTags.has(rule.affinityTagId), skill.id).toBe(true);
      }
    }
  });

  it('preserves the two corrected sequencing/low-Body mechanics and generic game hooks', () => {
    expect(skillById('skill_edge_of_focus_a').effects).toEqual([
      {
        condition: { body: 40, type: 'body_at_most' },
        multiplierPermille: 1250,
        scope: { actionTagIds: ['action_family_training'], type: 'action_tags' },
        type: 'action_xp_multiplier',
      },
      {
        condition: { body: 40, type: 'body_at_most' },
        multiplierPermille: 1250,
        scope: { actionTagIds: ['action_family_training'], type: 'action_tags' },
        type: 'action_body_cost_multiplier',
      },
    ]);
    expect(skillById('skill_reset_ritual_b').effects).toEqual([
      {
        condition: { actionId: 'action_recovery', type: 'previous_action_id' },
        multiplierPermille: 1150,
        scope: { actionTagIds: ['action_family_training'], type: 'action_tags' },
        type: 'action_xp_multiplier',
      },
    ]);
    expect(skillById('skill_coverage_ledger_b').effects).toContainEqual({
      hookId: 'game_hook_coverage_clue_bonus',
      type: 'game_hook',
      valueMilli: 1000,
    });
    expect(skillById('skill_high_point_wager_a').effects).toEqual(
      expect.arrayContaining([
        {
          hookId: 'game_hook_contested_catch_success_bonus',
          type: 'game_hook',
          valueMilli: 80,
        },
        {
          hookId: 'game_hook_tipped_turnover_risk_bonus',
          type: 'game_hook',
          valueMilli: 50,
        },
      ]),
    );
    expect(skillById('skill_open_field_dare_s').effects).toEqual(
      expect.arrayContaining([
        { hookId: 'game_hook_yac_yardage_multiplier', type: 'game_hook', valueMilli: 1200 },
        { hookId: 'game_hook_fumble_risk_multiplier', type: 'game_hook', valueMilli: 1250 },
      ]),
    );
  });

  it('identifies exactly nine mechanically inferred tradeoffs', () => {
    const explicitTradeoffIds = skills.filter(({ isTradeoff }) => isTradeoff).map(({ id }) => id);
    const inferredTradeoffIds = skills
      .filter(({ effects }) => isMechanicallyInferredTradeoff(effects))
      .map(({ id }) => id);
    expect(explicitTradeoffIds).toEqual(SKILL_TRADEOFF_IDS);
    expect(inferredTradeoffIds).toEqual(SKILL_TRADEOFF_IDS);
    expect(explicitTradeoffIds).toHaveLength(9);
  });

  it('projects strict display-free definitions aligned with the public game-core contract', () => {
    const coreDefinitions: readonly CoreSkillMechanicsDefinition[] = skillMechanicsDefinitions;
    expect(isCoreSkillMechanicsDefinitionCatalog(coreDefinitions)).toBe(true);
    expect(coreDefinitions.map(({ id }) => id)).toEqual(SKILL_IDS);
    expect(coreDefinitions.every(({ id }) => isCoreSkillId(id))).toBe(true);
    expect(
      coreDefinitions.every(
        (definition) => skillMechanicsDefinitionSchema.safeParse(definition).success,
      ),
    ).toBe(true);
    for (const definition of coreDefinitions) {
      expect(Object.keys(definition).sort()).toEqual([
        'baseOfferWeight',
        'behaviorWeightRules',
        'effects',
        'eligibility',
        'familyId',
        'gradeId',
        'id',
      ]);
    }
    expect(SKILL_GRADE_IDS).toEqual(CORE_SKILL_GRADE_IDS);
    expect(SKILL_FAMILY_IDS).toEqual(CORE_SKILL_FAMILY_IDS);
    expect(SKILL_EFFECT_TYPES).toEqual(CORE_SKILL_EFFECT_TYPES);
    expect(SKILL_EFFECT_CONDITION_TYPES).toEqual(CORE_SKILL_EFFECT_CONDITION_TYPES);
    expect(SKILL_GAME_HOOK_IDS).toEqual(CORE_SKILL_GAME_HOOK_IDS);
    expect(SKILL_BEHAVIOR_TAG_IDS).toEqual(CORE_SKILL_BEHAVIOR_TAG_IDS);
    expect(WEEKLY_ACTION_TAG_IDS.every((tagId) => isCoreWeeklyActionTagId(tagId))).toBe(true);
  });

  it('rejects unsupported IDs, inert parameters, malformed scopes, and false tradeoff metadata', () => {
    const routeNotebook = skillById('skill_route_notebook_c');
    const coverageLedger = skillById('skill_coverage_ledger_b');
    const broadHorizon = skillById('skill_broad_horizon_b');
    const invalidSkills: readonly [number, unknown][] = [
      [0, { ...routeNotebook, id: 'skill_grade_c' }],
      [0, { ...routeNotebook, id: 'skill_family_body' }],
      [0, { ...routeNotebook, surpriseCopy: 'inline' }],
      [0, { ...routeNotebook, baseOfferWeight: 99 }],
      [0, { ...routeNotebook, familyId: 'skill_family_body', familyNameKey: 'skills.family.body' }],
      [
        0,
        {
          ...routeNotebook,
          effects: [{ ...routeNotebook.effects[0], multiplierPermille: 1000 }],
        },
      ],
      [
        0,
        {
          ...routeNotebook,
          effects: [
            {
              ...routeNotebook.effects[0],
              scope: { actionTagIds: ['action_route_drills'], type: 'action_tags' },
            },
          ],
        },
      ],
      [
        0,
        {
          ...routeNotebook,
          effects: [
            {
              ...routeNotebook.effects[0],
              scope: {
                actionIds: ['action_speed_work', 'action_route_drills'],
                type: 'action_ids',
              },
            },
          ],
        },
      ],
      [
        9,
        {
          ...broadHorizon,
          effects: [
            {
              ...broadHorizon.effects[0],
              condition: { minimumCount: 1, type: 'plan_distinct_action_count_at_least' },
            },
            broadHorizon.effects[1],
          ],
        },
      ],
      [
        12,
        {
          ...coverageLedger,
          effects: coverageLedger.effects.map((effect) =>
            effect.type === 'game_hook' ? { ...effect, valueMilli: 999 } : effect,
          ),
        },
      ],
      [1, { ...skillById('skill_first_step_lab_b'), isTradeoff: false }],
    ];

    for (const [skillIndex, invalidSkill] of invalidSkills) {
      expect(
        expectIssues(
          validateContent({
            localeResources: localeMessages,
            manifest: manifestWithSkill(skillIndex, invalidSkill),
          }),
        ),
      ).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: expect.stringMatching(/^manifest\.skills\./u),
        }),
      );
    }
  });

  it('rejects unreachable behavior/action tags and incomplete bilingual or ICU copy', () => {
    const routeAction = weeklyActions[0];
    if (routeAction === undefined) {
      throw new Error('Expected Route Drills content.');
    }
    const actionsWithoutRouteFocus = [
      { ...routeAction, tags: ['action_family_training', 'action_scope_wr'] },
      ...weeklyActions.slice(1),
    ];
    expect(
      expectIssues(
        validateContent({
          localeResources: localeMessages,
          manifest: { ...contentManifest, weeklyActions: actionsWithoutRouteFocus },
        }),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-reference',
        contentId: 'skill_route_notebook_c',
        path: 'manifest.skills.0.behaviorWeightRules.0.affinityTagId',
      }),
    );

    const missingResources = cloneResources();
    delete missingResources['en-US']['skills.edgeOfFocusA.description'];
    expect(
      expectIssues(
        validateContent({ localeResources: missingResources, manifest: contentManifest }),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        contentId: 'skill_edge_of_focus_a',
        locale: 'en-US',
        messageKey: 'skills.edgeOfFocusA.description',
      }),
    );

    const invalidIcuResources = cloneResources();
    invalidIcuResources['ko-KR']['skills.resetRitualB.description'] = '{count';
    expect(
      expectIssues(
        validateContent({ localeResources: invalidIcuResources, manifest: contentManifest }),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-icu-message',
        locale: 'ko-KR',
        messageKey: 'skills.resetRitualB.description',
      }),
    );
  });
});
