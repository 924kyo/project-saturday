import { describe, expect, it } from 'vitest';
import {
  createEmptyMetaProfile,
  migrateMetaProfileV1ToWrV2,
  parseWrMetaProfileV2,
  parseMetaProfile,
} from '../src/index.js';

describe('staged WR mixed historical/current meta boundary', () => {
  it('changes only the version marker and preserves input ownership', () => {
    const legacy = structuredClone(createEmptyMetaProfile());
    const current = migrateMetaProfileV1ToWrV2(legacy);
    expect(current).toEqual({ ...legacy, schemaVersion: 2 });
    expect(parseWrMetaProfileV2(JSON.stringify(current))).toEqual(current);
    expect(parseMetaProfile(current).ok).toBe(false);
    expect(parseWrMetaProfileV2(legacy)).toBeNull();
    expect(Object.isFrozen(legacy)).toBe(false);
    expect(Object.isFrozen(current)).toBe(true);
  });
  it('rejects future, malformed, noncanonical and unproven current alumni', () => {
    const current = migrateMetaProfileV1ToWrV2(createEmptyMetaProfile());
    for (const value of [
      null,
      '{',
      { ...current, schemaVersion: 3 },
      { ...current, extra: undefined },
      { ...current, revision: -1 },
      { ...current, alumni: [{ schemaVersion: 2, model: 'wr_two_season_alumni_v1' }] },
      { ...current, unlockedOptionIds: ['legacy_b', 'legacy_a'] },
      {
        ...current,
        programFamiliarity: [{ programId: 'program_gulf_meridian', completedCareers: 0 }],
      },
    ])
      expect(parseWrMetaProfileV2(value)).toBeNull();
    expect(() =>
      migrateMetaProfileV1ToWrV2({ ...createEmptyMetaProfile(), revision: -1 }),
    ).toThrow();
  });
});
