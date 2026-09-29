# M4 First Game Simulation and WR Key Snaps Execution Plan

## Status

Completed on 2026-09-01. All nine atomic steps are implemented and aggregate-verified. The final focused review found one medium successive-key-snap keyboard-focus defect, fixed it with regression coverage, and found no unresolved high/medium core, content, or UI issues.

## Goal

Deliver one complete, legible, deterministic college-football game for the player's committed WR: simulate all non-player possessions quickly, pause for a role-scaled set of meaningful player decisions, make film/IQ/cards alter information or outcomes through explicit evidence, and persist a bilingual post-game result, stat line, grade, growth, and career record.

## Scope

- Advance `CareerRun` and browser save envelopes once, and only once in M4, from version 3 to version 4 while retaining exact v1/v2/v3 readers and migrations.
- Preserve the existing practice/depth `WEEK_END`; committed v4 careers explicitly prepare a game from that phase, enter a preview, and reach post-game before week advance. Historical uncommitted saves retain their established non-game compatibility path.
- Add compact serializable opponent, matchup, drive, clock/down/distance, score, player opportunity, stat-line, decision, play-evidence, grade, growth, and cumulative game-history contracts.
- Simulate non-player possessions and plays behind the scenes, pausing only when the WR's projected role creates a meaningful key snap.
- Scale participation by role: WR1 6–10 key decisions, WR2 4–8, WR3 2–6, WR4 1–4, and bench 0–2 offensive decisions. Every scheduled game still gives the athlete a meaningful Game Day surface and role-appropriate feedback.
- Ship eight original WR key-snap patterns across release, route/leverage, catch approach, and YAC/security families, with three athlete-level decisions per family.
- Make Football IQ, recent Film Study, and Coverage Ledger reveal more persisted coverage/leverage clues without changing the hidden context or forcing the result.
- Resolve player outcomes from WR attributes, matchup, decision fit, offense/QB context, Body/confidence, equipped game hooks, and seeded RNG, returning structured evidence.
- Produce a team result plus targets, catches, yards, touchdowns, drops/turnovers, decision-fit summary, performance grade, Body/confidence/trust changes, attribute XP, last-game summary, and cumulative career stats.
- Add replayable testkit evidence, bilingual mobile UI, exact autosave/reload/offline behavior, and production browser journeys.

## Non-goals

- A full season schedule, standings, rankings, conferences, postseason, rivalry calendar, fall camp, injuries, penalties, special teams detail, coach play-calling, audibles, full team rosters, or a possession-by-possession user interface; those belong to M5+.
- Full NCAA rules fidelity, licensed opponents, real playbooks, real schemes, broadcast assets, copied football-game text/layout, or any proprietary data.
- User control of the quarterback, team play call, defensive unit, timeout strategy, or every offensive snap.
- A separate persisted `WorldState` before M5 needs schedules and other simultaneous games. M4 stores the current matchup and cumulative player-facing game history inside `CareerRun`.
- Moving depth evaluation to post-game. Practice still produces the existing pregame depth result; post-game trust/growth feeds future evaluation rather than causing a second same-week chart swap.
- Expanding the skill catalog beyond the M3.5 ecology target. M4 consumes the game/preparation/role hooks established by M3.5 instead of defining the skill model independently.

## Relevant specs

- `AGENTS.md` and all package-scoped `AGENTS.md` files
- `ARCHITECTURE.md`
- `docs/00-project/PROJECT_CONTEXT.md`
- `docs/00-project/TERMINOLOGY_KO_EN.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/CORE_LOOP.md`
- `docs/product-specs/PLAYER_MODEL.md`
- `docs/product-specs/GAME_SIMULATION.md`
- `docs/product-specs/POSITION_DESIGN.md`
- `docs/product-specs/SKILL_SYSTEM.md`
- `docs/product-specs/DEPTH_CHART.md`
- `docs/product-specs/SAVE_SYSTEM.md`
- `docs/product-specs/UX_AND_FLOW.md`
- `docs/product-specs/BALANCE_PHILOSOPHY.md`
- `docs/product-specs/CONTENT_DENSITY.md`
- `docs/product-specs/LOCALIZATION.md`
- `docs/engineering/CONTENT_ARCHITECTURE.md`
- `docs/engineering/TEST_STRATEGY.md`
- `docs/engineering/PERFORMANCE_AND_PWA.md`
- `docs/qa/ACCEPTANCE_SCENARIOS.md`
- `docs/qa/BALANCE_TARGETS.md`
- `docs/qa/CONTENT_QA.md`
- `docs/execution/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/execution/DEFINITION_OF_DONE.md`

