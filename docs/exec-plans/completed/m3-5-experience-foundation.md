# M3.5 Exec Plan — Experience Foundation and Gameplay Legibility

Status: completed and aggregate-verified on 2026-08-31; M4 resumed at atomic step 2
Authoritative input: `docs/product-reviews/2026-08-31-m3-playtest-redesign.md`

## Goal

Correct the M3 playtest experience before live M4 game UI compounds the existing problems.
Preserve all green M0-M3 engineering guarantees.

## Sequencing

M4 atomic task 1 reached its green compatibility checkpoint without activating a live game command. Its additive v4 game-state foundation remains in place. The partially authored task-2 content contract remains staged but is not considered complete. M3.5 now owns the active sequence and integrates Preparation into the same unshipped v4 contract while keeping strict v1-v3 readers and migrations.

## Atomic tasks

### 1. Spec reconciliation and v4 state decision

- Read all current source-of-truth specs and active M4 plan.
- Integrate the correction directive into `CORE_LOOP`, `PLAYER_MODEL`, `TRAINING_AND_BODY`, `SKILL_SYSTEM`, `DEPTH_CHART`, `UX_AND_FLOW`, `ART_AND_PRESENTATION`, and `GAME_SIMULATION` as appropriate.
- Update roadmap/backlog/progress.
- Add ADRs only for durable architecture/product decisions that require them.
- Ensure v4 contains the new authoritative temporary-state requirements before v4 is considered shipped.
- Preserve the staged, validated M4 game-content declarations without allowing them to become a second source of M3.5 product rules.

Gate: specs and schema plan agree; no contradictory active plan remains.

Implementation decision: v4 adds `preparation` to the current player state with a neutral migrated/new-career baseline of 50. Confidence retains its existing field and becomes an explicit weekly/gameplay input during task 5. Legacy v1-v3 player-state shapes remain strict and unchanged.

### 2. Navigation and responsive information architecture

- Introduce Home / Week / Team / Skills / Player destinations.
- Preserve phase-authoritative domain rules; routing/navigation must not invent game state.
- Split planning, results, depth, skill loadout, and player detail out of the mega-page.
- Ensure 320px mobile, Pixel-class mobile, and desktop all work.

Gate: main loop is navigable without long mixed-purpose scrolling.

### 3. Athlete visual preview foundation

- Implement deterministic layered athlete preview from existing appearance IDs.
- Temporary vector/CSS/local placeholder assets are acceptable.
- Creation updates live.
- Reuse same portrait configuration on Home and Player.
- Preserve save identity and bilingual accessibility labels.

Gate: changing appearance produces visible player identity without reading text fields.

### 4. Progression and result legibility

- Add rating progress bars / XP threshold view.
- Add archetype/key-attribute emphasis.
- Redesign action result presentation around XP-to-next-rating.
- Add proficiency progress/benefit display.
- Add optional effect breakdown.

Gate: a user can explain what improved after a training action even without a rating level-up.

### 5. Weekly strategy model

- Implement Body / Preparation / Confidence.
- Convert weekly action UX to discretionary focus blocks over implicit team schedule.
- Make Practice Grade derived and explainable.
- Connect focus choices to Coach Trust/role progression where specified.
- Add deterministic tests and migration fixtures.

Gate: deterministic strategies demonstrate non-trivial tradeoffs that cannot be reduced to Body alone.

### 6. Team/depth explanation UX

- Explain current role/depth in readable factors.
- Show projected snap share prominently.
- Compare player with next relevant competitor without exposing misleading precision.
- Provide one or two actionable development suggestions.

Gate: player can answer why they are WRn and what is likely to help.

Implementation decision: Team will derive its adjacent advancement target (or the WR2 pressure behind a current WR1) from the saved ordered evaluation tuple. It will compare the five saved evaluation components with qualitative direction labels, rank at most two suggestions by saved contribution deficit, and remove the old decimal composite score from the room list. This is presentation over authoritative evidence, not a second evaluation formula. A compact causal chain and latest saved Practice Grade/Form/Trust evidence will explain how weekly choices reach rank and projected snaps.

### 7. Skill acquisition and ecology v2

- Introduce Breakthrough Gauge.
- Remove routine repeated-action free-card acquisition as the primary cadence.
- Add Role/Coach family and audit Body-heavy cards.
- Ensure Game Day/Preparation/Coach/Confidence effects exist before M4 gameplay relies on skills.
- Preserve seeded deterministic offers, save-publication safety, four-slot loadout, and rarity/pity guarantees.
- Update simulation evidence for at least three distinct build strategies.

