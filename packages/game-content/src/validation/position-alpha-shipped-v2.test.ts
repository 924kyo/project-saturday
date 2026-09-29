import { describe, expect, it } from 'vitest';
import {
  commitPositionAlphaFocusPlanV2,
  migratePositionAlphaSessionV1ToV2,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSession,
  createShippedPositionAlphaSessionV2,
  parseShippedPositionAlphaSessionJson,
  parseShippedPositionAlphaSessionV2Json,
  serializeShippedPositionAlphaSessionV2Json,
  parseShippedPositionAlphaSessionV3Json,
  serializeShippedPositionAlphaSessionV3Json,
  defaultWrAppearance,
} from '../index.js';

describe('shipped current position adapters', () => {
  it.each([
    ['position_qb', 'archetype_qb_field_general'],
    ['position_rb', 'archetype_rb_power_back'],
    ['position_cb', 'archetype_cb_press_man'],
  ] as const)(
    '%s preserves literal creation/migration and reads actual current focus wire',
    (positionId, archetypeId) => {
      const input = {
        careerSeed: `shipped-v2-${positionId}`,
        programId: 'program_prairie_forge' as const,
        identity: {
          displayName: '새 출발 / New start',
          positionId,
          archetypeId,
          recruitingBackgroundId: 'background_late_bloomer' as const,
          personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
          appearance: defaultWrAppearance,
          heightCm: 188,
          weightKg: 92,
        },
      };
      const old = createShippedPositionAlphaSession(input);
      const current = createShippedPositionAlphaSessionV2(input);
      if (!old.ok || !current.ok) throw new Error('Creation failed');
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({
        identity: input.identity,
      })!;
      expect(current.session).toEqual(migratePositionAlphaSessionV1ToV2(old.session, mechanics));
      expect(parseShippedPositionAlphaSessionV2Json(JSON.stringify(old.session))).toEqual(
        current.session,
      );
      expect(parseShippedPositionAlphaSessionJson(JSON.stringify(old.session))).toEqual(
        old.session,
      );
      expect(parseShippedPositionAlphaSessionJson(JSON.stringify(current.session))).toBeNull();
      expect(current.session.careerRng).toEqual(old.session.careerRng);
      expect(current.session.world).toEqual(old.session.world);
      const focused = commitPositionAlphaFocusPlanV2(
        current.session,
        ['action_recovery', 'action_film_study', 'action_study_hall'],
        mechanics,
      );
      if (!focused.ok) throw new Error(focused.reason);
      const wire = serializeShippedPositionAlphaSessionV2Json(focused.session)!;
      expect(parseShippedPositionAlphaSessionV2Json(wire)).toEqual(focused.session);
      expect(parseShippedPositionAlphaSessionV2Json(JSON.stringify(focused.session))).toEqual(
        focused.session,
      );
      expect(parseShippedPositionAlphaSessionJson(wire)).toBeNull();
      const paged = serializeShippedPositionAlphaSessionV3Json(focused.session)!;
      const restored = parseShippedPositionAlphaSessionV3Json(paged)!;
      expect(restored).toEqual(focused.session);
      expect(Object.isFrozen(restored)).toBe(true);
      expect(restored).not.toBe(focused.session);
      expect(serializeShippedPositionAlphaSessionV3Json(restored)).toBe(paged);
      expect(parseShippedPositionAlphaSessionV2Json(paged)).toBeNull();
      expect(parseShippedPositionAlphaSessionJson(paged)).toBeNull();
      for (const historical of [JSON.stringify(old.session), JSON.stringify(current.session)])
        expect(parseShippedPositionAlphaSessionV3Json(historical)).toEqual(current.session);
      for (const historical of [wire, JSON.stringify(focused.session)])
        expect(parseShippedPositionAlphaSessionV3Json(historical)).toEqual(focused.session);
      const pages = JSON.parse(paged);
      for (const invalid of [
        { ...pages, model: 'position_alpha_session_wire_v4' },
        { ...pages, extra: true },
        { ...pages, weekHistory: [{}] },
        { ...pages, session: null },
        { ...pages, session: { ...pages.session, player: null } },
        { ...pages, session: { ...pages.session, schemaVersion: 99 } },
        { ...pages, session: { ...pages.session, weekHistory: [] } },
      ])
        expect(parseShippedPositionAlphaSessionV3Json(JSON.stringify(invalid))).toBeNull();
      const encoded = JSON.parse(wire);
      for (const invalid of [
        null,
        {},
        { ...encoded, session: null },
        { ...encoded, session: { ...encoded.session, player: null } },
        {
          ...encoded,
          session: {
            ...encoded.session,
            player: { ...encoded.session.player, positionId: 'position_unknown' },
          },
        },
        { ...encoded, session: { ...encoded.session, schemaVersion: 99 } },
      ]) {
        expect(parseShippedPositionAlphaSessionV2Json(JSON.stringify(invalid))).toBeNull();
        expect(parseShippedPositionAlphaSessionV3Json(JSON.stringify(invalid))).toBeNull();
      }
    },
  );
});