## Authoritative M4 state contract

- `CareerRunV4` keeps every M3 field, adds Preparation to the current player state, adds an immutable `gameCareerState`, and expands the phase union without removing `PLAN_ACTIONS`, `RESOLVE_ACTIONS`, `WEEK_END`, or `SKILL_BREAKTHROUGH`.
- `gameCareerState` stores games played/won/lost/tied, cumulative WR stats, cumulative grade points, and the latest completed game summary. The active game remains phase-owned so there is no divergent second copy.
- `GAME_PREVIEW` stores a stable game ID, week, selected/opponent program IDs, home/away, offense/opponent ratings, pregame depth/projection, weekly results/depth evidence, and a zero-draw opportunity budget derived from the persisted projected snap range.
- `KEY_SNAP` stores the complete active game plus one persisted pending decision. The active game owns period/clock, down/distance/field position, possession/drive counters, score, opportunity counts, current stats, compact key-play evidence, RNG draw ranges, and the exact accumulated skill-hook evidence needed for replay and explanation.
- A pending key snap stores one stable pattern/family, hidden coverage/leverage/matchup context, exactly three legal decision IDs, information score/tier, and the clue IDs actually revealed. Presentation never recomputes or infers a clue.
- `POST_GAME` stores the final team result, stat line, exact compact key-play log, grade/growth evidence, player state before/after, exact game RNG range, weekly results/depth evidence, and a summary identical to `gameCareerState.lastGame`.
- Every game command validates current phase, complete mechanics catalogs, all cross-references, revision/draw bounds, and current CareerRun. Failure returns the identical career and consumes no RNG.
- v3-to-v4 migration preserves identity, program/room/depth, weekly/skill phase, results, week, revision, and RNG exactly, adds neutral Preparation 50 and an empty `gameCareerState`, and consumes no RNG. A migrated `WEEK_END` remains `WEEK_END` and enters the game only through an explicit command.

## Deterministic game baseline

- The content adapter selects the next M4 exhibition opponent by canonical program order, starting after the player's program and rotating by `weekIndex`; it never selects the player's own program and consumes no RNG. M5 may migrate this input to schedule-owned matchups.
- Opportunity budget derives only from the midpoint of the pregame snap projection plus bounded rotation tuning. The role targets are WR1 6–10, WR2 4–8, WR3 2–6, WR4 1–4, and bench 0–2 offensive decisions. Game script may change timing/context, not create unbounded decisions.
- Authored opportunity tuning carries explicit WR1-through-WR8 minimum/maximum bounds in addition to the snap-share bands. The simulator may use the bands to derive a raw budget, but must clamp it to the persisted pregame rank so wide rotations cannot accidentally give WR3/WR4 starter-scale control.
- Players with zero offensive decisions still receive an original, role-appropriate participation summary drawn from special teams, package work, garbage-time reps, sideline learning, or scout-team preparation. This feedback does not fabricate offensive stats.
- The compact game contains four 900-second periods and alternating abstract possessions. Non-player drives consume seeded RNG for duration and 0/3/7-point outcomes based on offense/defense ratings. User-team possessions pause only at their preallocated key-opportunity slots.
- Each key snap uses a fixed documented draw protocol for pattern/context/matchup and resolution. Catalog input order never affects selection; rejected commands and UI-only inspection consume none.
- One decision is athlete-level. Release, route/leverage, catch, and YAC/security families each expose exactly three stable choices. Pattern/context declares decision-fit values; no choice is universally correct across contexts.
- Information score uses Football IQ, the completed week's Film Study evidence, and the equipped Coverage Ledger hook. It selects which persisted clue IDs are revealed. Neither information tier nor clue visibility is used in the success formula.
- Information score uses a 650/350 Football IQ/Preparation split before the bounded Film Study bonus. Outcome score uses fixed authored weights for attribute fit (250), defender/matchup (150), choice fit (250), QB/offense context (75), Body (75), Preparation (125), and Confidence (75), plus applicable skill hooks and a bounded seeded roll. Structured evidence records every contribution, result class, target/catch/YAC/touchdown/drop/turnover changes, and hook traces.
- Existing hooks become live exactly as authored: Coverage Ledger adds information; package access changes the pregame opportunity input within the saved role clamp; assignment reliability and eligible pressure composure change execution; High-Point Wager changes contested-catch success and tipped-turnover risk; and Open-Field Dare changes aggressive YAC and fumble risk. Hook ordering remains equipped slot then authored effect index.
- Post-game grade is a deterministic 0–100 score with a stable localized band, based on opportunity-adjusted production, decision fit, drops, and turnovers. Bounded Body/confidence/Coach Trust changes and family-specific attribute XP are persisted as evidence before the result is published.
- M3.5 handoff: Week owns preview, key-snap, and post-game surfaces. `GAME_PREVIEW` consumes the saved post-focus Body, Preparation, Confidence, Practice Grade/depth evidence, and recent Film Study evidence without re-running weekly formulas. The current six-family skill catalog is the only skill authority; M4 activates its existing ordered Game Day hooks and post-game contributes a bounded `game_day` Breakthrough Gauge source. Role opportunity ranges remain scarce, but a zero-offense budget produces truthful special-teams/package/scout/learning evidence rather than fabricated targets or catches.

