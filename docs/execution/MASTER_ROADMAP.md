# Master Roadmap

Milestones are sequential quality gates. Exact task decomposition may evolve in the backlog/exec plans without changing the product target.

## M0 — Harness and repository foundation

Deliver:

- pnpm workspace;
- React + Vite TypeScript web app;
- `game-core`, `game-content`, `testkit` packages;
- strict TS;
- lint/format;
- Vitest/Playwright;
- CI or equivalent local check script;
- seeded RNG with tests;
- localization framework with `ko-KR` + `en-US` smoke screen;
- content validation skeleton;
- PWA shell;
- save/storage adapter skeleton.

Gate: all core commands exist and pass on a trivial app.

## M1 — Player and weekly career skeleton

Deliver:

- WR player model;
- player creation basics;
- 3 weekly actions;
- Body;
- training actions;
- week phases/advance;
- deterministic domain tests;
- autosave/reload;
- bilingual UI.

Gate: create player → perform actions → advance multiple weeks → reload.

## M2 — Skill-card build loop

Deliver:

- skill schemas/effects;
- 4 equipped slots;
- deterministic 3-card breakthrough;
- behavior/tag-weighted pools;
- at least 18 initial cards for testing, then content toward vertical-slice target;
- training/body/game extension points;
- bilingual skill UI/content;
- skill simulation report.

Gate: two seeded careers can form meaningfully different training/body builds.

## M3 — Programs, roster, depth chart, snap projection

Deliver:

- 12 fictional vertical-slice programs;
- WR room/roster model;
- program choice/recruiting context;
- Coach Trust;
- Practice Form;
- Scheme Fit;
- depth evaluation with stability;
- projected snap share;
- bilingual program/depth UI.

Gate: player can start deep on chart and earn/lose role for explainable reasons.

## M4 — First game simulation and WR key snaps

Deliver:

- opponent/game state;
- drive/play abstraction;
- WR targets/results;
- 6–10 key-snap pattern system for meaningful roles;
- film/information effects;
- post-game grade/stats/growth;
- game result;
- deterministic replay scenario tests.

Gate: one complete game is fun/legible and reproducible by seed.

## M5 — Vertical slice: one complete WR season

Deliver:

- fall camp;
- regular season schedule;
- contextual events;
- depth/snap movement;
- skill progression;
- injury/recovery baseline;
- postseason ending;
- season review;
- alumni record;
- second career start with initial legacy visibility;
- 36+ skill cards;
- 50–70 events;
- full ko-KR/en-US vertical-slice content;
- save migrations and recovery test;
- performance and E2E gate.

Gate: end-to-end season is playable without dev tools.

## M6 — Off-field/NIL/academics/relationships/transfer v1

Deliver:

- Brand/NIL offers and obligations;
- team relationship model;
- academics/GPA simplified eligibility;
- media/campus events;
- offseason coach/scheme change hooks;
- transfer decision flow;
- expanded legacy integration.

Gate: off-field choices create tradeoffs without turning weekly flow into micromanagement.

## M7 — Multi-position alpha and 32-program world

Deliver:

- QB, RB, CB in addition to WR;
- position-specific attributes/actions/key snaps;
- 32 original programs;
- broader simulation abstractions;
- position-specific events/skills;
- migration/compatibility for existing alumni.

Gate: each playable position feels mechanically distinct.

## M8 — Six-position beta and 64-program world

Deliver:

- LB and EDGE;
- 64 programs;
- expanded conferences/rankings/postseason;
- deeper injuries/NIL/events;
- draft stock and declaration system;
- larger skill/content library;
- balance automation at scale.

Gate: full multi-season careers complete across all six positions.

## M9 — Full world/content and legacy history

Deliver:

- 96 programs / 8 fictional conferences;
- ~100–130 skill cards;
- ~250–350 high-value events;
- robust program familiarity;
- alumni mentors/cameos/record books;
- awards/championships;
- pro draft ending;
- content QA and bilingual editorial pass.

Gate: repeated careers demonstrate strong variation and persistent history.

## M10 — 1.0 release candidate

Deliver:

- balance pass using large simulation batches;
- save/migration hardening;
- performance profiling;
- accessibility pass;
- mobile Safari/Chrome/Desktop smoke matrix;
- PWA install/update behavior;
- Korean/English full QA;
- no critical/high blockers;
- release notes/readiness report;
- clean production build.

Gate: `RELEASE_CHECKLIST.md` complete.
