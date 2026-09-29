# M5 One-Season WR Vertical Slice Execution Plan

## Status

Completed and aggregate-verified on 2026-09-01. M5 ships the version-5 aggregate persistence boundary, deterministic season/world flow, 57-event original bilingual catalog, bounded injury/recovery model, complete 40-card skill catalog, postseason/review/completion/alumni/legacy flow, public-command full-season evidence, complete bilingual mobile UI, and production-browser season gates. The durable target remains M10; M6 activates immediately after this plan is archived.

## Goal

Turn the verified creation, recruiting, weekly development, depth, skills, and Game Day systems into one complete deterministic WR season: fall camp, a fictional regular-season schedule, contextual events, injuries/recovery, standings/postseason, season review, a durable alumni record, and a second career that can see the first alumnus. The whole path must be playable in Korean and English without developer tools and must retain all v1–v4 save, RNG, localization, accessibility, content-validation, and PWA guarantees.

## Scope

- Introduce a versioned active-career aggregate containing `CareerRun`, `WorldState`, and season/calendar state so a saved player game and the fictional world cannot diverge.
- Introduce a separately versioned `MetaProfile` for alumni history and bounded legacy visibility across careers.
- Migrate checksum-valid v1–v4 career saves without changing their identity, existing phase evidence, revision, or career RNG. A migrated in-flight week/game finishes literally before the new calendar starts at its next safe boundary.
- Add a data-driven fall-camp and one-season calendar for the existing 12 original programs, with player fixtures, deterministic other-game results, standings, and a compact postseason path.
- Reuse M4's game simulator by passing schedule-owned explicit opponent/home inputs; do not fork or duplicate game rules in calendar/UI code.
- Add a deterministic event engine with eligibility, cooldown, weighted selection, persisted pending choice/evidence, and 50–70 original bilingual events across WR/depth, identity, program, and game context.
- Add a bounded fictional injury/recovery baseline driven by visible risk evidence, Body, Durability, workload, recent training, skill hooks, and seeded RNG.
- Expand the stable skill catalog from 27 toward approximately 40 original bilingual WR cards, adding only effects with live season/event/injury/game/weekly consequences.
- Add season review, ending, alumni snapshot, bounded first legacy visibility, explicit career replacement, and a second-career start path.
- Add deterministic season testkit reports, production UI, exact save/reload/offline coverage, performance evidence, and an end-to-end bilingual browser gate.

## Non-goals

- NIL contracts, relationship simulation, transfer decisions, coach/scheme changes, or a multi-season offseason loop; those remain M6 scope.
- Real schools, conferences, postseason rules, awards, logos, schedules, players, text, events, or proprietary reference-game mechanics/presentation.
- Full 96-program world simulation, player-by-player distant rosters, full statistical leaderboards, or exact real-world tiebreakers.
- A complete pro draft system. M5 records an original vertical-slice career ending and alumni history; draft-stock/declaration depth expands in later milestones.
- Replacing the deterministic M4 key-snap engine or weakening role scarcity to make a season easier.

## Relevant specs

- `AGENTS.md`, `ARCHITECTURE.md`, and package-scoped `AGENTS.md`
- `docs/00-project/PROJECT_CONTEXT.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/CORE_LOOP.md`
- `docs/product-specs/PLAYER_MODEL.md`
- `docs/product-specs/PROGRAM_WORLD.md`
- `docs/product-specs/LEAGUE_AND_POSTSEASON.md`
- `docs/product-specs/EVENT_SYSTEM.md`
- `docs/product-specs/INJURY_AND_RECOVERY.md`
- `docs/product-specs/SKILL_SYSTEM.md`
- `docs/product-specs/META_PROGRESSION.md`
- `docs/product-specs/DRAFT_AND_CAREER_ENDINGS.md`
- `docs/product-specs/SAVE_SYSTEM.md`
- `docs/product-specs/CONTENT_DENSITY.md`
- `docs/product-specs/BALANCE_PHILOSOPHY.md`
- `docs/product-specs/LOCALIZATION.md`
- `docs/product-specs/UX_AND_FLOW.md`
- `docs/product-specs/ART_AND_PRESENTATION.md`
- `docs/engineering/CONTENT_ARCHITECTURE.md`
- `docs/engineering/TEST_STRATEGY.md`
- `docs/engineering/PERFORMANCE_AND_PWA.md`
- `docs/qa/ACCEPTANCE_SCENARIOS.md`
- `docs/qa/BALANCE_TARGETS.md`
- `docs/qa/CONTENT_QA.md`
- `docs/execution/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/execution/DEFINITION_OF_DONE.md`

