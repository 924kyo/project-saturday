import type { PositionAlphaSessionV2 } from '@project-saturday/game-core';
import {
  CONTENT_COMPATIBILITY_VERSION,
  parseShippedPositionAlphaSessionV2Json,
  serializeShippedPositionAlphaSessionV2Json,
} from '@project-saturday/game-content';
import { computeSaveChecksum, type SaveChecksumFields } from './career-persistence';
import {
  PositionAlphaPersistenceEngine,
  validatePositionAlphaEnvelope,
  type DecodedPositionAlphaEnvelope,
  type PositionAlphaPersistenceCodec,
  type PositionAlphaPersistenceOptions,
} from './position-alpha-persistence';
import type { SaveEnvelope, StorageAdapter } from './storage';

export const POSITION_ALPHA_SAVE_VERSION_V2 = 2 as const;
const MAX_ENVELOPE_BYTES = 1_000_000;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

/** Version-aware decoded view; the original checksummed envelope is retained separately. */
export function decodePositionAlphaEnvelopeV2(
  value: unknown,
): DecodedPositionAlphaEnvelope<PositionAlphaSessionV2, unknown> | null {
  try {
    if (!record(value)) return null;
    if (value['saveVersion'] === 1) {
      const envelope = validatePositionAlphaEnvelope(value);
      if (envelope === null) return null;
      const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(envelope.payload));
      return session === null ? null : { session, envelope };
    }
    if (
      Object.keys(value).sort().join('|') !==
        'checksum|contentVersion|createdAt|payload|saveVersion|updatedAt' ||
      value['saveVersion'] !== POSITION_ALPHA_SAVE_VERSION_V2 ||
      value['contentVersion'] !== String(CONTENT_COMPATIBILITY_VERSION) ||
      !timestamp(value['createdAt']) ||
      !timestamp(value['updatedAt']) ||
      typeof value['checksum'] !== 'string' ||
      !record(value['payload']) ||
      value['payload']['model'] !== 'position_alpha_session_wire_v2'
    )
      return null;
    const fields: SaveChecksumFields<unknown> = {
      saveVersion: POSITION_ALPHA_SAVE_VERSION_V2,
      contentVersion: value['contentVersion'],
      createdAt: value['createdAt'],
      updatedAt: value['updatedAt'],
      payload: value['payload'],
    };
    if (computeSaveChecksum(fields) !== value['checksum']) return null;
    const serialized = JSON.stringify(value);
    if (new TextEncoder().encode(serialized).byteLength >= MAX_ENVELOPE_BYTES) return null;
    const envelope = JSON.parse(serialized) as SaveEnvelope<unknown>;
    const session = parseShippedPositionAlphaSessionV2Json(JSON.stringify(envelope.payload));
    return session === null ? null : { session, envelope };
  } catch {
    return null;
  }
}

const currentCodec: PositionAlphaPersistenceCodec<PositionAlphaSessionV2, unknown> = {
  saveVersion: POSITION_ALPHA_SAVE_VERSION_V2,
  snapshot: (session) => {
    try {
      const serialized = serializeShippedPositionAlphaSessionV2Json(session);
      if (serialized === null) return null;
      const snapshot = parseShippedPositionAlphaSessionV2Json(serialized);
      return snapshot === null
        ? null
        : { session: snapshot, payload: JSON.parse(serialized) as unknown };
    } catch {
      return null;
    }
  },
  readEnvelope: decodePositionAlphaEnvelopeV2,
  makeEnvelope: (snapshot, createdAt, updatedAt) => {
    const fields = {
      saveVersion: POSITION_ALPHA_SAVE_VERSION_V2,
      contentVersion: String(CONTENT_COMPATIBILITY_VERSION),
      createdAt,
      updatedAt,
      payload: snapshot.payload,
    };
    const envelope = { ...fields, checksum: computeSaveChecksum(fields) };
    return new TextEncoder().encode(JSON.stringify(envelope)).byteLength < MAX_ENVELOPE_BYTES
      ? envelope
      : null;
  },
};

/** Literal wire-v2 codec retained separately from the paged current writer. */
export class PositionAlphaPersistenceV2 extends PositionAlphaPersistenceEngine<
  PositionAlphaSessionV2,
  unknown
> {
  public constructor(storage: StorageAdapter, options: PositionAlphaPersistenceOptions = {}) {
    super(storage, currentCodec, options);
  }
}
