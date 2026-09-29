import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import {
  contentManifest,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
  programMechanicsDefinitions,
} from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import {
  M4_GAME_SCENARIOS,
  M4_GAME_SEEDS,
  M4_GAME_WEEK_COUNT,
  formatM4GameReport,
  runM4GameReport,
} from '../../src/index.js';

describe('M4 deterministic game baseline', () => {
  it('pins content identity and covers roles, builds, profiles, tensions, and strategies', () => {
    const report = runM4GameReport();

    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(report.contentManifestSchemaVersion).toBe(4);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(report.seeds).toEqual(M4_GAME_SEEDS);
    expect(report.scenarios).toEqual(M4_GAME_SCENARIOS);
    expect(report.weekCountPerCareer).toBe(M4_GAME_WEEK_COUNT);
    expect(report.totalCareers).toBe(20);
    expect(report.totalGames).toBe(120);
    expect(report.programCatalogIds).toEqual(programMechanicsDefinitions.map(({ id }) => id));
    expect(report.familyCatalogIds).toEqual(keySnapFamilyMechanicsDefinitions.map(({ id }) => id));
    expect(report.patternCatalogIds).toEqual(
      keySnapPatternMechanicsDefinitions.map(({ id }) => id),
    );
    expect(report.segments.depthRole).toHaveLength(4);
    expect(report.segments.archetype).toHaveLength(3);
    expect(report.segments.programStrengthBand).toHaveLength(3);
    expect(report.segments.bodyBand).toHaveLength(2);
    expect(report.segments.iqBand).toHaveLength(2);
    expect(report.segments.filmStudy).toHaveLength(2);
    expect(report.segments.decisionStrategy).toHaveLength(3);
    expect(report.segments.skillBuild.length).toBeGreaterThan(6);
    expect(report.segments.informationTier).toHaveLength(3);
    for (const segment of [
      report.segments.depthRole,
      report.segments.archetype,
      report.segments.programStrengthBand,
      report.segments.bodyBand,
      report.segments.iqBand,
      report.segments.filmStudy,
      report.segments.decisionStrategy,
      report.segments.skillBuild,
    ]) {
      expect(segment.reduce((total, { gameCount }) => total + gameCount, 0)).toBe(
        report.totalGames,
      );
    }
  });

  it('records complete public-command games, exact save boundaries, and reproduction evidence', () => {
    const report = runM4GameReport();

    for (const sample of report.samples) {
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
      expect(sample.games).toHaveLength(M4_GAME_WEEK_COUNT);
      expect(sample.acquiredSkillIds.length).toBeGreaterThanOrEqual(2);
      expect(sample.acquiredSkillFamilyIds).toHaveLength(sample.acquiredSkillIds.length);
      expect(sample.totalRoundTripCount).toBeGreaterThan(M4_GAME_WEEK_COUNT * 5);
      expect(sample.allRoundTripsEquivalent).toBe(true);
      for (const game of sample.games) {
        expect(game.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
        expect(game.summary.keySnapCount).toBe(game.opportunityBudget);
        expect(game.decisions).toHaveLength(game.opportunityBudget);
        expect(game.summary.gameRngDrawCountAfter).toBeGreaterThan(
          game.summary.gameRngDrawCountBefore,
        );
        expect(game.gameRngDrawCount).toBe(
          game.summary.gameRngDrawCountAfter - game.summary.gameRngDrawCountBefore,
        );
        expect(game.roundTripCount).toBeGreaterThanOrEqual(7);
        expect(game.growth.bodyAfter).toBeGreaterThanOrEqual(0);
        expect(game.growth.bodyAfter).toBeLessThanOrEqual(100);
        expect(game.summary.performanceGradeScore).toBeGreaterThanOrEqual(0);
        expect(game.summary.performanceGradeScore).toBeLessThanOrEqual(100);
        for (const decision of game.decisions) {
          expect(decision.rngDrawCountAfter).toBeGreaterThan(decision.rngDrawCountBefore);
          expect(decision.revealedClueIds.length).toBeGreaterThanOrEqual(0);
          expect(decision.revealedClueIds.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('shows role scarcity, all decision families, varied grades, and live game hooks', () => {
    const report = runM4GameReport();

    expect(report.outcomes.zeroOpportunityGameCount).toBeGreaterThan(0);
    expect(report.outcomes.zeroOpportunityGameCount).toBeLessThan(report.totalGames);
    expect(report.outcomes.hookedGameCount).toBeGreaterThan(0);
    expect(report.outcomes.hookApplicationCount).toBeGreaterThan(report.outcomes.hookedGameCount);
    expect(report.outcomes.minimumGradeScore).toBeLessThan(45);
    expect(report.outcomes.maximumGradeScore).toBeGreaterThanOrEqual(90);
    expect(report.outcomes.observedRoleIds).toEqual([
      'depth_role_developmental',
      'depth_role_reserve',
      'depth_role_rotation',
      'depth_role_starter',
    ]);
    expect(report.outcomes.observedFamilyIds).toEqual([
      'key_snap_family_catch',
      'key_snap_family_release',
      'key_snap_family_route',
      'key_snap_family_yac',
    ]);
    expect(report.outcomes.observedHookIds.length).toBeGreaterThanOrEqual(4);
    expect(report.outcomes.observedGradeBandIds).toHaveLength(5);
  });
});

describe('M4 checked-in game artifact', () => {
  it('is deterministic, timestamp-free, machine-readable, and synchronized byte-for-byte', () => {
    const report = runM4GameReport();
    const replay = runM4GameReport();
    const formatted = formatM4GameReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m4-game-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(replay).toEqual(report);
    expect(formatM4GameReport(replay)).toBe(formatted);
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });
});
