import { describe, expect, it } from 'vitest';
import {
  migratePositionAlphaSessionV1ToV2,
  packJsonArchiveV1,
  parsePositionAlphaSessionV2Json,
  serializePositionAlphaSessionV2Json,
  parsePositionAlphaSessionWireV3Json,
  serializePositionAlphaSessionWireV3Json,
} from '@project-saturday/game-core';
import {
  buildShippedPositionAlphaSessionCommandMechanics,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
} from '../index.js';

const CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

describe('current lossless position save wire', () => {
  it.each(CASES)(
    '%s round-trips canonical wire and historical raw migration without caller mutation',
    (positionId, archetypeId) => {
      const identity = {
        displayName: '토요일 Athlete 🏈',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer' as const,
        personalityTraitIds: ['personality_disciplined', 'personality_leader'] as const,
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      };
      const mechanics = buildShippedPositionAlphaSessionCommandMechanics({ identity })!;
      const created = createShippedPositionAlphaSession({
        careerSeed: `wire-${positionId}`,
        programId: 'program_prairie_forge',
        identity,
      });
      if (!created.ok) throw new Error(created.reason);
      const session = migratePositionAlphaSessionV1ToV2(created.session, mechanics)!;
      const mutable = JSON.parse(JSON.stringify(session)) as typeof session;
      const wire = serializePositionAlphaSessionV2Json(mutable, mechanics)!;
      expect(wire).not.toBeNull();
      expect(Object.isFrozen(mutable.player)).toBe(false);
      expect(mutable).toEqual(session);
      const restored = parsePositionAlphaSessionV2Json(wire, mechanics)!;
      expect(restored).toEqual(session);
      expect(Object.isFrozen(restored.player)).toBe(true);
      expect(serializePositionAlphaSessionV2Json(restored, mechanics)).toBe(wire);
      expect(parsePositionAlphaSessionV2Json(JSON.stringify(session), mechanics)).toEqual(session);
      expect(
        serializePositionAlphaSessionV2Json({ ...session, revision: -1 }, mechanics),
      ).toBeNull();
      const encoded = JSON.parse(wire);
      for (const invalid of [
        { ...encoded, model: 'position_alpha_session_wire_v3' },
        { ...encoded, extra: true },
        { ...encoded, session: { ...encoded.session, weekHistory: [] } },
        { ...encoded, session: { ...encoded.session, postseasonHistory: [] } },
        { ...encoded, weekHistory: packJsonArchiveV1({}) },
        { ...encoded, weekHistory: packJsonArchiveV1(Array(13).fill(null)) },
        { ...encoded, postseasonHistory: packJsonArchiveV1(Array(3).fill(null)) },
        { ...encoded, weekHistory: { ...encoded.weekHistory, rootIndex: 99 } },
        { ...encoded, weekHistory: packJsonArchiveV1([{ model: 'forged_game' }]) },
        {
          ...encoded,
          session: {
            ...encoded.session,
            skills: { ...encoded.session.skills, ownedSkillIds: ['skill_forged'] },
          },
        },
      ])
        expect(parsePositionAlphaSessionV2Json(JSON.stringify(invalid), mechanics)).toBeNull();
      // Leading JSON whitespace is legal JSON but still counts against actual persisted bytes.
      const padded = `${' '.repeat(1_000_000 - new TextEncoder().encode(wire).byteLength)}${wire}`;
      expect(new TextEncoder().encode(padded).byteLength).toBe(1_000_000);
      expect(parsePositionAlphaSessionV2Json(padded, mechanics)).toBeNull();

      const paged = serializePositionAlphaSessionWireV3Json(mutable, mechanics)!;
      expect(paged).not.toBeNull();
      expect(parsePositionAlphaSessionWireV3Json(paged, mechanics)).toEqual(session);
      expect(parsePositionAlphaSessionV2Json(paged, mechanics)).toBeNull();
      expect(parsePositionAlphaSessionWireV3Json(wire, mechanics)).toBeNull();
      expect(Object.isFrozen(mutable.player)).toBe(false);
      expect(mutable).toEqual(session);
      const pagedWire = JSON.parse(paged);
      expect(pagedWire.weekHistory).toEqual([]);
      for (const invalid of [
        { ...pagedWire, model: 'position_alpha_session_wire_v4' },
        { ...pagedWire, extra: true },
        { ...pagedWire, session: { ...pagedWire.session, weekHistory: [] } },
        { ...pagedWire, weekHistory: [packJsonArchiveV1([])] },
        { ...pagedWire, weekHistory: [packJsonArchiveV1([{ model: 'forged_game' }])] },
        { ...pagedWire, postseasonHistory: Array(2).fill(packJsonArchiveV1([null])) },
        { ...pagedWire, session: { ...pagedWire.session, revision: -1 } },
      ])
        expect(parsePositionAlphaSessionWireV3Json(JSON.stringify(invalid), mechanics)).toBeNull();
      const paddedV3 = `${' '.repeat(1_000_000 - new TextEncoder().encode(paged).byteLength)}${paged}`;
      expect(parsePositionAlphaSessionWireV3Json(paddedV3, mechanics)).toBeNull();
    },
  );
});
