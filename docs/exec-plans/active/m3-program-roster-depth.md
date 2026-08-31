# M3 Programs, Roster, Depth Chart, and Snap Projection Execution Plan

## Status

Active from 2026-08-31.

## Goal

Deliver a deterministic, bilingual transition from player creation into a meaningful five-offer program choice, generate an explainable eight-player WR room, and make Coach Trust, Practice Form, Scheme Fit, stable depth movement, and projected snap share the visible emotional progression of development weeks.

## Scope

- Advance `CareerRun` and browser save envelopes once, and only once in M3, from version 2 to version 3 while retaining exact v1/v2 readers and migrations.
- Persist recruiting state independently of the weekly phase so migrated in-flight M2 careers finish their already-committed work before choosing a program.
- Define validated program, scheme, rotation, recruiting, roster, depth-evaluation, role, and projection contracts before authoring content.
- Ship 12 original fictional programs with bilingual identity, a balanced opportunity matrix, reciprocal rival references, and data-driven WR mechanics.
- Derive a transparent recruit score/tier and an exact deterministic five-program shortlist without RNG or rerolls.
- Commit one offered program, consume the persisted career RNG only for that program's seven generated competitors, and persist the complete room/evaluation evidence.
- Integrate content-authored weekly Practice Form impact, bounded Coach Trust change, fixed-point depth evaluation, hysteresis, and projected snap ranges into the development loop.
- Add reproducible scenario/distribution evidence proving explainable promotion and demotion without noisy oscillation.
- Add mobile-first Korean and English recruiting, program, WR-room, depth, projection, and movement UI with exact autosave/reload behavior.

## Non-goals

- Games, opponents, schedules, fall-camp calendar presentation, injuries, transfers, NIL offers, academics eligibility, relationships, or live opponent roster development.
- A full team roster, coach simulation, real schools, copied traditions, logos, colors, mascots, player identities, or proprietary recruiting/depth data.
- Hidden familiarity penalties before `MetaProfile` exists. M3 reveals every mechanically relevant offer fact.
- Multiple recruiting rerolls, decommitment, transfer entry, or choosing a placeholder program for migrated careers.
- A second M3 save/schema jump; every M3-persisted field and neutral migration default is designed in v3 up front.

## Relevant specs

- `AGENTS.md` and all package-scoped `AGENTS.md` files
- `ARCHITECTURE.md`
- `docs/00-project/PROJECT_CONTEXT.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/CORE_LOOP.md`
- `docs/product-specs/PLAYER_MODEL.md`
- `docs/product-specs/PROGRAM_WORLD.md`
- `docs/product-specs/RECRUITING_AND_PROGRAM_CHOICE.md`
- `docs/product-specs/DEPTH_CHART.md`
- `docs/product-specs/POSITION_DESIGN.md`
- `docs/product-specs/TRAINING_AND_BODY.md`
- `docs/product-specs/SKILL_SYSTEM.md`
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
- `docs/execution/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/execution/DEFINITION_OF_DONE.md`

## Authoritative M3 state contract

- `CareerRunV3` keeps every M2 field and changes `programId` to `ProgramId | null`; it adds `recruitingState` and `programContext`.
- `RecruitingState` is a closed union: `NOT_STARTED`, `CHOOSING`, or `COMMITTED`.
- `CHOOSING` persists recruit ability, background modifier, final recruit score, recruit tier, and exactly five complete offer-evidence rows. It never recomputes presentation-critical ordering after reload.
- `COMMITTED` preserves the same shortlist/evidence, selected program, selection week, and exact roster RNG draw-count range.
- `programId` and `programContext` are non-null if and only if recruiting is `COMMITTED`; the selected/program/context IDs must agree.
- `ProgramCareerState` persists the selected program ID, player Practice Form, exactly seven lightweight NPC WR competitors, an exact eight-member depth order containing the user once, current evaluation/projection evidence, and the latest depth update.
- Each competitor persists a stable roster-player ID, localized given/family name token IDs, archetype, class year, talent fit, Coach Trust, Practice Form, Scheme Fit, and experience/readiness. M3 competitors remain static after enrollment; player development drives the vertical-slice movement.
- `WeeklyActionResultV3` adds the content-authored Practice Form impact. `WeekEndPhaseV3` and `programContext` preserve depth-update evidence; v2 migration supplies neutral `0`/`null` values.
- Depth evidence stores integer component contributions, total score-milli, threshold, neighboring competitor crossed or blocked, ranks/roles/snap ranges before and after, Practice Form calculation, and actual bounded Coach Trust change.

## Deterministic tuning baseline

