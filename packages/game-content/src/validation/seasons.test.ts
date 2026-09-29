import { describe, expect, it } from 'vitest';

import { contentManifest, gameContent, programContent, seasonContent } from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import { PROGRAM_IDS } from '../schema/programs.js';
import {
  CAMP_ROUND_IDS,
  POSTSEASON_ROUND_IDS,
  REGULAR_SEASON_ROUND_IDS,
  SEASON_OUTCOME_IDS,
  STANDINGS_TIEBREAKER_IDS,
  seasonContentSchema,
} from '../schema/seasons.js';
import { validateContent, validateShippedContent } from './content.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

function pairId(firstProgramId: string, secondProgramId: string): string {
  return firstProgramId < secondProgramId
    ? `${firstProgramId}:${secondProgramId}`
    : `${secondProgramId}:${firstProgramId}`;
}

function issueCodes(result: ReturnType<typeof validateContent>): readonly string[] {
  return result.ok ? [] : result.issues.map(({ code }) => code);
}

describe('M5 season/world content', () => {
  it('ships the canonical season catalog under additive manifest schema 5', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(contentManifest.contentVersion).toBe(1);
    expect(contentManifest.season).toBe(seasonContent);
    expect(seasonContent.model).toBe('season_v1');
    expect(seasonContent.campRounds.map(({ id }) => id)).toEqual(CAMP_ROUND_IDS);
    expect(seasonContent.regularSeasonRounds.map(({ id }) => id)).toEqual(REGULAR_SEASON_ROUND_IDS);
    expect(seasonContent.postseason.rounds.map(({ id }) => id)).toEqual(POSTSEASON_ROUND_IDS);
    expect(seasonContent.postseason.outcomes.map(({ id }) => id)).toEqual(SEASON_OUTCOME_IDS);
    expect(seasonContent.standings.tiebreakOrder).toEqual(STANDINGS_TIEBREAKER_IDS);
    expect(seasonContentSchema.safeParse(seasonContent).success).toBe(true);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('uses a complete eleven-round round robin plus one reciprocal rivalry round', () => {
    const fixtureIds = new Set<string>();
    const firstElevenPairs = new Set<string>();
    const appearanceCounts = new Map(PROGRAM_IDS.map((programId) => [programId, 0]));
    const homeCounts = new Map(PROGRAM_IDS.map((programId) => [programId, 0]));

    for (const [roundIndex, round] of seasonContent.regularSeasonRounds.entries()) {
      expect(round.weekNumber).toBe(roundIndex + 1);
      expect(round.fixtures).toHaveLength(6);
      const roundPrograms = new Set<string>();
      for (const fixture of round.fixtures) {
        expect(fixture.homeProgramId).not.toBe(fixture.awayProgramId);
        expect(fixtureIds.has(fixture.id)).toBe(false);
        fixtureIds.add(fixture.id);
        roundPrograms.add(fixture.homeProgramId);
        roundPrograms.add(fixture.awayProgramId);
        appearanceCounts.set(
          fixture.homeProgramId,
          (appearanceCounts.get(fixture.homeProgramId) ?? 0) + 1,
        );
        appearanceCounts.set(
          fixture.awayProgramId,
          (appearanceCounts.get(fixture.awayProgramId) ?? 0) + 1,
        );
        homeCounts.set(fixture.homeProgramId, (homeCounts.get(fixture.homeProgramId) ?? 0) + 1);
        if (roundIndex < 11) {
          expect(fixture.spotlight).toBe(false);
          firstElevenPairs.add(pairId(fixture.homeProgramId, fixture.awayProgramId));
        } else {
          expect(fixture.spotlight).toBe(true);
        }
      }
      expect(roundPrograms).toEqual(new Set(PROGRAM_IDS));
    }

    expect(fixtureIds.size).toBe(72);
    expect(firstElevenPairs.size).toBe(66);
    for (const programId of PROGRAM_IDS) {
      expect(appearanceCounts.get(programId), programId).toBe(12);
      expect(homeCounts.get(programId), programId).toBe(6);
    }

    const expectedRivalryPairs = new Set(
      programContent.programs.flatMap((program) =>
        program.rivalProgramIds
          .filter((rivalId) => program.id < rivalId)
          .map((rivalId) => pairId(program.id, rivalId)),
      ),
    );
    const rivalryRoundPairs = new Set(
      seasonContent.regularSeasonRounds[11]!.fixtures.map((fixture) =>
        pairId(fixture.homeProgramId, fixture.awayProgramId),
      ),
    );
    expect(rivalryRoundPairs).toEqual(expectedRivalryPairs);
  });

  it('derives team and schedule-strength evidence from the authored fixture matrix', () => {
    const gameProfileByProgramId = new Map(
      gameContent.opponentProfiles.map((profile) => [profile.programId, profile]),
    );
    const seasonProfileByProgramId = new Map(
      seasonContent.programProfiles.map((profile) => [profile.programId, profile]),
    );
    expect([...seasonProfileByProgramId.keys()]).toEqual(PROGRAM_IDS);

    for (const programId of PROGRAM_IDS) {
      const gameProfile = gameProfileByProgramId.get(programId)!;
      const seasonProfile = seasonProfileByProgramId.get(programId)!;
      expect(seasonProfile.teamRating).toBe(
        Math.round(
          (gameProfile.offenseRating + gameProfile.defenseRating + gameProfile.qbRating) / 3,
        ),
      );
      const opponentRatings = seasonContent.regularSeasonRounds.flatMap((round) =>
        round.fixtures.flatMap((fixture) => {
          if (fixture.homeProgramId === programId) {
            return [seasonProfileByProgramId.get(fixture.awayProgramId)!.teamRating];
          }
          if (fixture.awayProgramId === programId) {
            return [seasonProfileByProgramId.get(fixture.homeProgramId)!.teamRating];
          }
          return [];
        }),
      );
      expect(opponentRatings).toHaveLength(12);
      expect(seasonProfile.scheduleStrength).toBe(
        Math.round(
          opponentRatings.reduce((total, rating) => total + rating, 0) / opponentRatings.length,
        ),
      );
    }
  });

  it('defines a four-team bracket and mutually exclusive finish outcomes', () => {
    expect(seasonContent.postseason.qualifierCount).toBe(4);
    expect(seasonContent.postseason.semifinalMatchups).toEqual([
      { awaySeed: 4, homeSeed: 1 },
      { awaySeed: 3, homeSeed: 2 },
    ]);
    expect(seasonContent.postseason.rounds.map(({ gameCount }) => gameCount)).toEqual([2, 1]);

    const coveredFinishes = seasonContent.postseason.outcomes.flatMap((outcome) =>
      Array.from(
        { length: outcome.maximumFinish - outcome.minimumFinish + 1 },
        (_, index) => outcome.minimumFinish + index,
      ),
    );
    expect(coveredFinishes).toEqual(PROGRAM_IDS.map((_, index) => index + 1));
  });

  it('ships every season-facing key in Korean and English', () => {
    const localizedKeys = [
      seasonContent.nameKey,
      seasonContent.descriptionKey,
      seasonContent.standings.explanationKey,
      ...seasonContent.campRounds.flatMap(({ descriptionKey, nameKey }) => [
        descriptionKey,
        nameKey,
      ]),
      ...seasonContent.regularSeasonRounds.flatMap(({ descriptionKey, nameKey }) => [
        descriptionKey,
        nameKey,
      ]),
      ...seasonContent.postseason.rounds.flatMap(({ descriptionKey, nameKey }) => [
        descriptionKey,
        nameKey,
      ]),
      ...seasonContent.postseason.outcomes.flatMap(({ descriptionKey, nameKey }) => [
        descriptionKey,
        nameKey,
      ]),
    ];

    for (const key of localizedKeys) {
      const localeKey = key as keyof (typeof localeMessages)['ko-KR'];
      expect(localeMessages['ko-KR'][localeKey], key).toBeTruthy();
      expect(localeMessages['en-US'][localeKey], key).toBeTruthy();
    }
  });

  it('rejects schedule drift, duplicate fixture IDs, and stale strength evidence', () => {
    const duplicateParticipation = clone(contentManifest);
    duplicateParticipation.season.regularSeasonRounds[0]!.fixtures[1]!.homeProgramId =
      duplicateParticipation.season.regularSeasonRounds[0]!.fixtures[0]!.homeProgramId;
    expect(
      issueCodes(
        validateContent({ localeResources: localeMessages, manifest: duplicateParticipation }),
      ),
    ).toContain('content.invalid-mechanics');

    const duplicateFixtureId = clone(contentManifest);
    duplicateFixtureId.season.regularSeasonRounds[1]!.fixtures[0]!.id =
      duplicateFixtureId.season.regularSeasonRounds[0]!.fixtures[0]!.id;
    expect(
      issueCodes(
        validateContent({ localeResources: localeMessages, manifest: duplicateFixtureId }),
      ),
    ).toContain('content.duplicate-id');

    const staleStrength = clone(contentManifest);
    staleStrength.season.programProfiles[0]!.scheduleStrength += 1;
    expect(
      issueCodes(validateContent({ localeResources: localeMessages, manifest: staleStrength })),
    ).toContain('content.invalid-mechanics');

    const swappedRounds = clone(contentManifest);
    [swappedRounds.season.regularSeasonRounds[0], swappedRounds.season.regularSeasonRounds[1]] = [
      swappedRounds.season.regularSeasonRounds[1]!,
      swappedRounds.season.regularSeasonRounds[0]!,
    ];
    expect(
      issueCodes(validateContent({ localeResources: localeMessages, manifest: swappedRounds })),
    ).toContain('content.invalid-mechanics');
  });
});
