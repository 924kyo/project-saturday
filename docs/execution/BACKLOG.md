# Backlog

This is the durable ordered task list. Codex may refine tasks but should preserve milestone order and acceptance intent.

## Immediate bounded M7.5 desktop/efficiency detour (2026-09-14)

- [x] Archive complete progress evidence, adopt compact resume structure, and verify no code/script dependency on old prose.
- [x] Adopt tiered checks and sequential heavy verification; preserve all final milestone gates.
- [x] Build the same production frontend in a Tauri 2 x64 executable and bilingual NSIS installer; smoke-test the application, document exact artifacts and installer-wizard verification limits.
- [x] Resume M7.5 B1 WR compatibility/tactical work immediately after the first desktop checkpoint. B6 now follows B2–B5; M8 still waits for B6 and Phase C; M10 unchanged.

## M0

Completed 2026-08-30. The full aggregate gate and independent review passed.

- [x] Initialize pnpm workspace and package boundaries.
- [x] Configure strict TypeScript base config.
- [x] Create React/Vite web shell.
- [x] Create game-core package with no browser deps.
- [x] Create game-content package and schema validation skeleton.
- [x] Create testkit package.
- [x] Configure Vitest.
- [x] Configure Playwright.
- [x] Configure lint/format/check scripts.
- [x] Implement seeded RNG and deterministic tests.
- [x] Install/configure i18n with ko-KR/en-US sample screen.
- [x] Add localization completeness validation.
- [x] Add PWA manifest/service worker baseline.
- [x] Add IndexedDB storage abstraction baseline.
- [x] Add CI/check workflow if repository environment supports it.

## M1

Completed 2026-08-31. The bilingual multi-week/reload gate and independent production review passed.

- [x] Author/validate bilingual 3-archetype, 5-background, and 8-trait creation catalogs.
- [x] Implement WR player identity/rating schema.
- [x] Implement body/temporary state bounds.
- [x] Implement career/week phase state machine.
- [x] Implement weekly action definitions/resolution.
- [x] Implement 3-action planning.
- [x] Implement basic training/proficiency.
- [x] Add persisted appearance/body creation catalogs and content-to-core creation helpers.
- [x] Add seeded multi-week testkit builders and a version-pinned M1 balance report.
- [x] Implement strict CareerRun v1 parsing, canonical save envelopes, snapshot retention, and recovery.
- [x] Implement player creation UI in both locales.
- [x] Implement weekly home/action flow in both locales.
- [x] Implement autosave/reload of current career.
- [x] Add M1 scenario/E2E tests.

## M2 — Complete (2026-08-31)

- [x] Add CareerRun v2 skill state and strict v1/save-envelope migration.
- [x] Define skill schemas/effect registry.
- [x] Implement equipped slots.
- [x] Implement deterministic eligible-pool filtering.
- [x] Implement weighted three-card breakthrough.
- [x] Implement recent-behavior tag weighting.
- [x] Integrate training/body modifiers.
- [x] Implement skill inventory/equip UI bilingual.
- [x] Author/validate first 18 cards.
- [x] Add skill distribution simulation report.
- [x] Add bilingual M2 skill-loop E2E and 320 px/offline coverage.

## M3 — Complete (2026-08-31)

- [x] Add CareerRun/save-envelope v3 program state and strict v2 migration.
- [x] Define program schema/traits.
- [x] Build original 12-program vertical-slice set.
- [x] Implement transparent recruit profile and deterministic five-offer shortlist.
- [x] Implement recruiting/program choice.
- [x] Implement WR room roster generation.
- [x] Implement Coach Trust and Practice Form.
- [x] Implement Scheme Fit.
- [x] Implement stable depth evaluation.
- [x] Implement projected snap-share model.
- [x] Implement depth/program UI bilingual.
- [x] Add depth simulation/scenario tests.
- [x] Add bilingual M3 recruiting/depth E2E and 320 px/offline coverage.

## M3.5 — Complete (2026-09-01)