- Recruit ability uses eight ratings with positive permille weights summing to 1000: Speed 150, Burst 100, Agility 80, Strength 70, Release 140, Route Running 160, Hands 170, Catch in Traffic 130.
- Background modifiers are `+12` blue-chip, `+5` small-town star, `+4` legacy recruit, `0` late bloomer, and `-5` under-recruited athlete. Clamp the result to 0–100. Recruit tiers are National at 62+, Priority at 56+, and Developmental below 56.
- Program offer priority is `2 * tier interest + Scheme Fit`. Zero-interest programs are ineligible; candidates sort by priority descending and then stable program-ID code units. Taking the first five consumes zero RNG.
- The content validator must prove every one of the 390 valid M1 creation identities receives five distinct offers spanning at least two program-strength bands.
- Program choice alone generates seven competitors from the career RNG. It records the exact before/after draw count, uses canonical room order, and consumes no draws for unselected programs or rejected commands.
- Depth evaluation follows the specified fixed-point weights exactly: 45% talent fit, 20% Coach Trust, 15% Practice Form, 10% Scheme Fit, and 10% experience/readiness.
- Weekly Practice Form uses a content-authored action-impact sum plus a bounded Body-after-actions adjustment. The conservative initial blend is 40% previous form and 60% weekly score; Coach Trust changes only from documented weekly-score bands and remains bounded.
- An initial chart sorts total score-milli descending with stable-ID tie-breaking. Later weekly updates allow at most one player rank move and require a 2,000 score-milli advantage over the immediate neighbor. This threshold and every weight remain centralized.
- Role bands are ranks 1–2 Starter, 3–4 Rotation, 5–6 Reserve, and 7–8 Developmental. A program's validated rotation policy provides monotone rank-indexed projected snap min/max permille; trust/form influence projection through evaluation/rank rather than being counted twice.

## Atomic delivery steps

1. Implement the complete v3 persistence skeleton: strict program/recruiting/roster/depth IDs and state types, `CareerRunV3`, v2-to-v3 and v1-chain migrations, immutable v2 fixtures for every M2 phase, strict raw invariants, and browser save-envelope v3 compatibility. Creation returns neutral `NOT_STARTED`/null program state. Preserve active v2 phases, results, skills, RNG, and revision exactly; do not add live M3 mechanics yet.
2. Add content schemas and mechanics projections, then author the 12-program vertical-slice catalog and supporting regions, offense/defense styles, rotation policies, traits, and bilingual competitor-name tokens. Validate exact counts, numeric ranges, WR weight sums, all-three-archetype Scheme Fit, reciprocal rivals, unique references, opportunity diversity, originality review, and every locale key. Keep content compatibility version 1 while advancing only the internal manifest schema.
3. Implement transparent recruit-profile derivation and the zero-RNG canonical five-offer shortlist command. Persist complete component/offer evidence, reject invalid phase/catalog/pool inputs without mutation or RNG, gate new weekly plans until commitment, and have the web creation adapter begin recruiting before its first replacement save.
4. Implement program commitment and seeded WR-room generation. Generate only the chosen room, initialize Coach Trust/Practice Form/Scheme Fit, compute the first stable depth chart and snap projection, record RNG evidence, and reject non-offers/repeated choices/catalog mismatch without mutation or draws.
5. Integrate Practice Form and Coach Trust into weekly results; re-evaluate depth with one-rank hysteresis when the third action completes; persist promotion/demotion/blocked-change explanations and updated snap projection. Prove that migrated in-flight uncommitted phases finish with neutral depth evidence and begin recruiting only on the next planning phase.
6. Add testkit builders and a checked-in content-version-pinned `m3-depth-baseline.jsonl`. Use literal reproduction seeds and public commands; segment by recruit tier/background, program band, archetype, and strategy; record initial/final rank, first rotation week, movements, trust/form, snap range, room RNG, round trips, and oscillation evidence while keeping M1/M2 baselines byte-stable.
7. Build the bilingual mobile recruiting and program/depth UI. Present one five-offer choice surface with prestige, development, academics, NIL, Scheme Fit, projected depth band, and traits; after enrollment show program, rank, role, projected snaps, trust/form, a collapsed stacked WR room, and prominent week-end movement reasons. Keep all formulas in core/content adapters and every authoritative choice behind a successful autosave publication boundary.
8. Add Korean and English Playwright journeys at mobile and desktop widths plus a full 320 px path. Assert exact shortlist/program/room/order/RNG IndexedDB state, keyboard choice, failed choice-save retry, program/depth reload, promotion/projection movement, locked commands, localized presentation, touch targets, overflow, and offline resume.
9. Run the complete M3 gate, obtain independent high/medium core/content/UI reviews, synchronize all product/QA/execution documentation, complete this plan, and activate M4 immediately.

## Acceptance criteria

