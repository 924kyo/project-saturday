import { describe, expect, it } from 'vitest';
import {
  attemptWeeklyEventVNext,
  commitProgramVNext,
  createCareerVNext,
  ROTATION_CONTEST_EVENT_IDS,
  type CareerVNext,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

const POSITIONS = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_wr', 'archetype_wr_deep_threat'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_lb', 'archetype_lb_run_stopper'],
  ['position_edge', 'archetype_edge_speed_rusher'],
] as const;

/** The career with the athlete's role forced to `roleId` (week-by-week, all else unchanged). */
function withRole(
  career: CareerVNext,
  roleId: 'depth_role_starter' | 'depth_role_rotation',
  seasonIndex: number,
  weekIndex: number,
): CareerVNext {
  const program = career.program!;
  return {
    ...career,
    program: {
      ...program,
      room: {
        ...program.room,
        projection: {
          ...program.room.projection,
          roleId,
          rank: roleId === 'depth_role_starter' ? 1 : 3,
        },
      },
    },
    season: { ...career.season, index: seasonIndex, weekIndex },
  };
}

describe('role-aware weekly events (regression VER-05)', () => {
  it('never offers a rotation contest to a starter, at any position, and still offers it to a backup', () => {
    let backupContests = 0;
    for (const [positionId, archetypeId] of POSITIONS) {
      const identity = {
        displayName: 'Role Probe',
        positionId,
        archetypeId,
        recruitingBackgroundId: 'background_late_bloomer',
        personalityTraitIds: ['personality_disciplined', 'personality_leader'],
        appearance: defaultWrAppearance,
        heightCm: 188,
        weightKg: 92,
      } as PositionPlayerCreationIdentity;
      const mechanics = buildCareerVNextMechanics(identity)!;
      for (const seed of ['a', 'b', 'c']) {
        const created = createCareerVNext(
          { seed: `role-${positionId}-${seed}`, identity },
          mechanics,
        );
        if (!created.ok) throw new Error(created.reason);
        const offer = created.career.recruiting.offers[0]!;
        const committed = commitProgramVNext(created.career, offer.programId, mechanics);
        if (!committed.ok) throw new Error(committed.reason);
        for (let seasonIndex = 0; seasonIndex < 4; seasonIndex += 1)
          for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
            const starter = attemptWeeklyEventVNext(
              withRole(committed.career, 'depth_role_starter', seasonIndex, weekIndex),
              mechanics,
            );
            if (starter !== null)
              expect(
                ROTATION_CONTEST_EVENT_IDS.has(starter.eventId),
                `${positionId} ${starter.eventId}`,
              ).toBe(false);
            const backup = attemptWeeklyEventVNext(
              withRole(committed.career, 'depth_role_rotation', seasonIndex, weekIndex),
              mechanics,
            );
            if (backup !== null && ROTATION_CONTEST_EVENT_IDS.has(backup.eventId))
              backupContests += 1;
          }
      }
    }
    // The filter removes the scene for starters only.
    expect(backupContests).toBeGreaterThan(0);
  });
});
