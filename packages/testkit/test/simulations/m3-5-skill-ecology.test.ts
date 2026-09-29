import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import { describe, expect, it } from 'vitest';

import {
  M3_5_SKILL_ECOLOGY_WEEK_COUNT,
  formatM3_5SkillEcologyReport,
  runM3_5SkillEcologyReport,
} from '../../src/index.js';

function strategy(
  report: ReturnType<typeof runM3_5SkillEcologyReport>,
  strategyId: (typeof report.strategies)[number]['strategyId'],
) {
  const result = report.strategies.find((entry) => entry.strategyId === strategyId);
  expect(result).toBeDefined();
  return result!;
}

describe('M3.5 skill ecology evidence', () => {
  it('turns weekly behavior into four to six non-cadenced breakthroughs per regular season', () => {
    const report = runM3_5SkillEcologyReport();

    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(report.weekCountPerStrategy).toBe(M3_5_SKILL_ECOLOGY_WEEK_COUNT);
    expect(report.strategies).toHaveLength(3);
    for (const result of report.strategies) {
      expect(result.acquisitionCount).toBeGreaterThanOrEqual(4);
      expect(result.acquisitionCount).toBeLessThanOrEqual(6);
      expect(result.acquisitionWeekNumbers).toHaveLength(result.acquisitionCount);
      expect(new Set(result.acquisitionWeekNumbers).size).toBe(result.acquisitionCount);
      expect(result.acquisitionWeekNumbers.every((weekNumber) => weekNumber >= 1)).toBe(true);
      expect(
        result.acquisitionWeekNumbers.every(
          (weekNumber) => weekNumber <= M3_5_SKILL_ECOLOGY_WEEK_COUNT,
        ),
      ).toBe(true);
      expect(result.roundTripCount).toBeGreaterThanOrEqual(70);
    }

    expect(report.strategies.map(({ acquisitionWeekNumbers }) => acquisitionWeekNumbers)).toEqual([
      [3, 5, 8, 9, 12, 13],
      [2, 5, 7, 10, 12],
      [3, 5, 8, 12],
    ]);
  });

  it('makes development, role preparation, and balanced life produce distinct evidence and rewards', () => {
    const report = runM3_5SkillEcologyReport();
    const development = strategy(report, 'development_body');
    const role = strategy(report, 'role_preparation');
    const balanced = strategy(report, 'balanced_life_mindset');

    expect(development.sourcePointTotals.breakthrough_source_development).toBeGreaterThan(0);
    expect(development.sourcePointTotals.breakthrough_source_body).toBeGreaterThan(0);
    expect(development.appliedEffectCounts.action_xp_multiplier).toBeGreaterThan(0);
    expect(development.appliedEffectCounts.action_body_cost_multiplier).toBeGreaterThan(0);

    expect(role.sourcePointTotals.breakthrough_source_role_coach).toBeGreaterThan(
      role.sourcePointTotals.breakthrough_source_development,
    );
    expect(role.appliedEffectCounts.action_preparation_delta_flat).toBeGreaterThan(0);
    expect(role.equippedGameHookIds).toContain('game_hook_assignment_reliability_bonus');

    expect(balanced.sourcePointTotals.breakthrough_source_life).toBeGreaterThan(0);
    expect(balanced.sourcePointTotals.breakthrough_source_mindset).toBeGreaterThan(0);
    expect(balanced.appliedEffectCounts.action_gpa_delta_milli).toBeGreaterThan(0);
    expect(balanced.appliedEffectCounts.action_confidence_delta_flat).toBeGreaterThan(0);
    expect(balanced.equippedGameHookIds).toContain('game_hook_pressure_composure_bonus');
    expect(balanced.equippedLifeHookIds).toEqual([
      'life_hook_nil_reward_multiplier',
      'life_hook_event_option_access',
    ]);
    expect(balanced.finalGpa).toBe(4);
  });

  it('is deterministic, timestamp-free, and synchronized with its checked report', () => {
    const report = runM3_5SkillEcologyReport();
    const replay = runM3_5SkillEcologyReport();
    const formatted = formatM3_5SkillEcologyReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m3-5-skill-ecology.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(replay).toEqual(report);
    expect(formatM3_5SkillEcologyReport(replay)).toBe(formatted);
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });
});
