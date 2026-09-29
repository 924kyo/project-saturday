import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  M7_POSITION_SCENARIOS,
  M7_PRIOR_REPORT_SHA256,
  formatM7FourPositionReport,
  runM7FourPositionReport,
} from '../../src/index.js';

const report = runM7FourPositionReport();

describe('M7 checked four-position public-command report', () => {
  it('crosses every added position plus frozen WR evidence and both decision/offseason strategies', () => {
    expect(report.contentManifestSchemaVersion).toBe(9);
    expect(report.positionsCovered).toEqual([
      'position_qb',
      'position_rb',
      'position_wr',
      'position_cb',
    ]);
    expect(report.scenarios).toEqual(M7_POSITION_SCENARIOS);
    expect(report.samples).toHaveLength(6);
    expect(report.segments.position).toEqual([
      { id: 'position_cb', careerCount: 2 },
      { id: 'position_qb', careerCount: 2 },
      { id: 'position_rb', careerCount: 2 },
    ]);
    expect(report.segments.decisionStrategy).toHaveLength(2);
    expect(report.segments.offseasonPolicy).toHaveLength(2);
    expect(report.segments.archetype).toHaveLength(6);
    expect(report.segments.background.length).toBeGreaterThanOrEqual(4);
    expect(report.segments.initialProgram).toHaveLength(6);
  });

  it('round-trips every two-season career and preserves meaningful football/lifecycle evidence', () => {
    for (const sample of report.samples) {
      expect(sample.seasonsPlayed).toBe(2);
      expect(sample.gameCount).toBeGreaterThanOrEqual(24);
      expect(sample.totalKeySnaps).toBeGreaterThan(0);
      expect(sample.lifecycleRoundTripCount).toBeGreaterThan(20);
      expect(sample.careerRngDrawCount).toBeGreaterThan(70);
      expect(sample.worldRngDrawCount).toBeGreaterThan(600);
      expect(sample.injuryRiskMaximumPermille).toBeGreaterThanOrEqual(
        sample.injuryRiskMinimumPermille,
      );
      expect(sample.eligibilityTagIds).toContain(
        `tag_position_${sample.positionId.replace('position_', '')}`,
      );
      expect(sample.finalRelationshipValues).toHaveLength(3);
      expect(sample.programHistoryCount).toBe(sample.offseasonPolicy === 'first_transfer' ? 2 : 1);
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
    }
  });

  it('matches the checked timestamp-free artifact and protects every M1-M6 byte', () => {
    const formatted = formatM7FourPositionReport(report);
    const checked = readFileSync(
      new URL('../../reports/m7-four-position-alpha.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checked).toBe(formatted);
    for (const [fileName, expectedHash] of Object.entries(M7_PRIOR_REPORT_SHA256)) {
      const bytes = readFileSync(new URL(`../../reports/${fileName}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'), fileName).toBe(expectedHash);
    }
  });
});
