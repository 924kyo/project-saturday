# Localization — Korean and English Together

## Supported locales

Initial required locales:

- `ko-KR`
- `en-US`

Both are release-blocking from the first playable UI.

## Terminology source

Use `../00-project/TERMINOLOGY_KO_EN.md` as the initial bilingual terminology guide. Update that guide when an editorial term changes.

## Authoring policy

Korean is the primary product-design/review language. English must be authored in the same feature change.

A feature with missing English or Korean copy is incomplete.

## Architecture

UI code uses stable message keys:

```ts
`t('career.week.actionsRemaining', { count })`
```

Content data stores mechanics separately from copy and refers to message keys:

```ts
{
  id: 'skill_gym_rat_a',
  nameKey: 'skills.gymRatA.name',
  descriptionKey: 'skills.gymRatA.description'
}
```

Locale resources live under a predictable content structure such as:

```text
packages/game-content/locales/
├─ ko-KR/
└─ en-US/
```

Choose an established i18n library during bootstrap (recommended: i18next/react-i18next with ICU/plural support or an equivalent). Record the implementation choice in an ADR if it changes this suggestion.

## Validation

CI/content validation must fail when:

- a referenced localization key is missing in either locale;
- locale files have mismatched required keys;
- a key has an invalid interpolation contract;
- shipping components contain hardcoded user-facing copy, where a practical static check can detect it.

## Natural localization

Do not force literal translation when awkward. Preserve:

- gameplay meaning;
- tone;
- requirements/consequences;
- important football terminology.

Maintain a glossary for consistent Korean football terms once terminology stabilizes.

## Units

Store canonical domain values independently from display units.

Recommended:

- `heightCm`
- `weightKg`

Display defaults:

- `ko-KR`: cm / kg
- `en-US`: ft-in / lb

Allow a future user unit preference without schema migration.

## Dates and numbers

Use `Intl`/locale-aware formatting for:

- numbers;
- percentages;
- dates;
- currency;
- ordinals where appropriate.

In-world NIL values are US dollars unless the game fiction changes; Korean UI may still display USD rather than converting to KRW.

## Proper names

Fictional program names may have localized Korean display names/transliterations while sharing the same stable `ProgramId`.

## QA

At every milestone, perform at least one full smoke path in each locale and test layout expansion/contraction.
