# M1 Player and Weekly Career Skeleton Execution Plan

## Goal

Deliver a deterministic WR career skeleton in which a player can create a materially distinct athlete, choose and resolve three weekly actions, see bounded training/body/proficiency consequences, advance multiple development weeks, and resume the exact career after reload in Korean or English.

## Scope

- Add a versioned, serializable `CareerRun` and WR player model to `game-core` with centralized bounds and immutable transitions.
- Add the three WR archetypes, five recruiting backgrounds, eight personality traits, appearance/body creation options, and at least nine weekly action definitions as stable-ID bilingual content.
- Require exactly two distinct compatible personality traits; every archetype, background, and trait changes M1 initial mechanics, while appearance remains persisted/rendered cosmetic identity.
- Implement an authoritative M1 development-week phase machine, exactly three planned action slots, deterministic action resolution, attribute XP, Body effects, GPA effects, and capped training proficiency.
- Add save parsing/versioning, checksum-backed current-career envelopes, autosave checkpoints, and reload through the existing storage adapter.
- Replace the M0 sample body with a mobile-first player-creation and weekly-home flow while preserving locale/PWA/storage behavior.
- Add reusable testkit builders, deterministic scenarios/distribution checks, and bilingual create → act → advance → reload E2E coverage.

## Non-goals

- Recruiting/program selection, roster/depth competition, Coach Trust mechanics, or real program identity (M3).
- Skill cards or breakthrough drafts (M2).
- Opponents, games, key snaps, injuries, contextual events, NIL, or offseason systems (M4+).
- Cloud sync or backend services.

## Relevant specs

- `AGENTS.md` and package-scoped `AGENTS.md` files
- `ARCHITECTURE.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/CORE_LOOP.md`
- `docs/product-specs/PLAYER_MODEL.md`
- `docs/product-specs/POSITION_DESIGN.md`
- `docs/product-specs/TRAINING_AND_BODY.md`
- `docs/product-specs/SAVE_SYSTEM.md`
- `docs/product-specs/UX_AND_FLOW.md`
- `docs/product-specs/BALANCE_PHILOSOPHY.md`
- `docs/product-specs/CONTENT_DENSITY.md`
- `docs/product-specs/LOCALIZATION.md`
- `docs/engineering/TEST_STRATEGY.md`
- `docs/execution/DEFINITION_OF_DONE.md`
- `docs/qa/ACCEPTANCE_SCENARIOS.md`
- `docs/qa/BALANCE_TARGETS.md`

## Atomic delivery steps

1. Implement stable WR identity types, controlled option IDs, rating/body/GPA bounds, attribute progress, versioned `CareerRun`, and deterministic player creation with invariant tests.
2. Add validated bilingual creation/action content for 3 archetypes, 5 backgrounds, 8 traits, appearance basics, and 9 weekly actions without display-text identifiers.
3. Implement planning/phase commands and deterministic weekly action resolution, including duplicate action choices, Body-sensitive efficiency, attribute XP, recovery/study tradeoffs, and five-level diminishing proficiency.
4. Add testkit career builders and seeded multi-week scenario/distribution tests that report reproduction seeds and protect every bound/phase invariant.
5. Implement browser-free schema-v1 CareerRun parsing in `game-core`, then checksum/timestamp/envelope/IndexedDB recovery in web persistence. Keep 30 rolling snapshots, recover from the newest valid compatible snapshot, and test failure ordering, corruption, and unsupported versions without inventing a v0 migration.
6. Build the bilingual player-creation flow and focused weekly home/action/result screens; keep domain rules out of React and show only the information needed for the next decision.
7. Add Korean and English Playwright paths for create → choose three actions → resolve → advance multiple weeks → reload, including mobile layout and keyboard behavior.
8. Run the complete M1 gate, synchronize specs/ledgers, complete this plan, and immediately activate M2.

## Acceptance criteria

- All permanent and temporary values remain within documented bounds across long seeded runs.
- Exactly two distinct compatible personality traits are required. Every archetype, background, and trait alters M1 initial state/action value; appearance is persisted and rendered without attaching performance meaning to cosmetic traits.
- A valid plan contains exactly three available action IDs; resolution order and results are replayable and phase-invalid commands cannot mutate state.
- The authoritative sequence is `PLAN_ACTIONS` → `RESOLVE_ACTIONS` → `WEEK_END` → next `PLAN_ACTIONS`: the UI owns a reversible three-slot draft, commit stores/autosaves the full queue, each action resolves/autosaves individually, and week advance autosaves after passive recovery.
- Training changes visible progress, Body/recovery creates a real tradeoff, and proficiency is capped at five with diminishing marginal efficiency. Efficiency is monotonic and has no mechanical cliff at Body presentation boundaries 19/20, 39/40, 59/60, or 79/80.
- Save schema version 1 is explicit; corrupt, unsupported, content-incompatible, or checksum-mismatched data cannot replace a valid career. Reload restores the canonical full state, including phase, queue/index/results, RNG state/draw count, and stable effect IDs.
- An uninterrupted continuation and the same decisions after save/reload produce deeply equal CareerRuns and RNG states.
- The app autosaves only committed domain transitions and reloads the same career/week/progress from IndexedDB.
- Every new user-visible string and content item ships in both `ko-KR` and `en-US` with matching ICU contracts.
- The M1 roadmap gate—create player → perform actions → advance multiple weeks → reload—passes in both locales.

## Verification plan

