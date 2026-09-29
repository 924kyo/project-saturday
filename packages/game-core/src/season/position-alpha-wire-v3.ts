import { deepFreeze } from '../player/immutable.js';
import {
  packJsonArchiveV1,
  unpackJsonArchiveV1,
  type ArchiveJsonValue,
  type JsonArchiveV1,
} from '../player/json-archive.js';
import { utf8ByteLength } from '../player/utf8.js';
import type { PositionAlphaSessionFoundationMechanics } from './position-alpha-session.js';
import {
  validatePositionAlphaSessionV2,
  type PositionAlphaSessionV2,
} from './position-alpha-session-v2.js';

export const POSITION_ALPHA_WIRE_V3_LIMITS = Object.freeze({
  persistedBytes: 1_000_000,
  recordsPerPage: 4,
  regularRecords: 12,
  postseasonRecords: 2,
});

export interface PositionAlphaSessionWireV3 {
  readonly model: 'position_alpha_session_wire_v3';
  readonly session: Omit<PositionAlphaSessionV2, 'weekHistory' | 'postseasonHistory'>;
  readonly weekHistory: readonly JsonArchiveV1[];
  readonly postseasonHistory: readonly JsonArchiveV1[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const denseArray = (value: unknown): value is unknown[] =>
  Array.isArray(value) &&
  Object.keys(value).length === value.length &&
  Reflect.ownKeys(value).length === value.length + 1;

/** Canonical contiguous pages; the original per-archive safety limits are unchanged. */
export function packPositionHistoryPagesV3(
  records: readonly unknown[],
  maximumRecords: 2 | 12,
): readonly JsonArchiveV1[] | null {
  if (
    (maximumRecords !== 2 && maximumRecords !== 12) ||
    !denseArray(records) ||
    records.length > maximumRecords
  )
    return null;
  const pages: JsonArchiveV1[] = [];
  for (
    let index = 0;
    index < records.length;
    index += POSITION_ALPHA_WIRE_V3_LIMITS.recordsPerPage
  ) {
    const page = packJsonArchiveV1(
      records.slice(index, index + POSITION_ALPHA_WIRE_V3_LIMITS.recordsPerPage),
    );
    if (page === null) return null;
    pages.push(page);
  }
  return deepFreeze(pages);
}

/** Page decoding is not gameplay validation. The owning wire reader validates the whole session. */
export function unpackPositionHistoryPagesV3(
  pages: unknown,
  maximumRecords: 2 | 12,
): readonly ArchiveJsonValue[] | null {
  const pageSize = POSITION_ALPHA_WIRE_V3_LIMITS.recordsPerPage;
  if (
    (maximumRecords !== 2 && maximumRecords !== 12) ||
    !denseArray(pages) ||
    pages.length > Math.ceil(maximumRecords / pageSize)
  )
    return null;
  const records: ArchiveJsonValue[] = [];
  for (const [index, page] of pages.entries()) {
    const decoded = unpackJsonArchiveV1(page);
    if (
      !decoded.ok ||
      !Array.isArray(decoded.value) ||
      decoded.value.length < 1 ||
      decoded.value.length > pageSize ||
      (index < pages.length - 1 && decoded.value.length !== pageSize)
    )
      return null;
    records.push(...decoded.value);
    if (records.length > maximumRecords) return null;
  }
  return deepFreeze(records);
}

/** Wire version 3 keeps the complete version-2 gameplay domain, including literal prior proofs. */
export function serializePositionAlphaSessionWireV3Json(
  session: PositionAlphaSessionV2,
  mechanics: PositionAlphaSessionFoundationMechanics,
): string | null {
  if (!validatePositionAlphaSessionV2(session, mechanics)) return null;
  const weekHistory = packPositionHistoryPagesV3(session.weekHistory, 12);
  const postseasonHistory = packPositionHistoryPagesV3(session.postseasonHistory, 2);
  if (weekHistory === null || postseasonHistory === null) return null;
  const fields = Object.fromEntries(
    Object.entries(session).filter(([key]) => key !== 'weekHistory' && key !== 'postseasonHistory'),
  );
  const serialized = JSON.stringify({
    model: 'position_alpha_session_wire_v3',
    session: fields,
    weekHistory,
    postseasonHistory,
  });
  return utf8ByteLength(serialized) < POSITION_ALPHA_WIRE_V3_LIMITS.persistedBytes
    ? serialized
    : null;
}

/** Strict v3 only: legacy decoding/migration remains an explicit caller-owned boundary. */
export function parsePositionAlphaSessionWireV3Json(
  serialized: string,
  mechanics: PositionAlphaSessionFoundationMechanics,
): PositionAlphaSessionV2 | null {
  try {
    if (utf8ByteLength(serialized) >= POSITION_ALPHA_WIRE_V3_LIMITS.persistedBytes) return null;
    const value: unknown = JSON.parse(serialized);
    if (
      !record(value) ||
      value['model'] !== 'position_alpha_session_wire_v3' ||
      Object.keys(value).sort().join('|') !== 'model|postseasonHistory|session|weekHistory' ||
      !record(value['session']) ||
      Object.hasOwn(value['session'], 'weekHistory') ||
      Object.hasOwn(value['session'], 'postseasonHistory')
    )
      return null;
    const weekHistory = unpackPositionHistoryPagesV3(value['weekHistory'], 12);
    const postseasonHistory = unpackPositionHistoryPagesV3(value['postseasonHistory'], 2);
    if (weekHistory === null || postseasonHistory === null) return null;
    const session = { ...value['session'], weekHistory, postseasonHistory };
    return validatePositionAlphaSessionV2(session, mechanics) ? deepFreeze(session) : null;
  } catch {
    return null;
  }
}
