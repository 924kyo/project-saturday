import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION, SKILL_GRADE_IDS } from '@project-saturday/game-content';
import { contentManifest } from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import {
  M2_CONTROLLED_BUILD_SEED,
  M2_SKILL_OFFER_SEEDS,
  M2_SKILL_FAMILY_IDS,
  M2_SKILL_IDS,
  formatM2SkillBuildReport,
  runM2SkillBuildReport,
} from '../../src/index.js';

function sumCounts(record: Readonly<Record<string, { readonly count: number }>>): number {
  return Object.values(record).reduce((total, { count }) => total + count, 0);
}

describe('M2 behavior-shaped skill report', () => {
  it('pins the exact M2 catalog and reconciles every offer, pick, family, and grade denominator', () => {
    const report = runM2SkillBuildReport();

    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(report.contentManifestSchemaVersion).toBe(2);
    expect(report.skillCatalogIds).toEqual(M2_SKILL_IDS);
    expect(report.skillCatalogCardinality).toBe(18);
    expect(report.offerSeeds).toEqual(M2_SKILL_OFFER_SEEDS);
    expect(report.offerSeedCount).toBe(64);
    expect(report.totalOfferCareers).toBe(128);

    for (const strategy of report.offerStrategies) {
      expect(strategy.careerCount).toBe(64);
      expect(strategy.offerSlotCount).toBe(192);
      expect(strategy.pickCount).toBe(64);
      expect(sumCounts(strategy.offersBySkill)).toBe(strategy.offerSlotCount);
      expect(sumCounts(strategy.picksBySkill)).toBe(strategy.pickCount);
      expect(sumCounts(strategy.offersByFamily)).toBe(strategy.offerSlotCount);
      expect(sumCounts(strategy.picksByFamily)).toBe(strategy.pickCount);
      expect(sumCounts(strategy.offersByGrade)).toBe(strategy.offerSlotCount);
      expect(sumCounts(strategy.picksByGrade)).toBe(strategy.pickCount);
      expect(Object.keys(strategy.offersBySkill)).toEqual(M2_SKILL_IDS);
      expect(Object.keys(strategy.offersByFamily)).toEqual(M2_SKILL_FAMILY_IDS);
      expect(Object.keys(strategy.offersByGrade)).toEqual(SKILL_GRADE_IDS);
      for (const skillId of M2_SKILL_IDS) {
        expect(strategy.picksBySkill[skillId].count).toBeLessThanOrEqual(
          strategy.offersBySkill[skillId].count,
        );
      }
    }
  });

  it('shows both named affinity cards gaining exact weight and a robust paired offer-rate direction', () => {
    const report = runM2SkillBuildReport();
    const film = report.offerStrategies.find(({ strategyId }) => strategyId === 'film_repeat');
    const weight = report.offerStrategies.find(({ strategyId }) => strategyId === 'weight_repeat');

    expect(film).toBeDefined();
    expect(weight).toBeDefined();
    expect(film?.behaviorCounts).toEqual(
      expect.arrayContaining([
        { affinityTagId: 'action_focus_film_study', count: 3 },
        { affinityTagId: 'behavior_repeat_action', count: 2 },
      ]),
    );
    expect(weight?.behaviorCounts).toEqual(
      expect.arrayContaining([
        { affinityTagId: 'action_focus_strength', count: 3 },
        { affinityTagId: 'behavior_repeat_action', count: 2 },
      ]),
    );
    expect(film?.candidateWeights.skill_coverage_ledger_b).toBe(112);
    expect(weight?.candidateWeights.skill_coverage_ledger_b).toBe(70);
    expect(weight?.candidateWeights.skill_late_set_engine_b).toBe(112);
    expect(film?.candidateWeights.skill_late_set_engine_b).toBe(70);

    expect(report.affinityDirections).toHaveLength(2);
    for (const direction of report.affinityDirections) {
      expect(direction.favoredWeight).toBeGreaterThan(direction.comparisonWeight);
      expect(direction.offerRateDeltaPermille).toBeGreaterThan(0);
      expect(direction.favoredOfferRatePermille).toBeGreaterThan(
        direction.comparisonOfferRatePermille,
      );
    }
  });

  it('records exact per-seed RNG, ownership, choice, and reload evidence', () => {
    const report = runM2SkillBuildReport();

    for (const strategy of report.offerStrategies) {
      expect(strategy.samples).toHaveLength(report.offerSeedCount);
      expect(strategy.samples.map(({ seed }) => seed)).toEqual(report.offerSeeds);
      for (const sample of strategy.samples) {
        expect(sample.offeredSkillIds).toHaveLength(3);
        expect(sample.distinctOffer).toBe(true);
        expect(sample.unownedOffer).toBe(true);
        expect(sample.acquisitionMatchesOffer).toBe(true);
        expect(sample.choiceConsumedRng).toBe(false);
        expect(sample.reloadEquivalent).toBe(true);
        expect(sample.offerRngDrawCountBefore).toBe(sample.rngBeforeAdvance.drawCount);
        expect(sample.offerRngDrawCountAfter).toBe(sample.rngAfterOffer.drawCount);
        expect(sample.offerRngDrawCountAfter).toBeGreaterThanOrEqual(
          sample.offerRngDrawCountBefore + 3,
        );
        expect(sample.rngAfterChoice).toEqual(sample.rngAfterOffer);
        expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
      }
    }
  });
});