- [x] Reconcile the playtest correction across authoritative specs and integrate Preparation into the unshipped v4 contract without weakening strict v1-v3 compatibility.
- [x] Implement Home / Week / Team / Skills / Player navigation and responsive purpose-based surfaces.
- [x] Implement a deterministic graphical athlete preview in creation, Home, and Player.
- [x] Make attribute XP/next-rating and proficiency/next-benefit progress legible.
- [x] Implement three discretionary weekly focus blocks and meaningful Body / Preparation / Confidence consequences.
- [x] Explain Practice Grade, Coach Trust, depth rank, projected snaps, competitors, and actionable gaps.
- [x] Implement Breakthrough Gauge, Role/Coach skills, broader system hooks, and anticipation-based acquisition cadence.
- [x] Apply the original sports presentation foundation and `:focus-visible` keyboard treatment.
- [x] Implement bilingual contextual onboarding/help with skip and replay.
- [x] Run the aggregate gate, close M3.5 documentation, and resume M4 from its staged content-contract task.

## M4

Completed and aggregate-verified on 2026-09-01. All persistence, simulation, content, testkit, bilingual UI, production-browser, documentation, and review gates passed.

- [x] Add CareerRun/save-envelope v4 game state and strict v3 migration.
- [x] Define/validate bilingual opponent and key-snap content contracts.
- [x] Define deterministic game state/drive abstraction.
- [x] Implement basic opponent/team scoring simulation.
- [x] Implement WR snap opportunities and role-appropriate zero-opportunity feedback.
- [x] Implement key-snap decision protocol.
- [x] Define original release/route/catch/YAC decision patterns.
- [x] Integrate Preparation/Football IQ/Film information visibility.
- [x] Implement player stat line and opportunity-normalized performance grade.
- [x] Implement post-game growth/trust/history effects and the Game Day gauge source.
- [x] Implement game UI bilingual.
- [x] Add public-command builders and the replayable content-version-pinned M4 seed baseline.
- [x] Add bilingual M4 game E2E and 320 px/offline coverage.

## M5

Complete on 2026-09-01. The archived plan is `docs/exec-plans/completed/m5-wr-season-vertical-slice.md`; every persistence, season/world, event, injury, skill, postseason, review, alumni/legacy, simulation, bilingual UI, production-browser, performance, and closeout gate passed.

- [x] Add CareerSession/CareerRun v5, WorldState v1, MetaProfile v1, migrations, and atomic browser persistence.
- [x] Define/validate the 12-program fall-camp, regular-season, standings, and postseason content contract.
- [x] Implement deterministic calendar/world commands and aggregate other-game simulation.

- [x] Implement fall camp.
- [x] Implement season schedule and weekly calendar.
- [x] Implement event requirement/tag engine.
- [x] Author 50–70 validated bilingual events (57 shipped; all category minimums met).
- [x] Complete the 40-card validated bilingual skill target with live Development, Role/Coach, Game Day, Body, Mindset, Life, event, and injury consequences.
- [x] Implement simple injury/recovery model with visible deterministic risk, restrictions, recovery, and opportunity effects.
- [x] Implement postseason/season ending.
- [x] Implement season review.
- [x] Implement Alumni record persistence.
- [x] Implement minimal next-career legacy visibility.
- [x] Add public-command full-season builders and a content-version-pinned balance report with historical hash protection.
- [x] Implement the complete ko-KR/en-US mobile season, event, injury, postseason, review, alumni, completion, and returning-history UI with deferred aggregate saves.
- [x] Harden save snapshots/migrations, including independent monotonic career/world session revisions.
- [x] Complete ko-KR/en-US E2E season smoke tests on native mobile/desktop and 320 px.
- [x] Run final vertical-slice performance profiling.

## M6

Complete on 2026-09-01. The archived plan is `docs/exec-plans/completed/m6-off-field-transfer-v1.md`; every persistence, content, engine, report, bilingual UI, production-browser, performance, and closeout gate passed.

