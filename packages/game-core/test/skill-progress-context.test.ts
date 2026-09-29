import { describe, expect, it } from 'vitest';
import {
  bankSkillBreakthroughProgress,
  deriveSkillBreakthroughProgressFromContext,
  type SkillBreakthroughProgressContext,
  type SkillProgressFocusEvidence,
} from '../src/skills/progress.js';

const focus: SkillProgressFocusEvidence = {
  actionId: 'action_qb_delivery_work',
  attributeXp: [],
  proficiency: null,
  preparationBefore: 50,
  preparationAfter: 50,
  confidenceBefore: 50,
  confidenceAfter: 50,
  baseBodyDelta: -5,
  bodyBefore: 80,
  bodyAfter: 75,
  gpaBefore: 2.5,
  gpaAfter: 2.5,
};
const baseline: SkillBreakthroughProgressContext = {
  completedWeekIndex: 1,
  progressBefore: 0,
  results: [focus, focus, focus],
  depthUpdate: null,
  game: null,
};

describe('shared explicit six-source breakthrough progress', () => {
  it('preserves canonical source priority and the weekly cap from actual thresholds', () => {
    const input: SkillBreakthroughProgressContext = {
      ...baseline,
      progressBefore: 90,
      results: [
        { ...focus, attributeXp: [{ ratingBefore: 60, ratingAfter: 61 }] },
        focus,
        {
          ...focus,
          actionId: 'action_recovery',
          baseBodyDelta: 20,
          confidenceAfter: 51,
          gpaAfter: 2.6,
        },
      ],
      depthUpdate: { movement: 'HELD', actualCoachTrustDelta: 2, weeklyPracticeScore: 60 },
      game: { opportunityCount: 3, gradeBandId: 'performance_grade_poor' },
    };
    const before = JSON.stringify(input);
    const result = deriveSkillBreakthroughProgressFromContext(input);
    expect(result).toEqual({
      model: 'gauge_v1',
      weekIndex: 1,
      progressBefore: 90,
      pointsEarned: 60,
      progressAfter: 50,
      threshold: 100,
      triggeredOffer: true,
      sources: [
        { sourceId: 'breakthrough_source_development', points: 12 },
        { sourceId: 'breakthrough_source_role_coach', points: 8 },
        { sourceId: 'breakthrough_source_game_day', points: 7 },
        { sourceId: 'breakthrough_source_mindset', points: 2 },
        { sourceId: 'breakthrough_source_body', points: 12 },
        { sourceId: 'breakthrough_source_life', points: 19 },
      ],
    });
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(input.results[0])).toBe(false);
    expect(Object.isFrozen(result.sources[0])).toBe(true);
    expect(deriveSkillBreakthroughProgressFromContext(JSON.parse(before))).toEqual(result);
  });

  it('recognizes proficiency, promotion, preparation, and low-body recovery independently', () => {
    const result = deriveSkillBreakthroughProgressFromContext({
      ...baseline,
      results: [
        {
          ...focus,
          bodyBefore: 40,
          baseBodyDelta: 0,
          proficiency: { levelBefore: 0, levelAfter: 1 },
        },
        { ...focus, baseBodyDelta: 0 },
        {
          ...focus,
          actionId: 'action_recovery',
          baseBodyDelta: 20,
          bodyAfter: 60,
          preparationAfter: 62,
        },
      ],
      depthUpdate: { movement: 'PROMOTED', actualCoachTrustDelta: 4, weeklyPracticeScore: 75 },
    });
    expect(result.sources).toEqual([
      { sourceId: 'breakthrough_source_development', points: 8 },
      { sourceId: 'breakthrough_source_role_coach', points: 28 },
      { sourceId: 'breakthrough_source_body', points: 10 },
    ]);
    expect(result.pointsEarned).toBe(46);
    expect(result.triggeredOffer).toBe(false);
  });

  it('preserves truthful zero-opportunity progress and zero-draw banking', () => {
    const result = deriveSkillBreakthroughProgressFromContext({
      ...baseline,
      results: [],
      progressBefore: 94,
      game: { opportunityCount: 0, gradeBandId: 'performance_grade_elite' },
    });
    expect(result.sources).toEqual([{ sourceId: 'breakthrough_source_game_day', points: 6 }]);
    expect(result.progressAfter).toBe(0);
    expect(result.triggeredOffer).toBe(true);
    expect(bankSkillBreakthroughProgress(result)).toEqual({
      ...result,
      triggeredOffer: false,
      progressAfter: 100,
    });
    expect(
      deriveSkillBreakthroughProgressFromContext({ ...baseline, results: [] }).sources,
    ).toEqual([]);
  });
});
