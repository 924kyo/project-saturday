import { describe, expect, it } from 'vitest';
import {
  createCareerVNext,
  type PositionPlayerCreationIdentity,
} from '@project-saturday/game-core';
import {
  buildCareerVNextMechanics,
  defaultWrAppearance,
} from '@project-saturday/game-content/content';

import { MemoryStorageAdapter } from '../storage';
import {
  VNEXT_ALUMNI_ID,
  VNEXT_BACKUP_ID,
  VNEXT_CAREER_ID,
  clearCareerVNext,
  loadAlumniVNext,
  loadCareerVNext,
  saveCareerVNext,
} from './persistence';

const identity = {
  displayName: 'Save Tester',
  positionId: 'position_cb',
  archetypeId: 'archetype_cb_press_man',
  recruitingBackgroundId: 'background_late_bloomer',
  personalityTraitIds: ['personality_disciplined', 'personality_leader'],
  appearance: defaultWrAppearance,
  heightCm: 183,
  weightKg: 86,
} as PositionPlayerCreationIdentity;

function career(seed: string) {
  const created = createCareerVNext({ seed, identity }, buildCareerVNextMechanics(identity)!);
  if (!created.ok) throw new Error(created.reason);
  return created.career;
}

describe('save hardening (M10)', () => {
  it('keeps the last good save and restores it when the current one is corrupt', async () => {
    const storage = new MemoryStorageAdapter();
    const first = career('save-a');
    const second = { ...career('save-a'), revision: first.revision + 1 };
    await saveCareerVNext(storage, first, () => new Date('2026-09-30T00:00:00Z'));
    await saveCareerVNext(storage, second, () => new Date('2026-09-30T00:01:00Z'));
    expect((await loadCareerVNext(storage)).status).toBe('ok');
    // A torn or tampered current save falls back to the previous good one.
    await storage.put('currentCareer', VNEXT_CAREER_ID, { model: 'career_vnext_save', json: '{' });
    const loaded = await loadCareerVNext(storage);
    expect(loaded.status).toBe('recovered');
    if (loaded.status === 'recovered') expect(loaded.career).toEqual(first);
    // With no good backup either, the failure is reported, never guessed.
    await storage.put('currentCareer', VNEXT_BACKUP_ID, { model: 'junk' });
    expect((await loadCareerVNext(storage)).status).toBe('corrupt');
    await clearCareerVNext(storage);
    expect(await loadCareerVNext(storage)).toEqual({ status: 'none' });
    expect(await storage.get('currentCareer', VNEXT_BACKUP_ID)).toBeUndefined();
  });

  it('shows only well-formed plaques from the alumni store', async () => {
    const storage = new MemoryStorageAdapter();
    const good = {
      careerId: 'career_ok',
      displayName: 'Good Plaque',
      positionId: 'position_rb',
      archetypeId: 'archetype_rb_power_back',
      programIds: ['program_ironwood'],
      seasons: 4,
      championships: 0,
      bestFinish: 'MISSED',
      record: { wins: 20, losses: 28, ties: 0 },
      liveGames: 40,
      statTotals: [{ field: 'rushingYards', value: 3000 }],
      finalOverall: 70,
      bestDepthRank: 1,
    };
    await storage.put('profile', VNEXT_ALUMNI_ID, {
      model: 'career_vnext_alumni',
      version: 1,
      entries: [
        good,
        { careerId: 'career_bad', displayName: 'No Record' },
        { ...good, careerId: 'career_bad_position', positionId: 'position_te' },
        null,
      ],
    });
    expect((await loadAlumniVNext(storage)).map(({ careerId }) => careerId)).toEqual(['career_ok']);
  });
});
