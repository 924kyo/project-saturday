# Roster Identity

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Rules

- Stable player IDs are authoritative.
- Display names are never identifiers.
- Full names are unique within a team roster.
- Repeated first/surnames are legal but diversity-weighted.
- Generation is deterministic from world/roster seed.
- Names do not affect performance, traits or potential.

## Generation

1. draw from canonical first/surname pools
2. reject duplicate full names
3. reduce weight for tokens already used on that roster
4. use a reasonable repetition ceiling
5. fail validation if the catalog cannot satisfy the roster contract

Never append visible numbers merely to make names unique.

## Current deterministic contract

Both WR and QB/RB/CB room generation consume exactly the established two name draws per competitor and five total room draws per competitor. The pure name projection considers only unused full-name pairs, prefers the lowest squared post-selection first/family usage, and uses cyclic distance from the drawn pair to break ties. It consumes zero additional RNG. Stable participant IDs are constructed from program/position/slot evidence before display names and never contain a name token.

The paired `ko-KR` / `en-US` catalogs currently contain 32 stable given-name IDs and 32 stable family-name IDs. Existing IDs remain unchanged; the expansion is additive. Saved name IDs remain literal across transfer and migration.

## Before 64/96-program expansion

- expand both name pools
- validate both locales
- simulate 100+ seeded rosters
- report repetition distribution

The current checked `m7-5-roster-identity.jsonl` report covers 128 seeded QB/RB/WR/CB rooms (896 generated competitors): zero duplicate full names, zero repeated first tokens, zero repeated family tokens, exact 35-draw room generation, and complete reproduction strings. Future 64/96-program expansion must rerun and, where necessary, enlarge this report rather than assuming the current sample scales automatically.

## Depth readability

Where useful display class/year, archetype, rating band/overall, and eventually
jersey number so occasional repeated surnames remain distinguishable.

## Tests

- zero duplicate full names
- deterministic replay
- bounded token repetition
- no ID/name coupling
- transfer preserves athlete identity
