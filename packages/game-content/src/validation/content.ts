import { contentManifest } from '../content/index.js';
import { SUPPORTED_LOCALES, localeMessages } from '../locales/index.js';
import { contentManifestSchema } from '../schema/content.js';
import { SKILL_BEHAVIOR_TAG_IDS } from '../schema/skills.js';
import { validateLocalizationResources } from './localization.js';
import { toValidationResult, type ValidationIssue, type ValidationResult } from './types.js';
import type { LocalizationResourcesInput } from './localization.js';

interface IndexedLocalizedDefinition {
  readonly definition: {
    readonly descriptionKey: string;
    readonly id: string;
    readonly nameKey: string;
  };
  readonly path: string;
}

export interface ContentValidationInput {
  readonly localeResources: LocalizationResourcesInput;
  readonly manifest: unknown;
}

export class ContentValidationError extends Error {
  public readonly issues: readonly ValidationIssue[];

  public constructor(issues: readonly ValidationIssue[]) {
    super(
      [
        'Content validation failed:',
        ...issues.map((issue) => `- ${issue.path}: ${issue.message}`),
      ].join('\n'),
    );
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

export function validateContent(input: ContentValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const localizationResult = validateLocalizationResources(input.localeResources);
  if (!localizationResult.ok) {
    issues.push(...localizationResult.issues);
  }

  const parsedManifest = contentManifestSchema.safeParse(input.manifest);
  if (!parsedManifest.success) {
    for (const schemaIssue of parsedManifest.error.issues) {
      const suffix = schemaIssue.path.map(String).join('.');
      const path = suffix.length === 0 ? 'manifest' : `manifest.${suffix}`;
      issues.push({
        code: 'content.invalid-schema',
        message: schemaIssue.message,
        path,
      });
    }

    return toValidationResult(issues);
  }

  const indexedDefinitions: IndexedLocalizedDefinition[] = [
    ...parsedManifest.data.definitions.map((definition, index) => ({
      definition,
      path: `manifest.definitions.${index}`,
    })),
    ...parsedManifest.data.creation.wrArchetypes.map((definition, index) => ({
      definition,
      path: `manifest.creation.wrArchetypes.${index}`,
    })),
    ...parsedManifest.data.creation.recruitingBackgrounds.map((definition, index) => ({
      definition,
      path: `manifest.creation.recruitingBackgrounds.${index}`,
    })),
    ...parsedManifest.data.creation.personalityTraits.map((definition, index) => ({
      definition,
      path: `manifest.creation.personalityTraits.${index}`,
    })),
    ...parsedManifest.data.weeklyActions.map((definition, index) => ({
      definition,
      path: `manifest.weeklyActions.${index}`,
    })),
    ...parsedManifest.data.skills.map((definition, index) => ({
      definition,
      path: `manifest.skills.${index}`,
    })),
  ];

  const firstPathById = new Map<string, string>();

  function validateLocalizationReference(
    contentId: string,
    messageKey: string,
    path: string,
  ): void {
    for (const locale of SUPPORTED_LOCALES) {
      const messages = input.localeResources[locale];
      const value = messages?.[messageKey];
      if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push({
          code: 'content.missing-localization-reference',
          contentId,
          locale,
          message: `Content ID ${contentId} references unavailable key ${messageKey} in ${locale}.`,
          messageKey,
          path,
        });
      }
    }
  }

  for (const { definition, path } of indexedDefinitions) {
    const firstPath = firstPathById.get(definition.id);
    if (firstPath !== undefined) {
      issues.push({
        code: 'content.duplicate-id',
        contentId: definition.id,
        message: `Content ID ${definition.id} duplicates ${firstPath}.`,
        path: `${path}.id`,
      });
    } else {
      firstPathById.set(definition.id, path);
    }

    const references = [
      ['descriptionKey', definition.descriptionKey],
      ['nameKey', definition.nameKey],
    ] as const;

    for (const [field, messageKey] of references) {
      validateLocalizationReference(definition.id, messageKey, `${path}.${field}`);
    }
  }

  for (const [index, skill] of parsedManifest.data.skills.entries()) {
    validateLocalizationReference(
      skill.id,
      skill.familyNameKey,
      `manifest.skills.${index}.familyNameKey`,
    );
    validateLocalizationReference(
      skill.id,
      skill.gradeNameKey,
      `manifest.skills.${index}.gradeNameKey`,
    );
  }

  for (const [field, category] of Object.entries(parsedManifest.data.creation.appearanceCatalog)) {
    const categoryPath = `manifest.creation.appearanceCatalog.${field}`;
    const categoryId = `appearance_category_${field.replaceAll(/([A-Z])/gu, '_$1').toLowerCase()}`;
    validateLocalizationReference(categoryId, category.labelKey, `${categoryPath}.labelKey`);

    for (const [index, option] of category.options.entries()) {
      const optionPath = `${categoryPath}.options.${index}`;
      const optionId = option.id ?? `${categoryId}_none`;
      if (option.id !== null) {
        const firstPath = firstPathById.get(option.id);
        if (firstPath !== undefined) {
          issues.push({
            code: 'content.duplicate-id',
            contentId: option.id,
            message: `Content ID ${option.id} duplicates ${firstPath}.`,
            path: `${optionPath}.id`,
          });
        } else {
          firstPathById.set(option.id, optionPath);
        }
      }
      validateLocalizationReference(optionId, option.nameKey, `${optionPath}.nameKey`);
    }
  }

  for (const [field, range] of Object.entries(parsedManifest.data.creation.bodyMeasurements)) {
    validateLocalizationReference(
      `appearance_measurement_${field.replaceAll(/([A-Z])/gu, '_$1').toLowerCase()}`,
      range.labelKey,
      `manifest.creation.bodyMeasurements.${field}.labelKey`,
    );
  }

  const personalities = parsedManifest.data.creation.personalityTraits;
  const personalityById = new Map<string, (typeof personalities)[number]>(
    personalities.map((trait) => [trait.id, trait]),
  );
  for (const [index, trait] of personalities.entries()) {
    const seenIncompatibleTraitIds = new Set<string>();
    for (const [referenceIndex, incompatibleTraitId] of trait.incompatibleTraitIds.entries()) {
      const path = `manifest.creation.personalityTraits.${index}.incompatibleTraitIds.${referenceIndex}`;
      if (seenIncompatibleTraitIds.has(incompatibleTraitId)) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: trait.id,
          message: `Personality ${trait.id} repeats incompatible personality ${incompatibleTraitId}.`,
          path,
        });
        continue;
      }
      seenIncompatibleTraitIds.add(incompatibleTraitId);

