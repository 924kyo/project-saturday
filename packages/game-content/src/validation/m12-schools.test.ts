import { describe, expect, it } from 'vitest';
import {
  advanceCalendarVNext,
  brandPermilleVNext,
  chooseBreakthroughVNext,
  chooseEventVNext,
  chooseInjuryVNext,
  chooseNilVNext,
  chooseSnapVNext,
  commitOffseasonVNext,
  commitProgramVNext,
  continueGameVNext,
  continueSeasonReviewVNext,
  createCareerVNext,
  decideMidseasonVNext,
  developmentPermilleVNext,
  draftExposureBonusVNext,
  focusDefinitionsVNext,
  isFocusAvailableVNext,
  kickoffVNext,
  nextWeekVNext,
  nilOfferChancePermilleVNext,
  notYetOfferVNext,
  offerFactsVNext,
  offerReasonsVNext,
  planWeekVNext,
  programSchemeVNext,
  projectSnapBoardFrame,
  recruitOfferTargetVNext,
  roomMechanicsVNext,
  schemeFitBandVNext,
  scoutingReportVNext,
  toGameDayVNext,
  transferMarketVNext,
  VNEXT_OFFER_TUNING,
  VNEXT_PROGRAM_TUNING,
  type CareerVNext,
  type CareerVNextMechanics,
  type CareerVNextResult,
  type PositionPlayerCreationIdentity,
  type ProgramId,
  type ProgramProfileVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
  positionAlphaContent,
  profileValueKeyVNext,
  programProfilesVNext,
  schemeNameKeyVNext,
  schemesVNext,
  worldVNext96MechanicsDefinition,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

const ok = (result: CareerVNextResult): CareerVNext => {
  if (!result.ok) throw new Error(result.reason);
  return result.career;
};

function identity(
  positionId: VNextPositionId = 'position_cb',
  archetypeId = 'archetype_cb_press_man',
): PositionPlayerCreationIdentity {
  return {
    displayName: 'School Probe',
    positionId,
    archetypeId,
    recruitingBackgroundId: 'background_late_bloomer',
    personalityTraitIds: ['personality_disciplined', 'personality_leader'],
    appearance: defaultWrAppearance,
    heightCm: 186,
    weightKg: 88,
  } as PositionPlayerCreationIdentity;
}

/** Commits the same recruit to any program (the offer list is only the menu). */
function at(created: CareerVNext, programId: ProgramId, mechanics: CareerVNextMechanics) {
  const offers = created.recruiting.offers.some((offer) => offer.programId === programId)
    ? created.recruiting.offers
    : [...created.recruiting.offers, { ...created.recruiting.offers[0]!, programId }];
  const committed = ok(
    commitProgramVNext(
      { ...created, recruiting: { ...created.recruiting, offers } },
      programId,
      mechanics,
    ),
  );
  let current = committed;
  // Camp: the coach's plan, then its report.
  while (current.flow.type === 'CAMP') current = ok(advanceCalendarVNext(current, mechanics)!);
  return current;
}

function plan(career: CareerVNext, mechanics: CareerVNextMechanics): string[] {
  const open = focusDefinitionsVNext(career, mechanics)
    .map(({ id }) => id as string)
    .filter((id) => isFocusAvailableVNext(career, id, mechanics));
  const drills = focusDefinitionsVNext(career, mechanics)
    .filter((entry) => 'positionId' in entry)
    .map(({ id }) => id as string)
    .filter((id) => open.includes(id));
  const picks = [drills[0] ?? open[0]!, 'action_film_study', 'action_recovery'].filter((id) =>
    open.includes(id),
  );
  while (picks.length < 3) picks.push(open.find((id) => !picks.includes(id))!);
  return picks;
}

/** Plays one season with default choices and stops at the offseason. */
function toOffseason(career: CareerVNext, mechanics: CareerVNextMechanics): CareerVNext {
  let current = career;
  for (let guard = 0; guard < 4_000 && current.flow.type !== 'OFFSEASON'; guard += 1) {
    const flow = current.flow;
    if (flow.type === 'CAMP') current = ok(advanceCalendarVNext(current, mechanics)!);
    else if (flow.type === 'MIDSEASON') current = ok(decideMidseasonVNext(current, false));
    else if (flow.type === 'WEEK_PLAN')
      current = ok(planWeekVNext(current, plan(current, mechanics), mechanics));
    else if (flow.type === 'BREAKTHROUGH' && flow.offer.chosenSkillId === null)
      current = ok(chooseBreakthroughVNext(current, flow.offer.skillIds[0]!));
    else if (flow.type === 'EVENT' && flow.event.chosenChoiceId === null)
      current = ok(chooseEventVNext(current, flow.event.choiceIds[0]!, mechanics));
    else if (flow.type === 'NIL' && flow.offer.decision === null)
      current = ok(chooseNilVNext(current, false, mechanics));
    else if (flow.type === 'INJURY' && flow.report.availability === null)
      current = ok(chooseInjuryVNext(current, 'injury_choice_rest_rehab', mechanics));
    else if (flow.type === 'GAME') {
      if (flow.game.stage === 'PREGAME') current = ok(kickoffVNext(current, mechanics));
      else if (flow.game.stage === 'SNAP') {
        const frame = projectSnapBoardFrame(current, mechanics)!;
        current = ok(chooseSnapVNext(current, frame.decisionIds[0]!, mechanics));
      } else current = ok(continueGameVNext(current, mechanics));
    } else if (flow.type === 'POST_GAME') current = ok(nextWeekVNext(current, mechanics));
    else if (flow.type === 'SEASON_REVIEW')
      current = ok(continueSeasonReviewVNext(current, mechanics));
    else current = ok(toGameDayVNext(current, mechanics));
  }
  return current;
}

const xpOf = (career: CareerVNext) =>
  Object.values(
    career.athlete.profile.attributes as unknown as Record<string, { rating: number; xp: number }>,
  ).reduce((sum, { rating, xp }) => sum + rating * 100 + xp, 0);

describe('M12 program profiles (REC-02)', () => {
  it('cover all 96 programs, and every style is ideal in exactly one scheme of its side', () => {
    const ids = worldVNext96MechanicsDefinition.programProfiles.map(({ programId }) => programId);
    expect(programProfilesVNext.map(({ programId }) => programId).sort()).toEqual([...ids].sort());
    for (const { id: positionId, archetypeIds } of positionAlphaContent.positions) {
      if (
        ![
          'position_qb',
          'position_rb',
          'position_wr',
          'position_cb',
          'position_lb',
          'position_edge',
        ].includes(positionId)
      )
        continue;
      const side = ['position_qb', 'position_rb', 'position_wr'].includes(positionId)
        ? 'offense'
        : 'defense';
      for (const archetypeId of archetypeIds) {
        const ideal = schemesVNext.filter(
          (scheme) => scheme.side === side && scheme.idealArchetypeIds.includes(archetypeId),
        );
        expect(ideal, archetypeId).toHaveLength(1);
        expect(
          schemesVNext.some(
            (scheme) =>
              scheme.idealArchetypeIds.includes(archetypeId) &&
              scheme.poorArchetypeIds.includes(archetypeId),
          ),
        ).toBe(false);
      }
    }
    // Every value is used somewhere, so each tradeoff is reachable.
    for (const facet of [
      'offenseSchemeId',
      'defenseSchemeId',
      'developmentTierId',
      'exposureTierId',
      'academicSupportId',
      'nilMarketId',
    ] as const)
      expect(new Set(programProfilesVNext.map((row) => row[facet])).size).toBeGreaterThan(2);
  });

  it('ships copy for every scheme and profile value in both languages', () => {
    for (const locale of ['en-US', 'ko-KR'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      for (const { id } of schemesVNext) expect(messages[schemeNameKeyVNext(id)], id).toBeTruthy();
      for (const row of programProfilesVNext) {
        expect(messages[profileValueKeyVNext('development', row.developmentTierId)]).toBeTruthy();
        expect(messages[profileValueKeyVNext('exposure', row.exposureTierId)]).toBeTruthy();
        expect(messages[profileValueKeyVNext('academics', row.academicSupportId)]).toBeTruthy();
        expect(messages[profileValueKeyVNext('nilMarket', row.nilMarketId)]).toBeTruthy();
      }
    }
  });
});

describe('the same athlete at two programs (REC-02 harness)', () => {
  const id = identity('position_cb', 'archetype_cb_press_man');
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = ok(createCareerVNext({ seed: 'two-schools', identity: id }, mechanics));
  const score = (row: ProgramProfileVNext) =>
    (row.developmentTierId === 'development_elite' ? 1 : 0) +
    (row.exposureTierId === 'exposure_national' ? 1 : 0) +
    (row.nilMarketId === 'nil_market_major' ? 1 : 0) +
    (row.academicSupportId === 'academics_strong' ? 1 : 0) +
    (row.defenseSchemeId === 'scheme_press_man' ? 1 : 0);
  const sorted = [...programProfilesVNext].sort(
    (left, right) => score(right) - score(left) || left.programId.localeCompare(right.programId),
  );
  const rich = sorted[0]!;
  const lean = sorted.at(-1)!;

  it('picks two programs that differ on every facet', () => {
    expect(score(rich)).toBeGreaterThanOrEqual(4);
    expect(score(lean)).toBe(0);
  });

  it('gets different XP, scheme fit, brand, NIL chance and draft exposure', () => {
    const a = at(created, rich.programId, mechanics);
    const b = at(created, lean.programId, mechanics);
    expect(a.flow.type).toBe('WEEK_PLAN');
    // Scheme fit: the stored depth component follows each program's scheme.
    const fit = (career: CareerVNext) =>
      career.program!.room.evaluations.find(
        ({ participantId }) => participantId === career.program!.room.playerId,
      )!.components.schemeFit;
    expect(fit(a)).toBeGreaterThan(fit(b));
    // XP: the same plan grows more at an elite developer.
    const picks = plan(a, mechanics);
    const gainA = xpOf(ok(planWeekVNext(a, picks, mechanics))) - xpOf(a);
    const gainB = xpOf(ok(planWeekVNext(b, picks, mechanics))) - xpOf(b);
    expect(developmentPermilleVNext(a, mechanics)).toBeGreaterThan(
      developmentPermilleVNext(b, mechanics),
    );
    expect(gainA).toBeGreaterThan(gainB);
    expect(brandPermilleVNext(mechanics, rich.programId)).toBeGreaterThan(
      brandPermilleVNext(mechanics, lean.programId),
    );
    expect(nilOfferChancePermilleVNext(mechanics, rich.programId)).toBeGreaterThan(
      nilOfferChancePermilleVNext(mechanics, lean.programId),
    );
    expect(draftExposureBonusVNext(mechanics, rich.programId)).toBeGreaterThan(
      draftExposureBonusVNext(mechanics, lean.programId),
    );
  });

  it('scales the study-hall GPA gain by academic support (DEV-08)', () => {
    const gain = (programId: ProgramId) => {
      const career = at(created, programId, mechanics);
      const lowered = {
        ...career,
        athlete: {
          ...career.athlete,
          profile: {
            ...career.athlete.profile,
            state: { ...career.athlete.profile.state, gpa: 2.5 },
          },
        },
      };
      const after = ok(
        planWeekVNext(
          lowered,
          ['action_study_hall', 'action_film_study', 'action_recovery'],
          mechanics,
        ),
      );
      return after.athlete.profile.state.gpa - 2.5;
    };
    const strong = programProfilesVNext.find(
      (row) => row.academicSupportId === 'academics_strong',
    )!;
    const limited = programProfilesVNext.find(
      (row) => row.academicSupportId === 'academics_limited',
    )!;
    const high = gain(strong.programId);
    const low = gain(limited.programId);
    expect(high).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(high / low).toBeCloseTo(
      VNEXT_PROGRAM_TUNING.studyGpaPermille.academics_strong /
        VNEXT_PROGRAM_TUNING.studyGpaPermille.academics_limited,
      1,
    );
  });
});

describe('coordinator changes (REC-07)', () => {
  const mechanics = buildCareerVNextMechanics(identity())!;
  it('replay deterministically, change about one side in five, and move fits that season', () => {
    let changes = 0;
    let samples = 0;
    let moved: { programId: ProgramId; season: number } | null = null;
    for (const { programId } of programProfilesVNext)
      for (const season of [1, 2, 3]) {
        const scheme = programSchemeVNext('coord', programId, 'position_cb', season, mechanics)!;
        expect(programSchemeVNext('coord', programId, 'position_cb', season, mechanics)).toEqual(
          scheme,
        );
        samples += 1;
        if (scheme.previousSchemeId !== null) {
          changes += 1;
          moved ??= { programId, season };
        }
      }
    expect(changes / samples).toBeGreaterThan(0.1);
    expect(changes / samples).toBeLessThan(0.3);
    const { programId, season } = moved!;
    const before = roomMechanicsVNext(mechanics, 'coord', programId, 'position_cb', season - 1);
    const after = roomMechanicsVNext(mechanics, 'coord', programId, 'position_cb', season);
    expect(after.schemeFitByArchetype).not.toEqual(before.schemeFitByArchetype);
  });
});

describe('offers explained (REC-01, REC-03)', () => {
  it('names reasons that match the generator, facts from the profile, and a reachable gap', () => {
    for (const [positionId, archetypeId] of [
      ['position_cb', 'archetype_cb_press_man'],
      ['position_qb', 'archetype_qb_gunslinger'],
      ['position_rb', 'archetype_rb_power_back'],
    ] as const)
      for (const seed of ['why-1', 'why-2', 'why-3']) {
        const id = identity(positionId, archetypeId);
        const mechanics = buildCareerVNextMechanics(id)!;
        const career = ok(createCareerVNext({ seed, identity: id }, mechanics));
        const target = scoutingReportVNext(career.athlete.profile, mechanics)!.offerTarget;
        const bands = VNEXT_OFFER_TUNING.recruit;
        for (const offer of career.recruiting.offers) {
          const gap = offer.programRating - target;
          const band = offerReasonsVNext(career, offer, mechanics)[0]!.id;
          expect(band).toBe(
            gap > bands.reachAbove ? 'reach' : gap < bands.roleBelow ? 'early_role' : 'fit',
          );
          const facts = offerFactsVNext(career, offer, mechanics);
          expect(facts.starterSeasonsLeft).toBe(4 - offer.preview.starterClassYear);
          expect(facts.lastSeason).toBeNull();
          expect(facts.fit).toBe(
            schemeFitBandVNext(
              programSchemeVNext(seed, offer.programId, positionId, 0, mechanics)!.schemeId,
              archetypeId,
              mechanics,
            ),
          );
        }
        const notYet = notYetOfferVNext(career, career.recruiting.offers, mechanics);
        if (notYet === null) continue;
        expect(notYet.programRating).toBeGreaterThan(target + bands.reachTop);
        expect(recruitOfferTargetVNext(notYet.needed) + bands.reachTop).toBeGreaterThanOrEqual(
          notYet.programRating,
        );
        if (notYet.needed > notYet.current)
          expect(recruitOfferTargetVNext(notYet.needed - 1) + bands.reachTop).toBeLessThan(
            notYet.programRating,
          );
      }
  });
});

describe('the transfer market and transfer consequences (REC-04, REC-05)', () => {
  const id = identity('position_cb', 'archetype_cb_press_man');
  const mechanics = buildCareerVNextMechanics(id)!;
  const created = ok(createCareerVNext({ seed: 'market', identity: id }, mechanics));
  const offseason = toOffseason(
    ok(commitProgramVNext(created, created.recruiting.offers[1]!.programId, mechanics)),
    mechanics,
  );

  it('reads ability plus the season, and a better season brings stronger offers', () => {
    expect(offseason.flow.type).toBe('OFFSEASON');
    const market = transferMarketVNext(offseason, mechanics)!;
    expect(market.target).toBe(
      market.abilityTerm +
        market.awardTerm +
        market.roleTerm +
        market.gradeTerm +
        market.exposureTerm,
    );
    // The same athlete after a decorated, well-graded season.
    const review = offseason.history.at(-1)!;
    const better: CareerVNext = {
      ...offseason,
      flow: { type: 'SEASON_REVIEW', review },
      history: [
        ...offseason.history.slice(0, -1),
        {
          ...review,
          averageGrade: 85,
          awards: ['award_all_conference_first_team', 'award_freshman_of_the_year'] as never,
        },
      ],
    };
    const strong = transferMarketVNext(better, mechanics)!;
    expect(strong.target).toBeGreaterThan(market.target);
    const options = (career: CareerVNext) => {
      const next = ok(continueSeasonReviewVNext(career, mechanics));
      if (next.flow.type !== 'OFFSEASON') throw new Error(next.flow.type);
      const transfers = next.flow.options.filter(({ kind }) => kind === 'TRANSFER');
      return transfers.reduce((sum, option) => sum + option.programRating, 0) / transfers.length;
    };
    expect(options(better)).toBeGreaterThan(
      options({ ...offseason, flow: { type: 'SEASON_REVIEW', review } }),
    );
  });

  it('a transfer resets trust and opens camp behind on the playbook; staying keeps both', () => {
    if (offseason.flow.type !== 'OFFSEASON') throw new Error('not offseason');
    const stayId = offseason.flow.options.find(({ kind }) => kind === 'STAY')!.programId;
    const moveId = offseason.flow.options.find(({ kind }) => kind === 'TRANSFER')!.programId;
    const stay = ok(commitOffseasonVNext(offseason, stayId, mechanics));
    const move = ok(commitOffseasonVNext(offseason, moveId, mechanics));
    expect(stay.athlete.profile.state.preparation - move.athlete.profile.state.preparation).toBe(
      -VNEXT_PROGRAM_TUNING.transferPreparation,
    );
    expect(stay.athlete.profile.state.coachTrust).not.toBe(move.athlete.profile.state.coachTrust);
    expect(move.program!.programId).toBe(moveId);
    // The new school's scheme sets the athlete's fit for the season.
    const scheme = programSchemeVNext(
      move.seed,
      moveId,
      'position_cb',
      move.season.index,
      mechanics,
    )!;
    const fit = move.program!.room.evaluations.find(
      ({ participantId }) => participantId === move.program!.room.playerId,
    )!.components.schemeFit;
    expect(fit).toBe(
      roomMechanicsVNext(mechanics, move.seed, moveId, 'position_cb', move.season.index)
        .schemeFitByArchetype['archetype_cb_press_man'],
    );
    expect(scheme).not.toBeNull();
  });
});
