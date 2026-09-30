import {
  isVNextPositionId,
  parseCareerVNext,
  serializeCareerVNext,
  type AlumniVNext,
  type CareerVNext,
} from '@project-saturday/game-core';

import type { StorageAdapter } from '../storage';

/** The new save line lives beside (never inside) prototype records. */
export const VNEXT_CAREER_ID = 'career-vnext' as const;
/** The last good save before the current one (M10): corruption falls back to it. */
export const VNEXT_BACKUP_ID = 'career-vnext-backup' as const;
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
  /** The current save was unreadable; the last good save was restored. */
  | { readonly status: 'recovered'; readonly career: CareerVNext; readonly updatedAt: string }
  | { readonly status: 'corrupt' };

function validEnvelope(envelope: unknown): envelope is VNextSaveEnvelope {
  const value = envelope as VNextSaveEnvelope | undefined;
  return (
    typeof value === 'object' &&
    value !== null &&
    value.model === 'career_vnext_save' &&
    value.version === 1 &&
    typeof value.json === 'string' &&
    typeof value.updatedAt === 'string' &&
    checksum(`${value.updatedAt}|${value.json}`) === value.checksum
  );
}

function read(envelope: unknown): { career: CareerVNext; updatedAt: string } | null {
  if (!validEnvelope(envelope)) return null;
  const career = parseCareerVNext(envelope.json);
  return career === null ? null : { career, updatedAt: envelope.updatedAt };
}

export async function loadCareerVNext(storage: StorageAdapter): Promise<LoadVNextResult> {
  const envelope = await storage.get<unknown>('currentCareer', VNEXT_CAREER_ID);
  if (envelope === undefined) return { status: 'none' };
  const current = read(envelope);
  if (current !== null) return { status: 'ok', ...current };
  const backup = read(await storage.get<unknown>('currentCareer', VNEXT_BACKUP_ID));
  return backup === null ? { status: 'corrupt' } : { status: 'recovered', ...backup };
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
    // Keep the previous good save as the backup before replacing it.
    const previous = await storage.get<unknown>('currentCareer', VNEXT_CAREER_ID);
    if (validEnvelope(previous)) await storage.put('currentCareer', VNEXT_BACKUP_ID, previous);
    await storage.put('currentCareer', VNEXT_CAREER_ID, envelope);
    return updatedAt;
  });
}

export async function clearCareerVNext(storage: StorageAdapter): Promise<void> {
  await storage.runExclusive(LOCK, async () => {
    await storage.delete('currentCareer', VNEXT_CAREER_ID);
    await storage.delete('currentCareer', VNEXT_BACKUP_ID);
  });
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

/** A stored plaque is shown only if every field the wall reads has the right shape. */
function isPlaque(entry: unknown): entry is AlumniVNext {
  const value = entry as AlumniVNext | undefined;
  const count = (field: unknown) => Number.isSafeInteger(field) && (field as number) >= 0;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.careerId === 'string' &&
    typeof value.displayName === 'string' &&
    isVNextPositionId(value.positionId) &&
    Array.isArray(value.programIds) &&
    value.programIds.length > 0 &&
    value.programIds.every((id) => typeof id === 'string') &&
    count(value.seasons) &&
    count(value.championships) &&
    typeof value.record === 'object' &&
    value.record !== null &&
    count(value.record.wins) &&
    count(value.record.losses) &&
    count(value.record.ties) &&
    count(value.liveGames) &&
    Array.isArray(value.statTotals) &&
    value.statTotals.every(
      (total) => typeof total?.field === 'string' && Number.isSafeInteger(total.value),
    ) &&
    count(value.finalOverall) &&
    count(value.bestDepthRank) &&
    typeof value.bestFinish === 'string'
  );
}

export async function loadAlumniVNext(storage: StorageAdapter): Promise<readonly AlumniVNext[]> {
  const stored = await storage.get<unknown>('profile', VNEXT_ALUMNI_ID);
  return isAlumniEnvelope(stored) ? stored.entries.filter(isPlaque) : [];
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
