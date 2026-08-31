# Debugging and Developer Tools

## Goal

Make a simulation-heavy game easy for Codex and humans to inspect without editing saves by hand.

## Required dev-only surfaces over time

- create career with explicit seed;
- inspect domain state;
- jump week/phase safely through domain commands;
- force/preview a skill breakthrough using deterministic seeds;
- inspect event eligibility and rejected reasons;
- inspect depth evaluation components;
- simulate a game/career batch;
- export a compact reproducible bug bundle containing seed, version, and relevant state;
- locale missing-key/debug view.

## Safety

Debug tools must be excluded/disabled from production surfaces unless intentionally retained as harmless diagnostics.

## Logging

Use structured debug logging with categories rather than random console spam. Important simulation reports should include:

- content version;
- seed;
- milestone/build version;
- scenario identifiers.

## Balance scripts

Maintain scripts such as:

```bash
pnpm balance --runs 10000 --position wr
pnpm sim:career --seed 12345
pnpm sim:game --seed 999 --scenario wr_starter
```

Exact CLI syntax may differ but equivalent capability should exist before large balance work.
