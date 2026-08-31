# M2 Skill-Card Build Loop Execution Plan

## Status

Completed and verified on 2026-08-31.

## Goal

Deliver a deterministic, bilingual skill-card loop in which recent weekly behavior shapes three-card breakthrough offers, four equipped cards materially change training or Body decisions, and two otherwise comparable seeded careers can form visibly different builds without compromising save compatibility or weekly flow.

## Scope

- Add an acquisition-log-derived skill inventory, an exact four-slot equipped tuple, bounded recent-action history, and breakthrough phase to `CareerRun`, with an explicit schema-v1 to schema-v2 migration.
- Define strict position/archetype/tag eligibility, grade/family metadata, behavior affinities, and a closed discriminated effect registry in `game-core` and mirrored validated content schemas.
- Resolve training XP, action Body cost/recovery, passive recovery, and declared future game hooks through equipped-card effects; preserve structured applied-effect evidence for presentation and testing.
- Generate a canonical weighted three-card offer without replacement from unowned eligible cards using only the persisted seeded RNG.
- Use a tuneable M2 development cadence and a bounded recent-action window so behavior changes weights without guaranteeing an outcome.
- Ship exactly 18 original WR-compatible cards across all five families, including at least six explicit tradeoffs, with simultaneous `ko-KR` and `en-US` copy.
- Add mobile-first breakthrough, inventory, equip, and modifier-result UI with autosave/reload at every authoritative transition.
- Add deterministic scenario/distribution evidence plus bilingual browser coverage.

## Non-goals

- Duplicate upgrades/mastery, a fifth slot, legacy unlocks, monetized pulls, or permanent collection/meta progression.
- Programs, rosters, depth-chart effects, Coach Trust, games, injuries, events, or full game-hook resolution owned by M3-M6.
- Expanding to the 36-card vertical-slice target before M5; M2 establishes the first 18 high-value cards and the validated expansion path.
- Replacing the current single-active-career persistence policy or changing the save-envelope wire format.

## Relevant specs

- `AGENTS.md` and all package-scoped `AGENTS.md` files
- `ARCHITECTURE.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/CORE_LOOP.md`
- `docs/product-specs/PLAYER_MODEL.md`
- `docs/product-specs/SKILL_SYSTEM.md`
- `docs/product-specs/TRAINING_AND_BODY.md`
- `docs/product-specs/GAME_SIMULATION.md`
- `docs/product-specs/POSITION_DESIGN.md`
- `docs/product-specs/SAVE_SYSTEM.md`
- `docs/product-specs/UX_AND_FLOW.md`
- `docs/product-specs/BALANCE_PHILOSOPHY.md`
- `docs/product-specs/CONTENT_DENSITY.md`
- `docs/product-specs/LOCALIZATION.md`
- `docs/engineering/CONTENT_ARCHITECTURE.md`
- `docs/engineering/TEST_STRATEGY.md`
- `docs/qa/ACCEPTANCE_SCENARIOS.md`
- `docs/qa/BALANCE_TARGETS.md`
- `docs/qa/CONTENT_QA.md`
- `docs/execution/DEFINITION_OF_DONE.md`

## Atomic delivery steps

1. Add schema-v2 acquisition history, exact four-slot loadout, bounded recent-action, and breakthrough state with strict invariants; implement and fixture-test an immutable v1 to v2 migration that preserves every M1 field and resumable phase. Upgrade the checksum envelope to known version 2 while accepting only the verified legacy `(save 1, content 1, career 1)` tuple.
2. Implement the closed skill definition/effect registry and integrate equipped effects into weekly XP, Body cost/recovery, and passive recovery with fixed-point aggregation, deterministic application order, bounds, and structured result evidence.
3. Add validated skill content schemas and author exactly 18 original bilingual WR cards across Development, Game Day, Body, Mindset, and Life; validate references, effect parameters, eligibility reachability, tradeoffs, and locale contracts.
4. Implement deterministic eligible-pool filtering, recent-behavior weight calculation, canonical weighted sampling without replacement, the persisted three-card breakthrough phase, choose-one acquisition, first-open-slot auto-equip, and planning-only loadout commands.
5. Add testkit builders and a checked-in, content-version-pinned skill distribution report comparing at least two behavior/build strategies, with reproduction seeds, offer/pick/family/grade rates, determinism, and training/Body outcome evidence.
6. Build the bilingual mobile breakthrough and skill inventory/loadout UI; show concise card tradeoffs and applied modifiers, preserve one primary decision surface, and autosave/reload offers, choices, and loadout changes.
7. Add Korean and English Playwright paths for behavior-shaped offer generation, choose/equip, changed action value, exact offer/loadout/RNG reload, keyboard interaction, and 320 px layout.
8. Run the complete M2 gate, obtain an independent high/medium review, synchronize ledgers/specs, complete this plan, and activate M3 immediately.

## Acceptance criteria

