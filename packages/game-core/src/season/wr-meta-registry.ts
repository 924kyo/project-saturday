import { isCareerId, isProgramId, type ProgramId } from '../player/ids.js';
import { cloneSerializable, deepFreeze } from '../player/immutable.js';
import { compareCodeUnits } from '../player/order.js';
import type { AlumniRecordV1, MetaProfileV1 } from './types.js';
import { parseMetaProfile } from './persistence.js';
import { parseWrMetaProfileV2, type WrMetaProfileV2 } from './wr-meta-v2.js';
import { parseWrTwoSeasonAlumniV1, type WrTwoSeasonAlumniV1 } from './wr-two-season-alumni.js';
import { validateAlumniRecordV1, validateWrMetaProfileV2WithAlumni } from './validation.js';
import { matchesExactWrEvidence } from '../games/transitions.js';
import { registeredWrMetaHeader } from './wr-meta-header.js';
import { completeWrTwoSeasonCareerV8, type CareerSessionV8 } from './career-session-v8.js';

export interface WrMetaRegistryEntryV1 {
  readonly alumniId: AlumniRecordV1['alumniId'];
  readonly careerId: AlumniRecordV1['careerId'];
  readonly recordSchemaVersion: 1 | 2;
  readonly programIds: readonly ProgramId[];
}
export interface WrMetaRegistryV1 extends Omit<MetaProfileV1, 'alumni'> {
  readonly model: 'wr_meta_registry_v1';
  readonly alumni: readonly WrMetaRegistryEntryV1[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function entry(value: unknown): boolean {
  return (
    record(value) &&
    Object.keys(value).sort().join('|') === 'alumniId|careerId|programIds|recordSchemaVersion' &&
    isCareerId(value['careerId']) &&
    value['alumniId'] === `alumni_${value['careerId']}` &&
    (value['recordSchemaVersion'] === 1 || value['recordSchemaVersion'] === 2) &&
    Array.isArray(value['programIds']) &&
    value['programIds'].length >= 1 &&
    value['programIds'].length <= 2 &&
    (value['recordSchemaVersion'] !== 1 || value['programIds'].length === 1) &&
    Array.from(value['programIds']).every(isProgramId) &&
    new Set(value['programIds']).size === value['programIds'].length
  );
}

/** Logical lightweight index, not one growing whole-history save envelope. */
export function parseWrMetaRegistryV1(value: unknown): WrMetaRegistryV1 | null {
  try {
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    const snapshot = cloneSerializable(decoded);
    if (
      !matchesExactWrEvidence(decoded, snapshot) ||
      !record(snapshot) ||
      snapshot['schemaVersion'] !== 1 ||
      snapshot['model'] !== 'wr_meta_registry_v1' ||
      Object.keys(snapshot).sort().join('|') !==
        'alumni|model|programFamiliarity|revision|schemaVersion|unlockedOptionIds'
    )
      return null;
    const headerAndIndex = {
      schemaVersion: 2,
      revision: snapshot['revision'],
      alumni: snapshot['alumni'],
      unlockedOptionIds: snapshot['unlockedOptionIds'],
      programFamiliarity: snapshot['programFamiliarity'],
    };
    if (!validateWrMetaProfileV2WithAlumni(headerAndIndex, entry).ok) return null;
    return deepFreeze(snapshot as unknown as WrMetaRegistryV1);
  } catch {
    return null;
  }
}

function indexAlumni(alumni: AlumniRecordV1 | WrTwoSeasonAlumniV1): WrMetaRegistryEntryV1 {
  return {
    alumniId: alumni.alumniId,
    careerId: alumni.careerId,
    recordSchemaVersion: alumni.schemaVersion,
    programIds: alumni.programIds,
  };
}

export function createWrMetaRegistryV1(value: MetaProfileV1 | WrMetaProfileV2): {
  readonly registry: WrMetaRegistryV1;
  readonly records: readonly (AlumniRecordV1 | WrTwoSeasonAlumniV1)[];
} | null {
  if (!record(value)) return null;
  const legacy = value.schemaVersion === 1 ? parseMetaProfile(value) : null;
  const source = legacy === null ? parseWrMetaProfileV2(value) : legacy.ok ? legacy.meta : null;
  if (source === null) return null;
  const registry = parseWrMetaRegistryV1({
    ...source,
    schemaVersion: 1,
    model: 'wr_meta_registry_v1',
    alumni: source.alumni.map(indexAlumni),
  });
  return registry === null ? null : deepFreeze({ registry, records: source.alumni });
}

/** Parse one detail without reconstructing or replaying unrelated alumni. */
export function parseWrAlumniRecord(value: unknown): AlumniRecordV1 | WrTwoSeasonAlumniV1 | null {
  try {
    const decoded: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (!record(decoded)) return null;
    if (decoded['schemaVersion'] !== 1) return parseWrTwoSeasonAlumniV1(decoded);
    const snapshot = cloneSerializable(decoded);
    return matchesExactWrEvidence(decoded, snapshot) && validateAlumniRecordV1(snapshot).ok
      ? deepFreeze(snapshot as unknown as AlumniRecordV1)
      : null;
  } catch {
    return null;
  }
}

export function registerWrAlumniInRegistryV1(
  registry: WrMetaRegistryV1,
  value: WrTwoSeasonAlumniV1,
): WrMetaRegistryV1 | null {
  const source = parseWrMetaRegistryV1(registry);
  const alumni = parseWrTwoSeasonAlumniV1(value);
  if (
    source === null ||
    alumni === null ||
    source.alumni.some(({ careerId }) => careerId === alumni.careerId)
  )
    return null;
  const header = registeredWrMetaHeader(source, alumni.programIds);
  if (header === null) return null;
  return parseWrMetaRegistryV1({
    ...source,
    ...header,
    alumni: [...source.alumni, indexAlumni(alumni)].sort((left, right) =>
      compareCodeUnits(left.alumniId, right.alumniId),
    ),
  });
}

export function completeWrTwoSeasonSessionAndRegistryV8(
  session: CareerSessionV8,
  registry: WrMetaRegistryV1,
  contentVersion: number,
):
  | {
      readonly ok: true;
      readonly session: CareerSessionV8;
      readonly registry: WrMetaRegistryV1;
      readonly alumni: WrTwoSeasonAlumniV1;
    }
  | {
      readonly ok: false;
      readonly session: CareerSessionV8;
      readonly registry: WrMetaRegistryV1;
      readonly reason: string;
    } {
  const fail = (reason: string) => Object.freeze({ ok: false as const, session, registry, reason });
  if (parseWrMetaRegistryV1(registry) === null) return fail('v8.invalid_meta');
  const completed = completeWrTwoSeasonCareerV8(session, contentVersion);
  if (!completed.ok) return fail(completed.reason);
  const next = registerWrAlumniInRegistryV1(registry, completed.alumni);
  return next === null
    ? fail('v8.meta_registration_failed')
    : deepFreeze({ ...completed, registry: next });
}
