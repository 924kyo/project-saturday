import { describe, expect, it } from 'vitest';
import {
  createEmptyMetaProfile,
  createWrMetaRegistryV1,
  parseWrMetaRegistryV1,
  parseMetaProfile,
  parseWrMetaProfileV2,
} from '../src/index.js';

describe('staged lightweight WR meta registry', () => {
  it('separates an exact legacy profile from its logical index without claiming old wire compatibility', () => {
    const legacy = structuredClone(createEmptyMetaProfile());
    const migrated = createWrMetaRegistryV1(legacy);
    expect(migrated).not.toBeNull();
    if (migrated === null) throw new Error('Missing registry');
    expect(migrated.records).toEqual(legacy.alumni);
    expect(migrated.registry).toEqual({ ...legacy, model: 'wr_meta_registry_v1' });
    expect(parseWrMetaRegistryV1(JSON.stringify(migrated.registry))).toEqual(migrated.registry);
    expect(parseMetaProfile(migrated.registry).ok).toBe(false);
    expect(parseWrMetaProfileV2(migrated.registry)).toBeNull();
    expect(Object.isFrozen(legacy)).toBe(false);
  });
  it('validates 1,000 lightweight historical references without loading historical games', () => {
    const base = createWrMetaRegistryV1(createEmptyMetaProfile())!.registry;
    const value = {
      ...base,
      revision: 1000,
      alumni: Array.from({ length: 1000 }, (_, index) => {
        const careerId = `career_registry_${String(index).padStart(4, '0')}`;
        return {
          careerId,
          alumniId: `alumni_${careerId}`,
          recordSchemaVersion: 1,
          programIds: ['program_gulf_meridian'],
        };
      }),
      programFamiliarity: [{ programId: 'program_gulf_meridian', completedCareers: 1000 }],
      unlockedOptionIds: ['legacy_option_alumni_history'],
    };
    const start = performance.now();
    const parsed = parseWrMetaRegistryV1(JSON.stringify(value));
    expect(parsed).toEqual(value);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(JSON.stringify(value).length).toBeLessThan(250_000);
    for (const invalid of [
      { ...value, model: 'wr_meta_registry_v2' },
      { ...value, schemaVersion: 2 },
      { ...value, extra: undefined },
      { ...value, alumni: Object.assign([...value.alumni], { extra: true }) },
      {
        ...value,
        alumni: [
          {
            ...value.alumni[0],
            programIds: Object.assign(['program_gulf_meridian'], { extra: true }),
          },
        ],
      },
      { ...value, alumni: [...value.alumni].reverse() },
      { ...value, alumni: [value.alumni[0], value.alumni[0]] },
      { ...value, alumni: [{ ...value.alumni[0], alumniId: 'alumni_wrong' }] },
      { ...value, alumni: [{ ...value.alumni[0], recordSchemaVersion: 3 }] },
      { ...value, alumni: [{ ...value.alumni[0], programIds: ['missing_program'] }] },
    ])
      expect(parseWrMetaRegistryV1(invalid)).toBeNull();
  });
});