- [x] Add version-6 career/session migration for off-field, relationships, obligations, and offseason state without changing completed M5 evidence.
- [x] Define and validate the original bilingual relationship, academics, NIL, coach/scheme-change, and transfer-offer content contracts.
- [x] Implement simplified academic eligibility and term progression with visible GPA risk.
- [x] Implement compact relationship state for position coach, teammates, and a direct competitor with contextual consequences.
- [x] Implement bounded NIL/Brand offers, obligations, expiration, and weekly tradeoffs without a management dashboard.
- [x] Integrate off-field consequences into weekly actions, events, skills, role/coach trust, and game availability where specified.
- [x] Replace the active-v6 one-season hard ending with a versioned offseason world/transfer projection while preserving the M5 completion path for migrated completed careers.
- [x] Implement the explicit Stay/transfer commitment, program/roster reassignment, trust/scheme/event updates, and retained career history over the saved curated comparison.
- [x] Bootstrap season two from either decision and prove selected-program schedule linkage, carried state/history, a representative next-season week/game, and exact JSON/IndexedDB reload behavior.
- [x] Add bilingual mobile UI/onboarding for concise off-field status, obligations, offseason comparison, and transfer consequences.
- [x] Add public-command multi-season/off-field builders and a checked content-version-pinned balance report with exact M1–M5 hash protection.
- [x] Add exact save/reload/offline tests and Korean/English production-browser journeys for the M6 surfaces.
- [x] Profile/code-split the web bundle before M7 world/position expansion.

## M7

Complete and fully verified on 2026-09-14 under `docs/exec-plans/completed/m7-multi-position-32-program-alpha.md`: 88 browser passes / two intentional skips; 1,069 workspace, 351 content and 343 simulation cases; eighteen full profiles.

- [x] Add the strict v7 persistence skeleton, reserve four-position IDs, preserve MetaProfile v1, migrate exact v1–v6 WR careers/sessions/envelopes without RNG or evidence changes, and keep new-position commands disabled.
- [x] Define and validate the schema-9 four-position/12-archetype attribute, development, evaluation, opportunity, game-family, and paired ko-KR/en-US staged content contract without activating non-WR commands.
- [x] Define and validate the schema-9 32-program/four-group world, rivalry, 7+5 schedule-slot, aggregate-tier, and paired ko-KR/en-US staged content contract.
- [x] Add the strict browser-independent four-position attribute ownership, derived-overall, and next-rating XP projection contract without activating incomplete careers.
- [x] Generalize deterministic player creation, ratings, XP, and appearance identity across QB/RB/WR/CB through validated schema-9 mechanics and a pre-career builder, preserving the live activation boundary.
- [x] Generalize weekly strategy, training proficiency, Practice Grade, and Breakthrough evidence by position through staged schema-9 content and a deterministic pre-activation resolver.
- [x] Generalize recruiting, position rooms, Coach Trust, depth evaluation, role, and opportunity projection.
- [x] Expand to 32 original programs with four fictional groups, a validated schedule, rankings, aggregate simulation, postseason, offseason, and history.
- [x] Implement mechanically distinct deterministic QB decisions, stats, grade, skills, events, and season integration.
- [x] Implement mechanically distinct deterministic RB decisions, stats, grade, skills, events, and season integration.
- [x] Implement mechanically distinct deterministic CB decisions, stats, grade, skills, events, and season integration.
- [x] Generalize injury, relationships, NIL/event eligibility, offseason projection, Stay/transfer, season-two continuity, multi-season summaries, alumni/meta, familiarity, and legacy compatibility through the staged lifecycle contract.
- [x] Add public-command four-position/32-program builders and checked reports with exact M1–M6 hash protection and performance profiles.
- [x] Add the separately versioned added-position session, atomic recovery persistence, four-position selector, 32-program creation, and bilingual purpose-based Home/Week/Team/Player production shell without changing WR v7 semantics.
- [x] Complete the added-position skill/event/postseason/offseason/season-two/alumni compatibility checkpoint and focused bilingual browser journeys.
- [x] Finish direct four-position Game Day command activation without a parallel football model, enforce build budgets, then pass the M7 review/full gate. (verified)

M7 step 12d handoff is tracked in `docs/exec-plans/completed/m7-direct-game-day-activation.md`:

