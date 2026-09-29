import {
  migrateCareerSessionV7ToV8,
  parseCareerSessionV8,
  type CareerSessionV8,
  type WrTacticalMechanicsV1,
} from '@project-saturday/game-core';
import {
  computeSaveChecksum,
  validateCareerSaveEnvelope,
  type CareerEnvelopeFailureReason,
} from './career-persistence';
import type { SaveEnvelope } from './storage';

export const WR_CAREER_SAVE_VERSION_V8 = 8 as const;
const MAX_BYTES = 1_000_000;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function freezeProof<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) freezeProof(child);
    Object.freeze(value);
  }
  return value;
}
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString() === value;
}

export type DecodeWrCareerEnvelopeV8Result =
  | {
      readonly ok: true;
      readonly session: CareerSessionV8;
      readonly envelope: SaveEnvelope<unknown>;
    }
  | { readonly ok: false; readonly reason: CareerEnvelopeFailureReason };

/** Preserve the original authenticated wire proof independently of its current domain view. */
export function decodeWrCareerEnvelopeV8(
  value: unknown,
  expectedContentVersion: string,
  mechanics: WrTacticalMechanicsV1,
): DecodeWrCareerEnvelopeV8Result {
  const fail = (reason: CareerEnvelopeFailureReason): DecodeWrCareerEnvelopeV8Result =>
    Object.freeze({ ok: false, reason });
  try {
    const snapshot: unknown = structuredClone(value);
    if (!record(snapshot)) return fail('envelope.invalid_shape');
    if (snapshot['saveVersion'] !== WR_CAREER_SAVE_VERSION_V8) {
      const legacy = validateCareerSaveEnvelope(snapshot, expectedContentVersion);
      if (!legacy.ok) return legacy;
      return Object.freeze({
        ok: true,
        session: migrateCareerSessionV7ToV8(legacy.envelope.payload),
        envelope: freezeProof(snapshot) as unknown as SaveEnvelope<unknown>,
      });
    }
    if (
      Object.keys(snapshot).sort().join('|') !==
        'checksum|contentVersion|createdAt|payload|saveVersion|updatedAt' ||
      typeof snapshot['checksum'] !== 'string' ||
      !/^fnv1a32:[0-9a-f]{8}$/.test(snapshot['checksum'])
    )
      return fail('envelope.invalid_shape');
    if (
      typeof expectedContentVersion !== 'string' ||
      expectedContentVersion.length < 1 ||
      expectedContentVersion.length > 64 ||
      snapshot['contentVersion'] !== expectedContentVersion
    )
      return fail('envelope.incompatible_content');
    if (
      !timestamp(snapshot['createdAt']) ||
      !timestamp(snapshot['updatedAt']) ||
      snapshot['createdAt'] > snapshot['updatedAt']
    )
      return fail('envelope.invalid_timestamp');
    if (new TextEncoder().encode(JSON.stringify(snapshot)).byteLength >= MAX_BYTES)
      return fail('envelope.invalid_shape');
    const fields = {
      saveVersion: WR_CAREER_SAVE_VERSION_V8,
      contentVersion: expectedContentVersion,
      createdAt: snapshot['createdAt'],
      updatedAt: snapshot['updatedAt'],
      payload: snapshot['payload'],
    };
    if (computeSaveChecksum(fields) !== snapshot['checksum'])
      return fail('envelope.checksum_mismatch');
    const parsed = parseCareerSessionV8(snapshot['payload'], mechanics);
    if (!parsed.ok)
      return fail(
        parsed.reason === 'session_parse.unsupported_version'
          ? 'envelope.unsupported_career_version'
          : 'envelope.invalid_career',
      );
    return Object.freeze({
      ok: true,
      session: parsed.session,
      envelope: freezeProof(snapshot) as unknown as SaveEnvelope<unknown>,
    });
  } catch {
    return fail('envelope.invalid_shape');
  }
}

/** Staged only: no browser persistence writer selects this codec yet. */
export function createWrCareerEnvelopeV8(
  session: CareerSessionV8,
  contentVersion: string,
  createdAt: string,
  updatedAt: string,
  mechanics: WrTacticalMechanicsV1,
): SaveEnvelope<CareerSessionV8> | null {
  try {
    if (
      typeof contentVersion !== 'string' ||
      contentVersion.length < 1 ||
      contentVersion.length > 64 ||
      !timestamp(createdAt) ||
      !timestamp(updatedAt) ||
      createdAt > updatedAt
    )
      return null;
    const parsed = parseCareerSessionV8(session, mechanics);
    if (!parsed.ok) return null;
    const fields = {
      saveVersion: WR_CAREER_SAVE_VERSION_V8,
      contentVersion,
      createdAt,
      updatedAt,
      payload: parsed.session,
    };
    const envelope = Object.freeze({ ...fields, checksum: computeSaveChecksum(fields) });
    return new TextEncoder().encode(JSON.stringify(envelope)).byteLength < MAX_BYTES
      ? envelope
      : null;
  } catch {
    return null;
  }
}