describe('M2 controlled equipped-build evidence', () => {
  it('publicly acquires four distinct cards at the exact cadence and creates equal-cost branches', () => {
    const controlled = runM2SkillBuildReport().controlledBuild;

    expect(controlled.seed).toBe(M2_CONTROLLED_BUILD_SEED);
    expect(controlled.reproduction).toBe(
      'scenario="m2_controlled_build" seed="m2-control-low-003"',
    );
    expect(controlled.sharedAcquisitions).toHaveLength(4);
    expect(controlled.sharedAcquisitions.map(({ weekIndex }) => weekIndex)).toEqual([1, 5, 9, 13]);
    expect(new Set(controlled.sharedOwnedSkillIds).size).toBe(4);
    expect(controlled.sharedEquippedSkillIds.every((skillId) => skillId !== null)).toBe(true);
    expect(controlled.sharedOwnedSkillIds).toEqual([
      'skill_recovery_window_c',
      'skill_coverage_ledger_b',
      'skill_balanced_calendar_b',
      'skill_first_step_lab_b',
    ]);
    for (const acquisition of controlled.sharedAcquisitions) {
      expect(acquisition.offeredSkillIds).toHaveLength(3);
      expect(new Set(acquisition.offeredSkillIds).size).toBe(3);
      expect(acquisition.offeredSkillIds).toContain(acquisition.selectedSkillId);
      expect(acquisition.rngDrawCountAfter).toBeGreaterThanOrEqual(
        acquisition.rngDrawCountBefore + 3,
      );
    }
    expect(controlled.sharedBody).toBe(10);
    expect(controlled.sharedRevision).toBe(69);
    expect(controlled.sharedReloadEquivalent).toBe(true);
    expect(controlled.sourceUnmodifiedByBranching).toBe(true);
    expect(controlled.branchesEqualExceptLoadout).toBe(true);
    expect(controlled.loadoutCommandCountPerBranch).toBe(5);
  });

  it('shows authoritative Film XP and Recovery Body divergence with exact applied traces', () => {
    const controlled = runM2SkillBuildReport().controlledBuild;
    const [coverage, recovery] = controlled.variants;
    const [coverageFilm, coverageRecovery, coverageStudy] = coverage.results;
    const [recoveryFilm, recoveryRecovery, recoveryStudy] = recovery.results;

    expect(coverage.equippedSkillIds).toEqual(['skill_coverage_ledger_b', null, null, null]);
    expect(recovery.equippedSkillIds).toEqual(['skill_recovery_window_c', null, null, null]);
    expect(coverage.revisionBeforeActions).toBe(74);
    expect(recovery.revisionBeforeActions).toBe(74);
    expect(coverage.rngBeforeActions).toEqual(recovery.rngBeforeActions);
    expect(coverage.bodyBeforeActions).toBe(10);
    expect(recovery.bodyBeforeActions).toBe(10);

    expect(coverageFilm.actionId).toBe('action_film_study');
    expect(coverageFilm.attributeXp[0]?.awardedXp).toBe(16);
    expect(coverageFilm.attributeXp[0]?.appliedXp).toBe(16);
    expect(coverageFilm.skillEffectAggregates.xpMultiplierPermille).toBe(1_100);
    expect(coverageFilm.appliedSkillEffects).toEqual([
      {
        skillId: 'skill_coverage_ledger_b',
        slotIndex: 0,
        effectIndex: 0,
        type: 'action_xp_multiplier',
        multiplierPermille: 1_100,
      },
    ]);
    expect(recoveryFilm.attributeXp[0]?.awardedXp).toBe(15);
    expect(recoveryFilm.appliedSkillEffects).toEqual([]);

    expect(coverageRecovery.actionId).toBe('action_recovery');
    expect(coverageRecovery.requestedBodyDelta).toBe(32);
    expect(coverageRecovery.actualBodyDelta).toBe(32);
    expect(coverageRecovery.appliedSkillEffects).toEqual([]);
    expect(recoveryRecovery.requestedBodyDelta).toBe(40);
    expect(recoveryRecovery.actualBodyDelta).toBe(40);
    expect(recoveryRecovery.appliedSkillEffects).toEqual([
      {
        skillId: 'skill_recovery_window_c',
        slotIndex: 0,
        effectIndex: 0,
        type: 'action_body_delta_flat',
        delta: 8,
      },
    ]);
    expect(coverageStudy.actionId).toBe('action_study_hall');
    expect(recoveryStudy.actionId).toBe('action_study_hall');
    expect(coverageStudy.appliedSkillEffects).toEqual([]);
    expect(recoveryStudy.appliedSkillEffects).toEqual([]);

    expect(coverage.passiveBodyRecovery).toEqual(
      expect.objectContaining({
        baseBodyDelta: 10,
        requestedBodyDelta: 10,
        actualBodyDelta: 10,
        appliedSkillEffects: [],
      }),
    );
    expect(recovery.passiveBodyRecovery).toEqual(
      expect.objectContaining({
        baseBodyDelta: 10,
        requestedBodyDelta: 10,
        actualBodyDelta: 10,
        appliedSkillEffects: [],
      }),
    );
    expect(coverage.finalBody).toBe(49);
    expect(recovery.finalBody).toBe(57);
    expect(controlled.filmAwardedXpDelta).toBe(1);
    expect(controlled.recoveryActualBodyDeltaDelta).toBe(8);
    expect(controlled.finalBodyDelta).toBe(8);
    expect(coverage.finalRevision).toBe(79);
    expect(recovery.finalRevision).toBe(79);
    expect(coverage.finalRng).toEqual(recovery.finalRng);
    expect(coverage.finalRng).toEqual(controlled.sharedRng);
  });
});

describe('M2 checked-in report artifact', () => {
  it('is deterministic, machine-readable, timestamp-free, and synchronized byte-for-byte', () => {
    const report = runM2SkillBuildReport();
    const replay = runM2SkillBuildReport();
    const formatted = formatM2SkillBuildReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m2-skill-build-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(replay).toEqual(report);
    expect(formatM2SkillBuildReport(replay)).toBe(formatted);
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });
});