## Atomic delivery steps

1. Implement the complete v4 persistence skeleton: game IDs/types, neutral game-career totals, new phase contracts, strict v3 fixtures for every current phase, v3-to-v4 and full migration chains, raw invariants, checksum save-envelope v4 compatibility, browser lazy upgrade, and current-writer updates. Do not add live game commands yet; all existing v4 careers carry empty game history and preserve the current phase flow.
2. After M3.5 closes, finish the staged content schemas/mechanics projections and authored M4 game tuning, opponent projections, four decision families, twelve stable decision IDs, and eight original bilingual key-snap patterns. Validate exact counts, references, three choices per family, modifier bounds, reachability, canonical ordering, both locales, and originality.
3. Implement explicit game preparation plus the compact opponent/possession/drive simulator. Preserve `WEEK_END`, derive the zero-draw preview/opportunity budget, then use a fixed seeded protocol to advance all non-player moments until either one persisted `KEY_SNAP` or a completed zero-opportunity game. Prove score/clock/down/distance bounds, role scaling, catalog-order independence, replay, and rejection immutability.
4. Implement key-snap information and resolution. Persist hidden/revealed context separately, make Football IQ/Film/Coverage Ledger change only clues, resolve all four decision families with attributes/matchup/choice/Body/confidence/RNG, activate every existing game hook with ordered evidence, and continue deterministically to the next snap or final whistle.
5. Implement post-game grading, stats, growth, player-state effects, cumulative history, and week-advance integration. Persist exact grade/XP/Body/confidence/trust evidence and final result; allow committed careers to advance only after post-game while retaining the historical uncommitted compatibility path and existing breakthrough cadence.
6. Add public-command testkit builders and a checked-in content-version-pinned `m4-game-baseline.jsonl`. Use literal seeds across depth roles, archetypes, program bands, Body/IQ bands, film/no-film, skill builds, and decision strategies; report opportunity counts, scores, stats, grades, hook use, information, RNG/round trips, and reproduction strings while keeping M1–M3 reports byte-stable.
7. Build the bilingual mobile game UI. Show one concise preview, a fast broadcast-style score/clock/down-distance surface, exactly one semantic key-snap decision with persisted clues and consequence evidence, and a post-game result/stat/grade/growth summary. Defer next-snap/result publication until each authoritative save succeeds, preserve focus and command lockout, and keep secondary play evidence collapsed.
8. Add Korean and English Playwright journeys at native mobile/desktop widths plus a full 320 px path. Assert exact preview/game/key-snap/post-game IndexedDB state and RNG, information-only visibility, different decision consequences, failed decision-save retry, stat/grade/history reload, touch/keyboard/overflow, and offline resume.
9. Run the complete M4 gate, perform the available high/medium core/content/UI review, synchronize all product/QA/execution documentation, complete this plan, and activate M5 immediately.

## Acceptance criteria

