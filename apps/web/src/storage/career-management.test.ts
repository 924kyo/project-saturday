import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
} from '@project-saturday/game-content';

import { createTestCareer } from '../test/career-fixture';
import {
  advancePositionAlphaFixture,
  createTransferredPositionAlphaSession,
  POSITION_ALPHA_TRANSFER_CASES,
} from '../test/position-alpha-fixture';
import { CareerManagementConflict, CareerManagementPersistence } from './career-management';
import { CareerPersistence, SHIPPED_CAREER_CONTENT_VERSION } from './career-persistence';
import {
  ACTIVE_CAREER_KIND_STORAGE_ID,
  POSITION_ALUMNI_STORAGE_PREFIX,
  PositionAlphaPersistence,
} from './position-alpha-persistence';
import {
  IndexedDbStorageAdapter,
  MemoryStorageAdapter,
  STORAGE_STORE_NAMES,
  type StorageAdapter,
} from './storage';

const databases: { name: string; adapter: StorageAdapter }[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const { name, adapter } of databases.splice(0)) {
    await adapter.close();
    await deleteDB(name);
  }
});

async function dump(storage: StorageAdapter) {
  return Promise.all(STORAGE_STORE_NAMES.map(async (name) => [name, await storage.list(name)]));
}

describe.each(['memory', 'IndexedDB'] as const)('%s career management', (kind) => {
  function createStorage(): StorageAdapter {
    if (kind === 'memory') return new MemoryStorageAdapter();
    const name = `career-management-${databases.length}`;
    const adapter = new IndexedDbStorageAdapter(name);
    databases.push({ name, adapter });
    return adapter;
  }

  it('retires WR without rewards or recovery resurrection, then permits an explicit new run', async () => {
    const storage = createStorage();
    const careers = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    const hub = new CareerManagementPersistence(storage);
    const career = createTestCareer('hub-first-wr');
    expect((await careers.replaceCurrentCareer(career)).ok).toBe(true);
    await storage.put('profile', 'existing-history', { alumni: ['old'], unlocks: ['known'] });
    await storage.put('settings', 'locale', 'ko-KR');
    const profile = await storage.list('profile');
    expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({ ok: true });
    expect(await careers.loadCareer()).toMatchObject({
      ok: false,
      reason: 'career_load.not_found',
    });
    expect(await storage.list('autosaveSnapshots')).toEqual([]);
    expect(await storage.list('profile')).toEqual(profile);
    expect(await storage.get('settings', 'locale')).toBe('ko-KR');
    expect(await careers.saveCareer(career)).toMatchObject({
      ok: false,
      reason: 'career_save.different_career',
    });
    const next = createTestCareer('hub-second-wr');
    expect((await careers.replaceCurrentCareer(next)).ok).toBe(true);
    expect(await careers.loadCareer()).toMatchObject({ ok: true, career: { id: next.id } });
    expect(await storage.list('profile')).toEqual(profile);
  });

  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    'retires a transferred %s and rejects a stale tab save',
    async (position, archetype) => {
      const storage = createStorage();
      const careers = new PositionAlphaPersistence(storage);
      const hub = new CareerManagementPersistence(storage);
      const session = createTransferredPositionAlphaSession(position, archetype);
      expect((await careers.saveSession(session, true)).ok).toBe(true);
      const next = advancePositionAlphaFixture(session);
      expect((await careers.saveSession(next)).ok).toBe(true);
      const checkpoint = await hub.checkpoint();
      expect(await hub.retireCurrentCareer(checkpoint)).toEqual({ ok: true });
      expect(await careers.loadSession()).toEqual({
        ok: false,
        reason: 'position_alpha_load.not_found',
      });
      expect(await careers.saveSession(next)).toEqual({
        ok: false,
        reason: 'position_alpha_save.different_career',
      });
      expect(await storage.list('profile')).toEqual([]);
      const wr = new CareerPersistence(storage, { contentVersion: SHIPPED_CAREER_CONTENT_VERSION });
      expect((await wr.replaceCurrentCareer(createTestCareer('hub-switch-position'))).ok).toBe(
        true,
      );
      expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBe('WR');
      expect((await careers.saveSession(next)).ok).toBe(false);
    },
  );

  it('retains all stores after failure, retries exactly, and rejects a stale confirmation', async () => {
    const storage = createStorage();
    const hub = new CareerManagementPersistence(storage);
    await storage.put('currentCareer', 'active', { revision: 1 });
    const checkpoint = await hub.checkpoint();
    const before = await dump(storage);
    vi.spyOn(storage, 'putMany').mockRejectedValueOnce(new Error('transaction aborted'));
    expect(await hub.retireCurrentCareer(checkpoint)).toEqual({
      ok: false,
      reason: 'storage_error',
    });
    expect(await dump(storage)).toEqual(before);
    expect(await hub.retireCurrentCareer(checkpoint)).toEqual({ ok: true });
    const stale = await hub.checkpoint();
    await storage.put('currentCareer', 'active', { revision: 2 });
    const changed = await dump(storage);
    expect(await hub.resetAllData(stale)).toEqual({
      ok: false,
      reason: 'changed_since_confirmation',
    });
    expect(await dump(storage)).toEqual(changed);
  });

  it('rejects a confirmation for a different athlete already saved by another tab', async () => {
    const storage = createStorage();
    const hub = new CareerManagementPersistence(storage);
    const careers = new CareerPersistence(storage, {
      contentVersion: SHIPPED_CAREER_CONTENT_VERSION,
    });
    const first = createTestCareer('hub-tab-first');
    const second = createTestCareer('hub-tab-second');
    await careers.replaceCurrentCareer(first);
    await expect(hub.checkpoint({ careerId: first.id })).resolves.toBeDefined();
    await careers.replaceCurrentCareer(second);
    const before = await dump(storage);
    await expect(hub.checkpoint({ careerId: first.id })).rejects.toBeInstanceOf(
      CareerManagementConflict,
    );
    expect(await dump(storage)).toEqual(before);
  });

  it('resets only the application stores and blocks pre-reset ordinary saves', async () => {
    const storage = createStorage();
    const hub = new CareerManagementPersistence(storage);
    for (const store of STORAGE_STORE_NAMES) await storage.put(store, 'owned-data', { value: 1 });
    expect(await hub.resetAllData(await hub.checkpoint())).toEqual({ ok: true });
    for (const store of STORAGE_STORE_NAMES) {
      expect(await storage.list(store)).toEqual(
        store === 'settings' ? [{ id: ACTIVE_CAREER_KIND_STORAGE_ID, value: 'NONE' }] : [],
      );
    }
    const wr = new CareerPersistence(storage, { contentVersion: SHIPPED_CAREER_CONTENT_VERSION });
    expect((await wr.saveCareer(createTestCareer())).ok).toBe(false);
  });
});

