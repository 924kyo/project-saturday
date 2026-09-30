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

## M3.5 — Experience foundation and gameplay legibility

Status: completed and aggregate-verified on 2026-08-31. The spec reconciliation, purpose navigation, athlete preview, progression legibility, current-v4 weekly strategy model, Team/depth explanation, skill acquisition/ecology v2, original sports presentation foundation, contextual onboarding/help, and full M4 handoff are complete.

Deliver:

- a Body / Preparation / Confidence weekly strategy model with three discretionary focus blocks;
- visible attribute XP, next-rating, proficiency, and next-benefit progress;
- explainable Practice Grade, Coach Trust, depth rank, role, and snap projection;
- purpose-based Home / Week / Team / Skills / Player mobile navigation;
- a deterministic graphical athlete preview that persists visual identity;
- a broader skill ecology with Role/Coach effects and an anticipation-based Breakthrough Gauge;
- contextual bilingual onboarding/help;
- original sports-game presentation, accessible `:focus-visible` behavior, and role-appropriate football participation feedback.

Gate: a new player can understand the weekly tradeoffs, see how the athlete is developing and earning opportunity, navigate without a mega-page, and experience meaningful football feedback from every depth role. The full deterministic/localization/accessibility/PWA gate passes before M4 resumes.

## M4 — First game simulation and WR key snaps

Status: completed and aggregate-verified on 2026-09-01. The complete deterministic game, v4 migration/persistence, original bilingual content, role-scaled participation, all existing game hooks, post-game consequences/history, 120-game checked baseline, save-before-publication web flow, and 36-execution production-browser matrix are green with no unresolved high/medium findings.

Deliver:

- opponent/game state;
- drive/play abstraction;
- WR targets/results;
- role-scaled key-snap participation (WR1 6–10 through bench 0–2 offensive decisions) plus meaningful feedback for every role;
- film/information effects;
- post-game grade/stats/growth;
- game result;
- deterministic replay scenario tests.

Gate: one complete game is fun/legible and reproducible by seed.

## M5 — Vertical slice: one complete WR season

Status: complete and aggregate-verified on 2026-09-01. The archived execution plan is `docs/exec-plans/completed/m5-wr-season-vertical-slice.md`. The shipping browser completes the full bilingual one-season WR path through deterministic events/injury, season review, atomic alumni publication, and a second legacy-aware career on native mobile/desktop and 320 px.

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
- approximately 40 skill cards;
- 50–70 events;
- full ko-KR/en-US vertical-slice content;
- save migrations and recovery test;
- performance and E2E gate.

Gate: end-to-end season is playable without dev tools.

## M6 — Off-field/NIL/academics/relationships/transfer v1

Status: complete and aggregate-verified on 2026-09-01. The archived execution plan is `docs/exec-plans/completed/m6-off-field-transfer-v1.md`. The v6 persistence/content boundary, deterministic academic/relationship/NIL engines, weekly/Game Day consequences, season-one freeze and offseason projection, zero-reroll Stay/transfer commitment, season-two return, checked report, complete bilingual save-aware UI, production-browser matrix, sub-500 kB purpose/content chunks, repeatable operation profile, and full closeout gate are green.

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

Status: complete and verified on 2026-09-14. The parent/direct/wire plans are archived under `docs/exec-plans/completed/`. M7 is complete and verified on 2026-09-14: 1,069 workspace tests/111 files, eight script checks, explicit 351 content and 343 simulation cases, typecheck/lint/format/whitespace, build/export/PWA and the full production browser matrix (88 passed / two intentional mobile-only skips, 38.4 minutes). All twelve native two-season paths pass, including the reproduced overflow seed, offline/retry, transfer, alumni and New Career. Eighteen full profiles retain 3,155 exact reloads under unchanged limits.

Deliver:

- QB, RB, CB in addition to WR;
- position-specific attributes/actions/key snaps;
- 32 original programs;
- broader simulation abstractions;
- position-specific events/skills;
- migration/compatibility for existing alumni.

Gate: each playable position feels mechanically distinct.

Current closeout: explicit bilingual phases, three independent focuses, four slots, two-season Stay/transfer, retirement, current-program Team routing, roster identity and Career Hub are verified. Paged envelope v3 fixes valid-history overflow without changing domain v2, RNG, historical readers/proofs or limits. Native long-save/Hub-delay findings are closed by all twelve current career journeys. All emitted JS remains below 500 kB and both career screens are lazy/offline-precached. M7.5 begins immediately; M10 is unchanged.

## M7.5 — Career operations and Game Day experience