- Narrow unit/invariant tests after each domain and persistence transition.
- Content schema/reference/locale validation after every content slice.
- Seeded multi-week scenarios and batch bound/distribution checks through `testkit`.
- Canonical CareerRun round-trip and uninterrupted-versus-reloaded continuation equivalence at every resumable phase.
- Web component tests for creation, action planning, result summaries, storage degradation, and reload states.
- Playwright at mobile and desktop widths in Korean and English.
- Final `corepack pnpm check` plus explicit production artifact verification.

## Risks and conservative assumptions

- M1 uses pre-program development weeks and stores `programId: null`; M3 will introduce recruiting choice with an explicit save migration rather than a disposable placeholder ID.
- Duplicate weekly action IDs are allowed because repeated practice is required for proficiency; the Body cost and diminishing progression curve provide the counterweight.
- M1 training constants are data-driven baseline tuning, not final balance. Automated reports make later changes reviewable.
- Film Study must immediately improve Football IQ/proficiency. Study Hall is exposed only with a visible bounded GPA/status consequence and action-slot opportunity cost; M1 does not invent eligibility rules owned by M6.
- Save ownership stays strict: schema/version parsing and migrations are pure `game-core`; checksums, clocks, IndexedDB transactions, retention, and recovery remain web infrastructure.
- User-entered names are content, not localized shipping copy; all labels, option names, validation, and summaries remain catalog-backed.

## Progress notes

- 2026-08-30: Read all M1-relevant product/engineering specs after the verified M0 closeout. Recorded the pre-program development-week assumption and activated this plan.
- 2026-08-30: Strengthened the plan after read-only review: deep deterministic reload equivalence, exact-two compatible personalities, immediate M1 identity effects, explicit phase/autosave semantics, smooth Body boundaries, and strict persistence ownership are now acceptance requirements.
- 2026-08-30: Completed creation content with exact 3/5/8 cardinalities, positive/negative initialization tradeoffs for every option, symmetric personality incompatibilities, full ko-KR/en-US copy, reference/ICU validation, and an exact core/content ID contract test. Package typecheck/lint/build and 29 content tests pass.
- 2026-08-31: Completed the schema-v1 WR/CareerRun foundation after independent review. Core-authoritative personality conflicts, seed-only stable player IDs, code-unit ordering, immutable deep validation, all attribute/state bounds, and exact JSON/RNG round trips are covered. Integrated typecheck/lint passed; content passed 29 tests and core/testkit passed 36.
- 2026-08-31: Completed the development-week mechanics and bilingual action catalog. The immutable three-action phase machine, per-transition revisions, Body-sensitive fixed-point XP, bounded Recovery/Study Hall effects, capped diminishing proficiency, stable result/effect IDs, and unchanged RNG are covered by 49 core tests; the nine-action catalog, position requirements/tags, tuning, cross-package contracts, and both locales are covered by 37 content tests. Independent review findings are resolved, and deterministic core/testkit integration passed 54 tests.
- 2026-08-31: Completed creation content with a strict content-to-core mechanics builder, metric body defaults/options, and 51 bilingual persisted appearance choices. Exhaustive tests cover 390 compatible archetype/background/personality combinations and every cosmetic option; root typecheck/lint, 49 content tests, 70 simulation tests, package builds, and built-output smoke checks passed.
- 2026-08-31: Completed reusable WR fixtures and three seeded M1 development scenarios. The checked-in compatibility-v1 JSONL report covers 24 seeds, 72 careers, and 1,152 weeks; it reaches proficiency level 5, quantifies low-Body versus recovery-supported training, validates/optionally serializes every transition, and preserves an RNG draw count of zero. Testkit passed 18 focused tests and its build/lint/typecheck gates.
- 2026-08-31: Completed CareerRun v1 parsing and browser persistence after independent review. Saves synchronously clone caller data, use canonical checksum envelopes, serialize writers across instances, write snapshots before current, protect incompatible/future data, retain 30 valid compatible snapshots, clamp timestamps monotonically, and recover the globally newest valid state across interrupted replacements. Web passed 41 tests, core passed 53 tests, and no high/medium review findings remain.
- 2026-08-31: Completed the mobile-first bilingual creation and weekly web loop. Load-first boot resumes exact phases; creation covers stable-ID identity, 13 cosmetic fields, and locale-specific measurement input with metric storage; planning preserves ordered duplicates and drafts locally; every authoritative transition saves before the next command, with visible retry/reload recovery. Six web files passed 58 tests, content passed 49 tests, and web typecheck/lint/localization/boundary/format/build gates are green. Production Playwright and independent UI review are the remaining M1 closeout tasks.
- 2026-08-31: Completed M1 Playwright coverage with 14 passing mobile/desktop executions. Both locales create a representative WR, prove draft non-persistence, save/reload exact queue and mid-resolution results, finish two weeks through revision 10, and preserve identity/state/RNG; the 320 px path uses keyboard-only commands plus element/44 px bounds, and the offline PWA path resumes a saved career. The first aggregate M1 check passed, but independent review then reproduced two medium UI issues—same-phase resolution focus loss and locale/unit mismatch during delayed settings writes—which must be fixed before closeout.
- 2026-08-31: Closed M1 after remediating and independently reproducing every UI finding. Same-phase results use a focused atomic live status, repeated save failures retain a deterministic focus destination, successful retry restores the phase heading, and locale copy/units/document metadata/provider state update immediately while tokenized persistence serializes to the latest request. The final aggregate gate passed with 181 Vitest tests, 49 content tests, 71 deterministic core/testkit tests, 14 Playwright executions, all static checks, package builds, emitted-export smoke, and PWA artifact verification; no unresolved high/medium findings remain.
