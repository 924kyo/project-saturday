import {
  ACADEMIC_CHECKPOINT_IDS as CORE_ACADEMIC_CHECKPOINT_IDS,
  ACADEMIC_STATUS_IDS as CORE_ACADEMIC_STATUS_IDS,
  NIL_CATEGORY_IDS as CORE_NIL_CATEGORY_IDS,
  NIL_OBLIGATION_TYPE_IDS as CORE_NIL_OBLIGATION_TYPE_IDS,
  OFF_FIELD_BENEFIT_IDS as CORE_OFF_FIELD_BENEFIT_IDS,
  OFFSEASON_COACH_CHANGE_IDS as CORE_OFFSEASON_COACH_CHANGE_IDS,
  RELATIONSHIP_ACTOR_IDS as CORE_RELATIONSHIP_ACTOR_IDS,
  RELATIONSHIP_CONTEXT_TAG_IDS as CORE_RELATIONSHIP_CONTEXT_TAG_IDS,
  RELATIONSHIP_SOURCE_IDS as CORE_RELATIONSHIP_SOURCE_IDS,
  TRANSFER_CONFIDENCE_TIER_IDS as CORE_TRANSFER_CONFIDENCE_TIER_IDS,
  TRANSFER_PROJECTION_FACTOR_IDS as CORE_TRANSFER_PROJECTION_FACTOR_IDS,
  isOffFieldMechanicsCatalog,
} from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { contentManifest, offFieldContent, offFieldMechanicsCatalog } from '../content/index.js';
import { localeMessages } from '../locales/index.js';
import {
  ACADEMIC_CHECKPOINT_IDS,
  ACADEMIC_STATUS_IDS,
  NIL_CATEGORY_IDS,
  NIL_OBLIGATION_IDS,
  NIL_OBLIGATION_TYPE_IDS,
  NIL_OFFER_IDS,
  OFF_FIELD_BENEFIT_IDS,
  OFFSEASON_COACH_CHANGE_IDS,
  RELATIONSHIP_ACTOR_IDS,
  RELATIONSHIP_CONTEXT_TAG_IDS,
  RELATIONSHIP_SOURCE_IDS,
  TRANSFER_CONFIDENCE_TIER_IDS,
  TRANSFER_PROJECTION_FACTOR_IDS,
} from '../schema/off-field.js';
import { validateContent } from './content.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type DeepMutable<T> = T extends object ? { -readonly [TKey in keyof T]: DeepMutable<T[TKey]> } : T;

function jsonClone<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>;
}

function expectIssues(result: ValidationResult): readonly ValidationIssue[] {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected content validation failure.');
  return result.issues;
}

