import {
  CAREER_SCHEMA_VERSION_V8,
  parseCareerRunV8,
  projectWrTwoSeasonCareerV8,
  type CareerRunV8,
} from '../player/career-v8.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { parseCareerSessionV7, type ParseCareerSessionResult } from './persistence.js';
import type { CareerSessionV7, WorldStateV1 } from './types.js';
import type { WrTacticalMechanicsV1 } from '../games/tactical-wr-game-v1.js';
import { validateCareerSessionV8WithCareer } from './validation.js';
import { matchesExactWrEvidence } from '../games/transitions.js';
import { createWrTwoSeasonReviewV1 } from './wr-two-season-review.js';
import { utf8ByteLength } from '../player/utf8.js';
import { createWrTwoSeasonAlumniV1, type WrTwoSeasonAlumniV1 } from './wr-two-season-alumni.js';

export const CAREER_SESSION_SCHEMA_VERSION_V8 = 8 as const;

/** Staged only: no browser writer or current session alias selects v8 yet. */
export interface CareerSessionV8 {
  readonly schemaVersion: typeof CAREER_SESSION_SCHEMA_VERSION_V8;
  readonly career: CareerRunV8;
  readonly world: WorldStateV1;
}

type Failure = Extract<ParseCareerSessionResult, { readonly ok: false }>;
export type ParseCareerSessionV8Result =
  { readonly ok: true; readonly session: CareerSessionV8 } | Failure;

function failure(reason: Failure['reason']): Failure {
  return deepFreeze({ ok: false, reason, issues: [] });
}

function markV8(session: CareerSessionV7): CareerSessionV8 {
  // All input here is already a detached, strictly validated v7 parser result.
  return deepFreeze({
    ...session,
    schemaVersion: CAREER_SESSION_SCHEMA_VERSION_V8,
    career: { ...session.career, schemaVersion: CAREER_SCHEMA_VERSION_V8 },
  });
}

export function migrateCareerSessionV7ToV8(session: CareerSessionV7): CareerSessionV8 {
  const parsed = parseCareerSessionV7(session);
  if (!parsed.ok) throw new TypeError('session_migration.invalid_v7');
  return markV8(parsed.session);
}

export function enterWrTwoSeasonReviewV8(session: CareerSessionV8):
  | { readonly ok: true; readonly session: CareerSessionV8 }
  | {
      readonly ok: false;
      readonly session: CareerSessionV8;
      readonly reason: 'v8.invalid_phase' | 'v8.invalid_session';
    } {
  const parsed = parseCareerSessionV8(session);
  if (!parsed.ok) return Object.freeze({ ok: false, session, reason: 'v8.invalid_session' });
  const review = createWrTwoSeasonReviewV1({
    ...parsed.session,
    schemaVersion: 7,
    career: { ...parsed.session.career, schemaVersion: 7 },
  });
  const career = review === null ? undefined : projectWrTwoSeasonCareerV8(review);
  if (career === undefined)
    return Object.freeze({ ok: false, session, reason: 'v8.invalid_phase' });
  const next = parseCareerSessionV8({ schemaVersion: 8, career, world: parsed.session.world });
  return next.ok
    ? deepFreeze({ ok: true, session: next.session })
    : Object.freeze({ ok: false, session, reason: 'v8.invalid_session' });
}

