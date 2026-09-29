import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  formatM7_5RosterIdentityReport,
  M7_5_ROSTER_SEEDS,
  runM7_5RosterIdentityReport,
} from '../../src/index.js';

const report = runM7_5RosterIdentityReport();

describe('M7.5 checked roster identity report', () => {
  it('covers 128 seeded QB/RB/WR/CB rooms with unique, diverse names', () => {
    expect(M7_5_ROSTER_SEEDS).toHaveLength(32);
    expect(report.seedCount).toBe(32);
    expect(report.sampleCount).toBe(128);
    expect(report.positionCounts).toEqual({
      position_qb: 32,
      position_rb: 32,
      position_wr: 32,
      position_cb: 32,
    });
    expect(report.givenNamePoolSize).toBe(32);
    expect(report.familyNamePoolSize).toBe(32);
    expect(report.duplicateFullNameRosterCount).toBe(0);
    expect(report.repeatedGivenTokenRosterCount).toBe(0);
    expect(report.repeatedFamilyTokenRosterCount).toBe(0);
    expect(report.maximumGivenTokenFrequency).toBe(1);
    expect(report.maximumFamilyTokenFrequency).toBe(1);
  });

  it('retains exact 35-draw room generation and reproducible full-name evidence', () => {
    for (const sample of report.samples) {
      expect(sample.fullNameIds).toHaveLength(7);
      expect(new Set(sample.fullNameIds).size).toBe(7);
      expect(sample.rngDrawCount).toBe(35);
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
    }
  });

  it('matches the checked timestamp-free artifact', () => {
    const formatted = formatM7_5RosterIdentityReport(report);
    const checked = readFileSync(
      new URL('../../reports/m7-5-roster-identity.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();
    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checked).toBe(formatted);
  });
});