## Authoritative M5 state baseline

- Save envelope/version 5 stores one `CareerSessionV5`. The session owns one `CareerRunV5` and one `WorldStateV1`; successful commands publish and snapshot the aggregate atomically.
- `CareerRunV5` retains all v4 fields/evidence and adds only season-facing player state that belongs to one career: cumulative season/career statistics, current availability/injury evidence, event history/cooldowns, season outcome, and completion metadata.
- `WorldStateV1` owns the fictional season definition, current calendar cursor, all 12 program records, schedule/results, standings inputs, postseason bracket/status, and its own serialized seeded RNG. It does not own player attributes, skills, or active key-snap evidence.
- Active schedule/game orchestration receives a `CareerSessionV5` and delegates football resolution to the existing public M4 commands with explicit schedule-owned opponent/home mechanics. Player and world results update in the same successful transition.
- `MetaProfileV1` is stored separately from the active session and contains immutable alumni summaries, aggregate discoveries/unlocks, and program familiarity. Completing a career writes the final session snapshot and meta update as one storage-level transaction before the UI publishes completion.
- New phase variants distinguish fall camp, weekly recap, optional event choice, scheduled Week End/Game Day, postseason, season review, and career completion. Existing v4 phases remain valid migration inputs and are never inferred from a route.
- A migrated v1–v4 save receives a deterministic pending calendar bootstrap marker without consuming or rewriting career RNG. Any in-flight plan/action/breakthrough/preview/snap/post-game completes with its original rules; calendar bootstrap happens only on the following safe planning boundary.

## Conservative season baseline

- One M5 career contains three fall-camp development weeks, twelve regular-season games, and a compact fictional postseason path configured in content.
- The 12-program regular season uses a validated deterministic round-robin-derived fixture matrix with one authored rivalry/spotlight round. Every program plays at most once per round; no program plays itself.
- Other games use a bounded aggregate simulator and the separate world RNG. Current player games continue using detailed M4 simulation and career RNG. Stable result evidence permits standings and exact replay without simulating unseen key snaps.
- Standings sort by wins, then head-to-head when available, then authored schedule-strength evidence, then stable program ID. The first vertical-slice postseason uses a configurable four-program bracket; non-qualifiers receive a localized season-ending outcome rather than a fabricated playoff appearance.
- M5 deliberately completes the first one-season vertical-slice career after season review. The alumnus records `seasonsPlayed: 1`; M6+ may add return/transfer/multi-season decisions through a new migration rather than pretending they already exist.
- Events are optional by eligibility/density, never guaranteed every week. Exactly one pending event at a time may interrupt the safe weekly boundary; resolving a choice is one immutable saved command.
- Injury categories are fictional gameplay severity bands. Visible risk factors and restrictions are persisted; no medical advice or opaque catastrophic roll is presented.
- Legacy visibility in the second career is history-first: the prior alumnus appears in a localized alumni/program-history surface and may unlock at most one bounded option. It does not grant starter status, guaranteed rare skills, or large attributes.

## Atomic delivery steps

