import type { AlumniVNext } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { MemoryStorageAdapter } from '../storage';
import { loadAlumniVNext, recordAlumniVNext, VNEXT_ALUMNI_ID } from './persistence';
import { findPrototypeAlumni, hasPrototypeData } from './prototype';

const plaque = (careerId: string): AlumniVNext => ({
  careerId,
  displayName: 'Marcus Hale',
  positionId: 'position_qb',
  archetypeId: 'archetype_qb_field_general',
  programIds: ['program_crown_sound' as never],
  seasons: 4,
  championships: 1,
  bestFinish: 'CHAMPION',
  record: { wins: 30, losses: 16, ties: 2 },
  liveGames: 40,
  statTotals: [{ field: 'passingYards', value: 4_200 }],
  finalOverall: 71,
  bestDepthRank: 1,
});

describe('Alumni Wall storage', () => {
  it('records each finished career once and never looks like prototype data', async () => {
    const storage = new MemoryStorageAdapter();
    expect(await loadAlumniVNext(storage)).toEqual([]);
    await recordAlumniVNext(storage, plaque('career_a'));
    await recordAlumniVNext(storage, plaque('career_a'));
    const entries = await recordAlumniVNext(storage, plaque('career_b'));
    expect(entries.map(({ careerId }) => careerId)).toEqual(['career_a', 'career_b']);
    expect(await loadAlumniVNext(storage)).toEqual(entries);
    expect(await hasPrototypeData(storage)).toBe(false);
    await storage.put('profile', VNEXT_ALUMNI_ID, { model: 'something_else' });
    expect(await loadAlumniVNext(storage)).toEqual([]);
  });

  it('imports headline facts from prototype alumni records that still parse', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.put('profile', 'wr-meta:page:3:0', {
      payload: JSON.stringify({
        alumni: [
          {
            careerId: 'career_old',
            displayName: 'Old Timer',
            positionId: 'position_wr',
            programIds: ['program_oak_river'],
            gamesPlayed: 12,
          },
          { displayName: 'Broken', positionId: 42 },
        ],
      }),
    });
    await storage.put('currentCareer', 'legacy', { not: 'alumni' });
    expect(await hasPrototypeData(storage)).toBe(true);
    const found = await findPrototypeAlumni(storage);
    expect(found).toEqual([
      {
        key: 'career_old',
        displayName: 'Old Timer',
        positionId: 'position_wr',
        programIds: ['program_oak_river'],
        gamesPlayed: 12,
      },
    ]);
  });
});
