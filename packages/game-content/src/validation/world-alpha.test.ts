import { describe, expect, it } from 'vitest';

import { contentManifest, programContent, worldAlphaContent } from '../content/index.js';
import { worldAlphaNilProgramStrengthBands } from '../content/world-alpha-mechanics.js';
import { localeMessages } from '../locales/index.js';
import {
  STAGED_PROGRAM_IDS,
  WORLD_ALPHA_AGGREGATE_TIER_IDS,
  WORLD_ALPHA_GROUP_IDS,
  WORLD_ALPHA_PROGRAM_IDS,
  WORLD_ALPHA_ROUND_IDS,
  worldAlphaContentSchema,
} from '../schema/world-alpha.js';
import { validateContent, validateShippedContent } from './content.js';

type WorldAlphaProgramId = (typeof WORLD_ALPHA_PROGRAM_IDS)[number];

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

describe('M7 staged 32-program world contract', () => {
  it('covers every possible transfer destination in NIL without rewriting original strength bands', () => {
    expect(worldAlphaNilProgramStrengthBands.map(({ programId }) => programId)).toEqual(
      WORLD_ALPHA_PROGRAM_IDS,
    );
    expect(new Set(worldAlphaNilProgramStrengthBands.map(({ programId }) => programId)).size).toBe(
      32,
    );
    for (const program of programContent.programs)
      expect(
        worldAlphaNilProgramStrengthBands.find(({ programId }) => programId === program.id)
          ?.strengthBandId,
      ).toBe(program.strengthBandId);
    const bands = {
      aggregate_tier_peak: 'program_strength_national',
      aggregate_tier_contender: 'program_strength_contender',
      aggregate_tier_competitive: 'program_strength_builder',
      aggregate_tier_building: 'program_strength_builder',
    };
    for (const program of worldAlphaContent.programProfiles.filter(({ id }) =>
      STAGED_PROGRAM_IDS.includes(id as (typeof STAGED_PROGRAM_IDS)[number]),
    ))
      expect(
        worldAlphaNilProgramStrengthBands.find(({ programId }) => programId === program.id)
          ?.strengthBandId,
      ).toBe(bands[program.aggregateTierId]);
  });
  it('ships 20 original additions, four groups, four aggregate tiers, and paired copy', () => {
    expect(contentManifest.worldAlpha).toBe(worldAlphaContent);
    expect(worldAlphaContent.groups.map(({ id }) => id)).toEqual(WORLD_ALPHA_GROUP_IDS);
    expect(worldAlphaContent.stagedPrograms.map(({ id }) => id)).toEqual(STAGED_PROGRAM_IDS);
    expect(worldAlphaContent.programProfiles.map(({ id }) => id)).toEqual(WORLD_ALPHA_PROGRAM_IDS);
    expect(worldAlphaContent.regularSeasonRounds.map(({ id }) => id)).toEqual(
      WORLD_ALPHA_ROUND_IDS,
    );
    expect(
      WORLD_ALPHA_AGGREGATE_TIER_IDS.map(
        (tierId) =>
          worldAlphaContent.programProfiles.filter(
            ({ aggregateTierId }) => aggregateTierId === tierId,
          ).length,
      ),
    ).toEqual([8, 8, 8, 8]);
    expect(programContent.programs).toHaveLength(12);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('gives every program seven group games and five unique cross-group games', () => {
    const groupByProgram = new Map(
      worldAlphaContent.groups.flatMap((group) =>
        group.programIds.map((programId) => [programId, group.id] as const),
      ),
    );
    const opponents = new Map(
      WORLD_ALPHA_PROGRAM_IDS.map((id) => [id, [] as WorldAlphaProgramId[]]),
    );
    for (const round of worldAlphaContent.regularSeasonRounds) {
      expect(
        new Set(
          round.fixtures.flatMap(({ awayProgramId, homeProgramId }) => [
            awayProgramId,
            homeProgramId,
          ]),
        ).size,
      ).toBe(32);
      for (const fixture of round.fixtures) {
        opponents.get(fixture.homeProgramId)!.push(fixture.awayProgramId);
        opponents.get(fixture.awayProgramId)!.push(fixture.homeProgramId);
      }
    }
    for (const [programId, scheduledOpponents] of opponents) {
      expect(scheduledOpponents).toHaveLength(12);
      expect(new Set(scheduledOpponents).size).toBe(12);
      expect(
        scheduledOpponents.filter(
          (opponentId) => groupByProgram.get(opponentId) === groupByProgram.get(programId),
        ),
      ).toHaveLength(7);
      const rivalId = worldAlphaContent.programProfiles.find(
        ({ id }) => id === programId,
      )!.rivalProgramId;
      expect(scheduledOpponents).toContain(rivalId);
    }
  });

  it('rejects duplicate group membership and nonreciprocal rivalry', () => {
    const duplicateGroup = clone(worldAlphaContent);
    duplicateGroup.groups[1]!.programIds[0] = duplicateGroup.groups[0]!.programIds[0]!;
    expect(worldAlphaContentSchema.safeParse(duplicateGroup).success).toBe(false);

    const brokenRivalry = clone(worldAlphaContent);
    brokenRivalry.programProfiles[0]!.rivalProgramId = brokenRivalry.programProfiles[2]!.id;
    expect(worldAlphaContentSchema.safeParse(brokenRivalry).success).toBe(false);
  });

  it('fails content validation when one locale loses a staged program short name', () => {
    const resources = {
      'en-US': { ...localeMessages['en-US'] },
      'ko-KR': { ...localeMessages['ko-KR'] },
    };
    delete (resources['ko-KR'] as Record<string, string>)['m7World.programs.amberCoast.shortName'];
    const result = validateContent({ localeResources: resources, manifest: contentManifest });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.missing-localization-reference',
          contentId: 'program_amber_coast',
          locale: 'ko-KR',
        }),
      );
    }
  });
});
