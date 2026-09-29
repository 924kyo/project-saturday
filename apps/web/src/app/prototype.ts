import { STORAGE_STORE_NAMES, type StorageAdapter } from '../storage';
/** Every record written by the new save line starts with this prefix. */
const VNEXT_PREFIX = 'career-vnext';
const isVNextRecord = (id: string) => id.startsWith(VNEXT_PREFIX);

/**
 * Single deliberate prototype boundary: pre-1.0 saves are never read by the new save line and
 * never deleted by it. Players can export them once as JSON; nothing else is preserved.
 */
const DISMISSED_ID = 'prototype-notice-dismissed';
const PROTOTYPE_STORES = [
  'profile',
  'currentCareer',
  'autosaveSnapshots',
  'migrationMetadata',
] as const;

export async function hasPrototypeData(storage: StorageAdapter): Promise<boolean> {
  if ((await storage.get<boolean>('settings', DISMISSED_ID)) === true) return false;
  for (const store of PROTOTYPE_STORES) {
    const entries = await storage.list(store);
    if (entries.some(({ id }) => !isVNextRecord(id))) return true;
  }
  return false;
}

export async function exportPrototypeData(storage: StorageAdapter): Promise<string> {
  const stores: Record<string, unknown> = {};
  for (const store of STORAGE_STORE_NAMES) {
    stores[store] = (await storage.list(store)).filter(({ id }) => !isVNextRecord(id));
  }
  return JSON.stringify({ model: 'project_saturday_prototype_export', version: 1, stores });
}

export async function dismissPrototypeNotice(storage: StorageAdapter): Promise<void> {
  await storage.put('settings', DISMISSED_ID, true);
}

/** Browser download of the export; a no-op where downloads are unavailable. */
export function downloadJson(filename: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Headline facts recovered from a prototype career, where they parse. Nothing else is read. */
export interface PrototypeAlumniView {
  readonly key: string;
  readonly displayName: string;
  readonly positionId: string;
  readonly programIds: readonly string[];
  readonly gamesPlayed: number | null;
}

const MAX_SCAN_DEPTH = 8;

function collectAlumni(value: unknown, depth: number, found: Map<string, PrototypeAlumniView>) {
  if (depth > MAX_SCAN_DEPTH || value === null) return;
  if (typeof value === 'string') {
    // Older envelopes kept payloads as canonical JSON strings.
    if (value.length < 2_000_000 && value.startsWith('{')) {
      try {
        collectAlumni(JSON.parse(value), depth + 1, found);
      } catch {
        // Not JSON: nothing to import.
      }
    }
    return;
  }
  if (typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectAlumni(entry, depth + 1, found);
    return;
  }
  const record = value as Record<string, unknown>;
  const programIds = record['programIds'];
  if (
    typeof record['displayName'] === 'string' &&
    typeof record['positionId'] === 'string' &&
    record['positionId'].startsWith('position_') &&
    Array.isArray(programIds) &&
    programIds.every((id) => typeof id === 'string')
  ) {
    const key = typeof record['careerId'] === 'string' ? record['careerId'] : record['displayName'];
    if (!found.has(key))
      found.set(key, {
        key,
        displayName: record['displayName'],
        positionId: record['positionId'],
        programIds: programIds as string[],
        gamesPlayed: typeof record['gamesPlayed'] === 'number' ? record['gamesPlayed'] : null,
      });
    return;
  }
  for (const entry of Object.values(record)) collectAlumni(entry, depth + 1, found);
}

/** Best-effort, read-only: prototype alumni records that still parse, for the Alumni Wall. */
export async function findPrototypeAlumni(
  storage: StorageAdapter,
): Promise<readonly PrototypeAlumniView[]> {
  const found = new Map<string, PrototypeAlumniView>();
  try {
    for (const store of PROTOTYPE_STORES)
      for (const entry of await storage.list(store))
        if (!isVNextRecord(entry.id)) collectAlumni(entry.value, 0, found);
  } catch {
    return [];
  }
  return [...found.values()];
}
