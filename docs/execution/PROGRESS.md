# Project Progress

> Codex must keep this file current. It is the primary resume checkpoint after interruption.

## Target

M10 — 1.0 Release Candidate

## Current milestone

M3 — Programs, roster, depth chart, and snap projection

## Status

IN PROGRESS — M3 CareerRun/save v3 persistence foundation

## Last completed task

Closed M2 after correcting deferred breakthrough publication: the persisted breakthrough remains visible and locked until choice autosave succeeds. The complete repository gate and independent re-review are green with no unresolved high/medium findings.

## Current / next task

Implement M3's single CareerRun/save-envelope v3 foundation: strict recruiting/program/roster/depth state contracts, exact v2 migration fixtures for every M2 phase, raw invariants, and checksum-first browser compatibility.

## Active exec plan

`docs/exec-plans/active/m3-program-roster-depth.md`

## Last verification

- 2026-08-30 M0 full gate: `corepack pnpm check` passed.
- Static gates: strict browser/test/tooling typechecks, ESLint, architecture boundaries, AST localized-copy enforcement, and Prettier all passed.
- Automated tests: 4 localization-guard fixtures and 62 Vitest tests passed; focused content suite passed 23 tests and focused deterministic simulation suite passed 20 tests.
- Browser gate: 8 Playwright scenarios passed across Pixel 7 and desktop Chromium, including both locales, persistence, keyboard use, 320 px layout, service-worker activation, and offline reload.
- Production gate: emitted package exports load from `dist`, shipped content validates, and the PWA manifest/service-worker/icon precache artifacts verify.
- M1 creation content: package typecheck/lint/build passed; 29 content tests and built-output 3/5/8 catalog validation passed.
- M1 player domain: integrated typecheck/lint passed; focused content suite passed 29 tests and deterministic core/testkit suite passed 36 tests (31 in game-core).
- M1 weekly loop: independent reviews found no unresolved high/medium core issues and one resolved content-metadata issue. Formatting passed; the content suite passed 37 tests, game-core passed 49 tests, and the integrated deterministic core/testkit suite passed 54 tests. Workspace typecheck/lint passed before the final content-review metadata reconciliation; package-level typecheck/lint/build and built-output smoke checks passed afterward.
- M1 creation completion: 390 valid mechanical identity combinations and all 51 appearance options validate with matching ko-KR/en-US content. Root typecheck/lint, 49 content tests, 70 deterministic simulation tests, package builds, and built-output smoke checks passed.
- M1 deterministic evidence: testkit passed 18 tests and checked in a content-version-pinned report covering 24 seeds, 72 careers, and 1,152 development weeks. The report reaches proficiency level 5, demonstrates the Body/recovery training tradeoff, round-trips every authoritative transition when requested, and consumes zero gameplay RNG draws.
- M1 persistence: independent review found no unresolved high/medium issues. Web passed 41 tests and game-core passed 53 tests; affected typechecks, ESLint, formatting, and core/content/testkit builds passed. The integrated content suite passed 49 tests and core/testkit simulation suite passed 71 tests after the caller-snapshot regression was added.
- M1 bilingual web loop: web passed 58 tests across six files, content validation passed 49 tests, and web typecheck, workspace lint/localized-copy/boundary checks, scoped formatting, and the 170-module production PWA build passed. Coverage includes load-before-create, StrictMode resume, both locale unit systems with metric persistence, creation validation, ordered duplicate drafts with zero draft writes, all five weekly autosave boundaries, save retry lockout, snapshot recovery, and keyboard phase focus.
- M1 production browser gate: 14/14 Playwright executions passed—four Korean/English two-week journeys on mobile/desktop through exact revision 10, two keyboard-only 320 px flows with element-bound and 44 px target checks, and eight preserved locale/PWA/offline executions. Raw IndexedDB polling proves drafts do not persist and committed queues/results/identity/state/RNG survive phase reloads; offline reload now resumes a saved career.
- M1 aggregate gate passed once after E2E integration: strict workspace typechecks, lint/boundaries/localized-copy, formatting, 4 localized-copy guard fixtures, 178 Vitest tests, 49 focused content tests, 71 core/testkit simulations, 14 Playwright executions, package builds, emitted-export smoke, and PWA artifact verification. Two independently reproduced medium accessibility/locale synchronization findings remain under remediation, so M1 is not yet closed.
- M1 final closeout: all independent UI findings were fixed and reproduced in the production build. Resolution results and every save retry retain deterministic accessible focus; locale copy, units, document metadata, controls, i18n provider state, and latest persisted preference remain atomic under held/rapid writes. The final `corepack pnpm check` passed 4 localization-guard fixtures, 181 Vitest tests, 49 content tests, 71 core/testkit simulations, 14 Playwright executions, all static/format gates, all builds, emitted exports, and PWA artifact verification. Independent review found no unresolved high/medium issues.
- M2 schema/save migration foundation: game-core passed 88 tests across four files, including immutable v1 fixtures for PLAN, RESOLVE 0/1/2, and WEEK_END; the integrated core/testkit suite passed 104 tests. Web passed 71 tests, including raw-checksum-first legacy normalization, mixed-version ranking/recovery, no eager migration write, next-transition upgrade, future-version protection, and retention. Workspace typecheck, lint/boundaries/localized-copy, formatting, and core build passed. Independent core review found no high/medium issues.
- M2 skill effects and initial catalog: game-core passed 104 tests across five files and game-content passed 58 tests across six files. Workspace typecheck, lint/boundaries/localized-copy, formatting, core/content builds, and emitted content smoke checks passed. Fixed-point traces, v1 non-grid GPA migration, prefix-only repeat conditions, reload-safe passive recovery evidence, historical loadout changes, hook-specific bounds, 18-card stable order, all five families, grade-proportional behavior weights, nine tradeoffs, reference reachability, and both locales are covered. Independent review found no unresolved high/medium issues.
- M2 breakthrough/skill commands: game-core passed 130 tests across six files; the integrated game-core/testkit simulation gate passed 148 tests and content retained 58 passing tests. Workspace typecheck, lint/boundaries/localized-copy, formatting, and core build passed. Coverage includes eligibility, exact behavior counts, canonical catalog-order independence, rejection sampling, minimum draw evidence, cadence/raw-state chronology, pool exhaustion, paired catalog failures, RNG exhaustion, reload continuation, choose/auto-equip/full-loadout behavior, planning-only set/clear/replace, mutable-caller isolation, and historical passive trace integrity. Independent source/test reviews found no unresolved high/medium issues.
- M2 skill-build evidence: testkit passed 28 tests and the integrated deterministic simulation gate passed 158 tests. The checked-in content-version-pinned report covers 64 literal paired seeds and 128 first-offer careers; matching behavior raises Coverage Ledger and Late Set Engine weights from 70 to 112 and produces the expected paired offer-rate direction. A shared four-acquisition production-command career branches only through loadout commands: Coverage Ledger produces Film Study XP 16 versus 15, while Recovery Window produces Recovery +40 versus +32 and final Body 57 versus 49. Every sampled transition, pending offer, and post-choice state round-trips with exact RNG evidence; the M1 baseline remains byte-stable.
- M2 bilingual skill UI: web passed 86 tests and content retained 58 passing tests. Web typecheck, scoped ESLint, architecture/localized-copy checks, formatting, and the 185-module production PWA build passed. Coverage includes both-locales keyboard breakthrough choice, zero-draw acquisition/auto-equip, exact failed-save retry, four-slot planning-only clear/replace autosaves, pending-offer/choice/loadout persistence round-trips, localized applied action traces, and derived/persisted passive-recovery evidence. An exhaustive phase-copy switch and visible pre-skill base-value labels resolved both independent medium findings; final review found no unresolved high/medium issues.
- M2 production browser gate: 20/20 Playwright executions passed after the final production build. Korean film-heavy and English strength-heavy journeys each run under native Pixel 7 and desktop Chromium projects; a separate full 320×760 English path covers longer-copy overflow, containment, and 44 px targets. Exact behavior-shaped offers/RNG, pending-offer reload, keyboard choice, first-open auto-equip, four-slot clear/move autosaves, planning lock, localized applied effects, injected save retry, and offline IndexedDB resume are asserted. The preserved M1 two-week journeys now include the mandatory first breakthrough. Independent review found no unresolved high/medium issues after the locale-bound viewport override was removed.
- M2 final closeout: deferred breakthrough publication now keeps the saved `SKILL_BREAKTHROUGH` surface visible and disabled through the initial write, failure, and retry, publishing `PLAN_ACTIONS` only after success. The final `corepack pnpm check` passed 4 localized-copy guard fixtures, 302 Vitest tests, 58 focused content tests, 158 deterministic core/testkit tests, 20 Playwright executions, every static/format gate, all package builds, emitted exports, and PWA artifact verification. Independent re-review found no unresolved high/medium issues. The only build diagnostic is the existing non-fatal 549.79 kB main-chunk warning.
- Git probe: the directory has no git repository metadata, so checkpoint commits remain unavailable.

## Known failures

- The standalone `pnpm` shim is not globally enabled in this sandbox; verification uses `corepack pnpm` with a workspace-local Corepack cache. This does not affect package scripts or normal Corepack-enabled environments.
- `corepack enable pnpm` cannot write to the machine-wide Node installation even with sandbox escalation. This is an environment permission limitation; repository-local Corepack execution is verified.

## Hard blockers

None.

## Important assumptions

See `ASSUMPTIONS.md`.

## Checkpoint notes for the next agent

Continue M3 from `docs/exec-plans/active/m3-program-roster-depth.md`. M0–M2 are fully green. Preserve their deterministic RNG, strict migration, save-publication, localization, accessibility, evidence, and PWA guards while making only the planned single v3 wire-format jump.
