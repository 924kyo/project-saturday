import { describe, expect, it } from 'vitest';
import {
  commitProgramVNext,
  createCareerVNext,
  rivalWeekVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';

import {
  PROGRAM_EMBLEMS,
  buildCareerVNextMechanics,
  defaultWrAppearance,
  programCultureRowsVNext,
  programCultureVNext,
  programIdentitiesVNext,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

describe('program culture', () => {
  it('gives every program a unique mascot, an emblem, a tradition and atmosphere, in both languages', () => {
    const en = localeMessages['en-US'] as Record<string, string>;
    const ko = localeMessages['ko-KR'] as Record<string, string>;
    expect(programCultureRowsVNext).toHaveLength(programIdentitiesVNext.length);
    const mascots = new Set<string>();
    for (const identity of programIdentitiesVNext) {
      const culture = programCultureVNext(identity.id);
      expect(culture, identity.id).not.toBeNull();
      expect(PROGRAM_EMBLEMS).toContain(culture!.emblem);
      for (const key of [culture!.mascotKey, culture!.traditionKey, ...culture!.atmosphereKeys]) {
        expect(en[key], key).toBeTruthy();
        expect(ko[key], key).toBeTruthy();
      }
      expect(culture!.atmosphereKeys.length).toBeGreaterThanOrEqual(2);
      expect(culture!.atmosphereKeys.length).toBeLessThanOrEqual(3);
      mascots.add(en[culture!.mascotKey]!);
    }
    expect(mascots.size).toBe(programIdentitiesVNext.length);
    // A small art set covers the world: every emblem is used, none by more than twelve programs.
    for (const emblem of PROGRAM_EMBLEMS) {
      const users = programCultureRowsVNext.filter((row) => row.emblem === emblem).length;
      expect(users, emblem).toBeGreaterThan(0);
      expect(users, emblem).toBeLessThanOrEqual(12);
    }
  });
});

describe('the room competes', () => {
  const identity = {
    displayName: 'Room Probe',
    positionId: 'position_rb',
    archetypeId: 'archetype_rb_power_back',
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 185,
    weightKg: 95,
  } as PositionPlayerCreationIdentity;
  const mechanics = buildCareerVNextMechanics(identity)!;
  const ok = (result: CareerVNextResult): CareerVNext => {
    if (!result.ok) throw new Error(result.reason);
    return result.career;
  };
  const created = ok(createCareerVNext({ seed: 'rivals-probe', identity }, mechanics));
  const career = ok(
    commitProgramVNext(created, created.recruiting.offers[0]!.programId, mechanics),
  );
  const room = career.program!.room;

  it('moves teammates by a named stream: same week, same room', () => {
    const once = rivalWeekVNext(room, career.seed, 0, 3, mechanics.room);
    expect(rivalWeekVNext(room, career.seed, 0, 3, mechanics.room)).toEqual(once);
    expect(once.competitors.map(({ practiceForm }) => practiceForm)).not.toEqual(
      room.competitors.map(({ practiceForm }) => practiceForm),
    );
    // The athlete keeps their slot; practice (not this draw) moves them.
    const slot = (value: typeof room) => value.depthOrderIds.indexOf(value.playerId);
    expect(slot(once)).toBe(slot(room));
    expect(once.evaluations.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('lets the room grow over a season, youngest fastest', () => {
    // Growth is a per-player chance by class year, so the claim is about many rooms, not one:
    // twelve rooms (four seeds × three programs), one season each.
    let younger = 0;
    let older = 0;
    let anyGrowth = false;
    for (const seed of ['rivals-probe', 'rivals-a', 'rivals-b', 'rivals-c']) {
      const fresh = ok(createCareerVNext({ seed, identity }, mechanics));
      for (const offer of fresh.recruiting.offers.slice(0, 3)) {
        const start = ok(commitProgramVNext(fresh, offer.programId, mechanics)).program!.room;
        let current = start;
        for (let week = 0; week < 12; week += 1)
          current = rivalWeekVNext(current, seed, 0, week, mechanics.room);
        for (const entry of current.competitors) {
          const before = start.competitors.find(({ id }) => id === entry.id)!;
          const gain = entry.talentFit - before.talentFit;
          if (gain > 0) anyGrowth = true;
          if (entry.classYear <= 2) younger += gain;
          else older += gain;
        }
      }
    }
    expect(anyGrowth).toBe(true);
    expect(younger).toBeGreaterThan(older);
  });
});