Gate: skill choices meaningfully alter role/game/preparation strategy, not just training Body economics.

Implementation decision: strict v2/v3 skill-state and cadence records remain unchanged. Current v4 player skill state adds a `gauge_v1` progress object; migrated careers begin at zero while any pending legacy offer remains literal. Each completed current-model week persists bounded source evidence for development, role/coach, mindset, body management, and life progress. Crossing the centralized threshold generates the same seeded three-card offer at the safe week boundary and records the gauge trigger on new offers/acquisitions; unavailable pools bank progress instead of consuming RNG. A testkit-only historical advance path preserves checked-in M1–M3 cadence evidence. New additive cards introduce the Role/Coach family and live Preparation, Confidence, Practice Grade, and existing Game Day hooks without changing shipped card IDs or old mechanics.

### 8. Visual foundation pass

- Replace generic giant headline + low-value subtitle patterns on functional screens.
- Reduce identical rounded-card nesting.
- Establish sports-game typography, stat bars, score/role modules, dividers, and accent rules.
- Fix pointer vs keyboard focus styling using `:focus-visible` semantics.
- Preserve accessibility contrast and keyboard E2E.

Gate: Home/Player/Week/Skills look intentionally game-like and retain accessibility.

### 9. Onboarding/help

- Implement first-visit contextual tutorials for creation, Week, Team/depth, and Skills.
- Persist per-system completion.
- Add skip/replay.
- Keep copy concise and bilingual.

Gate: a new user can identify the purpose of every primary state and screen without an external guide.

Implementation decision: onboarding is versioned UI preference data in the existing IndexedDB `settings` store, not career gameplay state and therefore not a CareerRun/save-schema change. Four stable topics (`creation`, `week`, `team`, `skills`) persist independent completion. A non-modal contextual guide appears only while its topic is incomplete; `Got it` completes one topic and `Skip all guides` completes all four. A global bilingual Help & settings surface can review every guide, reset an individual guide for its next contextual visit, or replay all. Settings writes are serialized and optimistic so unavailable persistence never blocks gameplay.

### 10. Aggregate validation and resume M4

- Run full project gate.
- Add/refresh mobile screenshots if repository harness supports visual artifacts.
- Update `PROGRESS.md` with M3.5 closeout evidence.
- Reconcile active M4 plan with the new Game Day participation requirements.
- Resume M4 from the next safe task.

## Progress notes

