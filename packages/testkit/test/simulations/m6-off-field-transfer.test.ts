import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { CONTENT_COMPATIBILITY_VERSION } from '@project-saturday/game-content';
import { contentManifest } from '@project-saturday/game-content/content';
import { describe, expect, it } from 'vitest';

import {
  M6_OFF_FIELD_SCENARIOS,
  M6_PRIOR_REPORT_SHA256,
  formatM6OffFieldTransferReport,
  runM6OffFieldTransferReport,
} from '../../src/index.js';

const report = runM6OffFieldTransferReport();

describe('M6 deterministic off-field and transfer report', () => {
  it('pins content and crosses the required identity, risk, policy, and program bands', () => {
    expect(report.contentCompatibilityVersion).toBe(CONTENT_COMPATIBILITY_VERSION);
    expect(report.contentManifestSchemaVersion).toBe(8);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(report.scenarios).toEqual(M6_OFF_FIELD_SCENARIOS);
    expect(report.totalCareers).toBe(6);
    expect(report.segments.recruitTier).toHaveLength(3);
    expect(report.segments.archetype).toHaveLength(3);
    expect(report.segments.programStrengthBand).toHaveLength(3);
    expect(report.segments.academicRisk).toHaveLength(2);
    expect(report.segments.relationshipStrategy).toHaveLength(3);
    expect(report.segments.nilDecisionPolicy).toHaveLength(3);
    expect(report.segments.offseasonChoicePolicy).toHaveLength(2);
    expect(report.segments.selectedCoachChange.length).toBeGreaterThanOrEqual(2);
    expect(report.segments.actualNextRole.length).toBeGreaterThanOrEqual(3);
    for (const segment of Object.values(report.segments)) {
      expect(segment.reduce((total, { careerCount }) => total + careerCount, 0)).toBe(
        report.totalCareers,
      );
    }
  });

  it('covers academic outcomes, relationship direction, NIL choices, staff changes, and both offseason branches', () => {
    expect(report.outcomes.transferCareerCount).toBe(3);
    expect(report.outcomes.stayCareerCount).toBe(3);
    expect(report.outcomes.schemeChangeCareerCount).toBeGreaterThan(0);
    expect(report.outcomes.observedAcademicStatusIds).toEqual([
      'ELIGIBLE',
      'INELIGIBLE',
      'WARNING',
    ]);
    expect(report.outcomes.observedRelationshipDirectionIds).toEqual(['down', 'flat', 'up']);
    expect(report.outcomes.observedNilOfferIds.length).toBeGreaterThanOrEqual(5);
    expect(report.outcomes.observedWorldCoachChangeIds).toEqual([
      'offseason_coach_change_continuity',
      'offseason_coach_change_position_staff',
      'offseason_coach_change_scheme_shift',
    ]);
    expect(report.outcomes.observedNextRoleIds).toEqual([
      'depth_role_developmental',
      'depth_role_reserve',
      'depth_role_starter',
    ]);
    expect(report.samples.some(({ nilFulfilledCount }) => nilFulfilledCount > 0)).toBe(true);
    expect(report.samples.some(({ nilDefaultedCount }) => nilDefaultedCount > 0)).toBe(true);
    expect(report.samples.some(({ nilDeclinedCount }) => nilDeclinedCount > 0)).toBe(true);
  });

  it('round-trips every career into a truthful selected-program season-two opener', () => {
    for (const sample of report.samples) {
      expect(sample.reproduction).toContain(`seed=${JSON.stringify(sample.seed)}`);
      expect(sample.academicCheckpointStatusIds).toHaveLength(2);
      expect(sample.relationshipDirections).toHaveLength(3);
      expect(sample.programChanged).toBe(sample.offseasonChoicePolicy === 'first_transfer');
      expect(sample.cumulativeGamesAfterOpening).toBe(sample.firstSeasonGamesPlayed + 1);
      expect(sample.completedSeasonHistoryCount).toBe(1);
      expect(sample.totalRoundTripCount).toBeGreaterThan(250);
      expect(sample.allRoundTripsEquivalent).toBe(true);
      expect(sample.careerRngDrawCount).toBeGreaterThan(0);
      expect(sample.worldRngDrawCount).toBeGreaterThan(0);
    }
  });

  it('replays byte-identically within a bounded report runtime', () => {
    const startedAt = performance.now();
    const replay = runM6OffFieldTransferReport();
    const elapsedMs = performance.now() - startedAt;

    expect(replay).toEqual(report);
    expect(formatM6OffFieldTransferReport(replay)).toBe(formatM6OffFieldTransferReport(report));
    expect(elapsedMs).toBeLessThan(30_000);
  }, 40_000);
});

describe('M6 checked-in off-field artifact', () => {
  it('is timestamp-free, machine-readable, and synchronized byte-for-byte', () => {
    const formatted = formatM6OffFieldTransferReport(report);
    const checkedIn = readFileSync(
      new URL('../../reports/m6-off-field-transfer-baseline.jsonl', import.meta.url),
      'utf8',
    ).trimEnd();

    expect(JSON.parse(formatted)).toEqual(report);
    expect(formatted).not.toContain('generatedAt');
    expect(checkedIn).toBe(formatted);
  });

  it('keeps every completed M1–M5 report byte-stable', () => {
    for (const [fileName, expectedHash] of Object.entries(M6_PRIOR_REPORT_SHA256)) {
      const bytes = readFileSync(new URL(`../../reports/${fileName}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'), fileName).toBe(expectedHash);
    }
  });
});
