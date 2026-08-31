import { cloneSerializable, deepFreeze } from './immutable.js';
import { migrateCareerRunV1ToV2 } from './migrations/v1-to-v2.js';
import {
  CAREER_SCHEMA_VERSION_V1,
  CAREER_SCHEMA_VERSION_V2,
  type CareerRunV1,
  type CareerRunV2,
} from './types.js';
import {
  validateCareerRunV1,
  validateCareerRunV2,
  type CareerInvariantIssue,
} from './validation.js';

export const CAREER_PARSE_FAILURE_REASONS = Object.freeze([
  'career_parse.invalid_json',
  'career_parse.unsupported_version',
  'career_parse.invalid_career',
] as const);

export type CareerParseFailureReason = (typeof CAREER_PARSE_FAILURE_REASONS)[number];

export interface CareerParseFailure {
  readonly ok: false;
  readonly reason: CareerParseFailureReason;
  readonly issues: readonly CareerInvariantIssue[];
}

export type ParseCareerRunV1Result =
  { readonly ok: true; readonly career: CareerRunV1 } | CareerParseFailure;

export type ParseCareerRunV2Result =
  { readonly ok: true; readonly career: CareerRunV2 } | CareerParseFailure;

export type ParseCareerRunResult = ParseCareerRunV2Result;

type SnapshotResult =
  | { readonly ok: true; readonly snapshot: unknown }
  | {
      readonly ok: false;
      readonly reason: 'career_parse.invalid_json' | 'career_parse.invalid_career';
    };

function failure(
  reason: CareerParseFailureReason,
  issues: readonly CareerInvariantIssue[] = [],
): CareerParseFailure {
  return deepFreeze({ ok: false, reason, issues: [...issues] });
}

function readSchemaVersion(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return (value as Readonly<Record<string, unknown>>)['schemaVersion'];
}

function snapshotInput(value: unknown): SnapshotResult {
  let decoded: unknown = value;
  if (typeof value === 'string') {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return { ok: false, reason: 'career_parse.invalid_json' };
    }
  }

  try {
    return { ok: true, snapshot: cloneSerializable(decoded) };
  } catch {
    return { ok: false, reason: 'career_parse.invalid_career' };
  }
}

function parseV1Snapshot(snapshot: unknown): ParseCareerRunV1Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V1) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV1(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV1) });
}

function parseV2Snapshot(snapshot: unknown): ParseCareerRunV2Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V2) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV2(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV2) });
}

/** Parses schema v1 exactly and never migrates it. */
export function parseCareerRunV1(value: unknown): ParseCareerRunV1Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV1Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses schema v2 exactly and rejects every other numeric schema version. */
export function parseCareerRunV2(value: unknown): ParseCareerRunV2Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV2Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses the current schema, migrating a valid schema-v1 snapshot exactly once. */
export function parseCareerRun(value: unknown): ParseCareerRunResult {
  const decoded = snapshotInput(value);
  if (!decoded.ok) {
    return failure(decoded.reason);
  }

  const { snapshot } = decoded;
  const schemaVersion = readSchemaVersion(snapshot);
  if (schemaVersion === CAREER_SCHEMA_VERSION_V1) {
    const legacy = parseV1Snapshot(snapshot);
    if (!legacy.ok) {
      return legacy;
    }
    try {
      return deepFreeze({ ok: true, career: migrateCareerRunV1ToV2(legacy.career) });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V2) {
    return failure('career_parse.unsupported_version');
  }
  return parseV2Snapshot(snapshot);
}
