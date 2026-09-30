import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import {
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  commitProgramVNext,
  createCareerVNext,
  createRng,
  createWorldAlphaSeason,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  parseCareerVNext,
  planWeekVNext,
  serializeCareerVNext,
  toGameDayVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type ProgramId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

/**
 * Checked save fixtures (M10). Each file is a save written by an earlier shape of Career VNext; every
 * future version must load it and keep playing. Regenerate only deliberately:
 * `WRITE_SAVE_FIXTURES=1 pnpm vitest run --project game-content save-fixtures`.
 */
const directory = new URL('./fixtures/', import.meta.url);
const identity = {
  displayName: 'Fixture Player',
  positionId: 'position_lb',
  archetypeId: 'archetype_lb_run_stopper',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_disciplined', 'personality_leader'],
  appearance: defaultWrAppearance,
  heightCm: 188,
  weightKg: 104,
} as PositionPlayerCreationIdentity;

function ok(result: CareerVNextResult): CareerVNext {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
}

/** Plays until the next week plan (one full week). */
function playWeek(career: CareerVNext, mechanics: CareerVNextMechanics): CareerVNext {
  const open = focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id)
    .filter((id) => isFocusAvailableVNext(career, id, mechanics));
  let next = ok(planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics));
  for (let guard = 0; guard < 200 && next.flow.type !== 'GAME'; guard += 1) {
    const flow = next.flow;
    next = ok(
      flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
        ? chooseBreakthroughVNext(next, flow.offer.skillIds[0]!)
        : flow.type === 'EVENT' && flow.event.chosenChoiceId === null
          ? chooseEventVNext(next, flow.event.choiceIds[0]!, mechanics)
          : flow.type === 'NIL' && flow.offer.decision === null
            ? chooseNilVNext(next, true, mechanics)
            : flow.type === 'INJURY' && flow.report.availability === null
              ? chooseInjuryVNext(next, 'injury_choice_rest_rehab', mechanics)
              : toGameDayVNext(next, mechanics),
    );
  }
  return next;
}

function generate(): Record<string, string> {
  const mechanics = buildCareerVNextMechanics(identity)!;
  const created = ok(createCareerVNext({ seed: 'fixture-seed', identity }, mechanics));
  // v1: recruiting, before the weekly condition and the season arc existed.
  const v1 = JSON.parse(serializeCareerVNext(created)!) as Record<string, unknown>;
  delete v1['condition'];
  delete v1['history'];
  const season = v1['season'] as Record<string, unknown>;
  delete season['startOverall'];
  delete season['startRank'];
  v1['version'] = 1;
  // Pre-M8 v3: an alpha-world season in progress, no NIL or legacy fields.
  const programId = mechanics.legacyWorld.programProfiles[3]!.programId as ProgramId;
  const withOffer = {
    ...created,
    recruiting: {
      ...created.recruiting,
      offers: [{ ...created.recruiting.offers[0]!, programId }],
    },
  };
  let alpha = ok(commitProgramVNext(withOffer, programId, mechanics));
  const legacyWorld = createWorldAlphaSeason(
    mechanics.legacyWorld,
    createRng('fixture-seed:vnext:world:0'),
    0,
    programId,
  );
  if (!legacyWorld.ok) throw new Error(legacyWorld.reason);
  alpha = { ...alpha, season: { ...alpha.season, world: legacyWorld.value } };
  const preM8 = JSON.parse(serializeCareerVNext(alpha)!) as Record<string, unknown>;
  delete preM8['nil'];
  // Current (M9): the 96-program world with legacy and NIL state, mid-week at Game Day.
  const legacyPlaque = {
    careerId: 'career_fixture_alumnus',
    displayName: 'Old Legend',
    positionId: 'position_qb',
    archetypeId: 'archetype_qb_field_general',
    programIds: [created.recruiting.offers[0]!.programId],
    seasons: 4,
    championships: 1,
    bestFinish: 'CHAMPION',
    record: { wins: 40, losses: 8, ties: 0 },
    liveGames: 44,
    statTotals: [{ field: 'passingYards', value: 11000 }],
    finalOverall: 80,
    bestDepthRank: 1,
  } as const;
  let current = ok(
    createCareerVNext(
      { seed: 'fixture-seed', identity, legacy: [legacyPlaque as never] },
      mechanics,
    ),
  );
  current = ok(commitProgramVNext(current, current.recruiting.offers[0]!.programId, mechanics));
  current = playWeek(current, mechanics);
  return {
    'career-vnext-v1-recruiting.json': JSON.stringify(v1),
    'career-vnext-v3-pre-m8-alpha-world.json': JSON.stringify(preM8),
    'career-vnext-v3-m9-game-day.json': serializeCareerVNext(current)!,
  };
}

describe('checked save fixtures', () => {
  if (process.env['WRITE_SAVE_FIXTURES'] === '1') {
    mkdirSync(directory, { recursive: true });
    for (const [name, json] of Object.entries(generate()))
      writeFileSync(new URL(name, directory), `${json}\n`, 'utf8');
  }

  for (const name of [
    'career-vnext-v1-recruiting.json',
    'career-vnext-v3-pre-m8-alpha-world.json',
    'career-vnext-v3-m9-game-day.json',
  ])
    it(`${name} still loads and keeps playing`, () => {
      const file = new URL(name, directory);
      expect(existsSync(file), name).toBe(true);
      const career = parseCareerVNext(readFileSync(file, 'utf8').trim());
      expect(career, name).not.toBeNull();
      const mechanics = buildCareerVNextMechanics(career!.athlete.profile as never)!;
      if (career!.flow.type === 'RECRUITING') {
        const committed = commitProgramVNext(
          career!,
          career!.recruiting.offers[0]!.programId,
          mechanics,
        );
        expect(committed.ok).toBe(true);
        return;
      }
      // Advance a step from wherever the save rests: a week plan plays a week; Game Day advances.
      const next =
        career!.flow.type === 'WEEK_PLAN'
          ? playWeek(career!, mechanics)
          : career!.flow.type === 'GAME'
            ? ok(kickoffVNext(career!, mechanics))
            : ok(toGameDayVNext(career!, mechanics));
      expect(serializeCareerVNext(next)).not.toBeNull();
    });
});