- [x] Stage explicit added-position v2/four-slot/neutral-Game-Day migration with two-season literal preservation tests.
- [x] Extract shared three-focus preparation and direct QB/RB/CB start/snap adapters with four-slot forwarding and historical policy parity.
- [x] Stage strict saved practice/preview/active/resolved/post-game boundaries and planning-only four-slot set/move/clear commands, with bounded replay and reload/tamper tests.
- [x] Share once-only football/world settlement; retain replay-validated current snap histories beside literal historical summaries; verify twelve direct games, skill drafts, and bounded save size for QB/RB/CB.
- [x] Resolve migrated pending events/skill drafts through current commands, preserving zero-draw choices and forwarding fourth-slot Life effects through shared event rules.
- [x] Extract shared injury catalog sampling, rest/limited availability, and duration recovery with literal WR parity and deterministic validation coverage.
- [x] Compose position-owned exposure with the shared sampler in bounded replay-validated assessment/availability evidence, retaining required choices and zero-draw ongoing restrictions.
- [x] Compose validated rest/limited availability with existing QB/RB/CB snap adapters, preserving role caps, no-opportunity feedback, exact draws, and the unchanged historical default path.
- [x] Persist current regular-season injury assessment/choice/caps and derive once-only recovery from replay-validated settled history, preserving neutral migration.
- [x] Add the five authored shared recovery/study/physical/film choices and injury-aware availability to the staged added-position flow, alongside the three position drills.
  - [x] Resolve the five authored common focuses with bounded current evidence and content-owned injury policy, preserving drill arithmetic and paired copy.
  - [x] Integrate current preparation, shared proficiency persistence, strict history/replay, GPA settlement, passive recovery, and Preparation carryover into saved v2 commands.
- [x] Complete pregame relationship/event/academic/NIL timing and gauge source/affinity fidelity before browser activation.
  - [x] Save position relationship changes and bounded trust before injury/football, retain once-only settlement, and feed separately named relationship information into actual QB/RB/CB clue thresholds without RNG or historical shape changes.
  - [x] Save due academic review and activation/checkpoint/restriction ledgers using shared WR arithmetic; make Study Hall change eligibility, compose restrictions with actual injury/game caps, and preserve migrated dates without retroactive penalties.
  - [x] Persist canonical event attempts/required choices after academics, including selected/miss/empty-pool evidence, four-slot effects, prior football context, zero-draw choices, injury/Game Day consequences, and strict history/RNG replay.
  - [x] Extract shared NIL weighted selection and ordered effect arithmetic from WR commands, retaining historical guard/evidence/report contracts and testing all clamps, selection boundaries, immutable inputs, and unscaled obligations/defaults.
  - [x] Persist NIL handling after injury and planning accept/decline/expiry/fulfill/default decisions, including strict ledger/projection chains, actual obligation GPA provenance, and twelve-week reload/save-size coverage for QB/RB/CB.
  - [x] Consume relationship opportunity context in saved role-bounded preparation, injury workload, and actual QB/RB/CB opportunities, preserving historical absence and exact zero-snap reloads.
  - [x] Apply current authored weekly skill supplements through shared four-slot collectors, exact XP/cost/state/GPA/practice arithmetic, saved traces, and once-only passive recovery with paired supplemental copy and content validation.
  - [x] Apply positive relationship hooks with focus-time four-slot evidence, shared net-positive arithmetic, strict saved replay, and once-only trust.
  - [x] Apply positive NIL reward hooks with action-time loadout evidence and dated ownership, preserving later planning swaps and unscaled obligations.
  - [x] Finish regular-season six-source gauge and authored offer affinity with saved trigger/draw evidence.
    - [x] Extract shared explicit completed-week gauge arithmetic while preserving WR results and banking.
    - [x] Bind actual added-position sources, authored weighted pools, and saved offer/selection chains.
      - [x] Map real focus/practice/football sources and validate all 36 current card weight/affinity records; reuse canonical shared weighted sampling and zero-draw exhausted pools.
      - [x] Persist/replay gauge, weighted offers, selections, and interweek ownership/RNG chains without altering migrated pending offers.
