export interface NumericBounds {
  readonly min: number;
  readonly max: number;
}

function bounds(min: number, max: number): NumericBounds {
  return Object.freeze({ min, max });
}

export const ATTRIBUTE_RATING_BOUNDS = bounds(0, 100);
export const ATTRIBUTE_PROGRESS_XP_BOUNDS = bounds(0, 99);
export const BODY_BOUNDS = bounds(0, 100);
export const CONFIDENCE_BOUNDS = bounds(0, 100);
export const COACH_TRUST_BOUNDS = bounds(0, 100);
export const BRAND_BOUNDS = bounds(0, 100);
export const GPA_BOUNDS = bounds(0, 4);

// These broad creation bounds protect data integrity without encoding a WR build optimum.
export const HEIGHT_CM_BOUNDS = bounds(150, 215);
export const WEIGHT_KG_BOUNDS = bounds(55, 150);

export function isWithinBounds(value: unknown, valueBounds: NumericBounds): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= valueBounds.min &&
    value <= valueBounds.max
  );
}

export function isIntegerWithinBounds(value: unknown, valueBounds: NumericBounds): value is number {
  return Number.isInteger(value) && isWithinBounds(value, valueBounds);
}
