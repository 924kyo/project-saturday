import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import { contentManifest } from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import {
  M5_PRIOR_REPORT_SHA256,
  M5_SEASON_SCENARIOS,
  formatM5SeasonReport,
  runM5SeasonReport,
} from '../../src/index.js';

const report = runM5SeasonReport();

describe('M5 deterministic full-season report', () => {
  it('pins content identity and crosses recruit, program, archetype, strategy, and build bands', () => {
    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(report.contentManifestSchemaVersion).toBe(7);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(report.scenarios).toEqual(M5_SEASON_SCENARIOS);
    expect(report.totalCareers).toBe(6);
    expect(report.totalRegularSeasonGames).toBe(72);
    expect(report.totalPostseasonGames).toBe(2);
    expect(report.segments.recruitTier).toHaveLength(3);
    expect(report.segments.archetype).toHaveLength(3);
    expect(report.segments.programStrengthBand).toHaveLength(3);
    expect(report.segments.weeklyStrategy).toHaveLength(5);
    expect(report.segments.skillBuild).toHaveLength(6);
    expect(report.segments.eventChoicePolicy).toHaveLength(3);
    expect(report.segments.injuryChoicePolicy).toHaveLength(2);
    expect(report.segments.postseason).toHaveLength(2);
    expect(report.segments.finalRole).toHaveLength(3);
    for (const segment of Object.values(report.segments)) {
      expect(segment.reduce((total, { careerCount }) => total + careerCount, 0)).toBe(
        report.totalCareers,
      );
    }
  });

  it('covers event branches, injury choices, every role, every skill family, and both ending paths', () => {
    expect(report.outcomes.qualifierCareerCount).toBe(2);
    expect(report.outcomes.nonQualifierCareerCount).toBe(4);
    expect(report.outcomes.careerWithEventCount).toBe(6);
    expect(report.outcomes.careerWithInjuryCount).toBe(3);
    expect(report.outcomes.careerWithInjuryChoiceCount).toBe(3);
    expect(report.outcomes.observedEventIds.length).toBeGreaterThanOrEqual(24);
    expect(report.outcomes.observedEventChoiceIds.length).toBeGreaterThanOrEqual(24);
    expect(report.outcomes.observedInjuryOutcomeIds.length).toBeGreaterThanOrEqual(2);
    expect(report.outcomes.observedInjuryChoiceIds).toEqual([
      'injury_choice_play_limited',
      'injury_choice_rest_rehab',
    ]);
    expect(report.outcomes.observedRoleIds).toEqual([
      'depth_role_developmental',
      'depth_role_reserve',
      'depth_role_rotation',
      'depth_role_starter',
    ]);
    expect(report.outcomes.observedSkillFamilyIds).toEqual([
      'skill_family_body',
      'skill_family_development',
      'skill_family_game_day',
      'skill_family_life',
      'skill_family_mindset',
      'skill_family_role_coach',
    ]);
  });

  it('records completed alumni, bounded legacy, exact reloads, and reproducible week evidence', () => {
    for (const sample of report.samples) {
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
      expect(sample.regularSeasonGameCount).toBe(12);
      expect(sample.postseasonGameCount).toBe(sample.qualifiedForPostseason ? 1 : 0);
      expect(sample.weeks.filter(({ stageId }) => stageId === 'CAMP')).toHaveLength(3);
      expect(sample.weeks.filter(({ stageId }) => stageId === 'REGULAR_SEASON')).toHaveLength(12);
      expect(sample.totalRoundTripCount).toBeGreaterThan(100);
      expect(sample.allRoundTripsEquivalent).toBe(true);
      expect(sample.alumni.programIds).toEqual([sample.selectedProgramId]);
      expect(sample.alumni.seasonOutcomeId).toBe(sample.outcomeId);
      expect(sample.alumni.ownedSkillIds).toEqual(sample.ownedSkillIds);
      expect(sample.alumni.careerStats).toEqual(sample.cumulativeStats);
      expect(sample.legacyOptionIds).toEqual(['legacy_option_alumni_history']);
      expect(sample.legacyFamiliarProgramCareerCount).toBe(1);
      expect(sample.careerRngDrawCount).toBeGreaterThan(0);
      expect(sample.worldRngDrawCount).toBeGreaterThan(0);
      expect(sample.eventIds).toHaveLength(sample.eventChoiceIds.length);
      expect(sample.weeks.every(({ roundTripCount }) => roundTripCount > 0)).toBe(true);
    }
  });

  it('replays byte-identically within a bounded report runtime', () => {
    const startedAt = performance.now();
    const replay = runM5SeasonReport();
    const elapsedMs = performance.now() - startedAt;

    expect(replay).toEqual(report);
    expect(formatM5SeasonReport(replay)).toBe(formatM5SeasonReport(report));
    expect(elapsedMs).toBeLessThan(20_000);
  }, 25_000);
});

describe('M5 checked-in season artifact', () => {
  it('is timestamp-free, machine-readable, and synchronized byte-for-byte', () => {
    const formatted = formatM5SeasonReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m5-season-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });

  it('keeps every completed M1–M4 report byte-stable', () => {
    for (const [fileName, expectedHash] of Object.entries(M5_PRIOR_REPORT_SHA256)) {
      const bytes = readFileSync(new URL(`../../reports/${fileName}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'), fileName).toBe(expectedHash);
    }
  });
});