- [x] Complete saved direct Game Day evidence/commands and independent three-focus preparation, then atomically activate current browser persistence and UI (domain v2; subsequent paged envelope v3 preserves it).
  - [x] Define/test the current season clock without changing neutral migration: old season-two offset 12; new post-bracket offset 14, including non-qualifiers.
  - [x] Wire validated dates and source ownership before direct postseason/season carryover commands.
  - [x] Cover all 32 transferred-program NIL contexts, preserving original bands and historical commands.
  - [x] Execute direct bracket planning/chosen-snap/world settlement, with source chains and truthful restricted/non-player paths.
  - [x] Complete current season summaries, saved offseason projection, bounded archives and Stay/transfer/season-two carryover.
    - [x] Publish truthful current build/stat/injury/finish summaries, world archive and exact saved shortlist with strict review replay.
    - [x] Measure full current-season JSON and verify a versioned lossless bounded archive codec against current strict save parsing.
    - [x] Retain prior current season in a bounded archive and bind Stay/transfer/season-two sources to its verified commitment.
      - [x] Bind one canonical prior-review archive, saved Stay/transfer, exact 35-draw returning room, projected world/RNG, offset-14 dates and first-game carryover, including historical absent ledgers.
      - [x] Verify complete two-season UTF-8 payload/performance budgets and current final alumni completion.
        - [x] Add tagged current wire serialization using the same lossless codec for active history, with strict decoded validation, raw compatibility and an unchanged 1 MB UTF-8 bound.
        - [x] Repeat all six complete Stay/transfer wire-size/reload probes through second review after the measured raw-size failure.
  - [x] Add shipped current create/parse/serialize adapters and checksummed v2 persistence with literal v1 compatibility, recovery, exact retry and Hub/archive preservation.
    - [x] Export/test shipped current creation, literal v1/raw-v2 migration and compact-wire parsing/serialization over the full existing mechanics builder.
    - [x] Share the version-neutral persistence transaction engine while keeping the default legacy codec/writer unchanged; stage explicit v2 envelope support.
    - [x] Add version-aware Hub identity/retirement and decoded alumni views preserving literal completion proofs; 248 web tests/static checks pass.
    - [x] Finish the persistence/Hub full aggregate/build and current-build browser regression checkpoint: 932 tests and 14 bilingual production journeys pass.
  - [x] Activate bilingual current purpose screens and every direct Game Day/off-field/season/completion phase together.
    - [x] Expose exact read-only domain planning/availability/proficiency projections before current UI consumers; 935 tests/static/build pass.
    - [x] Stage paired three-focus planning, four-slot build and direct phase components, then switch current App/Hub state and writer together.
      - [x] Stage three independent focus selections, config proficiency and exact ordered forecast; six paired interaction cases, 254 web/348 content tests and build pass.
      - [x] Stage four-slot current skills, authored supplement copy, saved progress sources and locked/pending acquisition states; 947 aggregate tests plus all 12 skill UI cases pass.
      - [x] Stage direct practice/academic/event/injury/preview/snap/result/post-game screens over authoritative evidence; 18 bilingual cases and all 971 tests/static checks pass.
        - [x] Share zero-draw kickoff initialization and expose evidence-only capped preview; 953 tests/static/build pass.
      - [x] Stage current NIL decisions/projected status, historical pending events, offseason and completion before coherent App/Hub/writer activation.
        - [x] Expose actual available NIL commands and exact projected effects with zero RNG; static checks and 21 focused NIL cases pass.
        - [x] Stage paired NIL current-state/offer/obligation/actual consequence screens; six bilingual UI cases and all 980 tests/static/build pass.
        - [x] Stage historical pending events and bracket/offseason/completion; all 1,004 tests/static/build pass.
          - [x] Preserve migrated pending-event choices through the current command and save boundary; six bilingual tests/static checks pass.
          - [x] Preserve literal v1 saves paused at offseason decisions through an exact guarded current-command bridge; all 986 tests/static checks pass, including every saved option at both indices for all three positions.
        - [x] Compose the current five-purpose shell and activate all App commands, mixed-version Hub decoding and v2 writer together; 1,028 aggregate tests/static/build and 14 production journeys pass.
          - [x] Verify the five-purpose shell, transferred real roster names, all attributes, saved comparison/history, navigation and save locks; 12 bilingual shell cases/static/351 content tests pass.
          - [x] Verify live current App dispatch/writer/Hub publication and exact retry/reload; twelve direct App cases and six additional retirement/archive cases pass.
  - [x] Close M7 chunk budgets and complete the M7 gate before M7.5 presentation work.
    - [x] Split football/locale modules, lazy-load both career screens and enforce emitted-JS/offline/preload budgets; all 1,034 tests/static/build pass.
    - [x] Finish the full production matrix and two-season current QB/RB/CB UI/native retry journeys; initial-creation retry fix has six passing App cases and static checks, aggregate/build/native verification pending.
      - [x] Verify initial-creation exact retry and Home calendar/fixture context; 1,040 aggregate tests/static/build and explicit 351 content / 339 simulation tests pass. Korean QB two-season native probe passes.
      - [x] Complete final current profiles and all 90 production executions (12 added-position two-season executions included), then close out M7.
        - [x] Diagnose late-season QB save rejection with reproducible seed/envelope evidence; retain exact save/retry and size guards.
          - [x] Reproduce valid-history overflow at QB revision 207 with fixed browser-life UUID suffix 4 (1,061,282 expanded regular-history characters).
          - [x] Finish atomic snapshot-pruning rollback/retention checkpoint before changing wire compatibility; 1,047 aggregate/351 content/static/build/PWA pass.
          - [x] Stage explicit partitioned wire/envelope version with unchanged codec/save guards and literal old readers, then activate version-aware App/Hub and verify complete current-life careers.
            - [x] Verify core canonical-page/strict-wire foundation and exact all-position historical/current domain preservation (18 focused cases/static).
            - [x] Add shipped v3 adapters with read-only v1/raw-v2/wire-v2 compatibility and strict future/malformed rejection (three position cases/static/core-content-testkit builds).
            - [x] Re-run the exact overflowing QB browser-life seed with v3: both Stay/transfer retire, 356 exact reloads, 614,619 peak wire bytes / 590.954 ms command.
            - [x] Verify version-3 codec/Hub mixed migration/recovery/original proofs/older-writer protection/native pruning rollback (56 focused cases/static).
            - [x] Verify all full current-life/original profile paths with whole-envelope/page telemetry, then current App activation and native long careers.
              - [x] All eighteen original/browser-life Stay/transfer profiles pass: 3,155 exact reloads, peak whole envelope 624,692 bytes and all unchanged page/command guards.
              - [x] App v3 passes 24 bilingual current-publication/completion cases, including v2-to-v3 save boundaries/exact retry; final static/format and build/export/PWA pass (21 precache / 1814.68 KiB, every chunk under 500 kB).
              - [x] Complete web regression: all 375 cases across 28 files pass, including old WR/transfer/recovery and current Hub paths.
              - [x] Isolated explicit content: all 351 cases pass, including the two prior concurrent-run timeouts without code/timeout changes.
              - [x] Full workspace: all 1,069 tests/111 files plus eight script checks pass; repository-wide formatting/whitespace pass.
              - [x] Explicit simulation: 343 cases/47 files; final typecheck/lint pass. Start the complete native matrix on the verified v3 build, without concurrent profiling.
        - [x] Verify the completion-candidate Hub scan, truthful completed-New-Career copy and retry, then repeat native full-career journeys without increasing per-operation expectations.
          - [x] Preserve full candidate validation while skipping nonterminal snapshot replay; repository static, 26 focused cases and build/PWA pass, including all-position/locale failed New Career and exact retry.
          - [x] Verify native completed-New-Career latency and expand current size/profile coverage to the actual browser life/NIL strategy before the final gate.

