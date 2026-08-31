# Coding Standards

## TypeScript

- strict mode
- no implicit `any`
- explicit return types for exported domain functions when it improves API clarity
- discriminated unions for domain results/phases
- stable branded/string ID types where useful

## Domain code

- pure functions preferred
- immutable transitions preferred
- no global singleton RNG
- no browser dependencies in game core
- no localized text in mechanics
- tuneable constants collected in configuration/content, not scattered magic numbers

## Naming

Use unit/meaning suffixes:

- `heightCm`
- `weightKg`
- `weekIndex`
- `bodyCost`
- `snapSharePct` if it is 0–100, or clearly document 0–1 ratios

Avoid ambiguous `value`, `data`, `score` in public domain APIs when a specific name exists.

## Error handling

Impossible domain states should fail loudly in development/tests. User-facing recoverable errors should return structured results and safe UI recovery.

## Comments

Comment **why**, not syntax. Product rules belong in specs/tests; comments should not become a second contradictory rulebook.

## Dependencies

Add libraries only when they remove meaningful maintenance burden. Record architectural dependencies in ADRs when significant.
