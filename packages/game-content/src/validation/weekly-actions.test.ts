import {
  PASSIVE_BODY_RECOVERY_BOUNDS as CORE_PASSIVE_BODY_RECOVERY_BOUNDS,
  PLAYER_ATTRIBUTE_IDS as CORE_PLAYER_ATTRIBUTE_IDS,
  POSITION_WR_ID as CORE_POSITION_WR_ID,
  TRAINING_PROFICIENCY_IDS as CORE_TRAINING_PROFICIENCY_IDS,
  WEEKLY_ACTION_IDS as CORE_WEEKLY_ACTION_IDS,
  WEEKLY_ACTION_PROFICIENCY_IDS as CORE_WEEKLY_ACTION_PROFICIENCY_IDS,
  isDevelopmentWeekConfig as isCoreDevelopmentWeekConfig,
  isWeeklyActionDefinition as isCoreWeeklyActionDefinition,
  type DevelopmentWeekConfig as CoreDevelopmentWeekConfig,
  type WeeklyActionDefinition as CoreWeeklyActionDefinition,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  contentManifest,
  developmentWeekConfig,
  getAvailableWeeklyActionEntries,
  weeklyActionDefinitions,
  weeklyActions,
} from '../content/index.js';
import { localeMessages, type SupportedLocale } from '../locales/index.js';
import { PLAYER_ATTRIBUTE_IDS } from '../schema/creation.js';
import {
  TRAINING_PROFICIENCY_IDS,
  WEEKLY_ACTION_IDS,
  WEEKLY_ACTION_POSITION_IDS,
  WEEKLY_ACTION_PROFICIENCY_IDS,
} from '../schema/weekly-actions.js';
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
    throw new Error('Expected weekly action content validation to fail.');
  }
  return result.issues;
}

function manifestWithAction(actionIndex: number, action: unknown) {
  const actions: unknown[] = [...weeklyActions];
  actions[actionIndex] = action;
  return { ...contentManifest, weeklyActions: actions };
}