- 2026-08-31: Activated M3.5 after the verified M4 v4 compatibility checkpoint and before any live game command. Reconciled the product correction across product/QA/execution sources. Added Preparation as a strict v4-only player-state field with neutral new/migrated value 50 while preserving v1-v3 wire shapes, phase, revision, RNG, and lazy-save behavior. Typecheck, lint/boundaries/localized-copy, formatting, 373 workspace tests, 66 content tests, 204 core/testkit tests, and 103 web tests pass. Atomic task 2 is next.
- 2026-08-31: Completed atomic task 2. Added semantic bilingual Home / Week / Team / Skills / Player navigation, split recruiting/depth, weekly flow, skills, and player detail into purpose-owned destinations, added a concise persistent career context, and preserved phase-aware focus/save publication. The 320 px navigation is safe-area-aware with five 48 px targets. Typecheck/lint/format, 375 workspace tests, 66 content tests, 204 core/testkit tests, the production PWA build, and 26 Playwright executions pass. Atomic task 3 is next.
- 2026-08-31: Completed atomic task 3. Added an original deterministic CSS-layered athlete figure whose skin, face, hair, body, jersey fit, eye black, visor, sleeves, wrist tape, gloves, towel, and footwear are derived only from saved appearance IDs. Creation updates the figure live; Home and Player reuse the saved configuration and localized accessible name. Typecheck/lint/format, 378 workspace tests, 66 content tests, 204 core/testkit tests, 108 web tests, the production PWA build, and all 26 Playwright executions pass. The in-app browser had no connected surface for supplemental interactive screenshot review; no alternate browser-control surface was substituted. Atomic task 4 is next.
- 2026-08-31: Completed atomic task 4. Added pure presentation projections over exported core thresholds, exact rating XP bars, current-archetype emphasis, all seven proficiency tracks with next thresholds/benefits, and result cards centered on progress with optional XP calculations. React renders the projected evidence and does not own progression formulas. The full `corepack pnpm check` passes 379 workspace tests, 66 content tests, 204 core/testkit tests, 109 web tests, all 26 Playwright executions, and the 206-module production PWA build. Atomic task 5 is next.
- 2026-08-31: Completed atomic task 5. Added authored Preparation/Confidence consequences to all nine focus definitions, bounded and persisted current-v4 result evidence, deterministic partial Preparation carryover, and an `experience_v1` Practice Grade whose saved factors reproduce the score, Practice Form, Coach Trust, and role target. A v4 weekly-model discriminator leaves migrated in-flight phases literal; narrow testkit-only compatibility commands keep the M1–M3 checked-in reports byte-stable while shipping commands use the revised model. Bilingual Week surfaces preview and explain the three states and grade factors. The closeout passes 385 workspace tests, 66 content tests, 208 core/testkit simulations, 174 game-core tests, 111 web tests, all 26 Playwright executions, and the 207-module production PWA build. Atomic task 6 is next.
- 2026-08-31: Completed atomic task 6. Team now leads with the saved snap range/role, explains the Practice Grade → Form/Trust → five depth factors → rank/rotation chain, shows the latest saved coach review, compares the adjacent relevant WR with qualitative directions, and derives at most two suggestions from persisted contribution deficits. The room no longer exposes a misleading decimal composite score. Both locales, 111 web tests, content validation, static gates, and all 26 Playwright executions pass; the 320 px path verifies all new modules are visible and horizontally contained. The in-app browser had no connected surface for supplemental screenshot review. Atomic task 7 is next.
- 2026-08-31: Completed atomic task 7. Current-v4 weeks now persist a visible 100-point `gauge_v1` with bounded Development, Role/Coach, Mindset, Body-management, and Life source evidence; a threshold crossing saves its trigger on the existing seeded choose-one offer, while legal-pool failure banks progress with zero RNG. Strict v2/v3 wire shapes and pending offers remain literal, and historical M1-M3 reports stay byte-stable. The original catalog expands additively from 18 to 27 cards across six families with live Preparation, Confidence, Practice Grade, game-hook, NIL, and event-choice effects. The checked 13-week ecology report produces 6/5/4 drafts for three strategies with full transition round-trips. The bilingual Skills UI shows empty, progressing, and ready gauge states plus exact sources. The full `corepack pnpm check` passes 393 workspace tests, 66 content tests, 216 core/testkit simulations, 26 Playwright executions, and the 209-module PWA build. Atomic task 8 is next.
- 2026-08-31: Completed atomic task 8. The original visual foundation replaces generic dashboard repetition with destination accents, compact athletic headings, angular major modules, segmented state/progress bars, and a concise Home snap/role/trust/form strip without changing gameplay authority. Focus remains programmatically managed across phases, but CSS now shows the three-pixel outline only for `:focus-visible`: production Chromium proves it appears after keyboard transitions and not after pointer transitions. Strict typecheck/lint/localized-copy/formatting, 111 web tests, and all 26 mobile/desktop Playwright executions pass; the 320 px path verifies the new role strip is visible and contained. The in-app browser runtime had no connected surface for a supplemental manual screenshot review. Atomic task 9 is next.
- 2026-08-31: Completed atomic task 9. Creation, Week, Team, and Skills now render concise Korean/English consequence guides only while their independently persisted `onboarding-v1` topic is incomplete. `Got it`, skip-all, Help review, individual contextual replay, and replay-all remain UI settings outside CareerRun and never block commands. Strict version/key/topic parsing falls back safely, and one optimistic serialized queue prevents older writes from winning. Strict typecheck/lint/localized-copy/formatting, 66 content tests, 117 web tests, and four focused production Playwright executions pass. The 320 px Korean/English journeys verify keyboard controls, 44 px targets, containment, exact IndexedDB completion before reload, and absence after reload. Atomic task 10's aggregate gate and M4 handoff are next.
- 2026-08-31: Completed atomic task 10 and M3.5. The single aggregate `corepack pnpm check` passed strict typechecks, ESLint/boundaries/localized-copy, Prettier, 4 localization-guard fixtures, 399 workspace tests, 66 focused content tests, 216 deterministic core/testkit simulations, all 30 production Playwright executions, every package build, emitted exports, and PWA verification. The finished experience contract is reconciled into the active M4 plan: Week owns game flow, saved Body/Preparation/Confidence and Practice Grade/depth evidence feed Game Day, the existing skill hooks become live without a second skill model, role-scaled opportunities retain truthful zero-offense feedback, and post-game can add the reserved Game Day Breakthrough source. M4 resumed at atomic step 2.

## Do not do

- do not rewrite deterministic core or save architecture without need;
- do not delete accessibility focus indication;
- do not replace current content with copyrighted assets/UI from another game;
- do not turn all three states into compulsory maintenance chores;
- do not implement final art at the expense of the experience foundation;
- do not hide progression formulas so completely that players cannot make informed choices.
