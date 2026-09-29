import {
  GAME_INFORMATION_TIER_IDS as CORE_GAME_INFORMATION_TIER_IDS,
  GAME_PARTICIPATION_FEEDBACK_IDS as CORE_GAME_PARTICIPATION_FEEDBACK_IDS,
  KEY_SNAP_DECISION_FAMILY_IDS as CORE_KEY_SNAP_DECISION_FAMILY_IDS,
  PERFORMANCE_GRADE_BAND_IDS as CORE_PERFORMANCE_GRADE_BAND_IDS,
  deriveGameOpportunityBudget,
  depthRoleIdForRank,
  isGameClueId,
  isGameCoverageId,
  isGameLeverageId,
  isGameTuningDefinition,
  isKeySnapFamilyMechanicsDefinitionCatalog,
  isKeySnapDecisionFamilyId,
  isKeySnapDecisionId,
  isKeySnapPatternMechanicsDefinitionCatalog,
  isKeySnapPatternId,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import {
  contentManifest,
  gameContent,
  gameOpponentMechanicsProfiles,
  gameTuning,
  keySnapFamilyMechanicsDefinitions,
  keySnapPatternMechanicsDefinitions,
  programContent,
  selectNextGameProfiles,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import {
  GAME_CLUE_IDS,
  GAME_INFORMATION_TIER_IDS,
  GAME_PARTICIPATION_FEEDBACK_IDS,
  KEY_SNAP_DECISION_FAMILY_IDS,
  KEY_SNAP_DECISION_IDS,
  KEY_SNAP_PATTERN_IDS,
  PERFORMANCE_GRADE_BAND_IDS,
  gameContentSchema,
  type GameContent,
} from '../schema/games.js';
import { PROGRAM_IDS } from '../schema/programs.js';
import { validateContent, validateShippedContent } from './content.js';

type Mutable<T> = T extends readonly (infer TItem)[]
  ? Mutable<TItem>[]
  : T extends object
    ? { -readonly [TKey in keyof T]: Mutable<T[TKey]> }
    : T;

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

function cloneGameContent(): Mutable<GameContent> {
  return clone(gameContent) as Mutable<GameContent>;
}

function expectInvalidGameContent(content: unknown): void {
  expect(gameContentSchema.safeParse(content).success).toBe(false);
}

describe('M4 staged game content', () => {
  it('ships the exact stable catalog in canonical order under compatibility version 1', () => {
    expect(contentManifest.games).toBe(gameContent);
    expect(contentManifest.contentVersion).toBe(1);
    expect(contentManifest.schemaVersion).toBe(9);
    expect(gameContent.clues.map(({ id }) => id)).toEqual(GAME_CLUE_IDS);
    expect(gameContent.decisionFamilies.map(({ id }) => id)).toEqual(KEY_SNAP_DECISION_FAMILY_IDS);
    expect(gameContent.decisions.map(({ id }) => id)).toEqual(KEY_SNAP_DECISION_IDS);
    expect(gameContent.patterns.map(({ id }) => id)).toEqual(KEY_SNAP_PATTERN_IDS);
    expect(gameContent.participationFeedback.map(({ id }) => id)).toEqual(
      GAME_PARTICIPATION_FEEDBACK_IDS,
    );
    expect(gameContent.opponentProfiles.map(({ programId }) => programId)).toEqual(PROGRAM_IDS);
    expect(gameContentSchema.safeParse(gameContent).success).toBe(true);
    expect(validateShippedContent()).toEqual({ issues: [], ok: true });
  });

  it('aligns controlled IDs and prefixed game references with game-core', () => {
    expect(KEY_SNAP_DECISION_FAMILY_IDS).toEqual(CORE_KEY_SNAP_DECISION_FAMILY_IDS);
    expect(GAME_INFORMATION_TIER_IDS).toEqual(CORE_GAME_INFORMATION_TIER_IDS);
    expect(GAME_PARTICIPATION_FEEDBACK_IDS).toEqual(CORE_GAME_PARTICIPATION_FEEDBACK_IDS);
    expect(PERFORMANCE_GRADE_BAND_IDS).toEqual(CORE_PERFORMANCE_GRADE_BAND_IDS);

    for (const familyId of KEY_SNAP_DECISION_FAMILY_IDS) {
      expect(isKeySnapDecisionFamilyId(familyId), familyId).toBe(true);
    }
    for (const decisionId of KEY_SNAP_DECISION_IDS) {
      expect(isKeySnapDecisionId(decisionId), decisionId).toBe(true);
    }
    for (const patternId of KEY_SNAP_PATTERN_IDS) {
      expect(isKeySnapPatternId(patternId), patternId).toBe(true);
    }
    for (const clue of gameContent.clues) {
      expect(isGameClueId(clue.id), clue.id).toBe(true);
      if (clue.contextType === 'coverage') {
        expect(isGameCoverageId(clue.coverageId), clue.id).toBe(true);
      } else {
        expect(isGameLeverageId(clue.leverageId), clue.id).toBe(true);
      }
    }
  });

  it('gives every family three legal choices and two contexts with different best fits', () => {
    const reachedDecisionIds = new Set<string>();
    for (const family of gameContent.decisionFamilies) {
      expect(family.decisionIds).toHaveLength(3);
      expect(new Set(family.decisionIds)).toHaveProperty('size', 3);
      expect(
        family.attributeWeights.reduce((total, entry) => total + entry.weightPermille, 0),
        family.id,
      ).toBe(1_000);

      const familyPatterns = gameContent.patterns.filter(
        (pattern) => pattern.familyId === family.id,
      );
      expect(familyPatterns, family.id).toHaveLength(2);
      const bestDecisionIds = new Set<string>();
      for (const pattern of familyPatterns) {
        expect(
          pattern.decisionFits.map(({ decisionId }) => decisionId),
          pattern.id,
        ).toEqual(family.decisionIds);
        pattern.decisionFits.forEach(({ decisionId }) => reachedDecisionIds.add(decisionId));
        const best = pattern.decisionFits.reduce((left, right) =>
          right.fit > left.fit ? right : left,
        );
        bestDecisionIds.add(best.decisionId);
        expect(
          pattern.decisionFits.some(({ fit }) => fit < 0),
          pattern.id,
        ).toBe(true);
      }
      expect(bestDecisionIds, family.id).toHaveProperty('size', 2);
    }
    expect([...reachedDecisionIds].sort()).toEqual([...KEY_SNAP_DECISION_IDS].sort());
  });

  it('maps one coverage clue and one leverage clue to every hidden pattern context', () => {
    const clueById = new Map(gameContent.clues.map((clue) => [clue.id, clue]));
    for (const pattern of gameContent.patterns) {
      expect(pattern.clueIds).toHaveLength(2);
      const coverageClue = clueById.get(pattern.clueIds[0]);
      const leverageClue = clueById.get(pattern.clueIds[1]);
      expect(coverageClue).toEqual(
        expect.objectContaining({ contextType: 'coverage', coverageId: pattern.coverageId }),
      );
      expect(leverageClue).toEqual(
        expect.objectContaining({ contextType: 'leverage', leverageId: pattern.leverageId }),
      );
    }
  });

  it('keeps twelve bounded, distinct fictional opponent projections', () => {
    expect(gameOpponentMechanicsProfiles).toBe(gameContent.opponentProfiles);
    expect(gameOpponentMechanicsProfiles).toHaveLength(12);
    expect(new Set(gameOpponentMechanicsProfiles.map(({ programId }) => programId))).toHaveProperty(
      'size',
      12,
    );
    expect(
      new Set(
        gameOpponentMechanicsProfiles.map(
          ({ defenseRating, offenseRating, qbRating }) =>
            `${offenseRating}:${defenseRating}:${qbRating}`,
        ),
      ),
    ).toHaveProperty('size', 12);
    for (const profile of gameOpponentMechanicsProfiles) {
      for (const rating of [profile.offenseRating, profile.defenseRating, profile.qbRating]) {
        expect(Number.isInteger(rating), profile.programId).toBe(true);
        expect(rating, profile.programId).toBeGreaterThanOrEqual(40);
        expect(rating, profile.programId).toBeLessThanOrEqual(100);
      }
    }
  });

  it('selects a deterministic rotating opponent without ever selecting the player program', () => {
    for (const playerProgramId of PROGRAM_IDS) {
      const opponents = new Set<string>();
      for (let weekIndex = 0; weekIndex < PROGRAM_IDS.length - 1; weekIndex += 1) {
        const selection = selectNextGameProfiles(playerProgramId, weekIndex);
        expect(selection).not.toBeNull();
        expect(selection?.playerProfile.programId).toBe(playerProgramId);
        expect(selection?.opponentProfile.programId).not.toBe(playerProgramId);
        opponents.add(selection?.opponentProfile.programId ?? 'missing');
      }
      expect(opponents, playerProgramId).toHaveProperty('size', PROGRAM_IDS.length - 1);
    }
    expect(selectNextGameProfiles(PROGRAM_IDS[0], -1)).toBeNull();
  });

  it('authors Preparation, role scarcity, clocks, grades, and fixed-point totals explicitly', () => {
    expect(gameTuning.periodCount).toBe(4);
    expect(gameTuning.periodLengthSeconds).toBe(900);
    expect(gameTuning.maxKeySnapOpportunities).toBe(12);
    expect(gameTuning.zeroOpportunityMaxSnapPermille).toBe(20);
    expect(gameTuning.information).toEqual({
      diagnosticMinimumScore: 80,
      filmStudyBonus: 20,
      footballIqWeightPermille: 650,
      partialMinimumScore: 50,
      preparationWeightPermille: 350,
    });
    expect(
      gameTuning.information.footballIqWeightPermille +
        gameTuning.information.preparationWeightPermille,
    ).toBe(1_000);
    expect(gameTuning.resolution).toEqual({
      attributeWeightPermille: 250,
      bodyWeightPermille: 75,
      confidenceWeightPermille: 75,
      decisionFitWeightPermille: 250,
      matchupWeightPermille: 150,
      preparationWeightPermille: 125,
      rollMaximum: 20,
      rollMinimum: -20,
      teamContextWeightPermille: 75,
    });
    expect(
      Object.entries(gameTuning.resolution)
        .filter(([key]) => key.endsWith('WeightPermille'))
        .reduce((total, [, weight]) => total + weight, 0),
    ).toBe(1_000);
    expect(gameTuning.opportunityBoundsByDepthRank).toEqual([
      { depthRank: 1, maximumOpportunities: 10, minimumOpportunities: 6 },
      { depthRank: 2, maximumOpportunities: 8, minimumOpportunities: 4 },
      { depthRank: 3, maximumOpportunities: 6, minimumOpportunities: 2 },
      { depthRank: 4, maximumOpportunities: 4, minimumOpportunities: 1 },
      { depthRank: 5, maximumOpportunities: 2, minimumOpportunities: 0 },
      { depthRank: 6, maximumOpportunities: 2, minimumOpportunities: 0 },
      { depthRank: 7, maximumOpportunities: 2, minimumOpportunities: 0 },
      { depthRank: 8, maximumOpportunities: 2, minimumOpportunities: 0 },
    ]);
    expect(gameTuning.grade.bands.map(({ id }) => id)).toEqual(PERFORMANCE_GRADE_BAND_IDS);
    for (const policy of programContent.rotationPolicies) {
      for (const projection of policy.rankSnapRanges) {
        const budget = deriveGameOpportunityBudget(
          { ...projection, roleId: depthRoleIdForRank(projection.rank) },
          gameTuning,
        );
        const bounds = gameTuning.opportunityBoundsByDepthRank[projection.rank - 1]!;
        expect(budget, `${policy.id}:WR${projection.rank}`).not.toBeNull();
        expect(budget!, `${policy.id}:WR${projection.rank}`).toBeGreaterThanOrEqual(
          bounds.minimumOpportunities,
        );
        expect(budget!, `${policy.id}:WR${projection.rank}`).toBeLessThanOrEqual(
          bounds.maximumOpportunities,
        );
      }
    }
  });

  it('exports display-free mechanics projections for browser-independent simulation', () => {
    expect(isGameTuningDefinition(gameTuning)).toBe(true);
    expect(isKeySnapFamilyMechanicsDefinitionCatalog(keySnapFamilyMechanicsDefinitions)).toBe(true);
    expect(
      isKeySnapPatternMechanicsDefinitionCatalog(
        keySnapPatternMechanicsDefinitions,
        keySnapFamilyMechanicsDefinitions,
      ),
    ).toBe(true);
    expect(keySnapFamilyMechanicsDefinitions).toHaveLength(4);
    expect(keySnapPatternMechanicsDefinitions).toHaveLength(8);
    expect(Object.keys(keySnapFamilyMechanicsDefinitions[0]!).sort()).toEqual([
      'attributeWeights',
      'decisionIds',
      'id',
    ]);
    expect(Object.keys(keySnapPatternMechanicsDefinitions[0]!).sort()).toEqual([
      'clueIds',
      'coverageId',
      'decisionFits',
      'familyId',
      'id',
      'leverageId',
      'outcome',
    ]);
    const serialized = JSON.stringify({
      gameOpponentMechanicsProfiles,
      gameTuning,
      keySnapFamilyMechanicsDefinitions,
      keySnapPatternMechanicsDefinitions,
    });
    expect(serialized).not.toContain('nameKey');
    expect(serialized).not.toContain('descriptionKey');
  });

  it('provides complete, distinct bilingual copy without reference-game naming', () => {
    const localizedDefinitions = [
      ...gameContent.clues,
      ...gameContent.decisionFamilies,
      ...gameContent.decisions,
      ...gameContent.patterns,
      ...gameContent.participationFeedback,
    ];
    const prohibitedReferenceFragments = ['the rookie', 'ea college football'];

    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages = localeMessages[locale] as Readonly<Record<string, string>>;
      const patternNames = new Set<string>();
      for (const definition of localizedDefinitions) {
        for (const key of [definition.nameKey, definition.descriptionKey]) {
          const value = messages[key]!;
          expect(typeof value, `${locale}:${key}`).toBe('string');
          expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
          expect(value, `${locale}:${key}`).not.toBe(definition.id);
          const normalized = value.toLocaleLowerCase('en-US');
          for (const fragment of prohibitedReferenceFragments) {
            expect(normalized, `${locale}:${key}`).not.toContain(fragment);
          }
        }
      }
      for (const pattern of gameContent.patterns) {
        patternNames.add(messages[pattern.nameKey]!);
      }
      expect(patternNames).toHaveProperty('size', KEY_SNAP_PATTERN_IDS.length);
    }
  });

  it('rejects malformed families, clue references, and non-reversing contexts', () => {
    const duplicateFamilyChoice = cloneGameContent();
    duplicateFamilyChoice.decisionFamilies[0]!.decisionIds[1] =
      duplicateFamilyChoice.decisionFamilies[0]!.decisionIds[0]!;
    expectInvalidGameContent(duplicateFamilyChoice);

    const wrongClue = cloneGameContent();
    wrongClue.patterns[0]!.clueIds[0] = 'game_clue_off_man';
    expectInvalidGameContent(wrongClue);

    const noBestFitReversal = cloneGameContent();
    noBestFitReversal.patterns[1]!.decisionFits = [
      { decisionId: 'key_snap_decision_speed_release', fit: 8 },
      { decisionId: 'key_snap_decision_hand_clear', fit: 24 },
      { decisionId: 'key_snap_decision_patient_feint', fit: -8 },
    ];
    expectInvalidGameContent(noBestFitReversal);
  });

  it('rejects invalid weight totals, thresholds, rank bounds, and one-locale copy', () => {
    const invalidInformationWeights = cloneGameContent();
    invalidInformationWeights.tuning.information.preparationWeightPermille = 349;
    expectInvalidGameContent(invalidInformationWeights);

    const reversedInformationThresholds = cloneGameContent();
    reversedInformationThresholds.tuning.information.partialMinimumScore = 80;
    expectInvalidGameContent(reversedInformationThresholds);

    const invalidResolutionWeights = cloneGameContent();
    invalidResolutionWeights.tuning.resolution.preparationWeightPermille = 124;
    expectInvalidGameContent(invalidResolutionWeights);

    const invalidRankOrder = cloneGameContent();
    invalidRankOrder.tuning.opportunityBoundsByDepthRank[1]!.depthRank = 1;
    expectInvalidGameContent(invalidRankOrder);

    const reversedRankBounds = cloneGameContent();
    reversedRankBounds.tuning.opportunityBoundsByDepthRank[3]!.minimumOpportunities = 5;
    expectInvalidGameContent(reversedRankBounds);

    const localeResources = {
      'en-US': { ...localeMessages['en-US'] },
      'ko-KR': { ...localeMessages['ko-KR'] },
    };
    delete (localeResources['en-US'] as Record<string, string>)[
      'gameContent.patterns.boundaryJam.name'
    ];
    const result = validateContent({ localeResources, manifest: contentManifest });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'content.missing-localization-reference',
          locale: 'en-US',
          messageKey: 'gameContent.patterns.boundaryJam.name',
        }),
      );
    }
  });
});