## M7.5 — Career Operations and Game Day Experience

- [x] B1b prerequisite: exact neutral WR v7→v8 career/session migration and staged readers; retain current v7 aliases/writer and literal lifecycle/Game Day/world/RNG evidence (668 affected cases plus focused injury/static/core-build gate).
- [x] B1b WR owning play-kernel pre-context/physical evidence staging, all twelve decisions and exact six-draw historical parity (373 core/testkit, ten season content and static/format green); drive/retention/replay still required before activation.
- [x] B1b WR owning-drive evidence staging: current-only clock/goal-to-go initialization and remaining player-drive aggregate, 64 full seeded kernel games; 375 core/testkit, ten season content and static gate pass. Retained-result/v8 replay and shipping activation remain pending.
- [x] B1b WR detached resolved boundary plus exact source-bound replay and shared command input checks; 376 core/testkit, ten season content and static green. Full current-game/v8 retention and validation still precede writer activation.
- [x] B1b WR complete current-game record/source replay, shared kickoff/completion and retained pending/resolved/post-game boundaries; 379 core/testkit, ten season content and static green. Aggregate v8 integration and full save budgets remain before activation.

- [ ] B6 (after B2–B5): actual four-position full-career UI parity pass, including Creation/Recruiting, all five destinations, Game Day/post-game, Injury/Event, postseason, Transfer/Stay, second season and Retirement/New Career.
- [ ] B6: fix blank/stale surfaces, inappropriate WR copy/stats, missing controls, hierarchy and mobile defects; retain shared shell with QB reads/targets/pressure, RB gaps/cuts/protection, WR release/routes/coverage, CB leverage/coverage/ball/tackle.
- [ ] B6: visually recheck both locales and mobile/desktop/320 px, document journey evidence and beginner comprehension; any materially inferior required experience blocks Phase C completion and M8 even if automated checks pass.