describe('position completion history', () => {
  it.each(POSITION_ALPHA_TRANSFER_CASES)(
    'preserves completed %s evidence through retirement and another run',
    async (position, archetype) => {
      let session = createTransferredPositionAlphaSession(position, archetype, 'hub-alumnus');
      for (let week = 0; week < 12; week += 1) {
        session = advancePositionAlphaFixture(session);
        if (session.skills.offeredSkillIds !== null) {
          const result = chooseShippedPositionAlphaSkill(
            session,
            session.skills.offeredSkillIds[0],
          );
          if (!result.ok) throw new Error(result.reason);
          session = result.session;
        }
        if (session.events.pending !== null) {
          const result = resolveShippedPositionAlphaEvent(
            session,
            session.events.pending.choiceIds[0],
          );
          if (!result.ok) throw new Error(result.reason);
          session = result.session;
        }
      }
      const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
      if (!reviewed.ok) throw new Error(reviewed.reason);
      const completed = commitShippedPositionAlphaOffseason(
        reviewed.session,
        reviewed.session.lifecycle.currentProgramId,
      );
      if (!completed.ok) throw new Error(completed.reason);
      expect(completed.session.phase.type).toBe('CAREER_COMPLETE');
      const storage = new MemoryStorageAdapter();
      const careers = new PositionAlphaPersistence(storage);
      const hub = new CareerManagementPersistence(storage);
      expect((await careers.saveSession(completed.session, true)).ok).toBe(true);
      const archived = await hub.loadPositionAlumni();
      expect(archived.invalidEntryCount).toBe(0);
      expect(archived.completedSessions[0]?.payload).toEqual(completed.session);
      // Simulate a completion saved before the alumni namespace was introduced.
      await storage.delete(
        'profile',
        `${POSITION_ALUMNI_STORAGE_PREFIX}${session.lifecycle.careerId}`,
      );
      expect(await hub.retireCurrentCareer(await hub.checkpoint())).toEqual({ ok: true });
      expect((await hub.loadPositionAlumni()).completedSessions[0]?.payload).toEqual(
        completed.session,
      );
      expect(
        (
          await careers.saveSession(
            createTransferredPositionAlphaSession(position, archetype, 'hub-next'),
            true,
          )
        ).ok,
      ).toBe(true);
      expect((await hub.loadPositionAlumni()).completedSessions[0]?.payload.meta).toEqual(
        completed.session.meta,
      );
    },
  );
});