- Schema/save version 4 is explicit. Browser persistence accepts only checksum-verified matching save/career versions 1–4 at content compatibility version 1; future and mismatched tuples remain protected.
- v3-to-v4 preserves every M3 identity, program, room, depth, weekly action/result, skill state, offer, phase, week, revision, and RNG value exactly, adding only neutral Preparation 50 and empty game totals. All older migration chains converge on the same v4 state.
- A committed `WEEK_END` explicitly becomes one reproducible `GAME_PREVIEW`; a migrated v3 week end is not silently changed on load. Invalid phase/catalog/opponent/revision/RNG inputs return the original object and draw count.
- The user's team and opponent, four periods, score, clock, possession, drive, down, distance, and field position remain internally valid. A complete game always terminates within strict bounded steps and comfortably within the main-thread budget.
- Opportunity scarcity is role-sensitive according to the WR1/WR2/WR3/WR4/bench ranges above. The user never controls coach/play-call/team-level decisions, and a zero-offense role still receives truthful participation and development feedback.
- Exactly eight original patterns span release, route/leverage, catch, and YAC/security. Each presented decision contains exactly three legal choices, at least two contexts reverse the best fit, and no decision is a flat cosmetic stat button.
- Same preview, state, seed, catalogs, and decision sequence reproduce byte-identical pending snaps, results, final score/stat/grade, growth, history, and next RNG after JSON/save reload at every boundary.
- Football IQ, recent Film Study, and Coverage Ledger can reveal additional coverage/leverage clues. Holding hidden context, decision, skills that affect outcomes, and RNG fixed yields the same resolution despite different clue visibility.
- WR attributes, defender matchup, choice fit, QB/offense, Body/confidence, and RNG all contribute through centralized fixed-point rules. Every existing game hook produces its documented information/success/risk/YAC evidence on an eligible snap.
- Final state includes game result; targets, catches, receiving yards, touchdowns, drops and turnovers; decision-fit summary; grade; Body/confidence/trust and XP changes; exact RNG evidence; last-game summary; cumulative career totals.
- Post-game is saved before weekly advance. Reload/offline resume never repeats a resolved snap, loses a stat, changes a clue, changes the game result, or applies growth twice.
- Korean and English game flows remain natural, keyboard/touch accessible at 320 px and native mobile/desktop widths, use 44 px primary targets, avoid horizontal tables, and present one primary decision at a time.

## Verification plan

- Literal v3 fixtures and malformed raw-state matrices before changing current writers; exact caller isolation, freeze, JSON round-trip, migration convergence, checksum tuple, mixed-version recovery, and lazy-upgrade tests.
- Core unit/property-style tests for game bounds, terminating drives, opportunity budget by every rank/policy, fixed draw protocol, catalog-order invariance, information/result separation, each decision family, each game hook, grading, growth, history, and rejected-command zero draws.
- Content tests for exact pattern/family/decision cardinality, stable IDs, three-choice reachability, mechanic/reference bounds, program projections, locale parity/interpolation, and originality.
- Scenario tests for starter/rotation 6–10 snaps, deep-bench scarcity, film/IQ information, Coverage Ledger, High-Point Wager tradeoff, Open-Field Dare tradeoff, decision-fit reversal, comeback/red-zone context, and post-game replay.
- Checked-in testkit report with literal seeds, reproduction strings, role/build/decision segments, full RNG/round-trip evidence, and byte-stability assertions for all earlier baselines.
- Web component tests for every preview/decision/result save boundary, clue presentation, evidence, focus, command lock, both locales, compact play log, and post-game history.
- Playwright on mobile/desktop in both locales and a true 320 px route, followed by final `corepack pnpm check`, emitted-package import smoke, production PWA verification, and a bounded game-simulation timing assertion.

## Risks and conservative assumptions

- M4 runs one exhibition-like game after each completed practice week because formal schedules and WorldState arrive in M5. Opponent selection is explicit, deterministic content-adapter input so a later schedule migration can replace it without changing game resolution.
- Keeping `WEEK_END` before `GAME_PREVIEW` avoids reinterpreting v3 phases and retains the prominent M3 depth consequence. M5 may rename/resequence the broader calendar with an explicit migration.
- A compact possession abstraction is sufficient to make one player game legible. Full playbook, penalty, special-team, and roster fidelity would add complexity without improving the athlete-level decision gate.
- The active game is phase-owned; post-game retains one compact key-play log until week advance, while only completed summaries/totals survive into later weeks. This prevents two divergent authoritative copies while preserving enough evidence for result explanation and M5 season review.
- Opportunity budget is bounded from the pregame projection rather than random rerolls. Game context and outcomes remain seeded; role scarcity stays explainable and reproducible.
- Information visibility is stored as evidence and excluded from resolution arithmetic. Film/IQ/Card information therefore changes player knowledge and choice quality, not hidden odds by accident.
- Preparation affects both assignment recognition and execution through separately named fixed-point weights. This is deliberate: weekly Preparation remains a visible football tension without becoming a hidden duplicate of Football IQ, Body, or Confidence.
- Post-game depth does not swap a second time. Trust, XP, Body, and confidence become inputs to the next week's practice/game context, preserving one clear depth update per week.
- The main bundle already emits a non-fatal size warning. M4 game UI should use modular adapters/components and will be profiled before any worker or code-splitting change is introduced.

