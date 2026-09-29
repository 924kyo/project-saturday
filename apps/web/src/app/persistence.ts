import {
  parseCareerVNext,
  serializeCareerVNext,
  type AlumniVNext,
  type CareerVNext,
} from '@project-saturday/game-core';

import type { StorageAdapter } from '../storage';

/** The new save line lives beside (never inside) prototype records. */
export const VNEXT_CAREER_ID = 'career-vnext' as const;
const LOCK = 'career-vnext-save';

interface VNextSaveEnvelope {
  readonly model: 'career_vnext_save';
  readonly version: 1;
  readonly updatedAt: string;
  readonly checksum: string;
  readonly json: string;
}

function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

export type LoadVNextResult =
  | { readonly status: 'none' }
  | { readonly status: 'ok'; readonly career: CareerVNext; readonly updatedAt: string }
  | { readonly status: 'corrupt' };

export async function loadCareerVNext(storage: StorageAdapter): Promise<LoadVNextResult> {
  const envelope = await storage.get<VNextSaveEnvelope>('currentCareer', VNEXT_CAREER_ID);
  if (envelope === undefined) return { status: 'none' };
  if (
    envelope.model !== 'career_vnext_save' ||
    envelope.version !== 1 ||
    typeof envelope.json !== 'string' ||
    checksum(`${envelope.updatedAt}|${envelope.json}`) !== envelope.checksum
  )
    return { status: 'corrupt' };
  const career = parseCareerVNext(envelope.json);
  return career === null
    ? { status: 'corrupt' }
    : { status: 'ok', career, updatedAt: envelope.updatedAt };
}

export async function saveCareerVNext(
  storage: StorageAdapter,
  career: CareerVNext,
  now: () => Date = () => new Date(),
): Promise<string | null> {
  const json = serializeCareerVNext(career);
  if (json === null) return null;
  return storage.runExclusive(LOCK, async () => {
    const updatedAt = now().toISOString();
    const envelope: VNextSaveEnvelope = {
      model: 'career_vnext_save',
      version: 1,
      updatedAt,
      checksum: checksum(`${updatedAt}|${json}`),
      json,
    };
    await storage.put('currentCareer', VNEXT_CAREER_ID, envelope);
    return updatedAt;
  });
}

export async function clearCareerVNext(storage: StorageAdapter): Promise<void> {
  await storage.runExclusive(LOCK, () => storage.delete('currentCareer', VNEXT_CAREER_ID));
}

/** Alumni Wall: finished careers, kept beside (never inside) the live save and prototype records. */
export const VNEXT_ALUMNI_ID = 'career-vnext-alumni' as const;
interface AlumniEnvelope {
  readonly model: 'career_vnext_alumni';
  readonly version: 1;
  readonly entries: readonly AlumniVNext[];
}

function isAlumniEnvelope(value: unknown): value is AlumniEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as AlumniEnvelope).model === 'career_vnext_alumni' &&
    (value as AlumniEnvelope).version === 1 &&
    Array.isArray((value as AlumniEnvelope).entries)
  );
}

export async function loadAlumniVNext(storage: StorageAdapter): Promise<readonly AlumniVNext[]> {
  const stored = await storage.get<unknown>('profile', VNEXT_ALUMNI_ID);
  return isAlumniEnvelope(stored)
    ? stored.entries.filter(
        (entry) => typeof entry?.careerId === 'string' && typeof entry.displayName === 'string',
      )
    : [];
}

/** Idempotent by career: re-entering the completed career never duplicates its plaque. */
export async function recordAlumniVNext(
  storage: StorageAdapter,
  alumni: AlumniVNext,
): Promise<readonly AlumniVNext[]> {
  return storage.runExclusive(LOCK, async () => {
    const entries = await loadAlumniVNext(storage);
    if (entries.some(({ careerId }) => careerId === alumni.careerId)) return entries;
    const next = [...entries, alumni];
    const envelope: AlumniEnvelope = { model: 'career_vnext_alumni', version: 1, entries: next };
    await storage.put('profile', VNEXT_ALUMNI_ID, envelope);
    return next;
  });
}
