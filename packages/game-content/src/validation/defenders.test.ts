import {
  createRng,
  DEFENDER_POSITION_IDS,
  DEFENDER_SKILL_EFFECT_TYPES,
  derivePlayerId,
  getPlayableAttributeIds,
  isDefenderCatalogValid,
  isDefenderEventCatalog,
  resolveDefenderSnap,
  startDefenderGame,
  type DefenderGameState,
  type DefenderPositionId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { DEFENDER_CATALOGS } from '../content/vnext.js';
import { edgeContent, lbContent } from '../content/defenders.js';
import { lifeEventContent } from '../content/life-events.js';
import { localeMessages } from '../locales/index.js';

const contentFor = (positionId: DefenderPositionId) =>
  positionId === 'position_lb' ? lbContent : edgeContent;

function play(
  positionId: DefenderPositionId,
  seed: string,
  pick: (ids: readonly string[]) => string,
) {
  const catalog = DEFENDER_CATALOGS[positionId];
  const started = startDefenderGame({
    rulesVersion: 'tactical_game_v1',
    gameId: `game_${positionId === 'position_lb' ? 'lb' : 'edge'}_test`,
    positionId,
    weekIndex: 3,
    playerProgramId: 'program_ironwood',
    opponentProgramId: 'program_capital_commonwealth',
    isHome: true,
    opportunityCount: 5,
    playerTeamRating: 66,
    opponentOffenseRating: 62,
    opponentDefenseRating: 60,
    player: {
      id: derivePlayerId(seed),
      positionId,
      attributes: Object.fromEntries(
        getPlayableAttributeIds(positionId).map((id) => [id, { rating: 64, xp: 0 }]),
      ),
      state: { body: 80, preparation: 60, confidence: 55, coachTrust: 40 },
    },
    patterns: catalog.patterns,
    decisions: catalog.decisions,
    equippedSkills: [],
    eventModifiers: { clueBonus: 0, decisionScoreFlat: 0, exposureReductionPermille: 0 },
    rng: createRng(seed),
  });
  expect(started).toMatchObject({ ok: true });
  let state = (started as { ok: true; state: DefenderGameState }).state;
  for (let guard = 0; state.type === 'ACTIVE' && guard < 10; guard += 1) {
    const resolved = resolveDefenderSnap(state, pick(state.pendingSnap.decisionIds));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) break;
    state = resolved.state;
  }
  expect(state.type).toBe('COMPLETE');
  return state;
}

describe('M8 front-seven content', () => {
  for (const positionId of DEFENDER_POSITION_IDS) {
    const content = contentFor(positionId);
    const catalog = DEFENDER_CATALOGS[positionId];

    it(`${positionId} ships a valid 8-pattern, 12-decision, 12-card, 12-event catalog`, () => {
      expect(isDefenderCatalogValid(positionId, catalog.patterns, catalog.decisions)).toBe(true);
      expect(isDefenderEventCatalog(positionId, catalog.events)).toBe(true);
      expect(catalog.skills).toHaveLength(12);
      expect(new Set(catalog.skills.map(({ id }) => id)).size).toBe(12);
      for (const card of catalog.skills) {
        expect(card.positionId).toBe(positionId);
        expect(card.baseOfferWeight).toBeGreaterThan(0);
        for (const effect of card.effects)
          expect(DEFENDER_SKILL_EFFECT_TYPES).toContain(effect.type);
      }
      const clueIds = new Set(content.clues.map(({ id }) => id));
      for (const pattern of catalog.patterns)
        for (const clueId of pattern.clueIds) expect(clueIds.has(clueId), clueId).toBe(true);
    });

    it(`${positionId} copy is paired in ko-KR and en-US`, () => {
      const keys = [
        ...content.decisions,
        ...content.patterns,
        ...content.clues,
        ...content.skills,
        ...content.events,
      ].flatMap(({ nameKey, descriptionKey }) => [nameKey, descriptionKey]);
      for (const key of keys) {
        expect(localeMessages['en-US'][key as never], key).toBeTruthy();
        expect(localeMessages['ko-KR'][key as never], key).toBeTruthy();
      }
    });

    it(`${positionId} games are deterministic and every decision is playable`, () => {
      const first = play(positionId, 'def-seed-a', (ids) => ids[0]!);
      const replay = play(positionId, 'def-seed-a', (ids) => ids[0]!);
      expect(replay).toEqual(first);
      for (const index of [0, 1, 2]) {
        const game = play(positionId, `def-seed-${index}`, (ids) => ids[index]!);
        if (game.type !== 'COMPLETE') continue;
        expect(game.summary.statLine.snaps).toBe(5);
        expect(game.summary.gradeScore).toBeGreaterThanOrEqual(0);
        expect(game.summary.gradeScore).toBeLessThanOrEqual(100);
        for (const snap of game.keyPlayLog) {
          const pattern = catalog.patterns.find(({ id }) => id === snap.patternId)!;
          if (pattern.playType === 'RUN')
            expect(['SACK', 'INTERCEPTION']).not.toContain(snap.playResult);
          else expect(snap.playResult).not.toBe('LOSS');
        }
      }
    });
  }
});

describe('M8 campus-life event pack', () => {
  it('ships 136 position-neutral events with paired copy and valid effects', () => {
    expect(lifeEventContent).toHaveLength(136);
    const ids = new Set<string>();
    for (const event of lifeEventContent) {
      expect(event.id.startsWith('event_life_')).toBe(true);
      expect(ids.has(event.id)).toBe(false);
      ids.add(event.id);
      for (const key of [event.nameKey, event.descriptionKey]) {
        expect(localeMessages['en-US'][key as never], key).toBeTruthy();
        expect(localeMessages['ko-KR'][key as never], key).toBeTruthy();
      }
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of event.choices) {
        expect(choice.id.startsWith(`event_choice_life_`)).toBe(true);
        for (const value of [
          choice.effects.bodyDelta,
          choice.effects.preparationDelta,
          choice.effects.confidenceDelta,
          choice.effects.coachTrustDelta,
          choice.effects.brandDelta,
        ])
          expect(Math.abs(value)).toBeLessThanOrEqual(30);
      }
    }
  });
});