## Progress notes

- 2026-08-31: Closed verified M3, read the M4 simulation, WR position, loop, player, skill, depth, UX, save, localization, balance, content, architecture, performance, QA, and execution sources, and inspected the current v3 phase/game-hook seams. Activated this v4 plan with explicit migration, content, simulator, key-snap, information, post-game, evidence, UI, and browser boundaries before implementation.
- 2026-08-31: Completed atomic step 1. Added strict CareerRun/save-envelope v4, neutral game history, serializable preview/key-snap/post-game contracts, every pre-M4 v3 phase fixture, exact v1/v2/v3 migration convergence, strict game-state invariants, checksum-first browser lazy upgrades, and v4 current writers. Workspace typecheck/lint/format, 372 tests, 66 content tests, 203 core/testkit tests, and all 26 preserved Playwright executions pass; no live game command was introduced.
- 2026-08-31: Paused before live commands for the authoritative M3 playtest correction. The task-2 bilingual game-content declarations are staged and pass the static/content gates, but task 2 remains incomplete until M3.5 establishes Preparation, participation, navigation, skill, and explanation contracts.
- 2026-08-31: M3.5 completed its aggregate gate (399 workspace tests, 66 content tests, 216 core/testkit simulations, 30 Playwright executions, builds/PWA green). Reconciled its authoritative weekly-state, navigation, role-participation, skill-hook/gauge, and explanation contracts above. Resumed M4 at atomic step 2; staged game content must finish validation before explicit preparation or simulation commands begin.
- 2026-08-31: Completed atomic step 2. Schema-4/content-compatibility-1 content now validates twelve canonical fictional opponent projections, four families, twelve decisions, seven exact context clues, and eight original bilingual patterns. Added explicit 650/350 IQ/Preparation information tuning, named Body/Preparation/Confidence resolution weights, and canonical WR1–WR8 opportunity bounds. The full gate passed 409 workspace tests, 76 content tests, 216 core/testkit simulations, all 30 Playwright executions, static checks, builds/exports, and PWA verification; only the known non-fatal 756.32 kB bundle warning remains.
- 2026-08-31: Completed atomic step 3. Added zero-draw preview preparation, canonical opponent rotation, strict versioned completed-week/depth evidence across game phases, rank-clamped opportunity budgets, bounded alternating-drive scoring, one-decision publication, and deterministic zero-opportunity completion with five original bilingual non-stat participation categories. Replay/order/tamper/rejection and 32-seed termination coverage pass. The full gate passed 418 workspace tests, 77 content tests, 224 core/testkit simulations, all 30 Playwright executions, static checks, builds/exports, and PWA verification; only the non-fatal 760.82 kB bundle warning remains.
- 2026-08-31: Completed atomic step 4. Pending snaps persist named 650/350 IQ/Preparation contributions, exact Film and Coverage Ledger evidence, tier, and revealed clue IDs while resolution excludes information entirely. Added six-draw athlete-level outcome resolution with all seven named fixed-point contributions, every release/route/catch/YAC family, ordered assignment/pressure/contested-risk/YAC traces, package-access preview evidence, multi-snap continuation, exact post-game key-play/stat preservation, and strict evidence consistency validation. Sixteen literal seeded games reach all four families and all eight existing game hooks. The full gate passed 423 workspace tests, 77 content tests, 229 core/testkit simulations, all 30 Playwright executions, static checks, builds/exports, and PWA verification; only the non-fatal 766.85 kB bundle warning remains.
- 2026-08-31: Completed atomic step 5 at the domain/integration boundary. Final grade scales production and mistakes to an authored four-opportunity reference, averages decision fit, and clamps to 0–100. Each played family distributes deterministic XP by its authored attribute weights; Body, Confidence, and Coach Trust apply one bounded evidence-backed transition, with zero-offense roles receiving half game Body cost and no fabricated trust/confidence result. Player state, post-game evidence, last-game summary, and cumulative totals cross-validate. `game_day` now contributes 6–24 ordered gauge points, and current committed week close rejects `WEEK_END` until a saved `POST_GAME`; named historical cadence/gauge commands alone preserve earlier reports. Workspace typecheck, 193 core tests, 77 content tests, and all 37 preserved testkit tests pass. The browser's prior direct week-close expectation is the atomic-step-7 activation seam, so the next aggregate gate follows that UI conversion.
