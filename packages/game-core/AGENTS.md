# AGENTS.md — packages/game-core

This package is the deterministic game engine.

## Hard rules

- No React, DOM, browser storage, network, or UI dependencies.
- No `Math.random()`.
- No localized/display strings in mechanics.
- Pure functions are preferred.
- Every random transition receives RNG explicitly.
- Every state mutation rule requires deterministic unit/scenario coverage.
- Use stable IDs and serializable values.
- Attribute and resource bounds must be centralized and invariant-tested.
- If a gameplay rule is not specified, consult the relevant product spec; if still ambiguous, use the autonomous assumption policy rather than inventing hidden behavior.
