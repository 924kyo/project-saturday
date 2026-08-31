# ADR-0003 — Seeded RNG Everywhere in Gameplay

**Status:** Accepted

## Decision

All gameplay randomness receives an explicit deterministic RNG. `Math.random()` is forbidden in game-core.

## Why

- reproducible bugs;
- scenario tests;
- balance simulation;
- replay/debugging;
- agent-friendly verification.
