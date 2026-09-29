import { describe, expect, it } from 'vitest';
import {
  COMMON_POSITION_FOCUS_IDS,
  COMMON_POSITION_PROFICIENCY_IDS,
  POSITION_TRAINING_ACTION_IDS,
  createCommonPositionProficiencyUses,
  isPositionFocusAvailable,
  isPositionFocusStateV2,
  resolvePositionFocus,
  resolvePositionFocusWithSkills,
  derivePassiveBodyRecovery,
  resolvePositionTrainingAction,
  type PositionFocusStateV2,
  type PositionFocusId,
} from '@project-saturday/game-core';
import {
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  developmentWeekConfig,
  injuryOutcomeMechanicsDefinitions,
  positionAlphaContent,
  positionCommonFocusDefinitions,
  positionFocusInjuryPolicies,
  weeklyActions,
  positionSkillBuilds,
  positionSkillActionTags,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

function fixture([positionId, archetypeId]: readonly [
  (typeof CASES)[number][0],
  (typeof CASES)[number][1],
]): PositionFocusStateV2 {
  const result = createShippedPositionAlphaSession({
    careerSeed: 'current-focus',
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Focus Athlete',
      positionId,
      archetypeId,
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!result.ok) throw new Error('Invalid focus fixture');
  return JSON.parse(
    JSON.stringify({
      model: 'position_focus_state_v2',
      training: result.session.training,
      sharedProficiencyUses: createCommonPositionProficiencyUses(),
      gpa: result.session.player.state.gpa,
    }),
  ) as PositionFocusStateV2;
}

describe('current position focus ecology', () => {
  it.each(CASES)(
    '%s has real weekly build decisions with shared arithmetic and no invented XP',
    (positionId, archetypeId) => {
      const original = fixture([positionId, archetypeId]);
      const state = {
        ...original,
        gpa: 2.35,
        training: { ...original.training, state: { body: 60, preparation: 45, confidence: 45 } },
      };
      const builds = positionSkillBuilds.filter((entry) => entry.positionId === positionId);
      const definitions = builds.map(({ mechanics }) => mechanics);
      const drill = positionAlphaContent.trainingActions.find(
        (entry) => entry.positionId === positionId,
      )!;
      function run(
        buildId: (typeof builds)[number]['buildId'] | null,
        id: PositionFocusId,
        plan: readonly PositionFocusId[],
        index: 0 | 1 | 2,
        input = state,
      ) {
        const definition =
          positionAlphaContent.trainingActions.find((action) => action.id === id) ??
          positionCommonFocusDefinitions.find((action) => action.id === id)!;
        const skillId = builds.find((entry) => entry.buildId === buildId)?.skillId ?? null;
        const result = resolvePositionFocusWithSkills(
          input,
          definition,
          developmentWeekConfig,
          null,
          positionFocusInjuryPolicies,
          { model: 'skill_effect_loadout_v1', equippedSkillIds: [null, null, null, skillId] },
          definitions,
          {
            id,
            tagIds: positionSkillActionTags[id],
            attributeXp: definition.attributeXp,
            bodyDelta: definition.bodyDelta,
          },
          {
            body: input.training.state.body,
            actionId: id,
            actionIndex: index,
            planActionIds: plan,
            previousActionId: index === 0 ? null : plan[index - 1]!,
          },
        );
        if (!result.ok) throw new Error(result.reason);
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
        expect(
          result.evidence.skillEffects!.appliedSkillEffects.every(
            ({ slotIndex }) => slotIndex === 3,
          ),
        ).toBe(true);
        return result;
      }
      const repeat = [drill.id, drill.id, drill.id];
      const before = JSON.stringify(state);
      const empty = run(null, drill.id, repeat, 0);
      expect(run('repetition', drill.id, repeat, 0).next).toEqual(empty.next);
      const boosted = run('repetition', drill.id, repeat, 1);
      expect(boosted.evidence.attributeXp[0]!.awardedXp).toBe(
        Math.floor(
          (drill.attributeXp[0].baseXp *
            boosted.evidence.bodyXpEfficiencyPermille *
            boosted.evidence.proficiency!.xpMultiplierPermille *
            1250) /
            1_000_000_000,
        ),
      );
      expect(boosted.evidence.attributeXp[0]!.awardedXp).toBeGreaterThan(
        empty.evidence.attributeXp[0]!.awardedXp,
      );
      expect(boosted.evidence.bodyAfter).toBeLessThan(empty.evidence.bodyAfter);
      expect(run('body', drill.id, repeat, 0).evidence.bodyAfter).toBeGreaterThan(
        empty.evidence.bodyAfter,
      );
      const diversified = [drill.id, 'action_recovery', 'action_study_hall'] as const;
      expect(run('role', drill.id, repeat, 0).evidence.practiceImpact).toBe(
        empty.evidence.practiceImpact,
      );
      expect(run('role', drill.id, diversified, 0).evidence.practiceImpact).toBe(
        empty.evidence.practiceImpact + 2,
      );
      const filmPlan = ['action_film_study', 'action_recovery', 'action_study_hall'] as const;
      expect(run('film', 'action_film_study', filmPlan, 0).evidence.preparationAfter).toBe(
        run(null, 'action_film_study', filmPlan, 0).evidence.preparationAfter + 3,
      );
      const study = run('campus', 'action_study_hall', filmPlan, 2);
      expect(
        study.evidence.gpaAfter - run(null, 'action_study_hall', filmPlan, 2).evidence.gpaAfter,
      ).toBeCloseTo(0.1);
      expect(study.evidence.attributeXp).toEqual([]);
      expect(study.evidence.proficiency).toBeNull();
      const recovery = run('mindset', 'action_recovery', filmPlan, 1);
      expect(recovery.evidence.confidenceAfter).toBe(
        run(null, 'action_recovery', filmPlan, 1).evidence.confidenceAfter + 2,
      );
      const fresh = {
        ...state,
        training: { ...state.training, state: { ...state.training.state, body: 61 } },
      };
      expect(run('mindset', 'action_recovery', filmPlan, 1, fresh).next).toEqual(
        run(null, 'action_recovery', filmPlan, 1, fresh).next,
      );
      const passive = derivePassiveBodyRecovery(
        70,
        10,
        {
          model: 'skill_effect_loadout_v1',
          equippedSkillIds: [
            null,
            null,
            null,
            builds.find(({ buildId }) => buildId === 'body')!.skillId,
          ],
        },
        definitions,
        1,
      );
      expect(passive.ok && passive.evidence.bodyAfter).toBe(82);
      expect(JSON.stringify(state)).toBe(before);
      expect(Object.isFrozen(state.training.state)).toBe(false);
    },
  );

  it('reuses exactly five authored common actions and both locale presentations with complete injury policies', () => {
    expect(positionCommonFocusDefinitions.map(({ id }) => id)).toEqual(COMMON_POSITION_FOCUS_IDS);
    expect(Object.keys(positionFocusInjuryPolicies).sort()).toEqual(
      [...COMMON_POSITION_FOCUS_IDS, ...POSITION_TRAINING_ACTION_IDS].sort(),
    );
    for (const id of COMMON_POSITION_FOCUS_IDS) {
      const presentation = weeklyActions.find((entry) => entry.id === id)!;
      expect(presentation.requirements.positionIds).toEqual([]);
      for (const locale of ['ko-KR', 'en-US'] as const) {
        expect(localeMessages[locale][presentation.nameKey]).toBeTruthy();
        expect(localeMessages[locale][presentation.descriptionKey]).toBeTruthy();
      }
    }
  });

  it.each(CASES)(
    '%s preserves drill arithmetic and caller ownership',
    (positionId, archetypeId) => {
      const state = fixture([positionId, archetypeId]);
      expect(isPositionFocusStateV2(state, developmentWeekConfig)).toBe(true);
      for (const drill of positionAlphaContent.trainingActions.filter(
        (entry) => entry.positionId === positionId,
      )) {
        const before = JSON.stringify(state);
        const resolved = resolvePositionFocus(
          state,
          drill,
          developmentWeekConfig,
          null,
          positionFocusInjuryPolicies,
        );
        const old = resolvePositionTrainingAction(
          JSON.parse(before).training as PositionFocusStateV2['training'],
          drill,
          developmentWeekConfig,
        );
        if (!resolved.ok || !old.ok) throw new Error('Invalid drill');
        expect(resolved.next.training).toEqual(old.next);
        expect(resolved.next.gpa).toBe(state.gpa);
        expect(resolved.next.sharedProficiencyUses).toEqual(state.sharedProficiencyUses);
        expect(resolved.evidence.attributeXp).toEqual(old.evidence.attributeXp);
        expect(resolved.evidence.proficiency).toEqual(old.evidence.proficiency);
        expect(JSON.stringify(state)).toBe(before);
        expect(Object.isFrozen(state.training.attributes.attribute_speed)).toBe(false);
        expect(Object.isFrozen(resolved.next.training.attributes)).toBe(true);
      }
    },
  );

  it.each(CASES)(
    '%s supports recovery, GPA, physical growth, and learned film in one reproducible state',
    (positionId, archetypeId) => {
      let state = fixture([positionId, archetypeId]);
      state = {
        ...state,
        gpa: 3.95,
        training: { ...state.training, state: { body: 30, preparation: 50, confidence: 50 } },
      };
      for (const actionId of [
        'action_recovery',
        'action_study_hall',
        'action_weight_room',
        'action_speed_work',
        'action_film_study',
        'action_film_study',
        'action_film_study',
      ] as const) {
        const definition = positionCommonFocusDefinitions.find(({ id }) => id === actionId)!;
        const before = JSON.stringify(state);
        const resolved = resolvePositionFocus(
          state,
          definition,
          developmentWeekConfig,
          null,
          positionFocusInjuryPolicies,
        );
        expect(
          resolvePositionFocus(
            JSON.parse(before) as PositionFocusStateV2,
            definition,
            developmentWeekConfig,
            null,
            positionFocusInjuryPolicies,
          ),
        ).toEqual(resolved);
        if (!resolved.ok) throw new Error('Invalid common focus');
        expect(
          isPositionFocusStateV2(JSON.parse(JSON.stringify(resolved.next)), developmentWeekConfig),
        ).toBe(true);
        if (actionId === 'action_recovery') {
          expect(resolved.next.training.state).toEqual({
            body: 62,
            preparation: 48,
            confidence: 52,
          });
          expect(resolved.evidence.attributeXp).toEqual([]);
          expect(resolved.evidence.proficiency).toBeNull();
        }
        if (actionId === 'action_study_hall') {
          expect(resolved.evidence).toMatchObject({
            gpaBefore: 3.95,
            requestedGpaDelta: 0.15,
            actualGpaDelta: 0.05,
            gpaAfter: 4,
            attributeXp: [],
            proficiency: null,
          });
        }
        if (actionId === 'action_film_study') {
          expect(resolved.evidence.proficiency?.xpMultiplierPermille).toBe(
            state.sharedProficiencyUses.proficiency_film_study < 2 ? 1000 : 1080,
          );
          expect(resolved.evidence.attributeXp[0]?.attributeId).toBe('attribute_football_iq');
          expect(resolved.evidence.preparationAfter - resolved.evidence.preparationBefore).toBe(12);
        }
        expect(JSON.stringify(state)).toBe(before);
        state = resolved.next;
      }
      expect(state.sharedProficiencyUses).toEqual({
        proficiency_weight_room: 1,
        proficiency_speed_work: 1,
        proficiency_film_study: 3,
      });
      expect(Object.keys(state.training.proficiencyUses)).toHaveLength(3);
    },
  );

  it.each(CASES)(
    '%s always retains safe injury choices and rejects cross-position or malformed input',
    (positionId, archetypeId) => {
      const state = fixture([positionId, archetypeId]);
      for (const definition of positionCommonFocusDefinitions) {
        const precise = resolvePositionFocus(
          { ...state, gpa: 3.005 },
          definition,
          developmentWeekConfig,
          null,
          positionFocusInjuryPolicies,
        );
        if (!precise.ok) throw new Error('Fractional event GPA must remain usable');
        expect(precise.next.gpa).toBe(definition.id === 'action_study_hall' ? 3.155 : 3.005);
        expect(precise.evidence.actualGpaDelta).toBe(
          definition.id === 'action_study_hall' ? 0.15 : 0,
        );
      }
      const available = [
        ...positionAlphaContent.trainingActions.filter((entry) => entry.positionId === positionId),
        ...positionCommonFocusDefinitions,
      ];
      for (const definition of injuryOutcomeMechanicsDefinitions) {
        const injury = {
          outcomeId: definition.id,
          severityId: definition.severityId,
          startedWeekIndex: 0,
          originalDurationWeeks: definition.durationWeeks,
          remainingWeeks: definition.durationWeeks,
          defaultAvailabilityId: definition.availabilityId,
          opportunityCap: definition.opportunityCap,
        };
        const ids: string[] = [];
        for (const action of available) {
          const resolved = resolvePositionFocus(
            state,
            action,
            developmentWeekConfig,
            injury,
            positionFocusInjuryPolicies,
          );
          const allowed = isPositionFocusAvailable(action.id, injury, positionFocusInjuryPolicies);
          expect(resolved.ok).toBe(allowed);
          if (resolved.ok) ids.push(action.id);
          else expect(resolved.reason).toBe('position_focus.unavailable');
        }
        if (definition.availabilityId === 'injury_availability_out')
          expect(ids).toEqual(['action_film_study', 'action_recovery', 'action_study_hall']);
        else {
          expect(ids).toContain('action_recovery');
          expect(ids).not.toContain('action_weight_room');
          expect(ids).not.toContain('action_speed_work');
        }
      }
      const foreign = positionAlphaContent.trainingActions.find(
        (entry) => entry.positionId !== positionId,
      )!;
      expect(
        resolvePositionFocus(
          state,
          foreign,
          developmentWeekConfig,
          null,
          positionFocusInjuryPolicies,
        ).ok,
      ).toBe(false);
      const common = positionCommonFocusDefinitions[0]!;
      for (const malformed of [
        { ...state, extra: true },
        { ...state, gpa: 4.01 },
        { ...state, gpa: Number.NaN },
        { ...state, sharedProficiencyUses: {} },
        {
          ...state,
          sharedProficiencyUses: { ...state.sharedProficiencyUses, proficiency_weight_room: -1 },
        },
        {
          ...state,
          training: { ...state.training, state: { ...state.training.state, body: 101 } },
        },
      ]) {
        expect(isPositionFocusStateV2(malformed, developmentWeekConfig)).toBe(false);
        expect(
          resolvePositionFocus(
            malformed as PositionFocusStateV2,
            common,
            developmentWeekConfig,
            null,
            positionFocusInjuryPolicies,
          ).ok,
        ).toBe(false);
      }
      expect(COMMON_POSITION_PROFICIENCY_IDS).toHaveLength(3);
    },
  );
});
