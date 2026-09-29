import { describe, expect, it } from 'vitest';
import {
  migratePositionAlphaSessionV1ToV2,
  parsePositionAlphaSessionV2Json,
  parsePositionAlphaSessionWireV3Json,
  serializePositionAlphaSessionWireV3Json,
  validatePositionAlphaSession,
  validatePositionAlphaSessionV2,
  resolvePositionAlphaEventV2,
  choosePositionAlphaSkillV2,
  commitPositionAlphaOffseasonV2,
  projectHistoricalPositionAlphaSeasonClockV2,
  type PositionAlphaSessionV1,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  equipShippedPositionAlphaSkill,
  positionAlphaContent,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaWeek,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

describe('staged added-position v1 to v2 migration', () => {
  it.each(CASES)(
    'preserves every historical %s boundary and adds only neutral current fields',
    (positionId, archetypeId) => {
      const identity = {
        displayName: 'Migration Athlete',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer' as const,
        personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      };
      const created = createShippedPositionAlphaSession({
        careerSeed: `v2-migration-${positionId}`,
        programId: 'program_ember_peak_polytechnic',
        identity,
      });
      if (!created.ok) throw new Error(created.reason);
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity });
      if (mechanics === null) throw new Error('Missing fixture mechanics.');
      const observed = new Set<string>();
      let boundaries = 0;
      function verify(source: PositionAlphaSessionV1): void {
        const before = JSON.stringify(source);
        const migrated = migratePositionAlphaSessionV1ToV2(source, mechanics!);
        expect(migrated).not.toBeNull();
        if (migrated === null) return;
        expect(migrated).toEqual({
          ...source,
          schemaVersion: 2,
          model: 'position_alpha_session_v2',
          skills: {
            ...source.skills,
            model: 'position_alpha_skill_state_v2',
            equippedSkillIds: [...source.skills.equippedSkillIds, null],
          },
          gameDay: { model: 'position_alpha_game_day_v2', type: 'IDLE' },
        });
        expect(JSON.stringify(source)).toBe(before);
        expect(migrated.careerRng).toEqual(source.careerRng);
        expect(migrated.world).toEqual(source.world);
        expect(migrated.meta).toEqual(source.meta);
        expect(migrated.revision).toBe(source.revision);
        expect(Object.isFrozen(migrated.skills.equippedSkillIds)).toBe(true);
        expect(migrated.player).not.toBe(source.player);
        expect(parsePositionAlphaSessionV2Json(JSON.stringify(migrated), mechanics!)).toEqual(
          migrated,
        );
        expect(validatePositionAlphaSession(migrated, mechanics!)).toBe(false);
        expect(validatePositionAlphaSessionV2(source, mechanics!)).toBe(false);
        if (source.weekHistory.length > 0 && source.weekHistory.length % 4 === 0) {
          const paged = serializePositionAlphaSessionWireV3Json(migrated, mechanics!)!;
          expect(paged).not.toBeNull();
          const restored = parsePositionAlphaSessionWireV3Json(paged, mechanics!);
          expect(restored).toEqual(migrated);
          expect(restored?.careerRng).toEqual(source.careerRng);
          expect(restored?.world).toEqual(source.world);
          expect(restored?.meta).toEqual(source.meta);
          expect(serializePositionAlphaSessionWireV3Json(restored!, mechanics!)).toBe(paged);
          const encoded = JSON.parse(paged);
          if (encoded.weekHistory.length > 1) {
            encoded.weekHistory.reverse();
            expect(
              parsePositionAlphaSessionWireV3Json(JSON.stringify(encoded), mechanics!),
            ).toBeNull();
          }
        }
        if (source.phase.type === 'OFFSEASON_DECISION') {
          for (const option of source.lifecycle.offseason!.options) {
            const historical = commitShippedPositionAlphaOffseason(source, option.programId);
            const current = commitPositionAlphaOffseasonV2(migrated, option.programId, mechanics!);
            if (!historical.ok || !current.ok) throw new Error('Migrated offseason choice failed');
            expect(current.session).toEqual(
              migratePositionAlphaSessionV1ToV2(historical.session, mechanics!),
            );
            expect(
              parsePositionAlphaSessionV2Json(JSON.stringify(current.session), mechanics!),
            ).toEqual(current.session);
            expect(
              commitPositionAlphaOffseasonV2(current.session, option.programId, mechanics!).ok,
            ).toBe(false);
          }
          expect(commitPositionAlphaOffseasonV2(migrated, 'program_missing', mechanics!).ok).toBe(
            false,
          );
          const withCurrentClock = {
            ...migrated,
            seasonClock: projectHistoricalPositionAlphaSeasonClockV2(source.phase.seasonIndex)!,
          };
          // A clock cannot be invented at an already saved historical offseason boundary.
          expect(validatePositionAlphaSessionV2(withCurrentClock, mechanics!)).toBe(false);
          expect(
            commitPositionAlphaOffseasonV2(
              withCurrentClock,
              source.lifecycle.offseason!.options[0].programId,
              mechanics!,
            ).ok,
          ).toBe(false);
          const owned = migrated.skills.ownedSkillIds[0];
          if (owned !== undefined)
            expect(
              commitPositionAlphaOffseasonV2(
                {
                  ...migrated,
                  skills: { ...migrated.skills, equippedSkillIds: [null, null, null, owned] },
                },
                source.lifecycle.offseason!.options[0].programId,
                mechanics!,
              ).ok,
            ).toBe(false);
          expect(JSON.stringify(source)).toBe(before);
        }
        if (source.events.pending !== null) {
          const choiceId = source.events.pending.choiceIds[0]!;
          const historical = resolveShippedPositionAlphaEvent(source, choiceId);
          const current = resolvePositionAlphaEventV2(migrated, choiceId, mechanics!);
          if (!historical.ok || !current.ok) throw new Error('Migrated pending event failed');
          expect(current.session).toEqual(
            migratePositionAlphaSessionV1ToV2(historical.session, mechanics!),
          );
          expect(current.session.careerRng).toEqual(source.careerRng);
          expect(resolvePositionAlphaEventV2(current.session, choiceId, mechanics!).ok).toBe(false);
        }
        if (source.skills.offeredSkillIds !== null) {
          const selected = source.skills.offeredSkillIds[0];
          const historical = chooseShippedPositionAlphaSkill(source, selected);
          const current = choosePositionAlphaSkillV2(migrated, selected, mechanics!);
          if (!historical.ok || !current.ok) throw new Error('Migrated pending skill failed');
          const expected = migratePositionAlphaSessionV1ToV2(historical.session, mechanics!)!;
          const fourthSlotExpected = source.skills.equippedSkillIds.every((id) => id !== null)
            ? selected
            : null;
          expect(current.session).toEqual({
            ...expected,
            skills: {
              ...expected.skills,
              equippedSkillIds: [...historical.session.skills.equippedSkillIds, fourthSlotExpected],
            },
          });
          expect(current.session.careerRng).toEqual(source.careerRng);
          expect(choosePositionAlphaSkillV2(current.session, selected, mechanics!).ok).toBe(false);
        }
        const ownedSkill = source.skills.ownedSkillIds[0];
        if (ownedSkill !== undefined) {
          const fourSlotBuild = {
            ...migrated,
            skills: {
              ...migrated.skills,
              equippedSkillIds: [null, null, null, ownedSkill],
            },
          };
          expect(validatePositionAlphaSessionV2(fourSlotBuild, mechanics!)).toBe(true);
          expect(
            parsePositionAlphaSessionV2Json(JSON.stringify(fourSlotBuild), mechanics!),
          ).toEqual(fourSlotBuild);
          expect(
            validatePositionAlphaSessionV2(
              {
                ...fourSlotBuild,
                skills: {
                  ...fourSlotBuild.skills,
                  equippedSkillIds: [ownedSkill, null, null, ownedSkill],
                },
              },
              mechanics!,
            ),
          ).toBe(false);
        }
        for (const invalid of [
          { ...migrated, schemaVersion: 3 },
          { ...migrated, extra: true },
          { ...migrated, gameDay: { ...migrated.gameDay, type: 'ACTIVE' } },
          { ...migrated, gameDay: { ...migrated.gameDay, extra: 0 } },
          { ...migrated, skills: { ...migrated.skills, equippedSkillIds: [null, null, null] } },
          {
            ...migrated,
            skills: { ...migrated.skills, equippedSkillIds: [null, null, null, 'skill_not_owned'] },
          },
        ])
          expect(validatePositionAlphaSessionV2(invalid, mechanics!)).toBe(false);
        observed.add(source.phase.type);
        if (source.events.pending !== null) observed.add('EVENT');
        if (source.skills.offeredSkillIds !== null) observed.add('SKILL');
        boundaries += 1;
      }
      let session = created.session;
      verify(session);
      const actions = positionAlphaContent.trainingActions.filter(
        (action) => action.positionId === positionId,
      );
      for (let season = 0; season < 2; season += 1) {
        for (let week = 0; week < 12; week += 1) {
          const advanced = resolveShippedPositionAlphaWeek(
            session,
            actions[week % actions.length]!.id,
            'best_fit',
          );
          if (!advanced.ok) throw new Error(advanced.reason);
          session = advanced.session;
          verify(session);
          if (session.skills.offeredSkillIds !== null) {
            const chosen = chooseShippedPositionAlphaSkill(
              session,
              session.skills.offeredSkillIds[0],
            );
            if (!chosen.ok) throw new Error(chosen.reason);
            session = chosen.session;
            verify(session);
            const equipped = equipShippedPositionAlphaSkill(
              session,
              session.skills.ownedSkillIds.at(-1)!,
              (session.skills.ownedSkillIds.length - 1) % 3,
            );
            if (!equipped.ok) throw new Error(equipped.reason);
            session = equipped.session;
            verify(session);
          }
          if (session.events.pending !== null) {
            const resolved = resolveShippedPositionAlphaEvent(
              session,
              session.events.pending.choiceIds[0],
            );
            if (!resolved.ok) throw new Error(resolved.reason);
            session = resolved.session;
            verify(session);
          }
        }
        const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
        if (!reviewed.ok) throw new Error(reviewed.reason);
        session = reviewed.session;
        verify(session);
        const option = session.lifecycle.offseason?.options[season === 0 ? 1 : 0];
        if (option === undefined) throw new Error('Missing offseason fixture option.');
        const committed = commitShippedPositionAlphaOffseason(session, option.programId);
        if (!committed.ok) throw new Error(committed.reason);
        session = committed.session;
        verify(session);
      }
      expect(session.phase.type).toBe('CAREER_COMPLETE');
      expect(boundaries).toBeGreaterThan(35);
      expect([...observed]).toEqual(
        expect.arrayContaining([
          'WEEK_PLANNING',
          'SEASON_REVIEW',
          'OFFSEASON_DECISION',
          'CAREER_COMPLETE',
          'SKILL',
          'EVENT',
        ]),
      );
    },
  );
});
