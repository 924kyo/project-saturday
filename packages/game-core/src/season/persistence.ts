import { parseCareerRun } from '../player/persistence.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { migrateCareerRunV5ToV6 } from '../player/migrations/v5-to-v6.js';
import { migrateCareerRunV6ToV7 } from '../player/migrations/v6-to-v7.js';
import type { CareerRun } from '../player/types.js';
import { createRng, type RngSeed } from '../random/rng.js';
import {
  CAREER_SESSION_SCHEMA_VERSION_V5,
  CAREER_SESSION_SCHEMA_VERSION_V6,
  CAREER_SESSION_SCHEMA_VERSION_V7,
  META_PROFILE_SCHEMA_VERSION_V1,
  WORLD_SCHEMA_VERSION_V1,
  type CareerSessionV5,
  type CareerSessionV6,
  type CareerSessionV7,
  type MetaProfileV1,
  type WorldStateV1,
} from './types.js';
import {
  validateCareerSessionV5,
  validateCareerSessionV6,
  validateCareerSessionV7,
  validateMetaProfileV1,
  type SeasonInvariantIssue,
} from './validation.js';

export const SESSION_PARSE_FAILURE_REASONS = Object.freeze([
  'session_parse.invalid_json',
  'session_parse.unsupported_version',
  'session_parse.invalid_session',
] as const);

export type SessionParseFailureReason = (typeof SESSION_PARSE_FAILURE_REASONS)[number];
export type ParseCareerSessionResult =
  | { readonly ok: true; readonly session: CareerSessionV7 }
  | {
      readonly ok: false;
      readonly reason: SessionParseFailureReason;
      readonly issues: readonly SeasonInvariantIssue[];
    };

export type ParseMetaProfileResult =
  | { readonly ok: true; readonly meta: MetaProfileV1 }
  | {
      readonly ok: false;
      readonly reason: SessionParseFailureReason;
      readonly issues: readonly SeasonInvariantIssue[];
    };

function failure(
  reason: SessionParseFailureReason,
  issues: readonly SeasonInvariantIssue[] = [],
): Extract<ParseCareerSessionResult, { readonly ok: false }> {
  return deepFreeze({ ok: false as const, reason, issues: [...issues] });
}

function decode(
  value: unknown,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  let decoded = value;
  if (typeof value === 'string') {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return { ok: false };
    }
  }
  try {
    return { ok: true, value: cloneSerializable(decoded) };
  } catch {
    return { ok: false };
  }
}

function schemaVersion(value: unknown): unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)['schemaVersion']
    : undefined;
}

export function deriveWorldSeed(careerSeed: RngSeed): string {
  return `world_v1:${typeof careerSeed}:${String(careerSeed)}`;
}

export function createPendingWorldState(career: CareerRun): WorldStateV1 {
  const worldSeed = deriveWorldSeed(career.careerSeed);
  return deepFreeze({
    schemaVersion: WORLD_SCHEMA_VERSION_V1,
    model: 'season_v1',
    careerId: career.id,
    worldSeed,
    rng: createRng(worldSeed),
    revision: 0,
    calendar: { type: 'PENDING' },
  });
}

export function createCareerSession(career: CareerRun): CareerSessionV7 {
  const session = {
    schemaVersion: CAREER_SESSION_SCHEMA_VERSION_V7,
    career: cloneSerializable(career),
    world: createPendingWorldState(career),
  } satisfies CareerSessionV7;
  const validation = validateCareerSessionV7(session);
  if (!validation.ok) throw new TypeError('session_creation.invalid_session');
  return deepFreeze(session);
}

export function migrateCareerSnapshotToSession(value: unknown): ParseCareerSessionResult {
  const parsed = parseCareerRun(value);
  if (!parsed.ok) {
    return failure(
      parsed.reason === 'career_parse.unsupported_version'
        ? 'session_parse.unsupported_version'
        : parsed.reason === 'career_parse.invalid_json'
          ? 'session_parse.invalid_json'
          : 'session_parse.invalid_session',
    );
  }
  return deepFreeze({ ok: true, session: createCareerSession(parsed.career) });
}

export function migrateCareerSessionV5ToV6(session: CareerSessionV5): CareerSessionV6 {
  const sourceValidation = validateCareerSessionV5(session);
  if (!sourceValidation.ok) throw new TypeError('session_migration.invalid_v5');
  const migrated: CareerSessionV6 = {
    schemaVersion: CAREER_SESSION_SCHEMA_VERSION_V6,
    career: migrateCareerRunV5ToV6(session.career),
    world: cloneSerializable(session.world),
  };
  const validation = validateCareerSessionV6(migrated);
  if (!validation.ok) throw new TypeError('session_migration.invalid_v6');
  return deepFreeze(migrated);
}