1. **Completed 2026-09-01.** Implement the version-5 persistence skeleton only: `CareerSessionV5`, `CareerRunV5`, `WorldStateV1`, `MetaProfileV1`, strict v4 fixtures for every weekly/game phase, v1–v5 migration convergence, checksummed browser envelope/session migration, atomic active-session snapshots, meta storage, and future-version protection. Add the pending calendar-bootstrap marker but no live season commands.
2. **Completed 2026-09-01.** Define and validate the season/world content contract: three camp rounds, twelve regular rounds for all 12 programs, opponent/home fixture integrity, aggregate team ratings, standings/tiebreak tuning, four-team postseason configuration, season outcome IDs, and simultaneous ko-KR/en-US presentation.
3. **Completed 2026-09-01.** Implement deterministic calendar/world commands and the aggregate other-game simulator. Bootstrap only at a safe boundary, advance camp without a game, prepare schedule-owned player games through M4, atomically record player/other results, update standings, and prove termination/order independence/replay.
4. **Completed 2026-09-01.** Implement the event schema/engine before the full writing batch: stable event/choice IDs, tags and state predicates, exclusions, cooldowns, weighted seeded selection, no-event outcome, persisted pending phase, supported effect registry, choice evidence, rejection immutability, and content validation. The initial three-event bilingual set proves the mechanics and is not counted as completion of the density target.
5. **Completed 2026-09-01.** Author and validate 50–70 original bilingual events in reviewable batches. The shipped 57-event catalog contains 20 WR/depth, 16 background/personality/identity, and 22 program/game-context events by category union; every event has two mechanically distinct choices, paired natural Korean/English copy, stable IDs, supported consequences, available tag sources, and satisfiable predicates.
6. **Completed 2026-09-01.** Implement the injury/recovery baseline and its content: visible risk evidence, deterministic roll protocol, severity/restriction/absence state, recovery progression, availability effects on practice/game opportunity, player choices where meaningful, skill hooks, and distribution tests across Body/Durability/workload bands.
7. **Completed 2026-09-01.** Expand the skill catalog to exactly 40 cards and activate the remaining season/event/injury hooks. All 27 prior IDs/effects remain in place; thirteen additive original bilingual cards produce the target 8/7/10/5/6/4 family split and 13 validated tradeoffs. Every card is offer-reachable; Development, Game Day, and Body builds have distinct live evidence; Body cards can alter persisted injury risk; Campus Bridge unlocks an exclusive contextual event; and explicit 27-card historical catalogs keep the checked M3.5/M4 reports byte-stable.
8. **Completed 2026-09-01.** Implement postseason, season review, career completion, alumni/meta transaction, and second-career legacy visibility. The deterministic 1-v-4/2-v-3 bracket handles qualifiers and non-qualifiers, persists every result/advancing team and its higher-seed regulation-tie evidence, retains game and role histories, projects a complete season review, closes through explicit `SEASON_REVIEW` and `CAREER_COMPLETE` phases, and atomically writes the final session snapshot/current record plus the versioned alumni/meta record. Alumni retain identity/appearance, program record, player totals and best game, role trajectory, skills, injury history, outcome/rank/seed, career seed, and schema/content versions; the first legacy reward is history-first program familiarity plus one bounded option with no starting power.
9. **Completed 2026-09-01.** Add public-command season builders and a checked-in content-version-pinned M5 report. The builder executes creation, recruiting, season bootstrap, all weekly actions, events, injuries, games, breakthroughs, postseason, review, career completion, and legacy projection through exported commands with an exact session/meta JSON round trip after every requested transition. The 122,643-byte report fixes six literal careers, 72 regular-season and two player postseason games across all three recruit tiers, program bands, and WR archetypes; five weekly strategies; six build policies; 28 observed events; both injury choices; all four roles and six skill families; and two qualifier/four non-qualifier endings. It records reproduction strings, uses a bounded runtime assertion, and locks the exact M1–M4 plus M3.5 report hashes.
10. **Completed 2026-09-01.** Build the bilingual mobile season UI: calendar/recap, camp/regular/postseason context, event choice, availability/risk, standings summary, season review, alumni history, completion, and explicit second-career start. The Week/Home season overview now projects the saved calendar, record, rank, next opponent, availability, injury risk, and top-four standings; phase-owned panels cover bootstrap, contextual event consequences, bounded injury choices, postseason handoffs, complete season review, atomic alumni completion, and returning-history creation. Production uses aggregate session/meta persistence and deferred publication; failed final transactions keep review authoritative and retry the exact payload. Nineteen new web tests cover every saved surface in both locales, orchestration, portrait identity, exact evidence interpolation, command lockout, failure focus/retry, exact final session/meta reload, and visible second-career history.
11. **Completed 2026-09-01.** Add Korean/English production-browser season journeys on native mobile/desktop plus 320 px. Five full shipping-UI careers now complete every week without developer commands, exercise deterministic event and injury branches, prove exact online/offline reload, verify aggregate session/meta storage and failed final-transaction retry, publish alumni, and start a distinct second career with visible history. Preserved M1–M4 journeys were reconciled with the production camp cadence without bypassing season commands.
12. **Completed 2026-09-01.** Run the complete M5 gate, profile the full-season path and aggregate world advance, perform the available high/medium review, synchronize product/QA/execution docs, complete this plan, and activate M6. The final gate passes 510 root tests, 105 content tests, 255 deterministic core/testkit tests, and 41 Playwright executions with one intentionally skipped duplicate desktop 320 px run, plus typecheck, lint/boundaries/localized-copy, formatting, package/export/PWA verification, and production build. Three direct six-career report profiles completed 1,060 command/serialization/validation round trips in 3.41–3.83 seconds (3.22–3.61 ms per round trip). Browser review found and fixed world-only session revisions being misclassified as equal-career conflicts; regression coverage rejects world rollback and no unresolved high/medium issue remains. The only production diagnostic is the non-fatal 1,082.96 kB main-chunk warning.