- A current career derives unique ownership from contiguous acquisition records. It always has four dense nullable equipment slots; non-null IDs are distinct and owned, and no duplicate card is offered or acquired.
- Each completed acquisition records its contiguous offer index, week, exact three offered IDs, selected ID, and RNG draw-count range. An active offer has the next index and excludes every previously selected card.
- A migrated M1 save resumes the same identity, revision, phase, queue/results, ratings/state, and RNG. New skill/history fields use explicit neutral defaults, and schema-v1 fixtures cover every authoritative M1 phase.
- Save envelope version 2 and CareerRun schema version 2 are explicit. Loading the one known legacy tuple first verifies its original checksum and timestamps, then migrates its payload; unknown/future save, content, or career versions remain protected. Additive skill content keeps content compatibility version 1.
- Effect definitions and conditions are closed discriminated unions. Unsupported effects, invalid bounds/exclusive action-or-tag scopes, dangling references/hooks, and content/locale mismatches fail validation. Percentage modifiers aggregate additively around 1000 permille and round once; applied traces use equipment-slot then effect order.
- Equipped cards change documented weekly XP, Body cost/recovery, or passive recovery through pure core rules. At least six cards combine a meaningful benefit with a condition, cost, or drawback, and result data identifies the applied cards/effects.
- Offer eligibility honors position, archetype/tags, career timing, and ownership. Input catalog order cannot change an offer; same career/RNG/history produces the same offer and next RNG; failed or skipped generation cannot consume RNG.
- Every generated breakthrough contains exactly three distinct eligible unowned cards sampled without replacement. Recent matching behavior increases configured integer weight but never directly selects a card.
- M2 development weeks offer a breakthrough after completed week 1 and every fourth completed week thereafter (1, 5, 9, 13, ...) while at least three eligible cards remain. This temporary cadence is tuneable and isolated from later game/post-game trigger rules.
- Choosing a card consumes no additional RNG, records ownership, auto-equips into the first open slot, and returns to planning. Once four slots are full, later cards remain in inventory until a planning-phase loadout command equips them.
- Equipping is allowed only during `PLAN_ACTIONS`, increments revision, validates ownership/uniqueness/capacity, and autosaves before another command can proceed.
- Two seeded careers that differ by recent behavior/equipped cards demonstrate different offer distributions and different value for at least Weight Room or Film Study versus Recovery, satisfying acceptance scenario C.
- All new visible copy ships naturally in both locales; breakthrough/loadout/action-result flows work with keyboard and touch at 320 px and survive offline reload from IndexedDB.

## Verification plan

- Narrow migration/invariant tests before changing web persistence; checked-in schema-v1 fixtures and deep round-trip/replay comparisons.
- Registry unit/property-style tests for applicability, fixed-point stacking order, caps, tradeoffs, neutral loadout parity, and bounds over long seeded runs.
- Content schema/reference/locale tests for exact cardinality, all five families, grade coverage, six-plus tradeoffs, supported effects/hooks, reachability, and stable unique IDs.
- Seeded offer tests for eligibility, ownership exclusion, canonical ordering, weighted no-replacement draws, behavior influence, pool exhaustion, RNG draw/state preservation, save/reload, and uninterrupted equivalence.
- Testkit report with reproducible strategy segments, card offer/pick rates, family/grade rates, action use, Body, XP, and equipped-build outcomes.
- Web component tests for breakthrough choice, four slots, replacement, applied-effect explanation, every save boundary/failure retry, migration load, and both locales.
- Playwright on mobile and desktop in Korean and English, followed by final `corepack pnpm check` and explicit production artifact verification.

## Risks and conservative assumptions

- M2 has no game/post-game phase, so breakthrough cadence is a content-owned development scaffold. M4/M5 may replace the trigger through a migration without changing offer/acquisition semantics.
- Behavior history stores the six most recent stable weekly action IDs rather than an unbounded/tag-denormalized log. Content maps those actions and derived patterns to validated behavior tags when calculating weights.
- Fixed-point integer modifiers and canonical skill-ID/effect order avoid floating/order drift. Tuneable caps prevent stacked effects from escaping documented player/resource bounds.
- Newly acquired cards auto-equip only into an empty slot; a full loadout is never silently replaced. This minimizes interruption while preserving deliberate build choices.
- Future game hooks are validated declarative extension points. Every initial Game Day card also has an M2-resolvable effect so no shipped card is mechanically inert.
- Domain schema and checksum-envelope versions both advance to 2, while additive skill content remains compatibility version 1. Browser persistence verifies raw legacy envelopes before the pure core parser migrates payloads and does not overwrite the legacy source until the next committed save.

## Progress notes

