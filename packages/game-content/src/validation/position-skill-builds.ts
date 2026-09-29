import {
  isSkillMechanicsDefinition,
  isWeeklyActionTagId,
  isPositionSkillOfferDefinitionV2,
} from '@project-saturday/game-core';
import { positionSkillOffers } from '../content/position-skill-offers.js';
import { positionSkillBuilds, positionSkillActionTags } from '../content/position-skill-builds.js';
import { qbAlphaSkills } from '../content/qb-alpha.js';
import { rbAlphaSkills } from '../content/rb-alpha.js';
import { cbAlphaSkills } from '../content/cb-alpha.js';
import {
  COMMON_POSITION_FOCUS_IDS,
  POSITION_TRAINING_ACTION_IDS,
} from '@project-saturday/game-core';
import { toValidationResult, type ValidationIssue } from './types.js';
import type { LocalizationResourcesInput } from './localization.js';

/** Supplement catalog is current-only; historical schema-9 card payloads stay literal. */
export function validatePositionSkillBuilds(
  localeResources: LocalizationResourcesInput,
  builds: readonly {
    readonly skillId: string;
    readonly positionId: string;
    readonly descriptionKey: string;
    readonly mechanics: unknown;
  }[] = positionSkillBuilds,
  actionTags: Readonly<Record<string, readonly string[]>> = positionSkillActionTags,
  offers: readonly unknown[] = positionSkillOffers,
) {
  const issues: ValidationIssue[] = [];
  const cards = [...qbAlphaSkills, ...rbAlphaSkills, ...cbAlphaSkills];
  const offerIds = new Set<string>();
  for (const [index, offer] of offers.entries()) {
    const card = isPositionSkillOfferDefinitionV2(offer)
      ? cards.find(({ id }) => id === offer.id)
      : undefined;
    if (
      !isPositionSkillOfferDefinitionV2(offer) ||
      card === undefined ||
      offerIds.has(offer.id) ||
      card.positionId !== offer.positionId ||
      card.familyId !== offer.familyId ||
      card.gradeId !== offer.gradeId ||
      offer.sourceId !== card.familyId.replace('skill_family_', 'breakthrough_source_')
    ) {
      issues.push({
        code: 'content.invalid-schema',
        path: `positionSkillOffers.${index}`,
        message:
          'Current offers must retain original card identity and valid family affinity weights.',
      });
    } else offerIds.add(offer.id);
  }
  if (offerIds.size !== cards.length)
    issues.push({
      code: 'content.invalid-reference',
      path: 'positionSkillOffers',
      message: 'Current offer metadata must cover every authored position card exactly once.',
    });
  const expectedActions = [...COMMON_POSITION_FOCUS_IDS, ...POSITION_TRAINING_ACTION_IDS];
  if (
    Object.keys(actionTags).sort().join('|') !== [...expectedActions].sort().join('|') ||
    Object.values(actionTags).some(
      (tags) =>
        tags.length === 0 ||
        tags.some((tag) => !isWeeklyActionTagId(tag)) ||
        new Set(tags).size !== tags.length,
    )
  )
    issues.push({
      code: 'content.invalid-reference',
      path: 'positionSkillBuilds.actionTags',
      message: 'Current skill tags must cover each authored focus exactly once.',
    });
  const availableTags = new Set(Object.values(actionTags).flat());
  const seen = new Set<string>();
  for (const [index, build] of builds.entries()) {
    const path = `positionSkillBuilds.${index}`;
    const card = cards.find(({ id }) => id === build.skillId);
    if (seen.has(build.skillId))
      issues.push({
        code: 'content.duplicate-id',
        path,
        contentId: build.skillId,
        message: 'Duplicate current skill supplement.',
      });
    seen.add(build.skillId);
    const definition = build.mechanics;
    if (
      !isSkillMechanicsDefinition(definition) ||
      card === undefined ||
      card.positionId !== build.positionId ||
      definition.id !== build.skillId ||
      definition.gradeId !== card.gradeId ||
      definition.familyId !== card.familyId ||
      definition.eligibility.positionIds.length !== 1 ||
      definition.eligibility.positionIds[0] !== build.positionId
    ) {
      issues.push({
        code: 'content.invalid-schema',
        path,
        contentId: build.skillId,
        message:
          'Supplement must preserve the existing card identity and validate shared mechanics.',
      });
      continue;
    }
    for (const effect of definition.effects) {
      if (!('scope' in effect)) continue;
      const valid =
        effect.scope.type === 'action_ids'
          ? effect.scope.actionIds.every((id) => expectedActions.some((action) => action === id))
          : effect.scope.actionTagIds.every((id) => availableTags.has(id));
      if (!valid)
        issues.push({
          code: 'content.invalid-reference',
          path,
          contentId: build.skillId,
          message: 'Supplement scope references an unavailable current focus/tag.',
        });
    }
    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages = localeResources[locale];
      const message = messages?.[build.descriptionKey];
      if (typeof message !== 'string' || message.trim().length === 0)
        issues.push({
          code: 'content.invalid-reference',
          path,
          locale,
          messageKey: build.descriptionKey,
          message: 'Current skill supplement needs both localized descriptions.',
        });
    }
  }
  return toValidationResult(issues);
}
