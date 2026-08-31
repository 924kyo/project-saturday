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

## Validators

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