- 2026-08-31: Read the complete M2 product, architecture, content, localization, save, test, balance, QA, and execution sources after the verified M1 closeout. Activated this plan with explicit migration, RNG, phase/autosave, behavior weighting, effect-trace, bilingual content, UI, simulation, and browser acceptance boundaries.
- 2026-08-31: Completed the schema/save migration foundation. Current CareerRun v2 derives ownership from contiguous acquisition records, stores four dense nullable slots and six recent action IDs, and can persist an exact three-card pending offer with RNG draw ranges. Strict v1 parsers/fixtures remain frozen; pure migration preserves all legacy fields and seeds only persisted current-phase history. Browser envelopes advance to save version 2 while accepting only checksum-verified save1/content1/career1 legacy data without eager overwrite. Core passed 88 tests, web 71, integrated simulations 104, all relevant static/build gates, and independent review with no high/medium findings.
- 2026-08-31: Completed the closed effect engine. Equipped definitions resolve in slot/effect order; fixed-point XP, Body-cost, flat Body/GPA, passive recovery, conditions, and future game hooks have strict runtime guards and bounds. V2 results preserve base/modified values and recomputable traces, while the latest passive recovery persists across reload without binding historical traces to a later loadout. Exact v1 migration also preserves non-milli GPA deltas. Core passed 104 tests plus typecheck, lint, format, and build; independent review found no unresolved high/medium issues.
- 2026-08-31: Completed the initial content slice. Manifest schema 2 retains content compatibility 1 and ships exactly 18 stable bilingual WR cards across all five families, nine inferred tradeoffs, proportional C/B/A/S behavior bonuses, strict mechanics/reference/reachability checks, and paired Korean/English copy. Content passed 58 tests plus typecheck, lint, format, build, and emitted-output smoke verification.
- 2026-08-31: Completed the deterministic breakthrough and loadout domain loop. The six-action behavior window produces explicit affinity counts; eligible candidates sort by stable ID before unbiased integer sampling without replacement; weeks 1/5/9/13 generate persisted offers only when three cards remain. Choice copies exact draw evidence into acquisition, auto-equips only an open slot, and planning-only slot commands never consume RNG. Strict raw chronology/draw invariants, paired-catalog guards, reload equivalence, pool/RNG exhaustion, mutable-caller isolation, and full-loadout behavior are covered. Core passed 130 tests, integrated core/testkit passed 148, content passed 58, and all workspace static/format checks plus core build passed; independent reviews found no unresolved high/medium issues.
- 2026-08-31: Completed the checked-in M2 skill-build baseline. Sixty-four literal paired seeds produce 128 first offers with complete offer/pick/family/grade rates and exact per-seed RNG/reload evidence. Matching behavior moves Coverage Ledger and Late Set Engine weights from 70 to 112 and the paired samples retain the expected offer-rate direction. A single public-command four-card career branches only through equal-count loadout commands: Coverage Ledger yields Film Study XP 16 versus 15, while Recovery Window yields Recovery +40 versus +32 and final Body 57 versus 49. Testkit passed 28 tests, the integrated simulation gate passed 158, and the M1 report remained byte-stable.
- 2026-08-31: Completed the bilingual mobile skill UI. A persisted Breakthrough renders one semantic keyboard/touch choice, choice autosaves without RNG, the first open slot auto-equips, and the collapsed inventory exposes four planning-only select-based clear/replace commands. Cards show grade/family/tradeoff copy in both locales; resolved actions and passive recovery show authoritative core traces. Browser persistence now round-trips pending offers, choices, and loadout changes exactly. Web passed 86 tests, content passed 58, typecheck/lint/boundary/localized-copy/format/build gates passed, and independent re-review found no unresolved high/medium issues after exhaustive phase copy and visible pre-skill base labels were added.
- 2026-08-31: Completed the M2 production browser matrix. Twenty Playwright executions pass: Korean film-heavy and English strength-heavy journeys at native Pixel 7 and desktop widths, a separate full 320×760 English journey, preserved M1 paths, and PWA smoke coverage. Tests read exact schema-v2 IndexedDB state for behavior-shaped offers/RNG, reload, zero-draw keyboard choice, four-slot autosaves/lockout, localized applied modifiers, injected choice-save retry, and offline resume. Independent re-review found no unresolved high/medium issues after removing a locale-bound viewport override.
- 2026-08-31: Closed M2 after the final independent review identified and verified one save-publication correction: a chosen breakthrough remains the visible locked surface until its autosave succeeds, including failure and retry, and planning is published only afterward. The final `corepack pnpm check` passed all type, lint, architecture, localized-copy, and format gates; 302 Vitest tests, 58 focused content tests, 158 deterministic core/testkit tests, 20 Playwright executions, every package build, emitted-export smoke checks, and PWA artifact verification. No unresolved high/medium findings remain.

## Outcome

M2 satisfies its roadmap gate. Behavior can deterministically shape offers, four-card loadouts materially change Film Study and Recovery value, every authoritative choice and effect survives reload with exact RNG evidence, and the complete loop ships in Korean and English. The 36-card expansion remains explicitly owned by M5 rather than this completed milestone.
