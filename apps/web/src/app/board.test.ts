import type { SnapBoardFrame, VNextPositionId } from '@project-saturday/game-core';
import {
  cbAlphaContent,
  gameContent,
  qbAlphaContent,
  rbAlphaContent,
} from '@project-saturday/game-content';
import { edgeContent, lbContent } from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import { buildScene, lookArrows, pathD, resultMotion, techniquePath } from './board';

const catalogs: Readonly<Record<VNextPositionId, readonly { readonly id: string }[]>> = {
  position_qb: qbAlphaContent.decisions,
  position_rb: rbAlphaContent.decisions,
  position_wr: gameContent.decisions,
  position_cb: cbAlphaContent.decisions,
  position_lb: lbContent.decisions,
  position_edge: edgeContent.decisions,
};

function frame(positionId: VNextPositionId, decisionIds: readonly string[]): SnapBoardFrame {
  return {
    kind: 'LIVE',
    positionId,
    snapNumber: 1,
    snapTotal: 2,
    patternId: 'pattern',
    familyId: 'family',
    decisionIds,
    revealedClueIds: [],
    situation: {
      period: 2,
      secondsRemaining: 300,
      offense: ['position_cb', 'position_lb', 'position_edge'].includes(positionId)
        ? 'OPPONENT'
        : 'PLAYER',
      down: 2,
      distanceYards: 7,
      lineOfScrimmageYards: 42,
      firstDownYards: 49,
      score: { playerTeam: 7, opponent: 3 },
    },
    meanwhile: { playerTeam: 0, opponent: 0 },
    look:
      positionId === 'position_wr'
        ? {
            lookId: 'look_wr_test',
            familyNameKey: 'family',
            familyPromptKey: 'prompt',
            stance: { corner: 'press', leverage: 'inside', shell: 'one_high' },
            tellKeys: [],
            moves: [
              { actor: 'cb_top', to: 'press_jam', reveal: 1 },
              { actor: 'fs', to: 'rotate_middle', reveal: 0 },
            ],
            reveal: null,
          }
        : null,
    result: null,
  };
}

describe('tactical board geometry', () => {
  it.each(Object.keys(catalogs) as VNextPositionId[])(
    'draws a distinct authored technique for every %s decision',
    (positionId) => {
      const ids = catalogs[positionId].map(({ id }) => id);
      const scene = buildScene(frame(positionId, ids), positionId, false);
      const fallback = pathD(techniquePath(scene, 'key_snap_decision_unknown', 0));
      const drawn = ids.map((id, index) => pathD(techniquePath(scene, id, index)));
      for (const d of drawn) expect(d).not.toBe(fallback);
      expect(new Set(drawn).size).toBe(ids.length);
    },
  );

  it('draws the look: stance moves the defenders, revealed moves become arrows', () => {
    const ids = gameContent.decisions.slice(0, 3).map(({ id }) => id);
    const pressed = frame('position_wr', ids);
    const scene = buildScene(pressed, 'position_wr', false);
    // Press puts the corner on the receiver; one-high sends a safety to the middle.
    expect(scene.cb.x - scene.wr.x).toBeLessThan(20);
    expect(scene.actors.fs!.y).toBe(110);
    const arrows = lookArrows(scene, pressed);
    expect(arrows.map(({ actor, kind }) => `${actor}:${kind}`)).toEqual([
      'cb_top:read',
      'fs:presnap',
    ]);
    expect(arrows.every(({ d }) => d.startsWith('M'))).toBe(true);
    expect(
      lookArrows(
        buildScene(frame('position_qb', ids), 'position_qb', false),
        frame('position_qb', ids),
      ),
    ).toEqual([]);
  });

  it('places the WR defender by the authored leverage and replays only saved facts', () => {
    const ids = gameContent.decisions.slice(0, 3).map(({ id }) => id);
    const base = frame('position_wr', ids);
    const scene = buildScene(base, 'position_wr', true);
    expect(scene.cb.y).toBeGreaterThan(scene.wr.y);
    expect(scene.width).toBe(300);
    const resolved = {
      ...base,
      result: {
        decisionId: ids[0]!,
        playResultId: 'RECEPTION',
        outcome: 'GAIN',
        yards: 14,
        ballEndYards: 56,
        ballOutcome: 'STOPPED',
        scoreAfter: { playerTeam: 7, opponent: 3 },
        appliedSkillIds: [],
        readQuality: 'SHARP',
      },
    } as Extract<SnapBoardFrame, { kind: 'LIVE' }>;
    const motion = resultMotion(scene, resolved, 'position_wr')!;
    expect(motion.end.x).toBe(scene.x(56));
    expect(resultMotion(scene, resolved, 'position_wr')).toEqual(motion);
    expect(motion.tag).toBeNull();
  });
});
