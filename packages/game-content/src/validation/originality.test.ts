import { describe, expect, it } from 'vitest';
import {
  commitProgramVNext,
  createCareerVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type PositionPlayerCreationIdentity,
  type PositionRoomContext,
} from '@project-saturday/game-core';

import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
  reservedRosterNamePairs,
} from '../content/index.js';

/**
 * M10 originality: generated rosters never show a reserved full name (a combination that reads as
 * a well-known real player or coach). The remap is cosmetic: IDs, ratings and depth order hold.
 */
const identity = (positionId: string, archetypeId: string) =>
  ({
    displayName: 'Origin Tester',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  }) as PositionPlayerCreationIdentity;

const IDENTITIES = [
  identity('position_qb', 'archetype_qb_field_general'),
  identity('position_wr', 'archetype_wr_deep_threat'),
  identity('position_edge', 'archetype_edge_speed_rusher'),
];

function committedRooms(
  seed: string,
  who: PositionPlayerCreationIdentity,
  mechanics: CareerVNextMechanics,
) {
  const created = createCareerVNext({ seed, identity: who }, mechanics);
  if (!created.ok) throw new Error(created.reason);
  return created.career.recruiting!.offers.map(({ programId }) => {
    const committed = commitProgramVNext(created.career, programId, mechanics);
    if (!committed.ok) throw new Error(committed.reason);
    return (committed.career as CareerVNext).program!.room;
  });
}

const pairs = (room: PositionRoomContext) =>
  room.competitors.map(({ givenNameId, familyNameId }) => `${givenNameId}|${familyNameId}`);

describe('generated roster names', () => {
  it('never show a reserved full name', () => {
    expect(reservedRosterNamePairs.length).toBeGreaterThan(0);
    for (const who of IDENTITIES) {
      const mechanics = buildCareerVNextMechanics(who)!;
      for (let seed = 0; seed < 30; seed += 1)
        for (const room of committedRooms(`origin-${seed}`, who, mechanics))
          for (const pair of pairs(room)) expect(reservedRosterNamePairs).not.toContain(pair);
    }
  });

  it('remaps a reserved pair without touching IDs, ratings or depth order', () => {
    const who = IDENTITIES[0]!;
    const mechanics = buildCareerVNextMechanics(who)!;
    const before = committedRooms('origin-remap', who, { ...mechanics, reservedNamePairs: [] });
    // Reserve every name the first room showed; the same seed must now show none of them.
    const reserved = pairs(before[0]!);
    const after = committedRooms('origin-remap', who, {
      ...mechanics,
      reservedNamePairs: reserved,
    });
    for (const pair of pairs(after[0]!)) expect(reserved).not.toContain(pair);
    expect(new Set(pairs(after[0]!)).size).toBe(after[0]!.competitors.length);
    const strip = (room: PositionRoomContext) => ({
      ...room,
      competitors: room.competitors.map(({ givenNameId, id, talentFit, classYear }) => ({
        givenNameId,
        id,
        talentFit,
        classYear,
      })),
    });
    expect(strip(after[0]!)).toEqual(strip(before[0]!));
  });
});
