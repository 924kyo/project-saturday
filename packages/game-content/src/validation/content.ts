import { contentManifest } from '../content/index.js';
import { SUPPORTED_LOCALES, localeMessages } from '../locales/index.js';
import { contentManifestSchema } from '../schema/content.js';
import { SKILL_BEHAVIOR_TAG_IDS, SKILL_BREAKTHROUGH_SOURCE_IDS } from '../schema/skills.js';
import { PROGRAM_IDS, PROGRAM_STRENGTH_BAND_IDS, RECRUIT_TIER_IDS } from '../schema/programs.js';
import { WR_ARCHETYPE_IDS } from '../schema/creation.js';
import { REGULAR_SEASON_ROUND_IDS } from '../schema/seasons.js';
import { EVENT_CONTEXT_TAG_IDS } from '../schema/events.js';
import { validateLocalizationResources } from './localization.js';
import { validatePositionSkillBuilds } from './position-skill-builds.js';
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
    ...parsedManifest.data.positionAlpha.positions.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.positions.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.archetypes.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.archetypes.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.attributes.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.attributes.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.developmentFamilies.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.developmentFamilies.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.gameDecisionFamilies.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.gameDecisionFamilies.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.trainingActions.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.trainingActions.${index}`,
    })),
    ...parsedManifest.data.positionAlpha.trainingProficiencies.map((definition, index) => ({
      definition,
      path: `manifest.positionAlpha.trainingProficiencies.${index}`,
    })),
    {
      definition: parsedManifest.data.qbAlpha,
      path: 'manifest.qbAlpha',
    },
    ...parsedManifest.data.qbAlpha.decisions.map((definition, index) => ({
      definition,
      path: `manifest.qbAlpha.decisions.${index}`,
    })),
    ...parsedManifest.data.qbAlpha.clues.map((definition, index) => ({
      definition,
      path: `manifest.qbAlpha.clues.${index}`,
    })),
    ...parsedManifest.data.qbAlpha.patterns.map((definition, index) => ({
      definition,
      path: `manifest.qbAlpha.patterns.${index}`,
    })),
    ...parsedManifest.data.qbAlpha.skills.map((definition, index) => ({
      definition,
      path: `manifest.qbAlpha.skills.${index}`,
    })),
    ...parsedManifest.data.qbAlpha.events.flatMap((event, eventIndex) => [
      { definition: event, path: `manifest.qbAlpha.events.${eventIndex}` },
      ...event.choices.map((definition, choiceIndex) => ({
        definition,
        path: `manifest.qbAlpha.events.${eventIndex}.choices.${choiceIndex}`,
      })),
    ]),
    ...parsedManifest.data.qbAlpha.participationFeedback.map((definition, index) => ({
      definition,
      path: `manifest.qbAlpha.participationFeedback.${index}`,
    })),
    {
      definition: parsedManifest.data.rbAlpha,
      path: 'manifest.rbAlpha',
    },
    ...parsedManifest.data.rbAlpha.decisions.map((definition, index) => ({
      definition,
      path: `manifest.rbAlpha.decisions.${index}`,
    })),
    ...parsedManifest.data.rbAlpha.clues.map((definition, index) => ({
      definition,
      path: `manifest.rbAlpha.clues.${index}`,
    })),
    ...parsedManifest.data.rbAlpha.patterns.map((definition, index) => ({
      definition,
      path: `manifest.rbAlpha.patterns.${index}`,
    })),
    ...parsedManifest.data.rbAlpha.skills.map((definition, index) => ({
      definition,
      path: `manifest.rbAlpha.skills.${index}`,
    })),
    ...parsedManifest.data.rbAlpha.events.flatMap((event, eventIndex) => [
      { definition: event, path: `manifest.rbAlpha.events.${eventIndex}` },
      ...event.choices.map((definition, choiceIndex) => ({
        definition,
        path: `manifest.rbAlpha.events.${eventIndex}.choices.${choiceIndex}`,
      })),
    ]),
    ...parsedManifest.data.rbAlpha.participationFeedback.map((definition, index) => ({
      definition,
      path: `manifest.rbAlpha.participationFeedback.${index}`,
    })),
    { definition: parsedManifest.data.cbAlpha, path: 'manifest.cbAlpha' },
    ...parsedManifest.data.cbAlpha.decisions.map((definition, index) => ({
      definition,
      path: `manifest.cbAlpha.decisions.${index}`,
    })),
    ...parsedManifest.data.cbAlpha.clues.map((definition, index) => ({
      definition,
      path: `manifest.cbAlpha.clues.${index}`,
    })),
    ...parsedManifest.data.cbAlpha.patterns.map((definition, index) => ({
      definition,
      path: `manifest.cbAlpha.patterns.${index}`,
    })),
    ...parsedManifest.data.cbAlpha.skills.map((definition, index) => ({
      definition,
      path: `manifest.cbAlpha.skills.${index}`,
    })),
    ...parsedManifest.data.cbAlpha.events.flatMap((event, eventIndex) => [
      { definition: event, path: `manifest.cbAlpha.events.${eventIndex}` },
      ...event.choices.map((definition, choiceIndex) => ({
        definition,
        path: `manifest.cbAlpha.events.${eventIndex}.choices.${choiceIndex}`,
      })),
    ]),
    ...parsedManifest.data.cbAlpha.participationFeedback.map((definition, index) => ({
      definition,
      path: `manifest.cbAlpha.participationFeedback.${index}`,
    })),
    {
      definition: parsedManifest.data.worldAlpha,
      path: 'manifest.worldAlpha',
    },
    ...parsedManifest.data.worldAlpha.groups.map((definition, index) => ({
      definition,
      path: `manifest.worldAlpha.groups.${index}`,
    })),
    ...parsedManifest.data.worldAlpha.stagedPrograms.map((definition, index) => ({
      definition,
      path: `manifest.worldAlpha.stagedPrograms.${index}`,
    })),
    ...parsedManifest.data.weeklyActions.map((definition, index) => ({
      definition,
      path: `manifest.weeklyActions.${index}`,
    })),
    ...parsedManifest.data.skills.map((definition, index) => ({
      definition,
      path: `manifest.skills.${index}`,
    })),
    ...parsedManifest.data.programs.regions.map((definition, index) => ({
      definition,
      path: `manifest.programs.regions.${index}`,
    })),
    ...parsedManifest.data.programs.offenseStyles.map((definition, index) => ({
      definition,
      path: `manifest.programs.offenseStyles.${index}`,
    })),
    ...parsedManifest.data.programs.defenseStyles.map((definition, index) => ({
      definition,
      path: `manifest.programs.defenseStyles.${index}`,
    })),
    ...parsedManifest.data.programs.rotationPolicies.map((definition, index) => ({
      definition,
      path: `manifest.programs.rotationPolicies.${index}`,
    })),
    ...parsedManifest.data.programs.traits.map((definition, index) => ({
      definition,
      path: `manifest.programs.traits.${index}`,
    })),
    ...parsedManifest.data.programs.programs.map((definition, index) => ({
      definition,
      path: `manifest.programs.programs.${index}`,
    })),
    ...parsedManifest.data.games.decisionFamilies.map((definition, index) => ({
      definition,
      path: `manifest.games.decisionFamilies.${index}`,
    })),
    ...parsedManifest.data.games.decisions.map((definition, index) => ({
      definition,
      path: `manifest.games.decisions.${index}`,
    })),
    ...parsedManifest.data.games.clues.map((definition, index) => ({
      definition,
      path: `manifest.games.clues.${index}`,
    })),
    ...parsedManifest.data.games.patterns.map((definition, index) => ({
      definition,
      path: `manifest.games.patterns.${index}`,
    })),
    ...parsedManifest.data.games.participationFeedback.map((definition, index) => ({
      definition,
      path: `manifest.games.participationFeedback.${index}`,
    })),
    {
      definition: parsedManifest.data.season,
      path: 'manifest.season',
    },
    ...parsedManifest.data.season.campRounds.map((definition, index) => ({
      definition,
      path: `manifest.season.campRounds.${index}`,
    })),
    ...parsedManifest.data.season.regularSeasonRounds.map((definition, index) => ({
      definition,
      path: `manifest.season.regularSeasonRounds.${index}`,
    })),
    ...parsedManifest.data.season.postseason.rounds.map((definition, index) => ({
      definition,
      path: `manifest.season.postseason.rounds.${index}`,
    })),
    ...parsedManifest.data.season.postseason.outcomes.map((definition, index) => ({
      definition,
      path: `manifest.season.postseason.outcomes.${index}`,
    })),
    ...parsedManifest.data.events.events.map((definition, index) => ({
      definition,
      path: `manifest.events.events.${index}`,
    })),
    ...parsedManifest.data.events.events.flatMap((event, eventIndex) =>
      event.choices.map((definition, choiceIndex) => ({
        definition,
        path: `manifest.events.events.${eventIndex}.choices.${choiceIndex}`,
      })),
    ),
    ...parsedManifest.data.injuries.outcomes.map((definition, index) => ({
      definition,
      path: `manifest.injuries.outcomes.${index}`,
    })),
    ...parsedManifest.data.injuries.choices.map((definition, index) => ({
      definition,
      path: `manifest.injuries.choices.${index}`,
    })),
    ...parsedManifest.data.offField.relationships.actors.map((definition, index) => ({
      definition,
      path: `manifest.offField.relationships.actors.${index}`,
    })),
    ...parsedManifest.data.offField.relationships.sources.map((definition, index) => ({
      definition,
      path: `manifest.offField.relationships.sources.${index}`,
    })),
    ...parsedManifest.data.offField.academics.statuses.map((definition, index) => ({
      definition,
      path: `manifest.offField.academics.statuses.${index}`,
    })),
    ...parsedManifest.data.offField.academics.checkpoints.map((definition, index) => ({
      definition,
      path: `manifest.offField.academics.checkpoints.${index}`,
    })),
    ...parsedManifest.data.offField.benefits.map((definition, index) => ({
      definition,
      path: `manifest.offField.benefits.${index}`,
    })),
    ...parsedManifest.data.offField.nil.categories.map((definition, index) => ({
      definition,
      path: `manifest.offField.nil.categories.${index}`,
    })),
    ...parsedManifest.data.offField.nil.offers.flatMap((offer, index) => [
      { definition: offer, path: `manifest.offField.nil.offers.${index}` },
      {
        definition: offer.obligation,
        path: `manifest.offField.nil.offers.${index}.obligation`,
      },
    ]),
    ...parsedManifest.data.offField.offseason.coachChanges.map((definition, index) => ({
      definition,
      path: `manifest.offField.offseason.coachChanges.${index}`,
    })),
    ...parsedManifest.data.offField.offseason.projectionFactors.map((definition, index) => ({
      definition,
      path: `manifest.offField.offseason.projectionFactors.${index}`,
    })),
    ...parsedManifest.data.offField.offseason.confidenceTiers.map((definition, index) => ({
      definition,
      path: `manifest.offField.offseason.confidenceTiers.${index}`,
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

  validateLocalizationReference(
    parsedManifest.data.season.id,
    parsedManifest.data.season.standings.explanationKey,
    'manifest.season.standings.explanationKey',
  );

  for (const [index, program] of parsedManifest.data.worldAlpha.stagedPrograms.entries()) {
    validateLocalizationReference(
      program.id,
      program.shortNameKey,
      `manifest.worldAlpha.stagedPrograms.${index}.shortNameKey`,
    );
  }

  for (const [roundIndex, round] of parsedManifest.data.season.regularSeasonRounds.entries()) {
    for (const [fixtureIndex, fixture] of round.fixtures.entries()) {
      const path = `manifest.season.regularSeasonRounds.${roundIndex}.fixtures.${fixtureIndex}`;
      const firstPath = firstPathById.get(fixture.id);
      if (firstPath !== undefined) {
        issues.push({
          code: 'content.duplicate-id',
          contentId: fixture.id,
          message: `Content ID ${fixture.id} duplicates ${firstPath}.`,
          path: `${path}.id`,
        });
      } else {
        firstPathById.set(fixture.id, path);
      }
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

  const availableEventTagIds = new Set<string>([
    ...EVENT_CONTEXT_TAG_IDS,
    ...parsedManifest.data.creation.wrArchetypes.flatMap(({ grantedTagIds }) => grantedTagIds),
    ...parsedManifest.data.creation.recruitingBackgrounds.flatMap(
      ({ grantedTagIds }) => grantedTagIds,
    ),
    ...parsedManifest.data.creation.personalityTraits.flatMap(({ grantedTagIds }) => grantedTagIds),
  ]);

  const offField = parsedManifest.data.offField;
  const nilCategoryCounts = new Map(
    offField.nil.categories.map(({ id }) => [
      id,
      offField.nil.offers.filter(({ categoryId }) => categoryId === id).length,
    ]),
  );
  for (const [categoryId, count] of nilCategoryCounts) {
    if (count !== 2) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: categoryId,
        message: `The first NIL catalog requires exactly two offers in ${categoryId}; received ${count}.`,
        path: 'manifest.offField.nil.offers',
      });
    }
  }

  function isAdverseNilEffect(
    effect: (typeof offField.nil.offers)[number]['obligation']['weeklyEffects'][number],
  ): boolean {
    return (
      (effect.type === 'nil_integer_state_delta' && effect.delta < 0) ||
      (effect.type === 'nil_gpa_delta_milli' && effect.deltaMilli < 0) ||
      (effect.type === 'nil_funds_delta_usd' && effect.deltaUsd < 0) ||
      (effect.type === 'nil_relationship_delta' && effect.delta < 0)
    );
  }

  for (const [offerIndex, offer] of offField.nil.offers.entries()) {
    for (const [tagIndex, tagId] of offer.requirements.requiredTagIds.entries()) {
      if (!availableEventTagIds.has(tagId)) {
        invalidReference(
          offer.id,
          tagId,
          `manifest.offField.nil.offers.${offerIndex}.requirements.requiredTagIds.${tagIndex}`,
        );
      }
    }
    if (!offer.obligation.weeklyEffects.some(isAdverseNilEffect)) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: offer.id,
        message: `${offer.id} must carry a visible weekly tradeoff beyond its focus cost.`,
        path: `manifest.offField.nil.offers.${offerIndex}.obligation.weeklyEffects`,
      });
    }
    if (!offer.obligation.defaultEffects.some(isAdverseNilEffect)) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: offer.id,
        message: `${offer.id} must define a bounded adverse default consequence.`,
        path: `manifest.offField.nil.offers.${offerIndex}.obligation.defaultEffects`,
      });
    }
  }

  const checkpointWeeks = offField.academics.checkpoints.map(({ weekIndex }) => weekIndex);
  if (checkpointWeeks.some((week, index) => index > 0 && week <= checkpointWeeks[index - 1]!)) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: offField.id,
      message: 'Academic checkpoints must advance in canonical week order.',
      path: 'manifest.offField.academics.checkpoints',
    });
  }

  const projectionWeightTotal = offField.offseason.projectionFactors.reduce(
    (total, factor) => total + factor.weightPermille,
    0,
  );
  if (projectionWeightTotal !== 1_000) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: offField.id,
      message: `Transfer comparison weights must total 1,000 permille; received ${projectionWeightTotal}.`,
      path: 'manifest.offField.offseason.projectionFactors',
    });
  }

  const coachChangeWeightTotal = offField.offseason.coachChanges.reduce(
    (total, change) => total + change.weight,
    0,
  );
  if (coachChangeWeightTotal !== 1_000) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: offField.id,
      message: `Coach/scheme change weights must total 1,000; received ${coachChangeWeightTotal}.`,
      path: 'manifest.offField.offseason.coachChanges',
    });
  }

  const confidenceTiers = offField.offseason.confidenceTiers;
  if (
    confidenceTiers.some(
      (tier, index) =>
        index > 0 &&
        (tier.minimumInformationScore >= confidenceTiers[index - 1]!.minimumInformationScore ||
          tier.uncertaintyPoints <= confidenceTiers[index - 1]!.uncertaintyPoints),
    )
  ) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: offField.id,
      message:
        'Lower transfer-confidence tiers must require less information and expose more uncertainty.',
      path: 'manifest.offField.offseason.confidenceTiers',
    });
  }
  for (const [eventIndex, event] of parsedManifest.data.events.events.entries()) {
    for (const [requirementName, tagIds] of [
      ['allTagIds', event.requirements.allTagIds],
      ['anyTagIds', event.requirements.anyTagIds],
      ['excludedTagIds', event.requirements.excludedTagIds],
    ] as const) {
      for (const [tagIndex, tagId] of tagIds.entries()) {
        if (!availableEventTagIds.has(tagId)) {
          issues.push({
            code: 'content.invalid-reference',
            contentId: event.id,
            message: `${event.id} references unavailable event context tag ${tagId}.`,
            path: `manifest.events.events.${eventIndex}.requirements.${requirementName}.${tagIndex}`,
          });
        }
      }
    }

    const boundsByField = new Map<string, { lower: number; upper: number }>();
    for (const predicate of event.requirements.statePredicates) {
      const current = boundsByField.get(predicate.fieldId) ?? {
        lower: predicate.fieldId === 'event_state_depth_rank' ? 1 : 0,
        upper:
          predicate.fieldId === 'event_state_gpa_milli'
            ? 4_000
            : predicate.fieldId === 'event_state_depth_rank'
              ? 8
              : predicate.fieldId === 'event_state_week_index'
                ? 64
                : 100,
      };
      const next =
        predicate.operatorId === 'event_predicate_eq'
          ? { lower: predicate.value, upper: predicate.value }
          : predicate.operatorId === 'event_predicate_gte'
            ? { ...current, lower: Math.max(current.lower, predicate.value) }
            : { ...current, upper: Math.min(current.upper, predicate.value) };
      boundsByField.set(predicate.fieldId, next);
    }
    if ([...boundsByField.values()].some(({ lower, upper }) => lower > upper)) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: event.id,
        message: `${event.id} has mutually unsatisfiable state predicates.`,
        path: `manifest.events.events.${eventIndex}.requirements.statePredicates`,
      });
    }

    const requiredSeasonTags = event.requirements.allTagIds.filter((tagId) =>
      ['tag_season_camp', 'tag_season_regular', 'tag_season_postseason'].includes(tagId),
    );
    const requiredVenueTags = event.requirements.allTagIds.filter((tagId) =>
      ['tag_game_home', 'tag_game_away'].includes(tagId),
    );
    if (requiredSeasonTags.length > 1 || requiredVenueTags.length > 1) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: event.id,
        message: `${event.id} requires mutually exclusive context tags.`,
        path: `manifest.events.events.${eventIndex}.requirements.allTagIds`,
      });
    }
  }

  const eventCoverageGroups = [
    {
      categoryIds: ['event_category_wr', 'event_category_depth'],
      minimum: 15,
      name: 'football/depth',
    },
    {
      categoryIds: [
        'event_category_identity',
        'event_category_background',
        'event_category_personality',
      ],
      minimum: 10,
      name: 'identity/background/personality',
    },
    {
      categoryIds: ['event_category_program', 'event_category_game_week'],
      minimum: 10,
      name: 'program/game-context',
    },
  ] as const;
  for (const coverage of eventCoverageGroups) {
    const count = parsedManifest.data.events.events.filter((event) =>
      event.categoryIds.some((categoryId) =>
        (coverage.categoryIds as readonly string[]).includes(categoryId),
      ),
    ).length;
    if (count < coverage.minimum) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: parsedManifest.data.events.id,
        message: `Event catalog requires at least ${coverage.minimum} ${coverage.name} events; received ${count}.`,
        path: 'manifest.events.events',
      });
    }
  }

  const injurySeverities = new Set(
    parsedManifest.data.injuries.outcomes.map(({ severityId }) => severityId),
  );
  if (
    injurySeverities.size !== 4 ||
    !parsedManifest.data.injuries.outcomes.some(
      ({ minimumRiskPermille }) => minimumRiskPermille === 0,
    )
  ) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: parsedManifest.data.injuries.id,
      message:
        'Injury outcomes must cover all four severity bands and include a baseline-reachable outcome.',
      path: 'manifest.injuries.outcomes',
    });
  }
  const maximumRisk = parsedManifest.data.injuries.tuning.maximumRiskPermille;
  if (
    parsedManifest.data.injuries.outcomes.some(
      ({ minimumRiskPermille }) => minimumRiskPermille > maximumRisk,
    )
  ) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: parsedManifest.data.injuries.id,
      message: 'Every injury outcome must be reachable within the configured maximum risk.',
      path: 'manifest.injuries.outcomes',
    });
  }

  const nameTokenCatalogs = [
    ['rosterGivenNames', parsedManifest.data.programs.rosterGivenNames],
    ['rosterFamilyNames', parsedManifest.data.programs.rosterFamilyNames],
  ] as const;
  for (const [catalogName, tokens] of nameTokenCatalogs) {
    for (const [index, token] of tokens.entries()) {
      const path = `manifest.programs.${catalogName}.${index}`;
      const firstPath = firstPathById.get(token.id);
      if (firstPath !== undefined) {
        issues.push({
          code: 'content.duplicate-id',
          contentId: token.id,
          message: `Content ID ${token.id} duplicates ${firstPath}.`,
          path: `${path}.id`,
        });
      } else {
        firstPathById.set(token.id, path);
      }
      validateLocalizationReference(token.id, token.nameKey, `${path}.nameKey`);
    }
  }

  const programs = parsedManifest.data.programs.programs;
  const programById = new Map(programs.map((program) => [program.id, program]));
  const offenseStyleById = new Map(
    parsedManifest.data.programs.offenseStyles.map((style) => [style.id, style]),
  );
  const availableRegionIds = new Set(parsedManifest.data.programs.regions.map(({ id }) => id));
  const availableTraitIds = new Set(parsedManifest.data.programs.traits.map(({ id }) => id));
  const availableDefenseStyleIds = new Set(
    parsedManifest.data.programs.defenseStyles.map(({ id }) => id),
  );
  const availableRotationPolicyIds = new Set(
    parsedManifest.data.programs.rotationPolicies.map(({ id }) => id),
  );

  function invalidReference(contentId: string, reference: string, path: string): void {
    issues.push({
      code: 'content.invalid-reference',
      contentId,
      message: `${contentId} references unavailable content ${reference}.`,
      path,
    });
  }

  for (const [programIndex, program] of programs.entries()) {
    const path = `manifest.programs.programs.${programIndex}`;
    validateLocalizationReference(program.id, program.shortNameKey, `${path}.shortNameKey`);
    if (!availableRegionIds.has(program.regionId)) {
      invalidReference(program.id, program.regionId, `${path}.regionId`);
    }
    if (!offenseStyleById.has(program.offenseStyleId)) {
      invalidReference(program.id, program.offenseStyleId, `${path}.offenseStyleId`);
    }
    if (!availableDefenseStyleIds.has(program.defenseStyleId)) {
      invalidReference(program.id, program.defenseStyleId, `${path}.defenseStyleId`);
    }
    if (!availableRotationPolicyIds.has(program.rotationPolicyId)) {
      invalidReference(program.id, program.rotationPolicyId, `${path}.rotationPolicyId`);
    }
    for (const [index, regionId] of program.recruitingHotbedRegionIds.entries()) {
      if (!availableRegionIds.has(regionId)) {
        invalidReference(program.id, regionId, `${path}.recruitingHotbedRegionIds.${index}`);
      }
    }
    for (const [index, traitId] of program.traitIds.entries()) {
      if (!availableTraitIds.has(traitId)) {
        invalidReference(program.id, traitId, `${path}.traitIds.${index}`);
      }
    }
    for (const [index, rivalId] of program.rivalProgramIds.entries()) {
      const rival = programById.get(rivalId);
      const referencePath = `${path}.rivalProgramIds.${index}`;
      if (rival === undefined) {
        invalidReference(program.id, rivalId, referencePath);
      } else if (!rival.rivalProgramIds.includes(program.id)) {
        issues.push({
          code: 'content.invalid-reference',
          contentId: program.id,
          message: `Rivalry ${program.id} -> ${rivalId} must be reciprocal.`,
          path: referencePath,
        });
      }
    }
  }

  for (const bandId of PROGRAM_STRENGTH_BAND_IDS) {
    const bandCount = programs.filter(({ strengthBandId }) => strengthBandId === bandId).length;
    if (bandCount !== 4) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: bandId,
        message: `Vertical-slice strength band ${bandId} must contain exactly four programs.`,
        path: 'manifest.programs.programs',
      });
    }
  }
  for (
    let strongerIndex = 0;
    strongerIndex < PROGRAM_STRENGTH_BAND_IDS.length - 1;
    strongerIndex += 1
  ) {
    const strongerBandId = PROGRAM_STRENGTH_BAND_IDS[strongerIndex]!;
    const weakerBandId = PROGRAM_STRENGTH_BAND_IDS[strongerIndex + 1]!;
    const strongerPrograms = programs.filter(
      ({ strengthBandId }) => strengthBandId === strongerBandId,
    );
    const weakerPrograms = programs.filter(({ strengthBandId }) => strengthBandId === weakerBandId);
    const minimumStrongerRoom = Math.min(
      ...strongerPrograms.map(({ roomProfile }) => roomProfile.talentMean),
    );
    const maximumWeakerRoom = Math.max(
      ...weakerPrograms.map(({ roomProfile }) => roomProfile.talentMean),
    );
    if (minimumStrongerRoom <= maximumWeakerRoom) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: `${strongerBandId}:${weakerBandId}`,
        message: `Room strength must remain ordered between ${strongerBandId} and ${weakerBandId}.`,
        path: 'manifest.programs.programs',
      });
    }
    const maximumStrongerTrustBonus = Math.max(
      ...strongerPrograms.map(({ initialCoachTrustBonus }) => initialCoachTrustBonus),
    );
    const minimumWeakerTrustBonus = Math.min(
      ...weakerPrograms.map(({ initialCoachTrustBonus }) => initialCoachTrustBonus),
    );
    if (maximumStrongerTrustBonus >= minimumWeakerTrustBonus) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: `${strongerBandId}:${weakerBandId}`,
        message: `Initial trust opportunity must improve from ${strongerBandId} to ${weakerBandId}.`,
        path: 'manifest.programs.programs',
      });
    }
  }

  const season = parsedManifest.data.season;
  const gameProfileByProgramId = new Map(
    parsedManifest.data.games.opponentProfiles.map((profile) => [profile.programId, profile]),
  );
  const seasonProfileByProgramId = new Map(
    season.programProfiles.map((profile) => [profile.programId, profile]),
  );
  const scheduleOpponentsByProgramId = new Map(
    PROGRAM_IDS.map((programId) => [programId, [] as string[]]),
  );
  const homeCountByProgramId = new Map(PROGRAM_IDS.map((programId) => [programId, 0]));
  const appearanceCountByProgramId = new Map(PROGRAM_IDS.map((programId) => [programId, 0]));
  const firstElevenPairs = new Set<string>();
  const rivalryRoundPairs = new Set<string>();
  const pairId = (firstProgramId: string, secondProgramId: string) =>
    firstProgramId < secondProgramId
      ? `${firstProgramId}:${secondProgramId}`
      : `${secondProgramId}:${firstProgramId}`;

  for (const programId of PROGRAM_IDS) {
    const seasonProfile = seasonProfileByProgramId.get(programId);
    const gameProfile = gameProfileByProgramId.get(programId);
    if (seasonProfile === undefined) {
      invalidReference(season.id, programId, 'manifest.season.programProfiles');
      continue;
    }
    if (gameProfile === undefined) {
      invalidReference(season.id, programId, 'manifest.games.opponentProfiles');
      continue;
    }
    const expectedTeamRating = Math.round(
      (gameProfile.offenseRating + gameProfile.defenseRating + gameProfile.qbRating) / 3,
    );
    if (seasonProfile.teamRating !== expectedTeamRating) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: programId,
        message: `Season team rating for ${programId} must equal the rounded M4 aggregate rating ${expectedTeamRating}.`,
        path: 'manifest.season.programProfiles',
      });
    }
  }

  if (
    seasonProfileByProgramId.size !== PROGRAM_IDS.length ||
    gameProfileByProgramId.size !== PROGRAM_IDS.length
  ) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: season.id,
      message: 'Season and game aggregate profiles must each cover every program exactly once.',
      path: 'manifest.season.programProfiles',
    });
  }

  for (const [roundIndex, round] of season.regularSeasonRounds.entries()) {
    if (round.id !== REGULAR_SEASON_ROUND_IDS[roundIndex] || round.weekNumber !== roundIndex + 1) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: round.id,
        message: 'Regular-season rounds must remain in canonical ID and week order.',
        path: `manifest.season.regularSeasonRounds.${roundIndex}`,
      });
    }
    const seenPrograms = new Set<string>();
    for (const fixture of round.fixtures) {
      if (seenPrograms.has(fixture.homeProgramId) || seenPrograms.has(fixture.awayProgramId)) {
        issues.push({
          code: 'content.invalid-mechanics',
          contentId: round.id,
          message: `Every program must appear exactly once in ${round.id}.`,
          path: `manifest.season.regularSeasonRounds.${roundIndex}.fixtures`,
        });
      }
      seenPrograms.add(fixture.homeProgramId);
      seenPrograms.add(fixture.awayProgramId);
      homeCountByProgramId.set(
        fixture.homeProgramId,
        (homeCountByProgramId.get(fixture.homeProgramId) ?? 0) + 1,
      );
      for (const [programId, opponentId] of [
        [fixture.homeProgramId, fixture.awayProgramId],
        [fixture.awayProgramId, fixture.homeProgramId],
      ] as const) {
        appearanceCountByProgramId.set(
          programId,
          (appearanceCountByProgramId.get(programId) ?? 0) + 1,
        );
        scheduleOpponentsByProgramId.get(programId)?.push(opponentId);
      }
      const fixturePairId = pairId(fixture.homeProgramId, fixture.awayProgramId);
      if (roundIndex < 11) {
        if (firstElevenPairs.has(fixturePairId)) {
          issues.push({
            code: 'content.invalid-mechanics',
            contentId: fixture.id,
            message: 'The first eleven rounds must contain every program pairing exactly once.',
            path: `manifest.season.regularSeasonRounds.${roundIndex}.fixtures`,
          });
        }
        firstElevenPairs.add(fixturePairId);
        if (fixture.spotlight) {
          issues.push({
            code: 'content.invalid-mechanics',
            contentId: fixture.id,
            message: 'Only the authored rivalry round may carry the vertical-slice spotlight flag.',
            path: `manifest.season.regularSeasonRounds.${roundIndex}.fixtures`,
          });
        }
      } else {
        rivalryRoundPairs.add(fixturePairId);
        if (!fixture.spotlight) {
          issues.push({
            code: 'content.invalid-mechanics',
            contentId: fixture.id,
            message: 'Every rivalry-round fixture must carry the spotlight flag.',
            path: `manifest.season.regularSeasonRounds.${roundIndex}.fixtures`,
          });
        }
      }
    }
    if (seenPrograms.size !== PROGRAM_IDS.length) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: round.id,
        message: `${round.id} must cover all 12 programs exactly once.`,
        path: `manifest.season.regularSeasonRounds.${roundIndex}.fixtures`,
      });
    }
  }

  if (firstElevenPairs.size !== 66) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: season.id,
      message: 'The first eleven rounds must form a complete 66-pair round robin.',
      path: 'manifest.season.regularSeasonRounds',
    });
  }

  const expectedRivalryPairs = new Set(
    programs.flatMap((program) =>
      program.rivalProgramIds
        .filter((rivalId) => program.id < rivalId)
        .map((rivalId) => pairId(program.id, rivalId)),
    ),
  );
  if (
    expectedRivalryPairs.size !== 6 ||
    rivalryRoundPairs.size !== 6 ||
    [...expectedRivalryPairs].some((rivalryPairId) => !rivalryRoundPairs.has(rivalryPairId))
  ) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: season.regularSeasonRounds[11]?.id ?? season.id,
      message: 'Round 12 must contain exactly the six authored reciprocal rivalry pairs.',
      path: 'manifest.season.regularSeasonRounds.11.fixtures',
    });
  }

  for (const programId of PROGRAM_IDS) {
    if (
      appearanceCountByProgramId.get(programId) !== 12 ||
      homeCountByProgramId.get(programId) !== 6
    ) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: programId,
        message: `${programId} must play 12 games with exactly six home fixtures.`,
        path: 'manifest.season.regularSeasonRounds',
      });
    }
    const opponents = scheduleOpponentsByProgramId.get(programId) ?? [];
    const opponentRatings = opponents.flatMap((opponentId) => {
      const opponentProfile = seasonProfileByProgramId.get(
        opponentId as (typeof PROGRAM_IDS)[number],
      );
      return opponentProfile === undefined ? [] : [opponentProfile.teamRating];
    });
    const expectedScheduleStrength =
      opponentRatings.length === 0
        ? 0
        : Math.round(
            opponentRatings.reduce((total, rating) => total + rating, 0) / opponentRatings.length,
          );
    const seasonProfile = seasonProfileByProgramId.get(programId);
    if (
      seasonProfile !== undefined &&
      seasonProfile.scheduleStrength !== expectedScheduleStrength
    ) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: programId,
        message: `Schedule strength for ${programId} must equal the rounded authored opponent average ${expectedScheduleStrength}.`,
        path: 'manifest.season.programProfiles',
      });
    }
  }

  const finishCoverage = Array.from({ length: PROGRAM_IDS.length }, () => 0);
  for (const outcome of season.postseason.outcomes) {
    for (let finish = outcome.minimumFinish; finish <= outcome.maximumFinish; finish += 1) {
      finishCoverage[finish - 1] = (finishCoverage[finish - 1] ?? 0) + 1;
    }
  }
  if (finishCoverage.some((count) => count !== 1)) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: season.id,
      message: 'Season outcomes must cover finishes 1 through 12 exactly once.',
      path: 'manifest.season.postseason.outcomes',
    });
  }

  for (const archetypeId of WR_ARCHETYPE_IDS) {
    const fits = parsedManifest.data.programs.offenseStyles.map(
      ({ schemeFitByArchetype }) => schemeFitByArchetype[archetypeId],
    );
    if (Math.max(...fits) - Math.min(...fits) < 10) {
      issues.push({
        code: 'content.invalid-mechanics',
        contentId: archetypeId,
        message: `Offense styles must create a material Scheme Fit range for ${archetypeId}.`,
        path: 'manifest.programs.offenseStyles',
      });
    }
  }

  const recruitingOfferCount = parsedManifest.data.programs.recruitingConfig.offerCount;
  function recruitingShortlist(
    recruitTierId: (typeof RECRUIT_TIER_IDS)[number],
    archetypeId: (typeof WR_ARCHETYPE_IDS)[number],
  ) {
    return programs
      .flatMap((program) => {
        const interest = program.recruitingInterestByTier[recruitTierId];
        const style = offenseStyleById.get(program.offenseStyleId);
        return interest > 0 && style !== undefined
          ? [
              {
                id: program.id,
                priority: interest * 2 + style.schemeFitByArchetype[archetypeId],
                strengthBandId: program.strengthBandId,
              },
            ]
          : [];
      })
      .sort((left, right) =>
        right.priority === left.priority
          ? left.id < right.id
            ? -1
            : left.id > right.id
              ? 1
              : 0
          : right.priority - left.priority,
      )
      .slice(0, recruitingOfferCount);
  }

  const creation = parsedManifest.data.creation;
  const recruitingConfig = parsedManifest.data.programs.recruitingConfig;
  let identityCount = 0;
  for (const archetype of creation.wrArchetypes) {
    for (const background of creation.recruitingBackgrounds) {
      for (let firstIndex = 0; firstIndex < creation.personalityTraits.length; firstIndex += 1) {
        const firstTrait = creation.personalityTraits[firstIndex]!;
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < creation.personalityTraits.length;
          secondIndex += 1
        ) {
          const secondTrait = creation.personalityTraits[secondIndex]!;
          if (
            firstTrait.incompatibleTraitIds.includes(secondTrait.id) ||
            secondTrait.incompatibleTraitIds.includes(firstTrait.id)
          ) {
            continue;
          }
          identityCount += 1;
          const ratings: Record<string, number> = { ...creation.baseline.baseAttributeRatings };
          for (const profile of [archetype, background, firstTrait, secondTrait]) {
            for (const modifier of profile.attributeModifiers) {
              ratings[modifier.attributeId] = (ratings[modifier.attributeId] ?? 0) + modifier.delta;
            }
          }
          const recruitAbilityScore = Math.round(
            Object.entries(recruitingConfig.abilityWeightsPermille).reduce(
              (total, [attributeId, weight]) => total + (ratings[attributeId] ?? 0) * weight,
              0,
            ) / 1_000,
          );
          const recruitScore = Math.min(
            100,
            Math.max(0, recruitAbilityScore + recruitingConfig.backgroundModifiers[background.id]),
          );
          const recruitTierId =
            recruitScore >= recruitingConfig.tierThresholds.nationalMinScore
              ? RECRUIT_TIER_IDS[0]
              : recruitScore >= recruitingConfig.tierThresholds.priorityMinScore
                ? RECRUIT_TIER_IDS[1]
                : RECRUIT_TIER_IDS[2];
          const shortlist = recruitingShortlist(recruitTierId, archetype.id);
          const identityId = [archetype.id, background.id, firstTrait.id, secondTrait.id].join(':');
          if (
            shortlist.length !== recruitingConfig.offerCount ||
            new Set(shortlist.map(({ id }) => id)).size !== recruitingConfig.offerCount
          ) {
            issues.push({
              code: 'content.invalid-mechanics',
              contentId: identityId,
              message: `Creation identity ${identityId} must yield five distinct eligible programs.`,
              path: 'manifest.programs.programs',
            });
          } else if (new Set(shortlist.map(({ strengthBandId }) => strengthBandId)).size < 2) {
            issues.push({
              code: 'content.invalid-mechanics',
              contentId: identityId,
              message: `Creation identity ${identityId} must receive offers from at least two strength bands.`,
              path: 'manifest.programs.programs',
            });
          }
        }
      }
    }
  }
  if (identityCount !== 390) {
    issues.push({
      code: 'content.invalid-mechanics',
      contentId: 'creation_identity_matrix',
      message: `Expected 390 valid vertical-slice creation identities, received ${identityCount}.`,
      path: 'manifest.creation',
    });
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
  for (const sourceId of SKILL_BREAKTHROUGH_SOURCE_IDS) {
    reachableAffinityTags.add(sourceId);
  }
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
      if (
        effect.type === 'game_hook' ||
        effect.type === 'life_hook' ||
        effect.type === 'passive_body_recovery_flat' ||
        effect.type === 'injury_risk_multiplier'
      ) {
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
  const base = validateContent({
    localeResources: localeMessages,
    manifest: contentManifest,
  });
  return toValidationResult([
    ...base.issues,
    ...validatePositionSkillBuilds(localeMessages).issues,
  ]);
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
