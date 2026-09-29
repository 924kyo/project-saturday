import { ATTRIBUTE_XP_PER_RATING } from '../weekly/tuning.js';
import { ATTRIBUTE_PROGRESS_XP_BOUNDS, ATTRIBUTE_RATING_BOUNDS } from './bounds.js';
import { deepFreeze } from './immutable.js';
import {
  CB_ATTRIBUTE_IDS,
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  POSITION_CB_ID,
  POSITION_QB_ID,
  POSITION_RB_ID,
  POSITION_WR_ID,
  QB_ATTRIBUTE_IDS,
  RB_ATTRIBUTE_IDS,
  WR_ATTRIBUTE_IDS,
  isMultiPositionAttributeId,
  isPositionId,
  type MultiPositionAttributeId,
  type PositionId,
} from './ids.js';
import type { AttributeProgress } from './types.js';

export const SHARED_PLAYER_ATTRIBUTE_IDS = Object.freeze([
  ...PHYSICAL_ATTRIBUTE_IDS,
  ...MENTAL_ATTRIBUTE_IDS,
] as const);

export type PositionAttributeProgress = Readonly<
  Partial<Record<MultiPositionAttributeId, AttributeProgress>>
>;

export interface AttributeProgressProjection extends AttributeProgress {
  readonly atMaximumRating: boolean;
  readonly nextRating: number | null;
  readonly progressPermille: number;
  readonly xpToNextRating: number;
}

export type PositionProgressionIssueCode =
  | 'progression.duplicate_attribute'
  | 'progression.invalid_attribute'
  | 'progression.invalid_position'
  | 'progression.invalid_progress'
  | 'progression.missing_attribute'
  | 'progression.unexpected_attribute';

export interface PositionProgressionIssue {
  readonly code: PositionProgressionIssueCode;
  readonly path: string;
}

export type DerivePositionOverallResult =
  | { readonly ok: true; readonly overall: number }
  | { readonly ok: false; readonly issues: readonly PositionProgressionIssue[] };

export function getPositionAttributeIds(
  positionId: PositionId,
): readonly MultiPositionAttributeId[] {
  switch (positionId) {
    case POSITION_WR_ID:
      return WR_ATTRIBUTE_IDS;
    case POSITION_QB_ID:
      return QB_ATTRIBUTE_IDS;
    case POSITION_RB_ID:
      return RB_ATTRIBUTE_IDS;
    case POSITION_CB_ID:
      return CB_ATTRIBUTE_IDS;
  }
}

export function getPlayableAttributeIds(
  positionId: PositionId,
): readonly MultiPositionAttributeId[] {
  return Object.freeze([...SHARED_PLAYER_ATTRIBUTE_IDS, ...getPositionAttributeIds(positionId)]);
}

function isValidProgress(value: unknown): value is AttributeProgress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    Object.hasOwn(record, 'rating') &&
    Object.hasOwn(record, 'xp') &&
    Number.isInteger(record['rating']) &&
    (record['rating'] as number) >= ATTRIBUTE_RATING_BOUNDS.min &&
    (record['rating'] as number) <= ATTRIBUTE_RATING_BOUNDS.max &&
    Number.isInteger(record['xp']) &&
    (record['xp'] as number) >= ATTRIBUTE_PROGRESS_XP_BOUNDS.min &&
    (record['xp'] as number) <= ATTRIBUTE_PROGRESS_XP_BOUNDS.max &&
    ((record['rating'] as number) < ATTRIBUTE_RATING_BOUNDS.max || record['xp'] === 0)
  );
}

export function projectAttributeProgress(progress: AttributeProgress): AttributeProgressProjection {
  if (!isValidProgress(progress)) {
    throw new RangeError('Attribute progress requires a bounded rating and canonical stored XP.');
  }
  const atMaximumRating = progress.rating === ATTRIBUTE_RATING_BOUNDS.max;
  return deepFreeze({
    rating: progress.rating,
    xp: progress.xp,
    atMaximumRating,
    nextRating: atMaximumRating ? null : progress.rating + 1,
    progressPermille: atMaximumRating
      ? 1_000
      : Math.floor((progress.xp * 1_000) / ATTRIBUTE_XP_PER_RATING),
    xpToNextRating: atMaximumRating ? 0 : ATTRIBUTE_XP_PER_RATING - progress.xp,
  });
}

export function validatePositionAttributeProgress(
  positionId: unknown,
  attributes: unknown,
): readonly PositionProgressionIssue[] {
  const issues: PositionProgressionIssue[] = [];
  if (!isPositionId(positionId)) {
    return deepFreeze([{ code: 'progression.invalid_position', path: 'positionId' }]);
  }
  if (typeof attributes !== 'object' || attributes === null || Array.isArray(attributes)) {
    return deepFreeze([{ code: 'progression.invalid_progress', path: 'attributes' }]);
  }
  const record = attributes as Record<string, unknown>;
  const expectedIds = getPlayableAttributeIds(positionId);
  const expected = new Set<string>(expectedIds);
  for (const attributeId of expectedIds) {
    if (!Object.hasOwn(record, attributeId)) {
      issues.push({ code: 'progression.missing_attribute', path: `attributes.${attributeId}` });
    } else if (!isValidProgress(record[attributeId])) {
      issues.push({ code: 'progression.invalid_progress', path: `attributes.${attributeId}` });
    }
  }
  for (const attributeId of Object.keys(record)) {
    if (!isMultiPositionAttributeId(attributeId)) {
      issues.push({ code: 'progression.invalid_attribute', path: `attributes.${attributeId}` });
    } else if (!expected.has(attributeId)) {
      issues.push({ code: 'progression.unexpected_attribute', path: `attributes.${attributeId}` });
    }
  }
  return deepFreeze(
    issues.sort((left, right) =>
      left.path === right.path
        ? left.code.localeCompare(right.code)
        : left.path.localeCompare(right.path),
    ),
  );
}

export function derivePositionOverall(
  positionId: unknown,
  attributes: unknown,
): DerivePositionOverallResult {
  const issues = validatePositionAttributeProgress(positionId, attributes);
  if (issues.length > 0 || !isPositionId(positionId)) {
    return deepFreeze({ ok: false, issues });
  }
  const record = attributes as PositionAttributeProgress;
  const attributeIds = getPlayableAttributeIds(positionId);
  const ratingTotal = attributeIds.reduce(
    (total, attributeId) => total + record[attributeId]!.rating,
    0,
  );
  return deepFreeze({ ok: true, overall: Math.round(ratingTotal / attributeIds.length) });
}
