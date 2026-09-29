import { STORAGE_STORE_NAMES, type StorageAdapter } from '../storage';
import { VNEXT_CAREER_ID } from './persistence';

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
    if (entries.some(({ id }) => id !== VNEXT_CAREER_ID)) return true;
  }
  return false;
}

export async function exportPrototypeData(storage: StorageAdapter): Promise<string> {
  const stores: Record<string, unknown> = {};
  for (const store of STORAGE_STORE_NAMES) {
    stores[store] = (await storage.list(store)).filter(({ id }) => id !== VNEXT_CAREER_ID);
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
