import { describe, expect, it } from 'vitest';
import {
  advancePositionAlphaSeasonClockV2,
  isPositionAlphaSeasonClockV2,
  positionAlphaCareerWeekIndexV2,
  projectHistoricalPositionAlphaSeasonClockV2,
  positionAlphaSourceClockV2,
  positionAlphaSourceCareerWeekIndexV2,
} from '../src/season/position-alpha-calendar-v2.js';

describe('current postseason calendar compatibility foundation', () => {
  it('binds explicit source clocks to the owning season and never hides malformed activation', () => {
    const source = { lifecycle: { activeSeasonIndex: 1 } };
    const explicit = {
      ...source,
      seasonClock: advancePositionAlphaSeasonClockV2(
        projectHistoricalPositionAlphaSeasonClockV2(0)!,
      )!,
    };
    expect(positionAlphaSourceCareerWeekIndexV2(source, 0)).toBe(12);
    expect(positionAlphaSourceCareerWeekIndexV2(explicit, 0)).toBe(14);
    expect(positionAlphaSourceCareerWeekIndexV2(explicit, 13)).toBe(27);
    expect(
      positionAlphaSourceClockV2({ ...explicit, lifecycle: { activeSeasonIndex: 0 } }),
    ).toBeNull();
    for (const seasonClock of [null, undefined, {}, { ...explicit.seasonClock, extra: true }]) {
      const invalid = { ...source, seasonClock } as unknown as typeof explicit;
      expect(positionAlphaSourceClockV2(invalid)).toBeNull();
      expect(positionAlphaSourceCareerWeekIndexV2(invalid, 0)).toBeNull();
    }
  });
  it('preserves literal historical dates while projecting two postseason slots', () => {
    const first = projectHistoricalPositionAlphaSeasonClockV2(0)!;
    const historicalSecond = projectHistoricalPositionAlphaSeasonClockV2(1)!;
    expect(positionAlphaCareerWeekIndexV2(first, 11)).toBe(11);
    expect(positionAlphaCareerWeekIndexV2(historicalSecond, 0)).toBe(12);
    expect(positionAlphaCareerWeekIndexV2(historicalSecond, 11)).toBe(23);
    expect(positionAlphaCareerWeekIndexV2(first, 12)).toBe(12);
    expect(positionAlphaCareerWeekIndexV2(first, 13)).toBe(13);
    expect(positionAlphaCareerWeekIndexV2(first, 14)).toBe(14);
  });
  it('starts current season two after both bracket slots without changing its input or adding a third season', () => {
    const first = JSON.parse(
      JSON.stringify(projectHistoricalPositionAlphaSeasonClockV2(0)),
    ) as NonNullable<ReturnType<typeof projectHistoricalPositionAlphaSeasonClockV2>>;
    const before = JSON.stringify(first);
    const second = advancePositionAlphaSeasonClockV2(first)!;
    expect(second).toEqual({
      model: 'position_alpha_season_clock_v2',
      seasonIndex: 1,
      careerWeekOffset: 14,
    });
    expect(positionAlphaCareerWeekIndexV2(second, 0)).toBe(14);
    expect(positionAlphaCareerWeekIndexV2(second, 13)).toBe(27);
    expect(positionAlphaCareerWeekIndexV2(second, 14)).toBe(28);
    expect(advancePositionAlphaSeasonClockV2(second)).toBeNull();
    expect(JSON.stringify(first)).toBe(before);
    expect(Object.isFrozen(first)).toBe(false);
    expect(Object.isFrozen(second)).toBe(true);
    expect(isPositionAlphaSeasonClockV2(JSON.parse(JSON.stringify(second)))).toBe(true);
  });
  it('rejects wrong model, extra keys, inconsistent offsets and invalid week bounds', () => {
    const first = projectHistoricalPositionAlphaSeasonClockV2(0)!;
    for (const value of [
      null,
      [],
      {},
      { ...first, extra: true },
      { ...first, careerWeekOffset: 12 },
      { ...first, seasonIndex: 1 },
      { ...first, seasonIndex: 2, careerWeekOffset: 28 },
      { ...first, model: 'other' },
    ])
      expect(isPositionAlphaSeasonClockV2(value)).toBe(false);
    for (const week of [-1, 1.5, 15, NaN, Infinity])
      expect(positionAlphaCareerWeekIndexV2(first, week)).toBeNull();
    for (const season of [-1, 2, '1', null])
      expect(projectHistoricalPositionAlphaSeasonClockV2(season)).toBeNull();
  });
});
