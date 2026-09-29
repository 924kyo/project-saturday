import { describe, expect, it } from 'vitest';
import {
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  serializeCareerVNext,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
  programIdentityVNext,
} from '../content/index.js';

const identities = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
  ['position_wr', 'archetype_wr_deep_threat'],
] as const;

function identityFor(positionId: string, archetypeId: string): PositionPlayerCreationIdentity {
  return {
    displayName: 'Marcus Hale',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 188,
    weightKg: 92,
  } as PositionPlayerCreationIdentity;
}

function playSeason(identity: PositionPlayerCreationIdentity, seed: string, pickBest = false) {
  const mechanics = buildCareerVNextMechanics(identity)!;
  const decisionsPerGame: number[] = [];
  let reloads = 0;
  const adopt = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    const json = serializeCareerVNext(result.career);
    expect(json).not.toBeNull();
    const parsed = parseCareerVNext(json!);
    expect(parsed).toEqual(result.career);
    reloads += 1;
    return parsed!;
  };
  let career = adopt(createCareerVNext({ seed, identity }, mechanics));
  expect(career.recruiting.offers.length).toBe(4);
  for (const offer of career.recruiting.offers) programIdentityVNext(offer.programId);
  const offer = career.recruiting.offers.at(-1)!;
  career = adopt(commitProgramVNext(career, offer.programId, mechanics));
  // The previewed room is exactly the committed room.
  expect(career.program!.room.projection.rank).toBe(offer.preview.rank);
  const focusIds = focusDefinitionsVNext(career, mechanics).map(({ id }) => id);
  while (career.flow.type !== 'SEASON_END') {
    if (career.flow.type === 'WEEK_PLAN') {
      career = adopt(planWeekVNext(career, [focusIds[0]!, focusIds[1]!, focusIds[2]!], mechanics));
    } else if (career.flow.type === 'PRACTICE_REPORT') {
      career = adopt(toGameDayVNext(career, mechanics));
    } else if (career.flow.type === 'GAME') {
      const game = career.flow.game;
      if (game.stage === 'PREGAME') {
        career = adopt(kickoffVNext(career, mechanics));
        const kicked = career.flow.type === 'GAME' ? career.flow.game : null;
        decisionsPerGame.push(kicked?.slots.length ?? 0);
      } else if (game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(career)!;
        expect(frame).not.toBeNull();
        expect(frame.result).toBeNull();
        const choice =
          pickBest && frame.kind === 'SIDELINE'
            ? ((career.flow.type === 'GAME' &&
                career.flow.game.sideline[frame.repNumber - 1]!.bestDecisionId) as string)
            : frame.decisionIds[0]!;
        expect(chooseSnapVNext(career, 'not_a_decision').ok).toBe(false);
        career = adopt(chooseSnapVNext(career, choice));
        const resolved = projectSnapBoardFrame(career)!;
        expect(resolved.result).not.toBeNull();
        if (resolved.kind === 'LIVE') {
          expect(resolved.situation.lineOfScrimmageYards).toBeGreaterThanOrEqual(0);
          expect(resolved.result!.scoreAfter.playerTeam).toBeGreaterThanOrEqual(
            resolved.situation.score.playerTeam,
          );
        }
      } else {
        career = adopt(continueGameVNext(career, mechanics));
      }
    } else if (career.flow.type === 'POST_GAME') {
      career = adopt(nextWeekVNext(career, mechanics));
    }
  }
  return { career, decisionsPerGame, reloads };
}

describe('Career VNext vertical slice core', () => {
  it.each(identities)(
    '%s plays a full regular season with Saturday decisions every week',
    (positionId, archetypeId) => {
      const identity = identityFor(positionId, archetypeId);
      const { career, decisionsPerGame, reloads } = playSeason(identity, `vnext-${positionId}`);
      expect(career.log).toHaveLength(12);
      expect(decisionsPerGame).toHaveLength(12);
      expect(Math.min(...decisionsPerGame)).toBeGreaterThanOrEqual(2);
      const record = career.log.at(-1)!.recordAfter;
      expect(record.wins + record.losses + record.ties).toBe(12);
      expect(reloads).toBeGreaterThan(60);
      expect(serializeCareerVNext(career)!.length).toBeLessThan(1_000_000);
    },
    60_000,
  );

  it('is deterministic by seed and responds to sideline reads', () => {
    const identity = identityFor('position_qb', 'archetype_qb_field_general');
    const first = playSeason(identity, 'vnext-determinism');
    const second = playSeason(identity, 'vnext-determinism');
    expect(second.career).toEqual(first.career);
    const sharp = playSeason(identity, 'vnext-determinism', true);
    const credit = (career: CareerVNext) =>
      career.log.flatMap(({ sideline }) => sideline).filter(({ grade }) => grade === 'SHARP')
        .length;
    expect(credit(sharp.career)).toBeGreaterThanOrEqual(credit(first.career));
  }, 60_000);

  it('rejects out-of-phase commands without publishing', () => {
    const identity = identityFor('position_cb', 'archetype_cb_press_man');
    const mechanics = buildCareerVNextMechanics(identity)!;
    const created = createCareerVNext({ seed: 'vnext-phase', identity }, mechanics);
    if (!created.ok) throw new Error(created.reason);
    expect(planWeekVNext(created.career, [], mechanics).ok).toBe(false);
    expect(kickoffVNext(created.career, mechanics).ok).toBe(false);
    expect(commitProgramVNext(created.career, 'program_unknown' as never, mechanics).ok).toBe(
      false,
    );
    expect(parseCareerVNext('{"model":"career_vnext","version":2}')).toBeNull();
  });
});