Reconciled 2026-09-29: Phase A is complete. The remaining B1c–B6 and Phase C intent moves into phase R below. Staged v8/v3 work remains in history as reference.

B1b staging verified (2026-09-14): original four-position engines retain historical rules and stage current tactical evidence; WR v8 source-replayed career/session boundaries are tested through real Stay/transfer worlds. Full 1,117 workspace/ten script cases and static/build/PWA pass. B1c command/persistence/profiling and B1d public frames are next; no tactical shipping writer is activated yet.

B1c full-life profiling exposed an existing WR second-season terminal gap. Staged source-validated v8 review/retirement and lossless mixed-legacy/current meta now pass four complete domain paths through fresh creation, with 2,394 exact session reloads and 1,126 workspace/ten script cases plus static/build/PWA green. Browser codec/atomic storage, repeated-career capacity and coordinated UI activation remain before live retirement/B6/M8 acceptance. Historical one-season contracts remain literal; domain profiles are not UI parity evidence.

Mandatory B6 addition (2026-09-14): after B2–B5, complete the Four-position UX Parity Pass across every real QB/RB/WR/CB career surface and lifecycle transition. Visual/interaction evidence and beginner usability parity are required in addition to automated tests. Any obvious broken or materially inferior experience blocks M7.5 closeout and M8; full Phase C follows B6. Current B1 and M10 remain unchanged.

Execution supplement (2026-09-14): establish one bounded Tauri 2 Windows executable/NSIS snapshot at the green B1b checkpoint while adopting compact progress and tiered checks. Then immediately resume tactical work; this adds no milestone and does not move Phase C or weaken M10.

Status: active at B1 after complete M7 verification, under `docs/exec-plans/active/m7-5-playtest-correction.md`; mandatory before M8. The 2026-09-01 round-two live-playtest review is authoritative product evidence. Its isolated correctness fixes may land safely during final M7 activation, but the milestone gate does not move after M8.

Phase A (current-program correctness, deterministic roster diversity, and production Career Hub) is verified as of 2026-09-12. Tactical snap projection/board, decision comprehension, visual resolution, post-game payoff, and the full M7.5 acceptance gate remain incomplete.

Deliver:

- authoritative current-program routing across transfer, reload, offline, and recovery;
- deterministic roster-name uniqueness and diversity-weighted identity generation at world scale;
- a production Career Hub for Continue, New, Abandon, Alumni/Legacy, save/recovery state, and separately confirmed full reset;
- a pure zero-gameplay-RNG snap-presentation projection over existing QB/RB/WR/CB evidence, extensible to LB/EDGE;
- a responsive accessible 2D Tactical Snap Board with context, earned information, plain-language-first choice previews, and deterministic resolved-play animation;
- immediate snap payoff, compact game atmosphere, and a post-game story grounded in actual score, stats, coach, progression, depth, state, gauge, and reaction evidence.

Gate: users can repeatedly manage careers without clearing storage, transferred Team surfaces always follow current membership, generated rosters remain memorable and deterministic, and Game Day is visually legible and emotionally rewarding in both locales without presentation RNG or a second football model.

## R — Product Reconciliation & Frontend Rebuild

Complete 2026-09-30 (plan: `docs/exec-plans/completed/r-product-reconciliation.md`). Inserted 2026-09-29 by product-owner direction. It precedes M8 and absorbs the unfinished M7.5 Game Day work (B1c–B6, Phase C). Evidence and decisions: `docs/product-reconciliation/`.

Deliver:

- one position-generic career model and save line (WR joins the QB/RB/CB aggregate; recruiting for every position; tactical rules for every game);
- a single deliberate prototype save boundary (export + alumni import) instead of accumulating compatibility layers;
- a rebuilt frontend on an original "Saturday Broadcast" design system (broadcast, recruiting-graphic, depth-board and locker-room registers);
- a guided weekly loop, depth board, card-based build, broadcast Game Day with an SVG Tactical Board, sideline reps for every role, and a post-game story;
- a four-position parity ledger verified in the real app.

Gate: a first-time player completes a full two-season career in any position, in both locales on phone and desktop, with Game Day decisions in every role and no developer/compatibility language on screen. All automated gates pass.

## M8 — Six-position beta and 64-program world

Complete 2026-09-30 (plan: `docs/exec-plans/completed/m8-six-position-beta.md`; parity: `docs/qa/M8_SIX_POSITION_PARITY.md`).

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

Complete 2026-09-30 (plan: `docs/exec-plans/completed/m9-full-world-and-legacy.md`; gate: `docs/qa/M9_GATE.md`).

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
