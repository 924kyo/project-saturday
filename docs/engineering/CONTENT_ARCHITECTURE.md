# Content Architecture

## Principle

Mechanics and localized copy are separate but cross-validated.

## Stable IDs

Examples:

- `program_gulf_state`
- `skill_gym_rat_a`
- `event_wr_room_tension_v1`
- `background_small_town_star`
- `personality_competitive`

IDs are never localized and should remain stable after shipping.

## Data format

Use TypeScript data modules or validated JSON/YAML according to bootstrap preference. Whichever is selected:

- Zod or equivalent schemas validate at build/test time;
- cross-reference validation is mandatory;
- content loading is deterministic;
- locale copy uses keys, not inline mixed mechanics.

## Skill definition concept

```ts
interface SkillDefinition {
  id: SkillId;
  grade: 'C' | 'B' | 'A' | 'S';
  family: SkillFamily;
  tags: string[];
  positionEligibility: PositionId[] | 'common';
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  effects: SkillEffect[];
}
```

## Event definition concept

```ts
interface EventDefinition {
  id: EventId;
  tags: string[];
  requirements: EventRequirements;
  weight: number;
  cooldownWeeks?: number;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  choices: EventChoiceDefinition[];
}
```

## Program definition concept

```ts
interface ProgramDefinition {
  id: ProgramId;
  nameKey: MessageKey;
  shortNameKey: MessageKey;
  region: RegionId;
  ratings: ProgramRatings;
  traits: ProgramTraitId[];
  recruitingHotbeds: RegionId[];
  rivals: ProgramId[];
  offenseStyle: OffenseStyleId;
  defenseStyle: DefenseStyleId;
}
```

The M3 implementation extends this concept with strict nine-rating profiles, program strength band, recruiting interest by recruit tier, initial trust opportunity, room talent/readiness/form parameters, rotation policy, and mechanics-only projections. Localized definitions remain in the catalog; game-core receives projections containing stable IDs and numeric mechanics only.

The M4 catalog adds opponent rating projections, key-snap families/decisions, coverage/leverage clues, patterns, and fixed-point game tuning. Its exported mechanics projections deliberately omit `nameKey` and `descriptionKey`; localized catalog definitions remain available to presentation. M5 manifest schema version 5 adds the season calendar, aggregate/schedule-strength profiles, standings order, postseason configuration, and outcome catalog. Schema version 6 adds strict event definitions, choices, eligibility predicates, supported effects, selection tuning, and the current 57-event catalog. Schema version 7 adds the injury tuning, eight fictional outcome definitions, two player choices, and the completed 40-card skill catalog's bounded injury-risk effect. M6 schema version 8 adds strict academics, relationships, bounded benefits, ten NIL offer/obligation templates, coach/scheme outcomes, and uncertainty-aware transfer comparison factors. Content compatibility remains version 1. Cross-validation binds season projections to M4 opponent ratings and the 12-program rivalry graph; event validation binds requirement tags to creation, runtime, program-trait, or derived equipped-skill sources and enforces the 50–70/category-density contract; skill validation enforces the exact family split, offer reachability, live effect support, and tradeoff registry; injury validation requires all four severity bands, a universally reachable low-risk outcome, bounded availability/duration/opportunity mechanics, and both locales for every outcome and choice. Off-field validation enforces canonical core/content IDs, exactly two offers in each of five categories, reachable tag references, bounded non-power-purchase effects, visible obligation/default tradeoffs, 1,000-permille coach and transfer weights, ordered uncertainty, and paired Korean/English copy.

## Validators

M7 current-only weekly skill supplements live in `content/position-skill-builds.ts`, separate from literal historical schema-9 card payloads. They reference existing card IDs/position/family/grade, shared effect definitions, authored current focus tags, and paired supplemental description keys. `validateShippedContent` combines the historical manifest validator with the supplemental validator; the content gate also checks exact coverage, references, supported effect parameters, both locale descriptions, and live focus/recovery consequences. Authoring an off-field hook does not count as activating its port.

`pnpm test:content` should eventually detect:

- duplicate IDs;
- unknown references;
- missing localization in either locale;
- invalid requirements;
- impossible grade/value ranges;
- invalid effect parameters;
- duplicate event choices;
- dangling rivals/relationships;
- unsupported position references.
- key-snap family/decision/clue/pattern cardinality and canonical order;
- mismatched hidden-context clues or unreachable family choices;
- non-reversing best choices, invalid fixed-point totals, or invalid role-opportunity bounds.