export function migrateCareerSessionV6ToV7(session: CareerSessionV6): CareerSessionV7 {
  const sourceValidation = validateCareerSessionV6(session);
  if (!sourceValidation.ok) throw new TypeError('session_migration.invalid_v6');
  const migrated: CareerSessionV7 = {
    schemaVersion: CAREER_SESSION_SCHEMA_VERSION_V7,
    career: migrateCareerRunV6ToV7(session.career),
    world: cloneSerializable(session.world),
  };
  const validation = validateCareerSessionV7(migrated);
  if (!validation.ok) throw new TypeError('session_migration.invalid_v7');
  return deepFreeze(migrated);
}

export function parseCareerSessionV5(
  value: unknown,
):
  | { readonly ok: true; readonly session: CareerSessionV5 }
  | Extract<ParseCareerSessionResult, { readonly ok: false }> {
  const snapshot = decode(value);
  if (!snapshot.ok) {
    return failure('session_parse.invalid_json');
  }
  const version = schemaVersion(snapshot.value);
  if (typeof version === 'number' && version !== CAREER_SESSION_SCHEMA_VERSION_V5) {
    return failure('session_parse.unsupported_version');
  }
  const validation = validateCareerSessionV5(snapshot.value);
  if (!validation.ok) {
    return failure('session_parse.invalid_session', validation.issues);
  }
  return deepFreeze({ ok: true, session: snapshot.value as CareerSessionV5 });
}

export function parseCareerSessionV6(
  value: unknown,
):
  | { readonly ok: true; readonly session: CareerSessionV6 }
  | Extract<ParseCareerSessionResult, { readonly ok: false }> {
  const snapshot = decode(value);
  if (!snapshot.ok) {
    return failure('session_parse.invalid_json');
  }
  const version = schemaVersion(snapshot.value);
  if (typeof version === 'number' && version !== CAREER_SESSION_SCHEMA_VERSION_V6) {
    return failure('session_parse.unsupported_version');
  }
  const validation = validateCareerSessionV6(snapshot.value);
  if (!validation.ok) {
    return failure('session_parse.invalid_session', validation.issues);
  }
  return deepFreeze({ ok: true, session: snapshot.value as CareerSessionV6 });
}

export function parseCareerSessionV7(value: unknown): ParseCareerSessionResult {
  const snapshot = decode(value);
  if (!snapshot.ok) {
    return failure('session_parse.invalid_json');
  }
  const version = schemaVersion(snapshot.value);
  if (typeof version === 'number' && version !== CAREER_SESSION_SCHEMA_VERSION_V7) {
    return failure('session_parse.unsupported_version');
  }
  const validation = validateCareerSessionV7(snapshot.value);
  if (!validation.ok) {
    return failure('session_parse.invalid_session', validation.issues);
  }
  return deepFreeze({ ok: true, session: snapshot.value as CareerSessionV7 });
}

export function parseCareerSession(value: unknown): ParseCareerSessionResult {
  const snapshot = decode(value);
  if (!snapshot.ok) {
    return failure('session_parse.invalid_json');
  }
  const version = schemaVersion(snapshot.value);
  if (version === CAREER_SESSION_SCHEMA_VERSION_V5) {
    const legacy = parseCareerSessionV5(snapshot.value);
    if (!legacy.ok) return legacy;
    try {
      return deepFreeze({
        ok: true,
        session: migrateCareerSessionV6ToV7(migrateCareerSessionV5ToV6(legacy.session)),
      });
    } catch {
      return failure('session_parse.invalid_session');
    }
  }
  if (version === CAREER_SESSION_SCHEMA_VERSION_V6) {
    const legacy = parseCareerSessionV6(snapshot.value);
    if (!legacy.ok) return legacy;
    try {
      return deepFreeze({ ok: true, session: migrateCareerSessionV6ToV7(legacy.session) });
    } catch {
      return failure('session_parse.invalid_session');
    }
  }
  if (typeof version === 'number' && version !== CAREER_SESSION_SCHEMA_VERSION_V7) {
    return failure('session_parse.unsupported_version');
  }
  return parseCareerSessionV7(snapshot.value);
}

export function createEmptyMetaProfile(): MetaProfileV1 {
  return deepFreeze({
    schemaVersion: META_PROFILE_SCHEMA_VERSION_V1,
    revision: 0,
    alumni: [],
    unlockedOptionIds: [],
    programFamiliarity: [],
  });
}

export function parseMetaProfile(value: unknown): ParseMetaProfileResult {
  const snapshot = decode(value);
  if (!snapshot.ok) {
    return failure('session_parse.invalid_json');
  }
  const version = schemaVersion(snapshot.value);
  if (typeof version === 'number' && version !== META_PROFILE_SCHEMA_VERSION_V1) {
    return failure('session_parse.unsupported_version');
  }
  const validation = validateMetaProfileV1(snapshot.value);
  if (!validation.ok) {
    return failure('session_parse.invalid_session', validation.issues);
  }
  return deepFreeze({ ok: true, meta: snapshot.value as MetaProfileV1 });
}
