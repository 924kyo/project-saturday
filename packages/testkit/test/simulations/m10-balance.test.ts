import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { formatM10BalanceReport, runM10BalanceReport } from '../../src/index.js';

const report = runM10BalanceReport();
const summary = report.summary;

/**
 * M10 release balance bands over 36 deterministic four-year careers (six positions × balanced,
 * grind and study × two seeds). The bands are the product intent; the artifact is the evidence.
 */
describe('M10 balance at scale', () => {
  it('matches the checked, reproducible artifact', () => {
    const checked = readFileSync(
      new URL('../../reports/m10-balance.jsonl', import.meta.url),
      'utf8',
    );
    expect(`${formatM10BalanceReport(report)}\n`).toBe(checked.replace(/\r\n/g, '\n'));
  });

  it('keeps the career distribution broad', () => {
    expect(summary.careers).toBe(36);
    expect(summary.seasons).toBe(144);
    // The bracket is earned: some seasons, never routine.
    expect(summary.bracketSeasonRate).toBeGreaterThanOrEqual(20);
    expect(summary.bracketSeasonRate).toBeLessThanOrEqual(300);
    // Awards are real but rare.
    expect(summary.awardSeasonRate).toBeGreaterThan(50);
    expect(summary.awardSeasonRate).toBeLessThan(400);
    // Not everyone starts; not everyone waits.
    expect(summary.starterSeasonRate).toBeGreaterThan(400);
    expect(summary.starterSeasonRate).toBeLessThan(900);
    // The draft is an outcome for some; the first round needs more than this harness plays.
    expect(summary.draftedRate).toBeGreaterThan(150);
    expect(summary.draftedRate).toBeLessThan(800);
    expect(summary.firstRoundRate).toBeLessThan(250);
    // NIL reaches most careers that accept deals.
    expect(summary.nilCareerRate).toBeGreaterThan(500);
    // Growth is visible every year.
    expect(summary.meanOverallGrowthPerSeason).toBeGreaterThanOrEqual(2);
    expect(summary.meanOverallGrowthPerSeason).toBeLessThanOrEqual(7);
  });

  it('keeps meters meaningful: no saturation, and Body tracks the plan', () => {
    expect(summary.meanKickoffConfidence).toBeGreaterThan(45);
    expect(summary.meanKickoffConfidence).toBeLessThan(80);
    expect(summary.meanBrandEnd).toBeLessThan(90);
    const body = summary.meanKickoffBodyByStrategy;
    expect(body.balanced).toBeGreaterThan(body.study);
    expect(body.study).toBeGreaterThan(body.grind);
    const injuries = summary.injuriesPerSeasonByStrategy;
    expect(injuries.grind).toBeGreaterThan(injuries.balanced);
    expect(injuries.grind).toBeLessThan(4);
  });
});