- Schema and save version 3 are explicit. Browser persistence accepts only checksum-verified `(save 1, content 1, career 1)`, `(save 2, content 1, career 2)`, and `(save 3, content 1, career 3)` tuples; unknown/future combinations remain protected.
- v2-to-v3 preserves every M2 identity, phase, queue/result, skill acquisition/loadout, passive evidence, week, revision, and RNG value exactly, adding only documented neutral M3 fields. v1 chaining yields the same v3 result as v1-to-v2 followed by v2-to-v3.
- Migrated `RESOLVE_ACTIONS`, `WEEK_END`, and `SKILL_BREAKTHROUGH` saves resume their current commitment. No program alters already-queued M2 semantics, and weekly planning cannot begin again until recruiting is committed.
- The 12 programs are original composites with no copied identity, text, visuals, traditions, roster data, or 1:1 real-school mapping. Every visible string and content name exists naturally in both `ko-KR` and `en-US`.
- Every valid created WR receives exactly five unique persisted offers in stable order, spanning at least two strength bands. Catalog input order and reload cannot change the shortlist; shortlist generation consumes zero RNG and offers no reroll.
- Offer evidence makes the score/tier, interest, Scheme Fit, priority, and projected depth band explainable. M3 shows all mechanically relevant facts because familiarity/meta progression is not implemented yet.
- Choosing one offered program creates exactly seven distinct competitors and one eight-ID order containing the player once. Same career, catalog, selected program, and RNG produce byte-identical room/evaluation/next RNG; a failed or unselected path consumes none.
- Scheme style materially changes Scheme Fit/talent evaluation for at least one same-player comparison. A highly rated recruit at a national room is not guaranteed a starting role, while a mid-tier recruit at a builder/opportunity program has a plausible early-rotation path.
- Weekly action pattern and Body produce documented Practice Form; Coach Trust changes within bounds; depth uses exact fixed-point contributions. Sub-threshold changes do not swap ranks, and a weekly update moves the player no more than one position.
- Acceptance scenario D passes: a below-rotation player earns a stable promotion through training/practice/trust, projected snaps increase, and the same seed/actions reproduce the result. A poor-practice comparison can also lose a role for surfaced reasons without week-to-week oscillation.
- Program choice, room, depth order, movement evidence, and snap projection survive JSON and IndexedDB reload exactly. Every authoritative transition blocks conflicting commands and handles save failure/retry without showing unpersisted downstream decisions.
- Korean and English flows remain keyboard/touch accessible at 320 px and native mobile/desktop widths, with 44 px primary targets, no horizontal table dependency, and offline resumption of a committed program career.

## Verification plan

- Strict v2 fixtures and malformed raw-state matrices before changing current-save writers; exact caller-clone/freeze, JSON round-trip, and uninterrupted-versus-migrated continuation checks.
- Core unit/property-style tests for recruit arithmetic, canonical shortlist ordering, zero-draw failures, seeded room generation, evaluation contribution sums, form/trust bounds, hysteresis, roles, and monotone snap ranges.
- Content tests for exact cardinality/reference/locale contracts, 390-identity offer reachability/diversity, reciprocal rivals, style weight sums, all archetypes, stable IDs, and built-output validation.
- Scenario tests for national-room depth, builder opportunity, stable promotion, explainable demotion, scheme-fit contrast, reload equivalence, and no one-week oscillation.
- Checked-in testkit report with literal seeds, reproduction strings, segment rows, exact RNG/round-trip evidence, and byte-stability assertions for earlier baselines.
- Web component tests for every choice/save/retry boundary, migrated neutral state, both locales, collapsed room, movement explanations, focus, and one-primary-surface behavior.
- Playwright on mobile/desktop in both locales and a true 320 px route, followed by final `corepack pnpm check`, emitted-package import smoke, and production PWA verification.

## Risks and conservative assumptions

- Recruiting remains orthogonal to weekly phase so migration never invents a phase replacement. `beginRecruiting` is legal only during uncommitted `PLAN_ACTIONS`; new creation invokes it before the first save.
- All M3 offer facts are revealed. Unknown/familiarity presentation waits for a real `MetaProfile` rather than using arbitrary hidden penalties.
- Seven lightweight NPCs are enough to create an eight-player WR competition without introducing a fake whole-team simulation. Their names use original bilingual token content and their M3 ratings remain static.
- Five offers preserve a manageable mobile decision while exposing at least two opportunity bands. This count is persisted and versioned rather than inferred from current catalog length.
- Shortlisting is intentionally deterministic and zero-RNG; only committing a selected program consumes the career RNG. This makes tradeoffs reproducible and prevents browsing/rerolls from altering the world.
- Fixed-point score-milli and a one-rank/2,000-point hysteresis rule prioritize legibility and stability. Testkit evidence may tune centralized values without changing the state contract.
- Program traits are presentation/explanation tags in M3. Explicit numeric scheme, recruiting, room-strength, rotation, and initial-trust profiles own mechanics, avoiding hidden trait formulas.
- The M3 development loop represents preseason/fall-camp progression mechanically; a season calendar and formal camp phase arrive in M5.

## Progress notes

- 2026-08-31: Closed verified M2, read the M3 product, architecture, content, save, localization, balance, QA, and execution sources, and completed independent program/recruiting plus roster/depth reconnaissance. Activated this single-v3 plan with exact migration, shortlist, roster, evaluation, UI, simulation, and browser boundaries before implementation.
