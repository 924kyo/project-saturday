# Project Saturday

> Working title. A mobile-first, deterministic college-football player career RPG built for Korean and English from day one.

## What this repository is

Project Saturday is **not** a team-management game. The player controls one college athlete from recruiting through college career completion and, when applicable, the pro draft.

The game combines:

- a fast weekly loop;
- skill-card drafting and build-making;
- depth-chart and snap-share competition;
- character identity through appearance, body, background, personality, school, and career history;
- key-snap football decisions instead of full real-time 3D football;
- off-field systems including relationships, campus life, academics, media, NIL, and transfer decisions;
- roguelite-style legacy progression where retired careers become alumni and change future possibilities.

## Run locally

Prerequisites: Node.js `^22.22.2`, `^24.15.0`, or `>=26`, with Corepack available.

```bash
corepack pnpm install
corepack pnpm dev
```

The development server prints its local URL. The first screen is a mobile-first PWA shell with simultaneous Korean and English localization.

## Verify the workspace

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:content
corepack pnpm test:sim
corepack pnpm e2e:install
corepack pnpm e2e
corepack pnpm build
```

`corepack pnpm check` runs the complete gate after the Chromium test browser has been installed. If pnpm is already activated globally, the shorter `pnpm ...` forms are equivalent.

## First-time Codex use

1. Open this repository as a Codex project.
2. Give Codex the single prompt in [`START_CODEX.md`](START_CODEX.md).
3. Codex must read [`AGENTS.md`](AGENTS.md), the product specs, and the autonomous execution protocol before changing code.
4. Codex should continue milestone-by-milestone toward [`docs/execution/TARGET.md`](docs/execution/TARGET.md) without waiting for approval after normal tasks.
5. If a product/runtime limit interrupts the agent, start a new task with the **resume prompt** in `START_CODEX.md`. The durable state lives in `docs/execution/PROGRESS.md`.

## Source-of-truth order

When documents conflict, use this priority:

1. direct user instruction in the current Codex task;
2. `AGENTS.md` in the closest directory;
3. `docs/product-specs/`;
4. `ARCHITECTURE.md` and `docs/engineering/`;
5. accepted ADRs in `docs/adr/`;
6. execution plans and backlog;
7. older contextual notes.

## Initial technical direction

- TypeScript strict mode
- React + Vite PWA
- pnpm workspace
- pure deterministic simulation in `packages/game-core`
- data-driven content in `packages/game-content`
- Korean (`ko-KR`) and English (`en-US`) released together
- IndexedDB save system with migrations and snapshots
- Vitest + Playwright + deterministic simulation tests

The repository now contains the M0 implementation harness. Delivery continues milestone-by-milestone according to the roadmap and durable execution ledgers.
