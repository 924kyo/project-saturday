import {
  assessWeeklyInjury,
  sampleInjuryOutcome,
  deriveInjuryChoiceAvailability,
  advanceInjuryDuration,
  beginRecruiting,
  bootstrapSeason,
  commitProgramChoice,
  commitWeeklyActionPlan,
  createCareerSession,
  createRng,
  createWrCareer,
  deriveInjuryRiskComponents,
  isInjuryOutcomeMechanicsDefinitionCatalog,
  isWeeklyActionAvailableForCurrentInjury,
  nextInt,
  parseCareerRun,
  migrateCareerRunV7ToV8,
  parseCareerRunV8,
  resolveInjuryChoice,
  resolveNextWeeklyAction,
  validateCareerRun,
  type CareerRun,
  type CareerSession,
  type InjuryCommandResult,
  type InjuryTuningDefinition,
  type NewInjuryEvidence,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  advanceShippedCampRound,
  buildWrCreationMechanics,
  contentManifest,
  defaultWrCreationIdentity,
  developmentWeekConfig,
  injuryContent,
  injuryOutcomeMechanicsDefinitions,
  injuryTuning,
  offenseStyleMechanicsDefinitions,
  programMechanicsDefinitions,
  recruitingMechanicsConfig,
  resolveShippedEventChoice,
  rosterNameMechanicsPool,
  rotationPolicyMechanicsDefinitions,
  seasonMechanicsDefinition,
  selectShippedWeeklyEvent,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import { validateContent } from './content.js';

function expectSuccess<T extends { readonly ok: boolean }>(
  result: T,
): asserts result is T & { readonly ok: true } {
  expect(result).toEqual(expect.objectContaining({ ok: true }));
}

function createCommittedSession(seed: string): CareerSession {
  const mechanics = buildWrCreationMechanics({
    archetypeId: defaultWrCreationIdentity.archetypeId,
    personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
  });
  expectSuccess(mechanics);
  const created = createWrCareer({
    careerSeed: seed,
    identity: { ...defaultWrCreationIdentity, displayName: 'Injury Test' },
    mechanics: mechanics.mechanics,
  });
  expectSuccess(created);
  const choosing = beginRecruiting(
    created.career,
    recruitingMechanicsConfig,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
  );
  expectSuccess(choosing);
  if (choosing.career.recruitingState.type !== 'CHOOSING') {
    throw new TypeError('Expected choosing state.');
  }
  const committed = commitProgramChoice(
    choosing.career,
    choosing.career.recruitingState.offers[0].programId,
    programMechanicsDefinitions,
    offenseStyleMechanicsDefinitions,
    rotationPolicyMechanicsDefinitions,
    rosterNameMechanicsPool,
  );
  expectSuccess(committed);
  const bootstrapped = bootstrapSeason(
    createCareerSession(committed.career),
    seasonMechanicsDefinition,
  );
  expectSuccess(bootstrapped);
  return bootstrapped.session;
}

function completeEventWeek(seed: string): CareerSession {
  let session = createCommittedSession(seed);
  const actionIds = ['action_recovery', 'action_film_study', 'action_route_drills'] as const;
  const committed = commitWeeklyActionPlan(
    session.career,
    actionIds,
    weeklyActionDefinitions.map(({ id }) => id),
  );
  expectSuccess(committed);
  let career = committed.career;
  for (const actionId of actionIds) {
    const definition = weeklyActionDefinitions.find(({ id }) => id === actionId)!;
    const resolved = resolveNextWeeklyAction(
      career,
      definition,
      developmentWeekConfig,
      skillMechanicsDefinitions,
      offenseStyleMechanicsDefinitions,
      rotationPolicyMechanicsDefinitions,
    );
    expectSuccess(resolved);
    career = resolved.career;
  }
  session = { ...session, career };
  const selected = selectShippedWeeklyEvent(session);
  expectSuccess(selected);
  if (selected.session.career.phase.type !== 'EVENT_CHOICE') return selected.session;
  const resolved = resolveShippedEventChoice(
    selected.session,
    selected.session.career.phase.pendingEvent.choiceIds[0]!,
  );
  expectSuccess(resolved);
  return resolved.session;
}

function withRng(session: CareerSession, seed: string): CareerSession {
  return {
    ...session,
    career: {
      ...session.career,
      rng: { ...createRng(seed), drawCount: session.career.rng.drawCount },
    },
  };
}

type DeepMutable<T> = T extends object ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> } : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function findAssessment(
  session: CareerSession,
  tuning: InjuryTuningDefinition,
  predicate: (career: CareerRun) => boolean,
): InjuryCommandResult & { readonly ok: true } {
  for (let index = 0; index < 500; index += 1) {
    const candidate = withRng(session, `injury-search-${index}`);
    const result = assessWeeklyInjury(
      candidate.career,
      injuryOutcomeMechanicsDefinitions,
      tuning,
      skillMechanicsDefinitions,
    );
    if (result.ok && predicate(result.career)) return result;
  }
  throw new Error('Expected a matching deterministic injury assessment within 500 seeds.');
}

