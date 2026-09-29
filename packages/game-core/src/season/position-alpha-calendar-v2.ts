import { deepFreeze } from '../player/immutable.js';

export const POSITION_ALPHA_REGULAR_WEEK_COUNT = 12 as const;
export const POSITION_ALPHA_POSTSEASON_WEEK_COUNT = 2 as const;
export const POSITION_ALPHA_CURRENT_SEASON_WEEK_COUNT =
  POSITION_ALPHA_REGULAR_WEEK_COUNT + POSITION_ALPHA_POSTSEASON_WEEK_COUNT;

/** Absent from neutral migration; current activation/season commands own persistence. */
export interface PositionAlphaSeasonClockV2 {
  readonly model: 'position_alpha_season_clock_v2';
  readonly seasonIndex: 0 | 1;
  readonly careerWeekOffset: 0 | 12 | 14;
}

export interface PositionAlphaCalendarSourceV2 {
  readonly lifecycle: { readonly activeSeasonIndex: number };
  readonly seasonClock?: PositionAlphaSeasonClockV2;
}

/** An explicitly present malformed clock must never fall back to historical dates. */
export function positionAlphaSourceClockV2(
  source: PositionAlphaCalendarSourceV2,
): PositionAlphaSeasonClockV2 | null {
  if (!Object.hasOwn(source, 'seasonClock'))
    return projectHistoricalPositionAlphaSeasonClockV2(source.lifecycle.activeSeasonIndex);
  return isPositionAlphaSeasonClockV2(source.seasonClock) &&
    source.seasonClock.seasonIndex === source.lifecycle.activeSeasonIndex
    ? source.seasonClock
    : null;
}

export function positionAlphaSourceCareerWeekIndexV2(
  source: PositionAlphaCalendarSourceV2,
  seasonWeekIndex: number,
): number | null {
  const clock = positionAlphaSourceClockV2(source);
  return clock === null ? null : positionAlphaCareerWeekIndexV2(clock, seasonWeekIndex);
}

export function isPositionAlphaSeasonClockV2(value: unknown): value is PositionAlphaSeasonClockV2 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const clock = value as Record<string, unknown>;
  return (
    Object.keys(clock).sort().join('|') === 'careerWeekOffset|model|seasonIndex' &&
    clock['model'] === 'position_alpha_season_clock_v2' &&
    (clock['seasonIndex'] === 0
      ? clock['careerWeekOffset'] === 0
      : clock['seasonIndex'] === 1 &&
        [POSITION_ALPHA_REGULAR_WEEK_COUNT, POSITION_ALPHA_CURRENT_SEASON_WEEK_COUNT].includes(
          clock['careerWeekOffset'] as number,
        ))
  );
}

/** Projection only: preserves the literal historical clock, never mutates a migrated save. */
export function projectHistoricalPositionAlphaSeasonClockV2(
  seasonIndex: unknown,
): PositionAlphaSeasonClockV2 | null {
  if (seasonIndex !== 0 && seasonIndex !== 1) return null;
  return deepFreeze({
    model: 'position_alpha_season_clock_v2',
    seasonIndex,
    careerWeekOffset: seasonIndex === 0 ? 0 : 12,
  });
}

/** Includes the boundary after the final bracket slot, for the next-season offset. */
export function positionAlphaCareerWeekIndexV2(
  clock: PositionAlphaSeasonClockV2,
  seasonWeekIndex: number,
): number | null {
  if (
    !isPositionAlphaSeasonClockV2(clock) ||
    !Number.isSafeInteger(seasonWeekIndex) ||
    seasonWeekIndex < 0 ||
    seasonWeekIndex > POSITION_ALPHA_CURRENT_SEASON_WEEK_COUNT
  )
    return null;
  return clock.careerWeekOffset + seasonWeekIndex;
}

/** Qualification affects football participation, never the shared two-slot bracket calendar. */
export function advancePositionAlphaSeasonClockV2(
  clock: PositionAlphaSeasonClockV2,
): PositionAlphaSeasonClockV2 | null {
  if (!isPositionAlphaSeasonClockV2(clock) || clock.seasonIndex !== 0) return null;
  return deepFreeze({
    model: 'position_alpha_season_clock_v2',
    seasonIndex: 1,
    careerWeekOffset: 14,
  });
}
