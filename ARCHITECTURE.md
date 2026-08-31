# Architecture

## Shape

Project Saturday is a pnpm workspace with a browser/PWA application around a framework-independent game simulation.

```text
project-saturday/
├─ apps/
│  └─ web/                 # React/Vite PWA; presentation and input only
├─ packages/
│  ├─ game-core/           # deterministic simulation and domain rules
│  ├─ game-content/        # programs, skills, events, locale resources, tuning data
│  └─ testkit/             # fixtures, seeded scenarios, simulation helpers
├─ docs/                   # product and engineering source of truth
└─ scripts/                # validators, balance simulation, reports
```

## Dependency direction

```text
apps/web
   ↓
game-core ← game-content adapters/data
   ↑
testkit
```

`game-core` must remain free of React, DOM, IndexedDB, localStorage, browser navigation, and rendering concerns.

## Domain layers

### MetaProfile

Persists across careers:

- alumni history;
- collections/unlocks;
- program familiarity;
- cosmetics;
- legacy achievements and aggregate statistics.

### CareerRun

Current player's career:

- identity and attributes;
- body/fitness;
- academics;
- relationships;
- brand/NIL;
- skills;
- depth position and role;
- career stats, awards, draft stock;
- phase and history.

### WorldState

Shared college-football world:

- programs and rosters;
- schedules and results;
- rankings;
- coaches;
- transfer pool;
- awards and postseason state.

## Command/transition pattern

UI submits domain intents, for example:

```ts
planWeeklyActions(state, actionIds)
resolveWeeklyAction(state, actionId, rng)
resolveEventChoice(state, eventId, choiceId, rng)
advanceGameUntilDecision(state, rng)
resolveKeySnapDecision(state, decision, rng)
finishWeek(state, rng)
```

Functions return new state plus structured effects/events for presentation. Components never calculate XP, depth movement, injury chance, skill rolls, or game results.

## Determinism

All random behavior receives an RNG object derived from explicit seeds. A career must be reproducible from:

- save state/version;
- career seed;
- action/decision sequence;
- content version.

## Persistence boundary

A storage adapter in the web app serializes validated domain snapshots. Game core only knows serializable data types and migration-safe domain schemas.

## Localization boundary

Domain objects store stable keys (`nameKey`, `descriptionKey`) and locale-neutral mechanics. Translation resolution happens at presentation/report boundaries.

## Performance model

The user's team and current matchup may use detailed simulation. Unobserved world simulation may use tiered fidelity. Expensive world/season simulations should be runnable in Web Workers once required by profiling.
