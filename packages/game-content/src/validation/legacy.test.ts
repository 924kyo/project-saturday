import {
  advanceCalendarVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitProgramVNext,
  continueGameVNext,
  createCareerVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  parseCareerVNext,
  planWeekVNext,
  projectSnapBoardFrame,
  recordBookVNext,
  serializeCareerVNext,
  snapshotLegacyVNext,
  toGameDayVNext,
  type AlumniVNext,
  type CareerVNext,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type ProgramId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { buildCareerVNextMechanics, defaultWrAppearance } from '../content/index.js';

function plaque(overrides: Partial<AlumniVNext>): AlumniVNext {
  return {
    careerId: 'career_alpha',
    displayName: 'Jordan Reyes',
    positionId: 'position_qb',
    archetypeId: 'archetype_qb_field_general',
    programIds: ['program_ironwood' as ProgramId],
    seasons: 4,
    championships: 0,
    bestFinish: 'MISSED',
    record: { wins: 20, losses: 28, ties: 0 },
    liveGames: 40,
    statTotals: [{ field: 'passingYards', value: 9000 }],
    finalOverall: 72,
    bestDepthRank: 1,
    ...overrides,
  };
}

const identity = {
  displayName: 'Casey Park',
  positionId: 'position_rb',
  archetypeId: 'archetype_rb_power_back',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_disciplined', 'personality_leader'],
  appearance: defaultWrAppearance,
  heightCm: 183,
  weightKg: 95,
} as PositionPlayerCreationIdentity;

describe('M9 legacy history', () => {
  it('snapshots the Alumni Wall defensively and builds a record book', () => {
    const alumni = [
      plaque({}),
      plaque({
        careerId: 'career_beta',
        displayName: 'Min-jun Kim',
        championships: 1,
        awards: ['award_all_american', 'award_all_conference_first'],
        draft: { round: 2, pick: 41, stockScore: 75 },
        statTotals: [{ field: 'passingYards', value: 9800 }],
      }),
      // A malformed stored entry is ignored, never trusted.
      { careerId: 42 } as unknown as AlumniVNext,
    ];
    const snapshot = snapshotLegacyVNext(alumni);
    expect(snapshot.alumni.map(({ careerId }) => careerId)).toEqual([
      'career_alpha',
      'career_beta',
    ]);
    expect(snapshot.alumni[1]).toMatchObject({ awards: 2, draftRound: 2, championships: 1 });
    const book = recordBookVNext(alumni);
    const holder = (id: string) => book.find(({ recordId }) => recordId === id)?.displayName;
    expect(holder('record_championships')).toBe('Min-jun Kim');
    expect(holder('record_best_pick')).toBe('Min-jun Kim');
    expect(holder('record_stat_passingYards')).toBe('Min-jun Kim');
    expect(holder('record_wins')).toBe('Jordan Reyes');
    // Negative stats and a QB's interceptions thrown are never records.
    const withBad = [
      plaque({
        statTotals: [
          { field: 'fumbles', value: 9 },
          { field: 'interceptions', value: 7 },
        ],
      }),
    ];
    expect(recordBookVNext(withBad).some(({ field }) => field !== undefined)).toBe(false);
    expect(recordBookVNext([])).toEqual([]);
  });

  it('saves the snapshot and brings a mentor from the current program into some weeks', () => {
    let mentors = 0;
    for (const seed of ['legacy-a', 'legacy-b', 'legacy-c']) {
      const mechanics = buildCareerVNextMechanics(identity)!;
      const ok = (result: CareerVNextResult): CareerVNext => {
        if (!result.ok) throw new Error(result.reason);
        return result.career;
      };
      const probe = ok(createCareerVNext({ seed, identity }, mechanics));
      const programId = probe.recruiting.offers[0]!.programId;
      const legacy = [plaque({ programIds: [programId] })];
      let career = ok(createCareerVNext({ seed, identity, legacy }, mechanics));
      expect(career.legacy?.alumni).toHaveLength(1);
      // Legacy never changes the athlete or the offers.
      expect(career.athlete).toEqual(probe.athlete);
      expect(career.recruiting).toEqual(probe.recruiting);
      career = ok(commitProgramVNext(career, programId, mechanics));
      for (let guard = 0; guard < 2_000 && career.season.weekIndex < 12; guard += 1) {
        const flow = career.flow;
        if (flow.type === 'EVENT' && flow.event.mentorCareerId !== undefined) {
          expect(flow.event.mentorCareerId).toBe('career_alpha');
          if (flow.event.chosenChoiceId === null) mentors += 1;
        }
        const step: CareerVNextResult =
          flow.type === 'WEEK_PLAN'
            ? (() => {
                const open = focusDefinitionsVNext(career, mechanics)
                  .map(({ id }) => id)
                  .filter((id) => isFocusAvailableVNext(career, id, mechanics));
                return planWeekVNext(career, [open[0]!, open[1]!, open[2]!], mechanics);
              })()
            : flow.type === 'CAMP' || flow.type === 'MIDSEASON'
              ? advanceCalendarVNext(career, mechanics)!
              : flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null
                ? chooseBreakthroughVNext(career, flow.offer.skillIds[0]!)
                : flow.type === 'EVENT' && flow.event.chosenChoiceId === null
                  ? chooseEventVNext(career, flow.event.choiceIds[0]!, mechanics)
                  : flow.type === 'NIL' && flow.offer.decision === null
                    ? chooseNilVNext(career, false, mechanics)
                    : flow.type === 'INJURY' && flow.report.availability === null
                      ? chooseInjuryVNext(career, 'injury_choice_rest_rehab', mechanics)
                      : flow.type === 'GAME'
                        ? flow.game.stage === 'PREGAME'
                          ? kickoffVNext(career, mechanics)
                          : flow.game.stage === 'SNAP'
                            ? chooseSnapVNext(
                                career,
                                projectSnapBoardFrame(career, mechanics)!.decisionIds[0]!,
                                mechanics,
                              )
                            : continueGameVNext(career, mechanics)
                        : flow.type === 'POST_GAME'
                          ? nextWeekVNext(career, mechanics)
                          : toGameDayVNext(career, mechanics);
        career = ok(step);
        if (flow.type === 'SEASON_REVIEW') break;
      }
      expect(parseCareerVNext(serializeCareerVNext(career)!)).toEqual(career);
    }
    expect(mentors).toBeGreaterThan(0);
  }, 300_000);
});