## Acceptance criteria

- All checksum-valid v1–v4 saves migrate to one strict version-5 session without losing or reinterpreting identity, appearance, attributes, program/room/depth, weekly/game evidence, skill state, revision, or career RNG. Future/mismatched data remains protected.
- A new career can complete fall camp, twelve scheduled regular-season weeks, the configured postseason/end path, season review, career completion, alumni write, and second-career start entirely through shipping UI.
- Same session, world/career RNG states, content version, and choices reproduce identical events, injuries, other-game results, standings, player games, postseason, review, and alumni record across JSON/IndexedDB reload.
- Schedule data contains no self-games or duplicate round participation. Player preview opponent/home state comes from the saved fixture, and M4 game rules remain the only detailed football simulator.
- Events respect identity/context tags, cooldowns, and density; no career receives a generic mandatory event every week. Both locales communicate equivalent consequences, and every effect is engine-supported and validated.
- Injury risk is explainable and bounded, uses deterministic RNG, affects availability/opportunity truthfully, and does not create invisible arbitrary punishment. Simulation reports segment outcomes by Body, Durability, workload, and build.
- The additive skill catalog approaches 40 original bilingual WR cards with meaningful live consequences across all six families and no renamed shipped IDs.
- Season review and alumni records remain meaningful for stars, role players, injured careers, and non-qualifiers. The second career visibly recognizes prior history without automatic dominance.
- Production UI remains keyboard/touch accessible with no horizontal clipping at 320 px in Korean or English. Every new visible string ships in both locales in the same change.
- Full-season advancement stays within the documented main-thread budget or moves behind an explicit async boundary based on profiling evidence.

## Verification plan

- Literal v4 phase fixtures plus malformed session/world/meta matrices; exact checksum, lazy migration, caller isolation, freeze, recovery ranking, snapshot retention, and atomic session/meta transaction tests.
- Content tests for fixture cardinality, per-round uniqueness, opponent/home symmetry, postseason references, stable event/choice/injury/skill IDs, effect support, reachability, cooldowns, locale parity/interpolation, and originality review.
- Core tests for safe-boundary bootstrap, camp/regular/postseason phase gates, aggregate results, standings ties, schedule-owned M4 delegation, event selection/choice, injury rolls/recovery, season totals, alumni projection, and all rejected-command zero-draw behavior.
- Testkit full-season scenarios with save/reload after every requested command, distribution summaries, prior-report hash protection, and a bounded timing assertion.
- Web component tests for every new saved surface, failed save/retry, focus, lockout, both locales, and exact evidence formatting.
- Playwright full-season paths in both locales/mobile/desktop and true 320 px, exact IndexedDB session/meta assertions, representative offline resumes, PWA update/artifact verification, and final `corepack pnpm check`.

## Risks and reversible assumptions

- The version-5 session aggregate is the smallest way to keep `CareerRun` and `WorldState` atomic in a local-only PWA. Cloud synchronization remains behind the storage adapter.
- A 12-program detailed/aggregate hybrid is sufficient for the vertical slice. Expanding to 32/64/96 programs changes content and fidelity tiers, not the saved separation between career and world.
- The first complete career ends after one season so M5 can verify alumni and replay now. Later return/transfer/declaration decisions require explicit migrations and must not silently extend completed M5 alumni.
- Four-program fictional postseason qualification is tuneable content, not a claim about real college-football rules.
- Event and skill quantity targets are completion constraints, but content ships in validated batches after the engine contracts are green; quantity never justifies generic filler or copied material.
