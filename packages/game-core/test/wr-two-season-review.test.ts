import { describe, expect, it } from 'vitest';
import {
  createWrTwoSeasonReviewV1,
  parseWrTwoSeasonReviewV1,
  createCareerSession,
  parseCareerRun,
  migrateCareerSessionV7ToV8,
  enterWrTwoSeasonReviewV8,
  completeWrTwoSeasonCareerV8,
  createWrTwoSeasonAlumniV1,
  parseWrTwoSeasonAlumniV1,
} from '../src/index.js';
import { CAREER_RUN_V3_PHASE_FIXTURE_CASES } from './fixtures/career-run-v3.js';

describe('staged WR two-season review source boundary', () => {
  it('rejects missing, future, oversized and cyclic records', () => {
    for (const value of [
      null,
      undefined,
      {},
      [],
      '{',
      { source: null },
      { source: {}, padding: 'x'.repeat(1_000_000) },
    ]) {
      expect(createWrTwoSeasonReviewV1(value)).toBeNull();
      expect(parseWrTwoSeasonReviewV1(value)).toBeNull();
      expect(createWrTwoSeasonAlumniV1(value, 1)).toBeNull();
      expect(parseWrTwoSeasonAlumniV1(value)).toBeNull();
    }
    const cyclic: { source?: unknown } = {};
    cyclic.source = cyclic;
    expect(parseWrTwoSeasonReviewV1(cyclic)).toBeNull();
    expect(parseWrTwoSeasonAlumniV1(cyclic)).toBeNull();
  });
  it('does not turn a neutral historical pre-season career into a completed review', () => {
    const career = parseCareerRun(CAREER_RUN_V3_PHASE_FIXTURE_CASES[0]!.career);
    if (!career.ok) throw new Error(career.reason);
    const source = createCareerSession(career.career);
    expect(createWrTwoSeasonReviewV1(source)).toBeNull();
    expect(parseWrTwoSeasonReviewV1({ model: 'wr_two_season_review_v1', source })).toBeNull();
    const current = migrateCareerSessionV7ToV8(source);
    const rejected = enterWrTwoSeasonReviewV8(current);
    expect(rejected.ok).toBe(false);
    expect(rejected.session).toBe(current);
    const completion = completeWrTwoSeasonCareerV8(current, 1);
    expect(completion.ok).toBe(false);
    expect(completion.session).toBe(current);
  });
});