      if (incompatibleTraitId === trait.id) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: trait.id,
          message: `Personality ${trait.id} cannot be incompatible with itself.`,
          path,
        });
        continue;
      }

      const incompatibleTrait = personalityById.get(incompatibleTraitId);
      if (incompatibleTrait === undefined) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: trait.id,
          message: `Personality ${trait.id} references unknown personality ${incompatibleTraitId}.`,
          path,
        });
        continue;
      }

      if (!incompatibleTrait.incompatibleTraitIds.includes(trait.id)) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: trait.id,
          message: `Personality incompatibility ${trait.id} -> ${incompatibleTraitId} must be symmetric.`,
          path,
        });
      }
    }
  }

  const weeklyActionIds = new Set(parsedManifest.data.weeklyActions.map(({ id }) => id));
  const weeklyActionTags = new Set(parsedManifest.data.weeklyActions.flatMap(({ tags }) => tags));
  const reachableAffinityTags = new Set<string>(weeklyActionTags);
  if (parsedManifest.data.weeklyActions.length > 0) {
    reachableAffinityTags.add(SKILL_BEHAVIOR_TAG_IDS[0]);
  }
  if (
    parsedManifest.data.weeklyActions.filter(({ tags }) => tags.includes('action_family_training'))
      .length >= 3
  ) {
    reachableAffinityTags.add(SKILL_BEHAVIOR_TAG_IDS[1]);
  }
  if (
    weeklyActionIds.has('action_study_hall') &&
    parsedManifest.data.weeklyActions.some(({ tags }) => tags.includes('action_family_training'))
  ) {
    reachableAffinityTags.add(SKILL_BEHAVIOR_TAG_IDS[2]);
  }
  const grantedPlayerTags = new Set(
    [
      ...parsedManifest.data.creation.wrArchetypes,
      ...parsedManifest.data.creation.recruitingBackgrounds,
      ...parsedManifest.data.creation.personalityTraits,
    ].flatMap(({ grantedTagIds }) => grantedTagIds),
  );

  for (const [skillIndex, skill] of parsedManifest.data.skills.entries()) {
    for (const [ruleIndex, rule] of skill.behaviorWeightRules.entries()) {
      if (!reachableAffinityTags.has(rule.affinityTagId)) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: skill.id,
          message: `Skill ${skill.id} uses unreachable affinity tag ${rule.affinityTagId}.`,
          path: `manifest.skills.${skillIndex}.behaviorWeightRules.${ruleIndex}.affinityTagId`,
        });
      }
    }

    for (const [field, tagIds] of [
      ['requiredPlayerTagIds', skill.eligibility.requiredPlayerTagIds],
      ['excludedPlayerTagIds', skill.eligibility.excludedPlayerTagIds],
    ] as const) {
      for (const [tagIndex, tagId] of tagIds.entries()) {
        if (!grantedPlayerTags.has(tagId)) {
          issues.push({
            code: 'content.invalid-reference',
            contentId: skill.id,
            message: `Skill ${skill.id} references unavailable player tag ${tagId}.`,
            path: `manifest.skills.${skillIndex}.eligibility.${field}.${tagIndex}`,
          });
        }
      }
    }

    for (const [effectIndex, effect] of skill.effects.entries()) {
      if (effect.type === 'game_hook' || effect.type === 'passive_body_recovery_flat') {
        continue;
      }
      if (effect.scope.type === 'action_ids') {
        for (const [scopeIndex, actionId] of effect.scope.actionIds.entries()) {
          if (!weeklyActionIds.has(actionId)) {
            issues.push({
              code: 'content.invalid-reference',
              contentId: skill.id,
              message: `Skill ${skill.id} references unavailable weekly action ${actionId}.`,
              path: `manifest.skills.${skillIndex}.effects.${effectIndex}.scope.actionIds.${scopeIndex}`,
            });
          }
        }
      } else {
        for (const [scopeIndex, actionTagId] of effect.scope.actionTagIds.entries()) {
          if (!weeklyActionTags.has(actionTagId)) {
            issues.push({
              code: 'content.invalid-reference',
              contentId: skill.id,
              message: `Skill ${skill.id} references unavailable action tag ${actionTagId}.`,
              path: `manifest.skills.${skillIndex}.effects.${effectIndex}.scope.actionTagIds.${scopeIndex}`,
            });
          }
        }
      }
      if (
        effect.condition.type === 'previous_action_id' &&
        !weeklyActionIds.has(effect.condition.actionId)
      ) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: skill.id,
          message: `Skill ${skill.id} references unavailable previous action ${effect.condition.actionId}.`,
          path: `manifest.skills.${skillIndex}.effects.${effectIndex}.condition.actionId`,
        });
      }
    }
  }

  return toValidationResult(issues);
}

export function validateShippedContent(): ValidationResult {
  return validateContent({
    localeResources: localeMessages,
    manifest: contentManifest,
  });
}

export function assertValidContent(input: ContentValidationInput): void {
  const result = validateContent(input);
  if (!result.ok) {
    throw new ContentValidationError(result.issues);
  }
}

export function assertShippedContentIsValid(): void {
  const result = validateShippedContent();
  if (!result.ok) {
    throw new ContentValidationError(result.issues);
  }
}
