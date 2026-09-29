import { cloneSerializable, deepFreeze } from './immutable.js';
import { migrateCareerRunV1ToV2 } from './migrations/v1-to-v2.js';
import { migrateCareerRunV2ToV3 } from './migrations/v2-to-v3.js';
import { migrateCareerRunV3ToV4 } from './migrations/v3-to-v4.js';
import { migrateCareerRunV4ToV5 } from './migrations/v4-to-v5.js';
import { migrateCareerRunV5ToV6 } from './migrations/v5-to-v6.js';
import { migrateCareerRunV6ToV7 } from './migrations/v6-to-v7.js';
import {
  CAREER_SCHEMA_VERSION_V1,
  CAREER_SCHEMA_VERSION_V2,
  CAREER_SCHEMA_VERSION_V3,
  CAREER_SCHEMA_VERSION_V4,
  CAREER_SCHEMA_VERSION_V5,
  CAREER_SCHEMA_VERSION_V6,
  CAREER_SCHEMA_VERSION_V7,
  type CareerRunV1,
  type CareerRunV2,
  type CareerRunV3,
  type CareerRunV4,
  type CareerRunV5,
  type CareerRunV6,
  type CareerRunV7,
} from './types.js';
import {
  validateCareerRunV1,
  validateCareerRunV2,
  validateCareerRunV3,
  validateCareerRunV4,
  validateCareerRunV5,
  validateCareerRunV6,
  validateCareerRunV7,
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

export type ParseCareerRunV3Result =
  { readonly ok: true; readonly career: CareerRunV3 } | CareerParseFailure;

export type ParseCareerRunV4Result =
  { readonly ok: true; readonly career: CareerRunV4 } | CareerParseFailure;

export type ParseCareerRunV5Result =
  { readonly ok: true; readonly career: CareerRunV5 } | CareerParseFailure;

export type ParseCareerRunV6Result =
  { readonly ok: true; readonly career: CareerRunV6 } | CareerParseFailure;

export type ParseCareerRunV7Result =
  { readonly ok: true; readonly career: CareerRunV7 } | CareerParseFailure;

export type ParseCareerRunResult = ParseCareerRunV7Result;

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

function parseV3Snapshot(snapshot: unknown): ParseCareerRunV3Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V3) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV3(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV3) });
}

function parseV4Snapshot(snapshot: unknown): ParseCareerRunV4Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V4) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV4(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV4) });
}

function parseV5Snapshot(snapshot: unknown): ParseCareerRunV5Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V5) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV5(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV5) });
}

function parseV6Snapshot(snapshot: unknown): ParseCareerRunV6Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V6) {
    return failure('career_parse.unsupported_version');
  }

  const validation = validateCareerRunV6(snapshot);
  if (!validation.ok) {
    return failure('career_parse.invalid_career', validation.issues);
  }
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV6) });
}

function parseV7Snapshot(snapshot: unknown): ParseCareerRunV7Result {
  const schemaVersion = readSchemaVersion(snapshot);
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V7) {
    return failure('career_parse.unsupported_version');
  }
  const validation = validateCareerRunV7(snapshot);
  if (!validation.ok) return failure('career_parse.invalid_career', validation.issues);
  return deepFreeze({ ok: true, career: deepFreeze(snapshot as CareerRunV7) });
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

/** Parses schema v3 exactly and rejects every other numeric schema version. */
export function parseCareerRunV3(value: unknown): ParseCareerRunV3Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV3Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses schema v4 exactly and rejects every other numeric schema version. */
export function parseCareerRunV4(value: unknown): ParseCareerRunV4Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV4Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses schema v5 exactly and rejects every other numeric schema version. */
export function parseCareerRunV5(value: unknown): ParseCareerRunV5Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV5Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses schema v6 exactly and rejects every other numeric schema version. */
export function parseCareerRunV6(value: unknown): ParseCareerRunV6Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV6Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses schema v7 exactly and rejects every other numeric schema version. */
export function parseCareerRunV7(value: unknown): ParseCareerRunV7Result {
  const snapshot = snapshotInput(value);
  return snapshot.ok ? parseV7Snapshot(snapshot.snapshot) : failure(snapshot.reason);
}

/** Parses the current schema, chaining valid legacy snapshots exactly once per version. */
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
      return deepFreeze({
        ok: true,
        career: migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(
            migrateCareerRunV4ToV5(
              migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(migrateCareerRunV1ToV2(legacy.career))),
            ),
          ),
        ),
      });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (schemaVersion === CAREER_SCHEMA_VERSION_V2) {
    const legacy = parseV2Snapshot(snapshot);
    if (!legacy.ok) {
      return legacy;
    }
    try {
      return deepFreeze({
        ok: true,
        career: migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(
            migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(migrateCareerRunV2ToV3(legacy.career))),
          ),
        ),
      });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (schemaVersion === CAREER_SCHEMA_VERSION_V3) {
    const legacy = parseV3Snapshot(snapshot);
    if (!legacy.ok) {
      return legacy;
    }
    try {
      return deepFreeze({
        ok: true,
        career: migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(migrateCareerRunV3ToV4(legacy.career))),
        ),
      });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (schemaVersion === CAREER_SCHEMA_VERSION_V4) {
    const legacy = parseV4Snapshot(snapshot);
    if (!legacy.ok) {
      return legacy;
    }
    try {
      return deepFreeze({
        ok: true,
        career: migrateCareerRunV6ToV7(
          migrateCareerRunV5ToV6(migrateCareerRunV4ToV5(legacy.career)),
        ),
      });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (schemaVersion === CAREER_SCHEMA_VERSION_V5) {
    const legacy = parseV5Snapshot(snapshot);
    if (!legacy.ok) {
      return legacy;
    }
    try {
      return deepFreeze({
        ok: true,
        career: migrateCareerRunV6ToV7(migrateCareerRunV5ToV6(legacy.career)),
      });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (schemaVersion === CAREER_SCHEMA_VERSION_V6) {
    const legacy = parseV6Snapshot(snapshot);
    if (!legacy.ok) return legacy;
    try {
      return deepFreeze({ ok: true, career: migrateCareerRunV6ToV7(legacy.career) });
    } catch {
      return failure('career_parse.invalid_career');
    }
  }
  if (typeof schemaVersion === 'number' && schemaVersion !== CAREER_SCHEMA_VERSION_V7) {
    return failure('career_parse.unsupported_version');
  }
  return parseV7Snapshot(snapshot);
}
