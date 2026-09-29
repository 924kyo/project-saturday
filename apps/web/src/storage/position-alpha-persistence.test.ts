import { describe, expect, it } from 'vitest';
import {
  chooseShippedPositionAlphaSkill,
  commitShippedPositionAlphaOffseason,
  createShippedPositionAlphaSession,
  defaultWrAppearance,
  positionAlphaContent,
  resolveShippedPositionAlphaEvent,
  resolveShippedPositionAlphaSeason,
  resolveShippedPositionAlphaWeek,
} from '@project-saturday/game-content';

import {
  ACTIVE_CAREER_KIND_STORAGE_ID,
  POSITION_ALPHA_STORAGE_ID,
  PositionAlphaPersistence,
} from './position-alpha-persistence';
import { MemoryStorageAdapter, type StorageAdapter } from './storage';

const TRANSFER_CASES = [
  ['position_qb', 'archetype_qb_field_general'],
  ['position_rb', 'archetype_rb_power_back'],
  ['position_cb', 'archetype_cb_press_man'],
] as const;

function createSession() {
  const created = createShippedPositionAlphaSession({
    careerSeed: 'm7-browser-position-persistence',
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Persisted Alpha',
      positionId: 'position_qb',
      archetypeId: 'archetype_qb_field_general',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(created.reason);
  return created.session;
}

function nextWeek(session: ReturnType<typeof createSession>) {
  const action = positionAlphaContent.trainingActions.find(
    ({ positionId }) => positionId === 'position_qb',
  )!;
  const resolved = resolveShippedPositionAlphaWeek(session, action.id, 'best_fit');
  if (!resolved.ok) throw new Error(resolved.reason);
  return resolved.session;
}

function createTransferredSession(
  positionId: (typeof TRANSFER_CASES)[number][0],
  archetypeId: (typeof TRANSFER_CASES)[number][1],
) {
  const created = createShippedPositionAlphaSession({
    careerSeed: `m7-persisted-transfer-${positionId}`,
    programId: 'program_ember_peak_polytechnic',
    identity: {
      displayName: 'Persisted Transfer',
      positionId,
      archetypeId,
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_disciplined', 'personality_leader'],
      appearance: defaultWrAppearance,
      heightCm: 188,
      weightKg: 92,
    },
  });
  if (!created.ok) throw new Error(created.reason);
  const actions = positionAlphaContent.trainingActions.filter(
    (action) => action.positionId === positionId,
  );
  let session = created.session;
  for (let weekIndex = 0; weekIndex < 12; weekIndex += 1) {
    const resolved = resolveShippedPositionAlphaWeek(
      session,
      actions[weekIndex % actions.length]!.id,
      'best_fit',
    );
    if (!resolved.ok) throw new Error(resolved.reason);
    session = resolved.session;
    if (session.skills.offeredSkillIds !== null) {
      const chosen = chooseShippedPositionAlphaSkill(session, session.skills.offeredSkillIds[0]);
      if (!chosen.ok) throw new Error(chosen.reason);
      session = chosen.session;
    }
    if (session.events.pending !== null) {
      const settled = resolveShippedPositionAlphaEvent(
        session,
        session.events.pending.choiceIds[0],
      );
      if (!settled.ok) throw new Error(settled.reason);
      session = settled.session;
    }
  }
  const reviewed = resolveShippedPositionAlphaSeason(session, 'best_fit');
  if (!reviewed.ok) throw new Error(reviewed.reason);
  const transfer = reviewed.session.lifecycle.offseason?.options[1];
  if (transfer === undefined) throw new Error('Expected a transfer option.');
  const committed = commitShippedPositionAlphaOffseason(reviewed.session, transfer.programId);
  if (!committed.ok) throw new Error(committed.reason);
  return committed.session;
}

describe('position alpha browser persistence', () => {
  it('atomically writes and reloads the strict aggregate with active-kind selection', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new PositionAlphaPersistence(storage, {
      now: () => new Date('2026-09-01T12:00:00.000Z'),
    });
    const session = createSession();
    const saved = await persistence.saveSession(session, true);
    expect(saved.ok).toBe(true);
    expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBe('POSITION_ALPHA');
    expect(await persistence.loadSession()).toEqual(
      expect.objectContaining({
        ok: true,
        session,
        source: 'current',
        recovered: false,
      }),
    );
  });

  it('rejects stale/conflicting branches and recovers the newest valid snapshot', async () => {
    const storage = new MemoryStorageAdapter();
    const persistence = new PositionAlphaPersistence(storage, {
      now: () => new Date('2026-09-01T12:00:00.000Z'),
    });
    const initial = createSession();
    const next = nextWeek(initial);
    expect((await persistence.saveSession(initial, true)).ok).toBe(true);
    expect((await persistence.saveSession(next)).ok).toBe(true);
    expect(await persistence.saveSession(initial)).toEqual({
      ok: false,
      reason: 'position_alpha_save.stale_revision',
    });
    expect(await persistence.saveSession(next)).toEqual({
      ok: false,
      reason: 'position_alpha_save.conflicting_revision',
    });
    const current = await storage.get<Record<string, unknown>>(
      'currentCareer',
      POSITION_ALPHA_STORAGE_ID,
    );
    await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
      ...current,
      checksum: 'fnv1a32:00000000',
    });
    const recovered = await persistence.loadSession();
    expect(recovered).toEqual(
      expect.objectContaining({
        ok: true,
        session: initial,
        source: 'snapshot',
        recovered: true,
      }),
    );
  });

  it('leaves no partial current state when the atomic write fails', async () => {
    const storage = new MemoryStorageAdapter();
    const failing: StorageAdapter = {
      ...storage,
      durability: storage.durability,
      get: storage.get.bind(storage),
      put: storage.put.bind(storage),
      list: storage.list.bind(storage),
      delete: storage.delete.bind(storage),
      close: storage.close.bind(storage),
      runExclusive: storage.runExclusive.bind(storage),
      putMany: async () => {
        throw new Error('injected transaction failure');
      },
    };
    const persistence = new PositionAlphaPersistence(failing, {
      now: () => new Date('2026-09-01T12:00:00.000Z'),
    });
    expect(await persistence.saveSession(createSession(), true)).toEqual({
      ok: false,
      reason: 'position_alpha_save.storage_error',
    });
    expect(await storage.get('currentCareer', POSITION_ALPHA_STORAGE_ID)).toBeUndefined();
    expect(await storage.get('settings', ACTIVE_CAREER_KIND_STORAGE_ID)).toBeUndefined();
  });

  it.each(TRANSFER_CASES)(
    'reloads and snapshot-recovers the current program after a %s transfer',
    async (positionId, archetypeId) => {
      const storage = new MemoryStorageAdapter();
      const transferred = createTransferredSession(positionId, archetypeId);
      const persistence = new PositionAlphaPersistence(storage, {
        now: () => new Date('2026-09-01T12:00:00.000Z'),
      });
      expect((await persistence.saveSession(transferred, true)).ok).toBe(true);

      const reloaded = await new PositionAlphaPersistence(storage).loadSession();
      expect(reloaded).toEqual(
        expect.objectContaining({
          ok: true,
          session: transferred,
          source: 'current',
        }),
      );

      const action = positionAlphaContent.trainingActions.find(
        ({ positionId: actionPositionId }) => actionPositionId === positionId,
      );
      if (action === undefined) throw new Error('Expected a transfer-season action.');
      const advanced = resolveShippedPositionAlphaWeek(transferred, action.id, 'best_fit');
      if (!advanced.ok) throw new Error(advanced.reason);
      expect((await persistence.saveSession(advanced.session)).ok).toBe(true);

      const current = await storage.get<Record<string, unknown>>(
        'currentCareer',
        POSITION_ALPHA_STORAGE_ID,
      );
      await storage.put('currentCareer', POSITION_ALPHA_STORAGE_ID, {
        ...current,
        checksum: 'fnv1a32:00000000',
      });
      const recovered = await new PositionAlphaPersistence(storage).loadSession();
      expect(recovered).toEqual(
        expect.objectContaining({
          ok: true,
          recovered: true,
          session: transferred,
          source: 'snapshot',
        }),
      );
    },
  );
});
