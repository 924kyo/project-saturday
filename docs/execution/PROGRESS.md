# Project Progress

> Primary resume checkpoint. Historical detail lives under `docs/execution/progress-archive/`. The full M8 step log is in `2026-09-30-m8-closeout.md`, and the pre-rebuild state is in `2026-09-29-pre-rebuild.md`.

## Target

M10 — 1.0 Release Candidate (unchanged).

## Current milestone

M9 — Full world, content and legacy history (started 2026-09-30). Plan: `docs/exec-plans/active/m9-full-world-and-legacy.md`.

## Status

M8 is COMPLETE (2026-09-30), and its Tier 3 gate is met:
- all six positions (QB, RB, WR, CB, LB, EDGE) complete multi-season careers in the real app. The `E2E_FULL=1` matrix passed 41, covering six positions × ko-KR/en-US × phone/desktop/320 plus a Pro Draft declaration journey;
- the 64-program conference world with a 12-team bracket; the Pro Draft (stock, declaration, endings); NIL with benefits and the locker room; overtime; star impact; a 16-event campus-life pack;
- the six-position four-season career harness is inside its bands;
- `pnpm check` is green, the packaged desktop app was rebuilt (0.7.5 NSIS), and the desktop smoke passed;
- the parity ledger is `docs/qa/M8_SIX_POSITION_PARITY.md`.

## Last completed task

M9 step 2, awards and championships (2026-09-30):
- `vnext/awards.ts` covers All-Conference first and second team, Freshman All-American, All-American, per-position awards, Conference Player of the Year and Title Game MVP;
- awards appear on the review, the alumni plaque and completion (awards and conference titles), and as a draft-stock credit;
- the harness asserts awards are earned in some seasons but under 40%;
- the locales chunk is split by size, and the slice e2e driver handles NIL scenes;
- verified: `pnpm check` (850 + 408 + 394, e2e 10, build verified).


M9 step 1, the 96-program world (2026-09-30): 32 more original programs (4 per conference, with paired copy), eight conferences of 12, three early non-conference rounds and then nine conference games, the same bracket and stride, and a `worldId` on new conference seasons. A 64-program season in progress finishes there, which is tested. Verified with `pnpm check` (846 + 408 + 390, e2e 10, build).

Before that:

The M8 closeout, 2026-09-30:
- review fixes: receiver-only NIL deals, and overtime now uses the star-impact matchup;
- the six-position parity ledger;
- the Tier 3 gate: `pnpm check` (844 + 406 + 390 tests, e2e, and a verified PWA build), the full matrix, and the desktop build and smoke;
- the plan is archived at `docs/exec-plans/completed/m8-six-position-beta.md`.

## Current / next task

M9 step 3: legacy history (alumni snapshot, record book, familiarity, mentors, cameos). Then the event library, the editorial pass, and the gate.

## Active exec plan

`docs/exec-plans/active/m9-full-world-and-legacy.md`. Contract: `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`.

## Current compatibility boundary

- Live save line: `career_vnext` v3 (v1 and v2 migrate on load). It is a checksummed envelope with lean structural validation and a 1 MB bound (a four-season career peaks near 400 KB). The Alumni Wall is `career-vnext-alumni` in the `profile` store.
- M8 added only optional save fields: `nil`, the review's `averageGrade`/`draftStock`/`conferenceChampion`, the recap's `overtime`, and the alumni's `ending`/`draft`. The flow gained `NIL`.
- The world field is a union: the alpha 32-program season (`world_alpha_season_v1`, pre-M8 seasons in progress) or the conference world (`world_vnext_season_v1`). A new season always starts on the current world.
- Deterministic RNG: the career stream plus named streams (room, recruiting, world per season, sideline, event, life, injury, breakthrough, transfer, NIL, draft, overtime). There is no RNG in presentation.
- Prototype records stay on the device, unread, except for export and alumni import.

## Latest green verification

- Tier 3, 2026-09-30 (M8 closeout).
- `pnpm check`: typecheck, lint, boundaries, localized copy and format; node scripts (10); vitest 844/103 files; content 406; sim 390; e2e 10; build and PWA verified.
- Browser: `E2E_FULL=1` passed 41 (15 were project-assignment skips).
- Desktop: `desktop:build` (NSIS 0.7.5) and `desktop:smoke` passed with no errors.

## Recent checkpoints

1. 2026-09-30: M8 complete (`98a8a73` through the closeout commit). Steps covered LB/EDGE, the conference world, the draft, NIL, overtime, the life pack, and star impact with pacing.
2. 2026-09-30: R complete (`f62da91`), with the Career VNext app as the only app.
3. 2026-09-29: V3 cutover (tag `pre-cutover`); V2 core and slice.

## Milestone ledger

- M0 through M7 are complete; M7.5 is absorbed by R; R and M8 are complete.
- M9 is active. M10 has not started.

## Known issues

- Balance notes still open:
  - confidence saturates high on sensible plans;
  - rest credit on a one-week injury is inert;
  - brand reaches about 100 for four-year starters.
- The NIL catalog is small (10 deals; M9's content scale grows it).
- Unused pre-R aggregates and locale keys are still present (cleanup pending).
- Installer install/uninstall is unexercised.

## Hard blockers

None.

## Resume note

Continue M9 in plan order. Use the tiered protocol:
- focused core and content tests in the edit loop;
- the default e2e plan at feature boundaries;
- real-browser screenshots for new surfaces;
- the full matrix and desktop only at the M9 gate.