describe('M6 off-field and transfer content foundation', () => {
  it('ships one strict schema-8 catalog with exactly 10 original bilingual NIL templates', () => {
    expect(contentManifest.schemaVersion).toBe(9);
    expect(contentManifest.offField).toBe(offFieldContent);
    expect(offFieldContent.nil.offers.map(({ id }) => id)).toEqual(NIL_OFFER_IDS);
    expect(offFieldContent.nil.offers.map(({ obligation }) => obligation.id)).toEqual(
      NIL_OBLIGATION_IDS,
    );
    expect(offFieldContent.nil.offers).toHaveLength(10);
    expect(
      Object.fromEntries(
        NIL_CATEGORY_IDS.map((categoryId) => [
          categoryId,
          offFieldContent.nil.offers.filter((offer) => offer.categoryId === categoryId).length,
        ]),
      ),
    ).toEqual(Object.fromEntries(NIL_CATEGORY_IDS.map((categoryId) => [categoryId, 2])));
    expect(validateContent({ manifest: contentManifest, localeResources: localeMessages })).toEqual(
      {
        issues: [],
        ok: true,
      },
    );

    const definitions = [
      ...offFieldContent.relationships.actors,
      ...offFieldContent.relationships.sources,
      ...offFieldContent.academics.statuses,
      ...offFieldContent.academics.checkpoints,
      ...offFieldContent.benefits,
      ...offFieldContent.nil.categories,
      ...offFieldContent.nil.offers,
      ...offFieldContent.nil.offers.map(({ obligation }) => obligation),
      ...offFieldContent.offseason.coachChanges,
      ...offFieldContent.offseason.projectionFactors,
      ...offFieldContent.offseason.confidenceTiers,
    ];
    for (const definition of definitions) {
      for (const locale of ['ko-KR', 'en-US'] as const) {
        const messages = localeMessages[locale] as Readonly<Record<string, string>>;
        expect(messages[definition.nameKey], `${locale}:${definition.id}:name`).toBeTruthy();
        expect(
          messages[definition.descriptionKey],
          `${locale}:${definition.id}:description`,
        ).toBeTruthy();
      }
    }
  });

  it('keeps every controlled mechanics ID aligned with game-core and validates the projection', () => {
    expect(RELATIONSHIP_ACTOR_IDS).toEqual(CORE_RELATIONSHIP_ACTOR_IDS);
    expect(RELATIONSHIP_CONTEXT_TAG_IDS).toEqual(CORE_RELATIONSHIP_CONTEXT_TAG_IDS);
    expect(RELATIONSHIP_SOURCE_IDS).toEqual(CORE_RELATIONSHIP_SOURCE_IDS);
    expect(ACADEMIC_STATUS_IDS).toEqual(CORE_ACADEMIC_STATUS_IDS);
    expect(ACADEMIC_CHECKPOINT_IDS).toEqual(CORE_ACADEMIC_CHECKPOINT_IDS);
    expect(OFF_FIELD_BENEFIT_IDS).toEqual(CORE_OFF_FIELD_BENEFIT_IDS);
    expect(NIL_CATEGORY_IDS).toEqual(CORE_NIL_CATEGORY_IDS);
    expect(NIL_OBLIGATION_TYPE_IDS).toEqual(CORE_NIL_OBLIGATION_TYPE_IDS);
    expect(OFFSEASON_COACH_CHANGE_IDS).toEqual(CORE_OFFSEASON_COACH_CHANGE_IDS);
    expect(TRANSFER_PROJECTION_FACTOR_IDS).toEqual(CORE_TRANSFER_PROJECTION_FACTOR_IDS);
    expect(TRANSFER_CONFIDENCE_TIER_IDS).toEqual(CORE_TRANSFER_CONFIDENCE_TIER_IDS);
    expect(isOffFieldMechanicsCatalog(offFieldMechanicsCatalog)).toBe(true);
    expect(offFieldMechanicsCatalog.relationshipWeeklyRules).toHaveLength(4);

    const malformed = jsonClone(offFieldMechanicsCatalog) as unknown as {
      nilOffers: Array<{ obligation: { focusCost: number } }>;
    };
    malformed.nilOffers[0]!.obligation.focusCost = 0;
    expect(isOffFieldMechanicsCatalog(malformed)).toBe(false);
  });

  it('makes academics and each relationship track legible through bounded football consequences', () => {
    expect(offFieldContent.academics.tuning).toEqual({
      model: 'academic_v1',
      eligibleGpaMilli: 2_300,
      warningGpaMilli: 2_000,
      restrictionGames: 1,
    });
    expect(
      offFieldContent.academics.checkpoints.map(({ id, weekIndex }) => ({ id, weekIndex })),
    ).toEqual([
      { id: 'academic_checkpoint_midterm', weekIndex: 5 },
      { id: 'academic_checkpoint_final', weekIndex: 11 },
    ]);
    for (const actor of offFieldContent.relationships.actors) {
      expect(actor.lowThreshold).toBeLessThan(actor.initialValue);
      expect(actor.initialValue).toBeLessThan(actor.highThreshold);
      expect(
        actor.coachTrustWeightPermille +
          actor.informationWeightPermille +
          actor.opportunityWeightPermille,
      ).toBe(1_000);
    }
  });

  it('limits NIL to bounded funds/benefits/state tradeoffs and never exposes rating, role, or depth effects', () => {
    for (const offer of offFieldContent.nil.offers) {
      expect(offer.expirationWeeks).toBeGreaterThanOrEqual(1);
      expect(offer.obligation.focusCost).toBeGreaterThanOrEqual(1);
      expect(offer.requirements.programStrengthBandIds.length).toBeGreaterThan(0);
      const serializedEffects = JSON.stringify([
        ...offer.rewardEffects,
        ...offer.obligation.weeklyEffects,
        ...offer.obligation.defaultEffects,
      ]);
      expect(serializedEffects).not.toMatch(/attribute|rating|depth_rank|role/iu);
      expect(
        offer.rewardEffects.some(
          (effect) =>
            effect.type === 'nil_benefit_grant' ||
            effect.type === 'nil_funds_delta_usd' ||
            (effect.type === 'nil_integer_state_delta' && effect.stateId === 'nil_state_brand'),
        ),
      ).toBe(true);
    }
  });

  it('defines Stay plus three-offer comparison inputs with weighted factors and ordered uncertainty', () => {
    expect(offFieldContent.offseason.tuning).toEqual({
      model: 'offseason_v1',
      advisorInsightInformationBonus: 20,
      brandInformationDivisor: 4,
      neutralTransferDepthRank: 4,
      pressureMaximumInclusive: 12,
      pressurePointsPerDepthRank: 6,
      transferShortlistSize: 3,
      stayFamiliarityBonus: 8,
      transferCoachTrustRetentionPermille: 250,
      transferFamiliarityScore: 20,
      transferInformationBaseScore: 30,
      relationshipResetValue: 50,
    });
    expect(
      offFieldContent.offseason.projectionFactors.reduce(
        (total, factor) => total + factor.weightPermille,
        0,
      ),
    ).toBe(1_000);
    expect(
      offFieldContent.offseason.coachChanges.reduce((sum, change) => sum + change.weight, 0),
    ).toBe(1_000);
    expect(
      offFieldContent.offseason.confidenceTiers.map(
        ({ minimumInformationScore, uncertaintyPoints }) => ({
          minimumInformationScore,
          uncertaintyPoints,
        }),
      ),
    ).toEqual([
      { minimumInformationScore: 70, uncertaintyPoints: 4 },
      { minimumInformationScore: 40, uncertaintyPoints: 8 },
      { minimumInformationScore: 0, uncertaintyPoints: 14 },
    ]);
  });

  it('rejects unknown NIL tags, absent tradeoffs, and unbalanced projection catalogs', () => {
    const unknownTag = jsonClone(contentManifest) as unknown as {
      offField: { nil: { offers: Array<{ requirements: { requiredTagIds: string[] } }> } };
    };
    unknownTag.offField.nil.offers[0]!.requirements.requiredTagIds = ['tag_not_authored'];
    expect(
      expectIssues(validateContent({ manifest: unknownTag, localeResources: localeMessages })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-reference',
        contentId: NIL_OFFER_IDS[0],
      }),
    );

    const noTradeoff = jsonClone(contentManifest);
    noTradeoff.offField.nil.offers[0]!.obligation.weeklyEffects = [
      { type: 'nil_integer_state_delta', stateId: 'nil_state_brand', delta: 1 },
    ];
    expect(
      expectIssues(validateContent({ manifest: noTradeoff, localeResources: localeMessages })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-mechanics',
        contentId: NIL_OFFER_IDS[0],
        path: 'manifest.offField.nil.offers.0.obligation.weeklyEffects',
      }),
    );

    const unbalanced = jsonClone(contentManifest);
    unbalanced.offField.offseason.projectionFactors[0]!.weightPermille += 1;
    expect(
      expectIssues(validateContent({ manifest: unbalanced, localeResources: localeMessages })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'content.invalid-mechanics',
        path: 'manifest.offField.offseason.projectionFactors',
      }),
    );
  });

  it('rejects a one-locale off-field reference through the aggregate locale/content gate', () => {
    const resources = {
      'ko-KR': { ...localeMessages['ko-KR'] },
      'en-US': { ...localeMessages['en-US'] },
    } as Record<'ko-KR' | 'en-US', Record<string, string>>;
    delete resources['en-US'][offFieldContent.nil.offers[0]!.nameKey];
    const issues = expectIssues(
      validateContent({ manifest: contentManifest, localeResources: resources }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'content.missing-localization-reference',
        locale: 'en-US',
        messageKey: offFieldContent.nil.offers[0]!.nameKey,
      }),
    );
  });
});