Mandatory before M8 under `docs/exec-plans/active/m7-5-playtest-correction.md`. The round-two live-playtest review is authoritative product evidence, not isolated polish.

- [x] Reproduce and fix Team after transfer through one authoritative current-program selector; cover QB/RB/WR/CB, reload, offline, and recovery.
- [x] Guarantee deterministic full-name uniqueness and diversity-weighted token reuse, expand bilingual name pools, and check in a seeded repetition report.
- [x] Ship a production Career Hub with Continue, New Career, atomic Abandon, Alumni/Legacy, save/recovery status, and separately confirmed Reset All Data while preserving meta/settings.
- [x] A3a: Verify atomic clear-and-write batches in IndexedDB and memory, including reset, preservation, and rollback.
- [x] A3b: Persist retirement/reset with confirmation freshness, stale-save protection, and completed-position history retention.
- [x] A3c: Complete bilingual Hub controls and four-position browser/failure/recovery coverage.
- [ ] Add a pure zero-gameplay-RNG snap-presentation projection over authoritative QB/RB/WR/CB evidence with an LB/EDGE-extensible contract.
    - [ ] Establish explicitly versioned missing current field/clock/score and retained pre/post context in owning engines, preserving literal historical absence and already-started games.
      - [x] B1a: Pin four literal historical engine outcomes and add strict detached pre-snap context; 49 focused/354 content cases and static/format checks pass.
      - [x] B1b: Stage explicitly selected new-game tactical rules/context in existing owning engines; preserve six resolution draws and literal old outputs. WR current v8 career/session replay and four-position staging pass 1,117 workspace/ten script cases, static/build/PWA; no live caller yet.
        - [x] Stage shared field/aggregate helpers and QB new-game opt-in; 27 focused/357 content/360 simulation cases and static checks pass, including exact draw-budget edges.
        - [ ] Extend RB/CB, then WR owning drive/retention rules without changing shipping callers or literal historical outputs.
          - [x] Stage RB/CB alongside QB with all-choice/low-high-information/reload/no-target/protection/tackle tests; 1,098 workspace/363 content/360 simulation/static/build/PWA pass.
          - [ ] Establish neutral WR v8 career/session migration and exact v7 reader isolation before extending whole-career-validating WR commands.
          - [ ] Implement versioned WR drive/field correction and retained result boundary, preserving already-started literal games.
      - [ ] B1c: Version current session/save activation, preserve already-started games, and verify full replay/history/budgets before enabling new rules.
        - [x] Explicit WR v8 Game Day command staging and byte-literal migrated in-progress routing; 316 core/38 focused, repository static/core build green.
        - [x] WR current post-game/lifecycle bridge with full-source validation, failed retry retention, unchanged actual football state and auxiliary/meta preservation; 316 core/38 focused/ten season content plus static/core build green.
        - [x] Add full WR v8 two-season diagnostic profiles with strict reload/size/latency guards; reproduce the previously untested second-season terminal gap in all four paths (full-life gate remains red).
        - [x] Add explicit versioned WR second-season review/retirement and truthful two-season alumni, preserving literal single-season contracts; repair all four terminal domain profiles before B1c/B6 acceptance (actual UI still pending).
          - [x] Source-validated two-season review and explicit v8 publication/reload, distinct season versus career statistics; 386 core/testkit and ten season content plus four full-profile review checks green.
          - [x] Explicit retirement, compact lossless versioned alumni/mixed meta and fresh creation; all four domain profiles pass, 1,126 workspace/ten script cases and static/build/PWA green.
          - [ ] Atomic persistence, repeated-career meta capacity/paging and actual UI completion.
        - [ ] Complete WR current two-season profiles, v8 codec/writer and coordinated UI activation.
          - [x] Stage authenticated save-8 envelope codec with literal original v1–v7 proofs separate from migrated sessions; 52 storage cases and scoped static gate green.
          - [x] Lightweight canonical meta registry with literal separate alumni, shared familiarity arithmetic, four actual retirement paths and 1,000-reference capacity/identity/revision/failure checks; 390 core/testkit + ten content/static/export gate green.
          - [x] Paged registry wire plus independently authenticated alumni records; 8,000-reference paging, actual terminal/detail envelopes, 61 storage/four core/static/export gate green.
          - [x] Shared WR engine codec boundary and unselected v8 facade: 388 web/static gate, exact previous proofs, current game transaction/retry/recovery and foreign-snapshot isolation.
          - [x] Staged atomic v8 session/meta/detail/snapshot/recovery publication: 390 web/final 11-case sentinel/static/PWA gate; actual memory/IndexedDB abort/retry, two current retirements and literal legacy migration pass.
          - [x] Stage WR aggregate frontend command dispatcher and bounded read-only Hub history port; two full current command paths and 12 storage/history tests plus scoped static gate pass.
          - [x] Shared read-only WR v7/v8 presentation plus explicit resolved-snap continuation and two-season review/completion panels; 404 web/363 content/322 core, repo static and build/PWA green (2026-09-29). App shell still selects v7.
          - [ ] App/Hub wiring over the staged dispatcher/storage; added-position retained-current aggregate integration, then coordinated activation and required production browser coverage.
  - [ ] Map every current position into detached public/earned-information frames with original schematic geometry, truthful historical fallback and no hidden probabilities or future outcome leakage.
- [ ] Ship the responsive accessible 2D Tactical Snap Board, plain-language-first decision preview, deterministic resolved play, score/drive atmosphere, and post-game story/reactions.
- [ ] Pass both locales, mobile/desktop/320 px, keyboard/screen-reader, reduced-motion, online/offline, failure/retry, transfer, historical compatibility, PWA, and full aggregate gates.

## M8–M10

Detailed tasks may be decomposed when the preceding milestone stabilizes. Use `MASTER_ROADMAP.md` as the acceptance source and add atomic backlog items before implementation.

### M8 balance notes (for step 6)

- [ ] Player-game ties are frequent (two or three a season), because the detailed kernel's background scores run low. Decide on an original deterministic overtime or tiebreak rule in the owning core, with history compatibility for recorded ties.
- [ ] Recruits at building/competitive programs go about 4-8 and seldom win a conference. Check whether the climb (transfer up, development) gives a realistic playoff path. Tune in the six-position harness, not in presentation.
- [ ] Draft stock over sampled careers is 55-65 at weaker programs (late round or undrafted). Recheck the bands once the playoff path and production (staff grades) are tuned.
