# ADR-0001 — Web/PWA First

**Status:** Accepted

## Decision

Build the initial product as a mobile-first React/TypeScript web app with installable PWA support.

## Why

- fast iteration;
- cross-platform access;
- suitable for simulation/2D presentation;
- easy Codex/test automation;
- avoids native platform scope before core fun is proven.

## Consequence

Game logic must remain platform-independent so a later native shell is possible without rewriting mechanics.
