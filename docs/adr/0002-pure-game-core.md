# ADR-0002 — Pure Game Core

**Status:** Accepted

## Decision

Gameplay simulation lives in `packages/game-core`, independent of React/browser APIs.

## Why

- deterministic tests;
- balance simulation;
- easier refactoring;
- worker/server/native portability;
- prevents UI from becoming the rule engine.