describe('weekly action content', () => {
  it('ships exactly nine actions in stable contract order with conservative M1 tuning', () => {
    expect(weeklyActions.map(({ id }) => id)).toEqual(WEEKLY_ACTION_IDS);
    expect(weeklyActions).toEqual([
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
    ]);
    expect(validateContent({ localeResources: localeMessages, manifest: contentManifest })).toEqual(
      {
        issues: [],
        ok: true,
      },
    );
  });

  it('keeps action, proficiency, and attribute ID contracts aligned with game-core', () => {
    const coreActions: readonly CoreWeeklyActionDefinition[] = weeklyActionDefinitions;
    expect(coreActions).toHaveLength(9);
    expect(coreActions.map(({ id }) => id)).toEqual(weeklyActions.map(({ id }) => id));
    expect(coreActions.every((action) => isCoreWeeklyActionDefinition(action))).toBe(true);
    expect(WEEKLY_ACTION_IDS).toEqual(CORE_WEEKLY_ACTION_IDS);
    expect(TRAINING_PROFICIENCY_IDS).toEqual(CORE_TRAINING_PROFICIENCY_IDS);
    expect(PLAYER_ATTRIBUTE_IDS).toEqual(CORE_PLAYER_ATTRIBUTE_IDS);
    expect(WEEKLY_ACTION_POSITION_IDS).toEqual([CORE_POSITION_WR_ID]);
    expect(WEEKLY_ACTION_PROFICIENCY_IDS).toEqual(CORE_WEEKLY_ACTION_PROFICIENCY_IDS);
  });

  it('selects all WR-eligible actions in authored order and pairs definitions by stable ID', () => {
    const entries = getAvailableWeeklyActionEntries('position_wr');

    expect(entries.map(({ presentation }) => presentation.id)).toEqual(WEEKLY_ACTION_IDS);
    expect(entries.map(({ definition }) => definition.id)).toEqual(WEEKLY_ACTION_IDS);
    expect(entries).toHaveLength(9);
    for (const { definition, presentation } of entries) {
      expect(definition.id).toBe(presentation.id);
      expect(definition).toEqual({
        attributeXp: presentation.attributeXp,
        bodyDelta: presentation.bodyDelta,
        gpaDelta: presentation.gpaDelta,
        id: presentation.id,
        proficiencyId: presentation.proficiencyId,
        tagIds: presentation.tags,
      });
      expect(Object.keys(definition).sort()).toEqual([
        'attributeXp',
        'bodyDelta',
        'gpaDelta',
        'id',
        'proficiencyId',
        'tagIds',
      ]);
      expect(
        presentation.requirements.positionIds.length === 0 ||
          presentation.requirements.positionIds.includes('position_wr'),
      ).toBe(true);
    }
    expect(entries[0]?.presentation).not.toBe(weeklyActions[0]);
    expect(entries[0]?.definition).not.toBe(weeklyActionDefinitions[0]);
  });

  it('ships passive recovery as validated data compatible with the core week config', () => {
    const coreConfig: CoreDevelopmentWeekConfig = developmentWeekConfig;
    expect(isCoreDevelopmentWeekConfig(coreConfig)).toBe(true);
    expect(coreConfig).toEqual({
      bodyXpEfficiencyMinPermille: 600,
      bodyXpEfficiencyPerBodyPoint: 4,
      passiveBodyRecovery: 10,
      proficiencyUseThresholds: [0, 2, 5, 9, 14, 20],
      proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1180, 1210, 1230],
    });
    expect(coreConfig.passiveBodyRecovery).toBeGreaterThanOrEqual(
      CORE_PASSIVE_BODY_RECOVERY_BOUNDS.min,
    );
    expect(coreConfig.passiveBodyRecovery).toBeLessThanOrEqual(
      CORE_PASSIVE_BODY_RECOVERY_BOUNDS.max,
    );

    for (const passiveBodyRecovery of [-1, 10.5, 101]) {
      expect(
        expectIssues(
          validateContent({
            localeResources: localeMessages,
            manifest: {
              ...contentManifest,
              developmentWeekConfig: { ...developmentWeekConfig, passiveBodyRecovery },
            },
          }),
        ),
      ).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: 'manifest.developmentWeekConfig.passiveBodyRecovery',
        }),
      );
    }

    const invalidConfigs = [
      { ...developmentWeekConfig, bodyXpEfficiencyMinPermille: 1001 },
      {
        ...developmentWeekConfig,
        bodyXpEfficiencyMinPermille: 900,
        bodyXpEfficiencyPerBodyPoint: 2,
      },
      { ...developmentWeekConfig, proficiencyUseThresholds: [0, 2, 5, 5, 14, 20] },
      {
        ...developmentWeekConfig,
        proficiencyXpMultipliersPermille: [1000, 1080, 1140, 1200, 1260, 1320],
      },
    ];
    for (const config of invalidConfigs) {
      expect(
        expectIssues(
          validateContent({
            localeResources: localeMessages,
            manifest: { ...contentManifest, developmentWeekConfig: config },
          }),
        ),
      ).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: expect.stringMatching(/^manifest\.developmentWeekConfig\./u),
        }),
      );
    }
  });

  it('gives every action an immediate effect and preserves the intended M1 tradeoffs', () => {
    for (const action of weeklyActions) {
      const mechanicalDeltas: readonly number[] = [action.bodyDelta, action.gpaDelta];
      expect(
        action.attributeXp.length > 0 || mechanicalDeltas.some((delta) => delta !== 0),
        action.id,
      ).toBe(true);
      expect(action.proficiencyId, action.id).toBe(WEEKLY_ACTION_PROFICIENCY_IDS[action.id]);
      expect(action.tags.length, action.id).toBeGreaterThan(0);
      expect(Object.hasOwn(action, 'requirements'), action.id).toBe(true);
    }

    const filmStudy = weeklyActions.find(({ id }) => id === 'action_film_study');
    expect(filmStudy?.attributeXp).toContainEqual({
      attributeId: 'attribute_football_iq',
      baseXp: 24,
    });
    expect(weeklyActions.find(({ id }) => id === 'action_recovery')?.bodyDelta).toBeGreaterThan(0);
    expect(weeklyActions.find(({ id }) => id === 'action_study_hall')?.gpaDelta).toBeGreaterThan(0);

    const trainingActions = weeklyActions.filter(({ proficiencyId }) => proficiencyId !== null);
    expect(trainingActions.every(({ bodyDelta }) => bodyDelta < 0)).toBe(true);
    expect(Math.min(...trainingActions.map(({ bodyDelta }) => bodyDelta))).toBe(
      weeklyActions.find(({ id }) => id === 'action_extra_practice')?.bodyDelta,
    );
  });

  it('rejects missing actions and any change to stable manifest order', () => {
    const shortenedResult = validateContent({
      localeResources: localeMessages,
      manifest: { ...contentManifest, weeklyActions: weeklyActions.slice(0, 8) },
    });
    expect(expectIssues(shortenedResult)).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-schema',
        path: 'manifest.weeklyActions',
      }),
    );

    const reorderedActions = [...weeklyActions];
    const firstAction = reorderedActions[0];
    const secondAction = reorderedActions[1];
    if (firstAction === undefined || secondAction === undefined) {
      throw new Error('Expected shipped weekly action fixtures.');
    }
    reorderedActions[0] = secondAction;
    reorderedActions[1] = firstAction;
    const reorderedResult = validateContent({
      localeResources: localeMessages,
      manifest: { ...contentManifest, weeklyActions: reorderedActions },
    });
    expect(expectIssues(reorderedResult)).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-schema',
        path: 'manifest.weeklyActions.0.id',
      }),
    );
  });

  it('rejects duplicate or excess XP targets, invalid mechanics, and effectless actions', () => {
    const routeDrills = weeklyActions[0];
    const recovery = weeklyActions[7];
    if (routeDrills === undefined || recovery === undefined) {
      throw new Error('Expected shipped weekly action fixtures.');
    }
    const routeXp = routeDrills.attributeXp[0];
    if (routeXp === undefined) {
      throw new Error('Expected Route Drills XP fixture.');
    }

    const invalidActions = [
      {
        ...routeDrills,
        attributeXp: [routeXp, routeXp],
      },
      {
        ...routeDrills,
        attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 51 }],
      },
      {
        ...routeDrills,
        attributeXp: [{ attributeId: 'attribute_wr_route_running', baseXp: 1.5 }],
      },
      {
        ...routeDrills,
        attributeXp: [
          { attributeId: 'attribute_speed', baseXp: 1 },
          { attributeId: 'attribute_burst', baseXp: 1 },
          { attributeId: 'attribute_agility', baseXp: 1 },
          { attributeId: 'attribute_strength', baseXp: 1 },
        ],
      },
      { ...routeDrills, bodyDelta: -41 },
      { ...routeDrills, bodyDelta: -8.5 },
      { ...routeDrills, gpaDelta: 0.51 },
      { ...routeDrills, gpaDelta: Number.POSITIVE_INFINITY },
      { ...routeDrills, tags: ['action_family_training', 'action_family_training'] },
      { ...routeDrills, requirements: { positionIds: ['position_qb'] } },
      { ...recovery, bodyDelta: 0 },
    ];

    for (const action of invalidActions) {
      expect(
        expectIssues(
          validateContent({
            localeResources: localeMessages,
            manifest: manifestWithAction(WEEKLY_ACTION_IDS.indexOf(action.id), action),
          }),
        ),
      ).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: expect.stringMatching(/^manifest\.weeklyActions\./u),
        }),
      );
    }
  });

  it('rejects a proficiency assigned to the wrong action or to a non-training action', () => {
    const routeDrills = weeklyActions[0];
    const recovery = weeklyActions[7];
    if (routeDrills === undefined || recovery === undefined) {
      throw new Error('Expected shipped weekly action fixtures.');
    }

    for (const [actionIndex, action] of [
      [0, { ...routeDrills, proficiencyId: 'proficiency_speed_work' }],
      [7, { ...recovery, proficiencyId: 'proficiency_route_drills' }],
    ] as const) {
      expect(
        expectIssues(
          validateContent({
            localeResources: localeMessages,
            manifest: manifestWithAction(actionIndex, action),
          }),
        ),
      ).toContainEqual(
        expect.objectContaining({
          code: 'content.invalid-schema',
          path: `manifest.weeklyActions.${actionIndex}.proficiencyId`,
        }),
      );
    }
  });

  it('requires complete localized references and valid ICU for weekly actions', () => {
    const missingResources = cloneResources();
    delete missingResources['en-US']['weeklyActions.routeDrills.name'];
    const missingIssues = expectIssues(
      validateContent({ localeResources: missingResources, manifest: contentManifest }),
    );
    expect(missingIssues).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        contentId: 'action_route_drills',
        locale: 'en-US',
        messageKey: 'weeklyActions.routeDrills.name',
      }),
    );

    const invalidIcuResources = cloneResources();
    invalidIcuResources['ko-KR']['weeklyActions.recovery.description'] = '{bodyDelta';
    expect(
      expectIssues(
        validateContent({ localeResources: invalidIcuResources, manifest: contentManifest }),
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'locale.invalid-icu-message',
        locale: 'ko-KR',
        messageKey: 'weeklyActions.recovery.description',
      }),
    );
  });
});
