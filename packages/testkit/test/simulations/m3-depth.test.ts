import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  contentManifest,
  programMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import {
  M3_DEPTH_PROFILES,
  M3_DEPTH_SEEDS,
  M3_DEPTH_STRATEGIES,
  M3_DEPTH_WEEK_COUNT,
  formatM3DepthReport,
  runM3DepthReport,
} from '../../src/index.js';

describe('M3 segmented depth report', () => {
  it('pins content identity and covers every required profile dimension', () => {
    const report = runM3DepthReport();

    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(report.contentManifestSchemaVersion).toBe(3);
    expect(report.programCatalogIds).toEqual(programMechanicsDefinitions.map(({ id }) => id));
    expect(report.seeds).toEqual(M3_DEPTH_SEEDS);
    expect(report.seedCount).toBe(4);
    expect(report.profiles).toEqual(M3_DEPTH_PROFILES);
    expect(report.strategies).toEqual(M3_DEPTH_STRATEGIES);
    expect(report.weekCountPerCareer).toBe(M3_DEPTH_WEEK_COUNT);
    expect(report.totalCareers).toBe(60);
    expect(report.totalWeeks).toBe(360);
    expect(report.segments.recruitTier).toHaveLength(3);
    expect(report.segments.recruitingBackground).toHaveLength(5);
    expect(report.segments.programStrengthBand).toHaveLength(3);
    expect(report.segments.archetype).toHaveLength(3);
    expect(report.segments.strategy).toHaveLength(3);
    expect(report.segments.primarySkillFamily.length).toBeGreaterThan(1);
    for (const segment of Object.values(report.segments)) {
      expect(segment.reduce((total, { careerCount }) => total + careerCount, 0)).toBe(
        report.totalCareers,
      );
    }
  });

  it('records exact room RNG, reload, movement, trust/form, and projection evidence per seed', () => {
    const report = runM3DepthReport();

    for (const sample of report.samples) {
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
      expect(sample.roomRngDrawCount).toBe(35);
      expect(sample.roomRngAfter.drawCount - sample.roomRngBefore.drawCount).toBe(35);
      expect(sample.allRoundTripsEquivalent).toBe(true);
      expect(sample.roundTripCount).toBeGreaterThan(2);
      expect(sample.movements).toHaveLength(M3_DEPTH_WEEK_COUNT);
      expect(sample.acquiredSkillIds).toHaveLength(2);
      expect(sample.acquiredSkillFamilyIds).toHaveLength(2);
      expect(sample.primarySkillFamilyId).toBe(sample.acquiredSkillFamilyIds[0]);
      expect(sample.finalSnapProjection.rank).toBe(sample.finalRank);
      expect(sample.initialSnapProjection.rank).toBe(sample.initialRank);
      for (const movement of sample.movements) {
        expect(Math.abs(movement.rankAfter - movement.rankBefore)).toBeLessThanOrEqual(1);
        expect(movement.snapProjectionBefore.rank).toBe(movement.rankBefore);
        expect(movement.snapProjectionAfter.rank).toBe(movement.rankAfter);
        expect(movement.practiceFormAfter).toBeGreaterThanOrEqual(0);
        expect(movement.practiceFormAfter).toBeLessThanOrEqual(100);
        expect(movement.coachTrustAfter).toBeGreaterThanOrEqual(0);
        expect(movement.coachTrustAfter).toBeLessThanOrEqual(100);
      }
    }
  });

  it('shows a stable practice path, a poor-week demotion path, and no adjacent reversals', () => {
    const report = runM3DepthReport();
    const national = report.samples.filter(
      ({ profileId }) => profileId === 'national_deep_blue_chip',
    );
    const builderPractice = report.samples.filter(
      ({ programStrengthBandId, strategyId }) =>
        programStrengthBandId === 'program_strength_builder' && strategyId === 'practice_push',
    );

    expect(national.every(({ initialRank }) => initialRank > 2)).toBe(true);
    expect(
      builderPractice.some(
        ({ initialRank, firstRotationCompletedWeekNumber }) =>
          initialRank > 4 &&
          firstRotationCompletedWeekNumber !== null &&
          firstRotationCompletedWeekNumber > 0,
      ),
    ).toBe(true);
    expect(report.outcomes).toEqual({
      promotedCareerCount: 15,
      demotedCareerCount: 2,
      reachedRotationCareerCount: 12,
      oscillatingCareerCount: 0,
    });
    expect(
      report.samples.some(
        ({ strategyId, movementCounts }) =>
          strategyId === 'body_risk' && movementCounts.DEMOTED > 0,
      ),
    ).toBe(true);
    expect(report.samples.every(({ oscillationPairs }) => oscillationPairs.length === 0)).toBe(
      true,
    );
  });
});

describe('M3 checked-in depth artifact', () => {
  it('is deterministic, timestamp-free, machine-readable, and synchronized byte-for-byte', () => {
    const report = runM3DepthReport();
    const replay = runM3DepthReport();
    const formatted = formatM3DepthReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m3-depth-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(replay).toEqual(report);
    expect(formatM3DepthReport(replay)).toBe(formatted);
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });
});