export function completeWrTwoSeasonCareerV8(
  session: CareerSessionV8,
  contentVersion: number,
):
  | { readonly ok: true; readonly session: CareerSessionV8; readonly alumni: WrTwoSeasonAlumniV1 }
  | {
      readonly ok: false;
      readonly session: CareerSessionV8;
      readonly reason: 'v8.invalid_phase' | 'v8.invalid_session' | 'v8.invalid_content_version';
    } {
  const parsed = parseCareerSessionV8(session);
  if (!parsed.ok) return Object.freeze({ ok: false, session, reason: 'v8.invalid_session' });
  if (!Number.isSafeInteger(contentVersion) || contentVersion < 1)
    return Object.freeze({ ok: false, session, reason: 'v8.invalid_content_version' });
  const review = parsed.session.career.terminalReview;
  if (
    review === undefined ||
    parsed.session.career.phase.type !== 'SEASON_REVIEW' ||
    parsed.session.career.terminalCompletion !== undefined
  )
    return Object.freeze({ ok: false, session, reason: 'v8.invalid_phase' });
  const alumni = createWrTwoSeasonAlumniV1(review, contentVersion);
  const career = projectWrTwoSeasonCareerV8(review, contentVersion);
  if (alumni === null || career === undefined)
    return Object.freeze({ ok: false, session, reason: 'v8.invalid_session' });
  const completed = parseCareerSessionV8({ schemaVersion: 8, career, world: parsed.session.world });
  return completed.ok
    ? deepFreeze({ ok: true, session: completed.session, alumni })
    : Object.freeze({ ok: false, session, reason: 'v8.invalid_session' });
}

/** Exact v8/v8/world-v1 tuple; never migrates a mixed-version input. */
export function parseCareerSessionV8(
  value: unknown,
  mechanics?: WrTacticalMechanicsV1,
): ParseCareerSessionV8Result {
  let decoded = value;
  if (typeof value === 'string') {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return failure('session_parse.invalid_json');
    }
  }
  let snapshot: unknown;
  try {
    snapshot = cloneSerializable(decoded);
  } catch {
    return failure('session_parse.invalid_session');
  }
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot))
    return failure('session_parse.invalid_session');
  const record = snapshot as Readonly<Record<string, unknown>>;
  if (record['schemaVersion'] !== CAREER_SESSION_SCHEMA_VERSION_V8)
    return failure(
      typeof record['schemaVersion'] === 'number'
        ? 'session_parse.unsupported_version'
        : 'session_parse.invalid_session',
    );
  const career = record['career'];
  if (
    typeof career !== 'object' ||
    career === null ||
    Array.isArray(career) ||
    !('schemaVersion' in career) ||
    career.schemaVersion !== CAREER_SCHEMA_VERSION_V8
  )
    return failure('session_parse.invalid_session');
  if (Object.hasOwn(career, 'terminalReview')) {
    const parsed = parseCareerRunV8(career);
    if (!parsed.ok || parsed.career.terminalReview === undefined)
      return failure('session_parse.invalid_session');
    const expected: CareerSessionV8 = {
      schemaVersion: 8,
      career: parsed.career,
      world: parsed.career.terminalReview.source.world,
    };
    return matchesExactWrEvidence(record, expected) &&
      utf8ByteLength(JSON.stringify(expected)) < 1_000_000
      ? deepFreeze({ ok: true, session: expected })
      : failure('session_parse.invalid_session');
  }
  if (Object.hasOwn(career, 'tacticalGame')) {
    const validation = validateCareerSessionV8WithCareer(record, (candidate) => {
      const parsed = parseCareerRunV8(candidate, mechanics);
      return parsed.ok
        ? { ok: true, issues: [] }
        : {
            ok: false,
            issues: [{ code: 'invariant.invalid_combination', path: 'career.tacticalGame' }],
          };
    });
    return validation.ok
      ? deepFreeze({ ok: true, session: snapshot as CareerSessionV8 })
      : deepFreeze({
          ok: false,
          reason: 'session_parse.invalid_session',
          issues: validation.issues,
        });
  }
  // Preserve all fields; the exact legacy validator still owns every neutral
  // career/world linkage, historical ledger and draw-chain invariant.
  const parsed = parseCareerSessionV7({
    ...record,
    schemaVersion: 7,
    career: { ...career, schemaVersion: 7 },
  });
  return parsed.ok ? deepFreeze({ ok: true, session: markV8(parsed.session) }) : parsed;
}