const GUARANTEED_RISK_TUNING = {
  ...injuryTuning,
  baseRiskPermille: 500,
  positionExposurePermille: 0,
  bodyDeficitWeightPermille: 0,
  durabilityDeficitWeightPermille: 0,
  workloadWeightPermille: 0,
  trainingLoadWeightPermille: 0,
  passiveRecoveryRiskWeightPermille: 0,
  maximumRiskPermille: 500,
} as const satisfies InjuryTuningDefinition;

describe('M5 injury and recovery foundation', () => {
  it('shares exact catalog samples and limited-choice evidence with the established WR command', () => {
    const base = completeEventWeek('shared-injury-resolution');
    const tuning = { ...injuryTuning, baseRiskPermille: 500, maximumRiskPermille: 500 };
    const observed = new Set<string>();
    for (let index = 0; index < 40; index += 1) {
      const session = withRng(base, `shared-injury-${index}`);
      const components = deriveInjuryRiskComponents(
        session.career,
        tuning,
        skillMechanicsDefinitions,
      )!;
      const before = JSON.stringify(session);
      const sampled = sampleInjuryOutcome(
        components.totalRiskPermille,
        injuryOutcomeMechanicsDefinitions,
        session.career.rng,
      );
      expectSuccess(sampled);
      expect(
        sampleInjuryOutcome(
          components.totalRiskPermille,
          [...injuryOutcomeMechanicsDefinitions].reverse(),
          session.career.rng,
        ),
      ).toEqual(sampled);
      const resolved = assessWeeklyInjury(
        session.career,
        injuryOutcomeMechanicsDefinitions,
        tuning,
        skillMechanicsDefinitions,
      );
      expectSuccess(resolved);
      if (resolved.career.seasonCareerState.bootstrapStatus !== 'ACTIVE')
        throw new Error('Missing active injury state');
      const assessment = resolved.career.seasonCareerState.injuryState.lastAssessment!;
      if (assessment.outcome === 'ONGOING') throw new Error('Unexpected ongoing fixture');
      observed.add(assessment.outcome);
      expect(assessment.riskRoll).toBe(sampled.sample.riskRoll);
      expect(assessment.selectedOutcomeId).toBe(sampled.sample.selectedOutcome?.id ?? null);
      expect(assessment.outcomeSelectionRoll).toBe(sampled.sample.outcomeSelectionRoll);
      expect(assessment.eligibleOutcomeIds).toEqual(sampled.sample.eligibleOutcomeIds);
      expect(assessment.totalEligibleWeight).toBe(sampled.sample.totalEligibleWeight);
      expect(assessment.rngDrawCountBefore).toBe(sampled.sample.rngDrawCountBefore);
      expect(assessment.rngDrawCountAfter).toBe(sampled.sample.rngDrawCountAfter);
      expect(resolved.career.rng).toEqual(sampled.sample.rng);
      if (resolved.career.phase.type === 'INJURY_CHOICE') {
        observed.add('LIMITED_CHOICE');
        for (const choiceId of resolved.career.phase.pendingInjury.choiceIds) {
          const expected = deriveInjuryChoiceAvailability(
            resolved.career.player.state,
            resolved.career.weekIndex,
            sampled.sample.selectedOutcome!,
            choiceId,
            tuning,
          );
          const chosen = resolveInjuryChoice(
            resolved.career,
            choiceId,
            injuryOutcomeMechanicsDefinitions,
            tuning,
          );
          expectSuccess(chosen);
          if (chosen.career.seasonCareerState.bootstrapStatus !== 'ACTIVE')
            throw new Error('Missing chosen injury state');
          expect(chosen.career.seasonCareerState.injuryState.lastAvailability).toEqual(expected);
          expect(chosen.career.rng).toEqual(resolved.career.rng);
        }
      }
      expect(JSON.stringify(session)).toBe(before);
    }
    expect(observed).toEqual(new Set(['NO_INJURY', 'INJURY', 'LIMITED_CHOICE']));
  });

  it('rejects invalid shared sampling input and exhaustion without caller mutation', () => {
    const rng = jsonClone(createRng('shared-injury-invalid'));
    const catalog = jsonClone(injuryOutcomeMechanicsDefinitions);
    const before = JSON.stringify({ rng, catalog });
    for (const risk of [-1, 1_001, 0.5, Number.NaN])
      expect(sampleInjuryOutcome(risk, catalog, rng)).toEqual({
        ok: false,
        reason: 'injury.invalid_risk',
      });
    expect(sampleInjuryOutcome(50, [], rng)).toEqual({
      ok: false,
      reason: 'injury.invalid_definitions',
    });
    expect(
      sampleInjuryOutcome(50, catalog, { ...rng, drawCount: Number.MAX_SAFE_INTEGER }),
    ).toEqual({ ok: false, reason: 'injury.rng_exhausted' });
    const zero = sampleInjuryOutcome(0, catalog, rng);
    expectSuccess(zero);
    expect(zero.sample.selectedOutcome).toBeNull();
    expect(zero.sample.rngDrawCountAfter - rng.drawCount).toBe(1);
    expect(Object.isFrozen(zero.sample.rng)).toBe(true);
    expect(Object.isFrozen(rng)).toBe(false);
    expect(Object.isFrozen(catalog[0])).toBe(false);
    expect(JSON.stringify({ rng, catalog })).toBe(before);
  });

  it('shares bounded recovery duration without rewriting onset history', () => {
    const outcome = injuryOutcomeMechanicsDefinitions.find(
      ({ durationWeeks }) => durationWeeks >= 3,
    )!;
    const injury: NewInjuryEvidence = {
      outcomeId: outcome.id,
      severityId: outcome.severityId,
      startedWeekIndex: 4,
      originalDurationWeeks: outcome.durationWeeks,
      remainingWeeks: outcome.durationWeeks,
      defaultAvailabilityId: outcome.availabilityId,
      opportunityCap: outcome.opportunityCap,
    };
    const before = JSON.stringify(injury);
    expect(advanceInjuryDuration(injury, 0)).toEqual({
      ...injury,
      remainingWeeks: injury.remainingWeeks - 1,
    });
    expect(advanceInjuryDuration({ ...injury, remainingWeeks: 2 }, 1)).toBeNull();
    expect(advanceInjuryDuration({ ...injury, remainingWeeks: 1 }, 0)).toBeNull();
    for (const credit of [-1, 4, 0.5, Number.NaN])
      expect(() => advanceInjuryDuration(injury, credit)).toThrow(RangeError);
    expect(JSON.stringify(injury)).toBe(before);
    const limited = injuryOutcomeMechanicsDefinitions.find(
      ({ availabilityId }) => availabilityId === 'injury_availability_limited',
    )!;
    const nearBounds = { body: 99, confidence: 1, coachTrust: 99 };
    const rest = deriveInjuryChoiceAvailability(
      nearBounds,
      1,
      limited,
      'injury_choice_rest_rehab',
      injuryTuning,
    )!;
    expect(rest.bodyAfter).toBeLessThanOrEqual(100);
    expect(rest.confidenceAfter).toBeGreaterThanOrEqual(0);
    expect(
      deriveInjuryChoiceAvailability(
        { ...nearBounds, body: -1 },
        1,
        limited,
        'injury_choice_rest_rehab',
        injuryTuning,
      ),
    ).toBeNull();
  });
  it('ships eight original outcomes, two choices, four severities, and complete paired locale copy', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(injuryContent.outcomes).toHaveLength(8);
    expect(injuryContent.choices).toHaveLength(2);
    expect(isInjuryOutcomeMechanicsDefinitionCatalog(injuryOutcomeMechanicsDefinitions)).toBe(true);
    expect(new Set(injuryContent.outcomes.map(({ severityId }) => severityId))).toEqual(
      new Set([
        'injury_severity_minor_restriction',
        'injury_severity_short_absence',
        'injury_severity_multiweek_absence',
        'injury_severity_season_impact',
      ]),
    );
    expect(validateContent({ manifest: contentManifest, localeResources: localeMessages })).toEqual(
      { issues: [], ok: true },
    );
    for (const definition of [...injuryContent.choices, ...injuryContent.outcomes]) {
      for (const locale of ['ko-KR', 'en-US'] as const) {
        const messages = localeMessages[locale] as Readonly<Record<string, string>>;
        expect(messages[definition.nameKey]).toBeTruthy();
        expect(messages[definition.descriptionKey]).toBeTruthy();
      }
    }
  });

  it('uses one draw for no injury, preserves input immutability, and canonicalizes outcome order', () => {
    const session = completeEventWeek('injury-no-hit');
    const noRiskTuning = {
      ...injuryTuning,
      baseRiskPermille: 0,
      positionExposurePermille: 0,
      bodyDeficitWeightPermille: 0,
      durabilityDeficitWeightPermille: 0,
      workloadWeightPermille: 0,
      trainingLoadWeightPermille: 0,
      passiveRecoveryRiskWeightPermille: 0,
      maximumRiskPermille: 1,
    } as const satisfies InjuryTuningDefinition;
    const before = JSON.stringify(session.career);
    const first = assessWeeklyInjury(
      session.career,
      injuryOutcomeMechanicsDefinitions,
      noRiskTuning,
      skillMechanicsDefinitions,
    );
    const reordered = assessWeeklyInjury(
      session.career,
      [...injuryOutcomeMechanicsDefinitions].reverse(),
      noRiskTuning,
      skillMechanicsDefinitions,
    );
    expectSuccess(first);
    expectSuccess(reordered);
    expect(first.career).toEqual(reordered.career);
    expect(first.career.rng.drawCount).toBe(session.career.rng.drawCount + 1);
    expect(first.career.seasonCareerState).toEqual(
      expect.objectContaining({
        injuryState: expect.objectContaining({
          currentInjury: null,
          lastAssessment: expect.objectContaining({ outcome: 'NO_INJURY' }),
          lastAvailability: expect.objectContaining({
            availabilityId: 'injury_availability_full',
            opportunityCap: 12,
          }),
        }),
      }),
    );
    expect(JSON.stringify(session.career)).toBe(before);
  });

  it('persists exact two-draw evidence and applies distinct rest or play-limited consequences without RNG', () => {
    const session = completeEventWeek('injury-limited-choice');
    const injured = findAssessment(
      session,
      GUARANTEED_RISK_TUNING,
      (career) =>
        career.phase.type === 'INJURY_CHOICE' &&
        career.seasonCareerState.bootstrapStatus === 'ACTIVE' &&
        career.seasonCareerState.injuryState.currentInjury?.originalDurationWeeks === 2,
    );
    expect(injured.career.rng.drawCount).toBe(session.career.rng.drawCount + 2);
    if (injured.career.phase.type !== 'INJURY_CHOICE') {
      throw new TypeError('Expected limited injury choice.');
    }
    expect(injured.career.phase.pendingInjury.assessment).toEqual(
      expect.objectContaining({
        outcome: 'INJURY',
        riskRoll: expect.any(Number),
        outcomeSelectionRoll: expect.any(Number),
        totalEligibleWeight: expect.any(Number),
      }),
    );
    const beforeDraws = injured.career.rng.drawCount;
    const pendingV8 = migrateCareerRunV7ToV8(injured.career);
    expect(pendingV8.phase).toEqual(injured.career.phase);
    expect(parseCareerRunV8(JSON.stringify(pendingV8))).toEqual({ ok: true, career: pendingV8 });
    const rest = resolveInjuryChoice(
      injured.career,
      'injury_choice_rest_rehab',
      injuryOutcomeMechanicsDefinitions,
      injuryTuning,
    );
    const play = resolveInjuryChoice(
      injured.career,
      'injury_choice_play_limited',
      injuryOutcomeMechanicsDefinitions,
      injuryTuning,
    );
    expectSuccess(rest);
    expectSuccess(play);
    expect(rest.career.rng.drawCount).toBe(beforeDraws);
    expect(play.career.rng.drawCount).toBe(beforeDraws);
    if (
      rest.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
      play.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
    ) {
      throw new TypeError('Expected active injury states.');
    }
    expect(rest.career.seasonCareerState.injuryState.lastAvailability).toEqual(
      expect.objectContaining({
        choiceId: 'injury_choice_rest_rehab',
        availabilityId: 'injury_availability_out',
        opportunityCap: 0,
        recoveryCreditWeeks: 1,
        requestedBodyDelta: 6,
        requestedConfidenceDelta: -2,
      }),
    );
    expect(play.career.seasonCareerState.injuryState.lastAvailability).toEqual(
      expect.objectContaining({
        choiceId: 'injury_choice_play_limited',
        availabilityId: 'injury_availability_limited',
        opportunityCap: expect.any(Number),
        requestedBodyDelta: -3,
        requestedCoachTrustDelta: 2,
      }),
    );
    expect(isWeeklyActionAvailableForCurrentInjury(play.career, 'action_speed_work')).toBe(false);
    expect(isWeeklyActionAvailableForCurrentInjury(play.career, 'action_film_study')).toBe(true);
    expect(parseCareerRun(JSON.stringify(play.career))).toEqual({ ok: true, career: play.career });
    const staged = migrateCareerRunV7ToV8(play.career);
    expect(staged.phase).toEqual(play.career.phase);
    expect(staged.rng).toEqual(play.career.rng);
    expect(parseCareerRunV8(JSON.stringify(staged))).toEqual({ ok: true, career: staged });

    const restedWeek = advanceShippedCampRound({ ...session, career: rest.career });
    const playedWeek = advanceShippedCampRound({ ...session, career: play.career });
    expectSuccess(restedWeek);
    expectSuccess(playedWeek);
    if (
      restedWeek.session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE' ||
      playedWeek.session.career.seasonCareerState.bootstrapStatus !== 'ACTIVE'
    ) {
      throw new TypeError('Expected active recovery states.');
    }
    expect(restedWeek.session.career.seasonCareerState.injuryState.currentInjury).toBeNull();
    expect(
      playedWeek.session.career.seasonCareerState.injuryState.currentInjury?.remainingWeeks,
    ).toBe(1);
    expect(
      isWeeklyActionAvailableForCurrentInjury(playedWeek.session.career, 'action_extra_practice'),
    ).toBe(false);
  });

  it('handles OUT outcomes without a choice and caps availability at zero', () => {
    const session = completeEventWeek('injury-out');
    const injured = findAssessment(
      session,
      GUARANTEED_RISK_TUNING,
      (career) =>
        career.phase.type === 'WEEK_END' &&
        career.seasonCareerState.bootstrapStatus === 'ACTIVE' &&
        career.seasonCareerState.injuryState.currentInjury?.defaultAvailabilityId ===
          'injury_availability_out',
    );
    expect(injured.career.phase.type).toBe('WEEK_END');
    if (injured.career.seasonCareerState.bootstrapStatus !== 'ACTIVE') {
      throw new TypeError('Expected active injury state.');
    }
    expect(injured.career.seasonCareerState.injuryState.lastAvailability).toEqual(
      expect.objectContaining({
        availabilityId: 'injury_availability_out',
        opportunityCap: 0,
        choiceId: null,
      }),
    );
    expect(isWeeklyActionAvailableForCurrentInjury(injured.career, 'action_route_drills')).toBe(
      false,
    );
    expect(isWeeklyActionAvailableForCurrentInjury(injured.career, 'action_recovery')).toBe(true);
  });

  it('makes low Body, low Durability, workload, and training load visibly increase risk', () => {
    const session = completeEventWeek('injury-risk-components');
    const lowRiskCareer = jsonClone(session.career);
    const highRiskCareer = jsonClone(session.career);
    lowRiskCareer.player.state.body = 100;
    lowRiskCareer.player.attributes.physical.attribute_durability.rating = 100;
    highRiskCareer.player.state.body = 0;
    highRiskCareer.player.attributes.physical.attribute_durability.rating = 0;
    if (
      lowRiskCareer.programContext === null ||
      highRiskCareer.programContext === null ||
      lowRiskCareer.phase.type !== 'WEEK_END' ||
      highRiskCareer.phase.type !== 'WEEK_END'
    ) {
      throw new TypeError('Expected completed program weeks.');
    }
    lowRiskCareer.programContext.projection.minSnapPermille = 0;
    lowRiskCareer.programContext.projection.maxSnapPermille = 0;
    highRiskCareer.programContext.projection.minSnapPermille = 1_000;
    highRiskCareer.programContext.projection.maxSnapPermille = 1_000;
    for (const result of lowRiskCareer.phase.results) result.baseBodyDelta = 0;
    for (const result of highRiskCareer.phase.results) result.baseBodyDelta = -40;
    const low = deriveInjuryRiskComponents(lowRiskCareer, injuryTuning, skillMechanicsDefinitions);
    const high = deriveInjuryRiskComponents(
      highRiskCareer,
      injuryTuning,
      skillMechanicsDefinitions,
    );
    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    expect(high!.bodyRiskPermille).toBeGreaterThan(low!.bodyRiskPermille);
    expect(high!.durabilityRiskPermille).toBeGreaterThan(low!.durabilityRiskPermille);
    expect(high!.workloadRiskPermille).toBeGreaterThan(low!.workloadRiskPermille);
    expect(high!.trainingRiskPermille).toBeGreaterThan(low!.trainingRiskPermille);
    expect(high!.totalRiskPermille).toBeGreaterThan(low!.totalRiskPermille);

    let rng = createRng('injury-risk-band-distribution');
    let lowHits = 0;
    let highHits = 0;
    for (let index = 0; index < 5_000; index += 1) {
      const sample = nextInt(rng, 0, 1_000);
      rng = sample.nextRng;
      if (sample.value < low!.totalRiskPermille) lowHits += 1;
      if (sample.value < high!.totalRiskPermille) highHits += 1;
    }
    expect(highHits).toBeGreaterThan(lowHits);
  });

  it('rejects catalogs with no universally eligible outcome and persisted evidence tampering', () => {
    const invalidCatalog = injuryOutcomeMechanicsDefinitions.map((definition) => ({
      ...definition,
      minimumRiskPermille: 1,
    }));
    expect(isInjuryOutcomeMechanicsDefinitionCatalog(invalidCatalog)).toBe(false);

    const session = completeEventWeek('injury-tamper');
    const injured = findAssessment(
      session,
      GUARANTEED_RISK_TUNING,
      (career) => career.phase.type === 'INJURY_CHOICE',
    );
    const tampered = jsonClone(injured.career);
    if (tampered.phase.type !== 'INJURY_CHOICE') throw new TypeError('Expected injury choice.');
    tampered.phase.pendingInjury.outcomeId = 'injury_outcome_tampered';
    expect(validateCareerRun(tampered).ok).toBe(false);
    expect(parseCareerRun(JSON.stringify(tampered))).toEqual(
      expect.objectContaining({ ok: false, reason: 'career_parse.invalid_career' }),
    );
  });
});
