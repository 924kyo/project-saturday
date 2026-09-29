import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import { utf8ByteLength } from '../player/utf8.js';
import { parseMetaProfile } from './persistence.js';
import { validateWrMetaProfileV2WithAlumni } from './validation.js';
import { parseWrTwoSeasonAlumniV1, type WrTwoSeasonAlumniV1 } from './wr-two-season-alumni.js';
import { completeWrTwoSeasonCareerV8, type CareerSessionV8 } from './career-session-v8.js';
import type { AlumniRecordV1, MetaProfileV1 } from './types.js';
import { registeredWrMetaHeader } from './wr-meta-header.js';

/** Staged WR profile namespace; shipping MetaProfileV1 remains unchanged. */
export interface WrMetaProfileV2 extends Omit<MetaProfileV1, 'schemaVersion' | 'alumni'> {
  readonly schemaVersion: 2;
  readonly alumni: readonly (AlumniRecordV1 | WrTwoSeasonAlumniV1)[];
}

export function parseWrMetaProfileV2(value: unknown): WrMetaProfileV2 | null {
  try {
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    const snapshot = cloneSerializable(decoded);
    if (
      !validateWrMetaProfileV2WithAlumni(
        snapshot,
        (alumni) => parseWrTwoSeasonAlumniV1(alumni) !== null,
      ).ok ||
      utf8ByteLength(JSON.stringify(snapshot)) >= 1_000_000
    )
      return null;
    return deepFreeze(snapshot as WrMetaProfileV2);
  } catch {
    return null;
  }
}

export function migrateMetaProfileV1ToWrV2(value: MetaProfileV1): WrMetaProfileV2 {
  const legacy = parseMetaProfile(value);
  if (!legacy.ok) throw new TypeError('meta_migration.invalid_v1');
  const migrated = parseWrMetaProfileV2({ ...legacy.meta, schemaVersion: 2 });
  if (migrated === null) throw new TypeError('meta_migration.invalid_v2');
  return migrated;
}

export function registerWrTwoSeasonAlumniV2(
  meta: WrMetaProfileV2,
  value: WrTwoSeasonAlumniV1,
): WrMetaProfileV2 | null {
  const source = parseWrMetaProfileV2(meta);
  const alumni = parseWrTwoSeasonAlumniV1(value);
  if (
    source === null ||
    alumni === null ||
    source.revision === Number.MAX_SAFE_INTEGER ||
    source.alumni.some(({ careerId }) => careerId === alumni.careerId)
  )
    return null;
  const header = registeredWrMetaHeader(source, alumni.programIds);
  if (header === null) return null;
  return parseWrMetaProfileV2({
    ...source,
    ...header,
    alumni: [...source.alumni, alumni].sort((left, right) =>
      compareCodeUnits(left.alumniId, right.alumniId),
    ),
  });
}

export function completeWrTwoSeasonSessionAndMetaV8(
  session: CareerSessionV8,
  meta: WrMetaProfileV2,
  contentVersion: number,
):
  | {
      readonly ok: true;
      readonly session: CareerSessionV8;
      readonly meta: WrMetaProfileV2;
      readonly alumni: WrTwoSeasonAlumniV1;
    }
  | {
      readonly ok: false;
      readonly session: CareerSessionV8;
      readonly meta: WrMetaProfileV2;
      readonly reason: string;
    } {
  const fail = (reason: string) => Object.freeze({ ok: false as const, session, meta, reason });
  if (parseWrMetaProfileV2(meta) === null) return fail('v8.invalid_meta');
  const completed = completeWrTwoSeasonCareerV8(session, contentVersion);
  if (!completed.ok) return fail(completed.reason);
  const nextMeta = registerWrTwoSeasonAlumniV2(meta, completed.alumni);
  return nextMeta === null
    ? fail('v8.meta_registration_failed')
    : deepFreeze({ ...completed, meta: nextMeta });
}
