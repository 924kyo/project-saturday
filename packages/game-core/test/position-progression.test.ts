import {
  ATTRIBUTE_XP_PER_RATING,
  CB_ATTRIBUTE_IDS,
  EDGE_ATTRIBUTE_IDS,
  LB_ATTRIBUTE_IDS,
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  POSITION_IDS,
  QB_ATTRIBUTE_IDS,
  RB_ATTRIBUTE_IDS,
  SHARED_PLAYER_ATTRIBUTE_IDS,
  WR_ATTRIBUTE_IDS,
  derivePositionOverall,
  getPlayableAttributeIds,
  getPositionAttributeIds,
  projectAttributeProgress,
  validatePositionAttributeProgress,
  type MultiPositionAttributeId,
  type PositionAttributeProgress,
  type PositionId,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

function completeAttributes(
  positionId: PositionId,
  sharedRating = 60,
  positionRating = 70,
): PositionAttributeProgress {
  return Object.fromEntries([
    ...SHARED_PLAYER_ATTRIBUTE_IDS.map((attributeId) => [
      attributeId,
      { rating: sharedRating, xp: 0 },
    ]),
    ...getPositionAttributeIds(positionId).map((attributeId) => [
      attributeId,
      { rating: positionRating, xp: 0 },
    ]),
  ]) as PositionAttributeProgress;
}

describe('M7 position progression contract', () => {
  it('returns the canonical 10 shared plus six selected-position attributes', () => {
    expect(SHARED_PLAYER_ATTRIBUTE_IDS).toEqual([
      ...PHYSICAL_ATTRIBUTE_IDS,
      ...MENTAL_ATTRIBUTE_IDS,
    ]);
    expect(POSITION_IDS.map(getPositionAttributeIds)).toEqual([
      WR_ATTRIBUTE_IDS,
      QB_ATTRIBUTE_IDS,
      RB_ATTRIBUTE_IDS,
      CB_ATTRIBUTE_IDS,
      LB_ATTRIBUTE_IDS,
      EDGE_ATTRIBUTE_IDS,
    ]);
    for (const positionId of POSITION_IDS) {
      expect(getPlayableAttributeIds(positionId)).toHaveLength(16);
      expect(new Set(getPlayableAttributeIds(positionId)).size).toBe(16);
    }
  });

  it('derives exact next-rating progress including the maximum-rating terminal state', () => {
    expect(projectAttributeProgress({ rating: 64, xp: 37 })).toEqual({
      atMaximumRating: false,
      nextRating: 65,
      progressPermille: 370,
      rating: 64,
      xp: 37,
      xpToNextRating: ATTRIBUTE_XP_PER_RATING - 37,
    });
    expect(projectAttributeProgress({ rating: 100, xp: 0 })).toEqual({
      atMaximumRating: true,
      nextRating: null,
      progressPermille: 1_000,
      rating: 100,
      xp: 0,
      xpToNextRating: 0,
    });
    expect(() => projectAttributeProgress({ rating: 100, xp: 1 })).toThrow(RangeError);
  });

  it('derives a deterministic rounded overall from exactly 16 responsible ratings', () => {
    for (const positionId of POSITION_IDS) {
      expect(derivePositionOverall(positionId, completeAttributes(positionId))).toEqual({
        ok: true,
        overall: 64,
      });
    }
  });

  it('rejects missing, cross-position, unknown, and malformed progress deterministically', () => {
    const attributes = {
      ...completeAttributes('position_qb'),
      attribute_rb_vision: { rating: 70, xp: 0 },
      attribute_unknown: { rating: 70, xp: 0 },
    } as Record<string, { rating: number; xp: number }>;
    delete attributes['attribute_qb_throw_power'];
    attributes['attribute_qb_short_accuracy'] = { rating: 100, xp: 1 };

    expect(validatePositionAttributeProgress('position_qb', attributes)).toEqual([
      {
        code: 'progression.invalid_progress',
        path: 'attributes.attribute_qb_short_accuracy',
      },
      {
        code: 'progression.missing_attribute',
        path: 'attributes.attribute_qb_throw_power',
      },
      {
        code: 'progression.unexpected_attribute',
        path: 'attributes.attribute_rb_vision',
      },
      { code: 'progression.invalid_attribute', path: 'attributes.attribute_unknown' },
    ]);
    expect(derivePositionOverall('position_qb', attributes).ok).toBe(false);
    expect(validatePositionAttributeProgress('position_te' as never, attributes)).toEqual([
      { code: 'progression.invalid_position', path: 'positionId' },
    ]);
  });

  it('does not accept a selected-position record typed with an unrelated attribute', () => {
    const attributes = completeAttributes('position_cb') as Record<
      MultiPositionAttributeId,
      { rating: number; xp: number }
    >;
    attributes.attribute_qb_throw_power = { rating: 80, xp: 0 };
    expect(validatePositionAttributeProgress('position_cb', attributes)).toContainEqual({
      code: 'progression.unexpected_attribute',
      path: 'attributes.attribute_qb_throw_power',
    });
  });
});
