# Project Progress

> Primary resume checkpoint. Historical detail lives under `docs/execution/progress-archive/`. The full M8 step log is in `2026-09-30-m8-closeout.md`, and the pre-rebuild state is in `2026-09-29-pre-rebuild.md`.

## Target

M10 — 1.0 Release Candidate (unchanged).

## Current milestone

M10 — 1.0 Release Candidate (started 2026-09-30). Plan: `docs/exec-plans/active/m10-release-candidate.md`.

## Status

M9 is COMPLETE (2026-09-30), and its Tier 3 gate is met (`docs/qa/M9_GATE.md`):
- 96 programs in 8 conferences of 12, fictional awards and conference titles, legacy history (snapshot, record book, familiarity, mentors, cameos), 254 events and 100 cards, and a bilingual editorial pass;
- the six-position harness shows variation across repeated careers;
- a two-career browser journey shows history persists;
- `pnpm check` is green; `E2E_FULL=1` passed 42; the desktop build and smoke passed.

M8 is COMPLETE (2026-09-30): see `docs/exec-plans/completed/m8-six-position-beta.md`.

## Last completed task

M10 step 6, localization QA (2026-09-30):
- numbers use the app language, not the device default: NIL fund totals and fund chips go through `formatNumber` with grouping;
- en-US Profile shows height and weight in feet, inches and pounds, matching creation's imperial input, while ko-KR stays metric (`v2.profile.measureImperial`);
- the 320 px layout test covers both locales and the Week, Build, Team and Profile tabs;
- every step of the two-season career journeys (both locales, all six positions under `E2E_FULL=1`) asserts no raw message key on screen and no Hangul in en-US.


M10 step 5, the browser and PWA matrix (2026-09-30):
- a `mobile-webkit` Playwright project (iPhone 14, WebKit 26.5) for the slice journey and the ko-KR accessibility scan;
- the install scripts include WebKit;
- a PWA installability e2e: a complete manifest and a controlling service worker;
- the update prompt, which had no styles since the rebuild, is restyled on the design system and tested (updates apply only when the player chooses; saves live in IndexedDB, separate from caches);
- offline resume stays covered;
- verified: `pnpm check` (869 + 418 + 397, e2e 19, build).


M10 step 4, accessibility (2026-09-30):
- axe WCAG 2.0–2.2 A/AA scans (including target size) of every week screen in both locales;
- a keyboard-only Saturday, and a reduced-motion board with no animation;
- program-color contrast fixed with `inkOn`, and the depth-row tag contrast fixed;
- the pass is recorded in `docs/qa/M10_ACCESSIBILITY.md`;
- verified: `pnpm check` (867 + 418 + 397, e2e 16, build).


M10 step 3, performance (2026-09-30):
- `performance.test.ts` sets budgets for every command of a full season (100 ms per command, 60 ms per save round trip, season save under 600 KB). Measured: 2–13 ms per command and 5 ms per round trip;
- a throttled mobile e2e smoke: a whole week at 4× CPU slowdown with each transition under 1.5 s (measured 3.7 s total);
- verified: `pnpm check` (866 + 418 + 397, e2e 11, build).


M10 step 2, save hardening (2026-09-30):
- a last-good backup with recovery and a notice;
- checked save fixtures (v1, pre-M8 v3, current M9) that load and keep playing;
- validated Alumni Wall plaques;
- verified: `pnpm check` (865 + 417 + 397, e2e 10, build).


M10 step 1, balance at scale (2026-09-30):
- the testkit `m10-balance` report: 36 four-year careers, checked byte for byte, with band assertions;
- confidence reversion (no more saturation), and a truthful rest credit on short injuries;
- `docs/qa/BALANCE_TARGETS.md` has the M10 table;
- verified: `pnpm check` (860 + 414 + 397, e2e 10, build).


The M9 closeout (2026-09-30):
- the variation harness assertions;
- the two-career legacy journey;
- the record book now celebrates only good marks;
- the Tier 3 gate;
- the plan is archived at `docs/exec-plans/completed/m9-full-world-and-legacy.md`.


M9 step 5, the content QA and bilingual editorial pass (2026-09-30):
- `copy-audit.test.ts` (placeholders, trademarks, untranslated copy, the 콘퍼런스 glossary, title lengths) now runs in every check;
- the Korean register is aligned: -다 for narration and choices, -습니다 for help and notices;
- the pass is recorded in `docs/qa/M9_EDITORIAL_PASS.md`;
- verified: `pnpm check` (857 + 414 + 394, e2e 10, build).


M9 step 4, the event library (2026-09-30): 120 new position-neutral events in six themed packs (campus, locker room, media, body, family, program), from `scripts/life_events_m9_a.py`/`_b.py` through the life-event generator with paired copy. The library has 254 events and 100 cards (enforced by `library.test.ts`). The web build splits the content and locale chunks by size to stay under the 500 kB budget. Verified with `pnpm check` (855 + 412 + 394), then a build and e2e (10) after the chunk change.


M9 step 3, legacy history (2026-09-30):
- an alumni snapshot saved into new careers (`vnext/legacy.ts`);
- a record book (titles, awards, best pick, wins, live games, stat leaders) on the landing screen and at completion;
- program familiarity on offers, transfers and Team;
- the mentor scene from the current program's alumni;
- alumni cameo reactions;
- verified: `pnpm check` (853 + 410 + 394, e2e 10, build).


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

M10 step 7: hygiene and documentation (originality and legal review, known limitations, specs and ADRs against the implementation, release notes, the readiness report). Then the gate.

## Active exec plan

`docs/exec-plans/active/m10-release-candidate.md`. M8 and M9 are archived in `docs/exec-plans/completed/`.

## Current compatibility boundary

- Live save line: `career_vnext` v3 (v1 and v2 migrate on load). It is a checksummed envelope with lean structural validation and a 1 MB bound (a four-season career peaks near 400 KB). The Alumni Wall is `career-vnext-alumni` in the `profile` store.
- M8 added only optional save fields: `nil`, the review's `averageGrade`/`draftStock`/`conferenceChampion`, the recap's `overtime`, and the alumni's `ending`/`draft`. The flow gained `NIL`.
- The world field is a union: the alpha 32-program season (`world_alpha_season_v1`, pre-M8 seasons in progress) or the conference world (`world_vnext_season_v1`). A new season always starts on the current world.
- Deterministic RNG: the career stream plus named streams (room, recruiting, world per season, sideline, event, life, injury, breakthrough, transfer, NIL, draft, overtime). There is no RNG in presentation.
- Prototype records stay on the device, unread, except for export and alumni import.

## Latest green verification

- Tier 3, 2026-09-30 (M9 closeout).
- `pnpm check`: typecheck, lint, boundaries, localized copy and format; node scripts (10); vitest 857/107 files; content 414; sim 394; e2e 10; build and PWA verified.
- Browser: `E2E_FULL=1` passed 42 (16 were project-assignment skips).
- Desktop: `desktop:build` (NSIS) and `desktop:smoke` passed.

## Recent checkpoints

1. 2026-09-30: M9 complete (`18ce04f` through the closeout commit): the 96-program world, awards, legacy, the event library and the editorial pass.
2. 2026-09-30: M8 complete (`98a8a73` through the closeout commit). Steps covered LB/EDGE, the conference world, the draft, NIL, overtime, the life pack, and star impact with pacing.
3. 2026-09-30: R complete (`f62da91`), with the Career VNext app as the only app.
4. 2026-09-29: V3 cutover (tag `pre-cutover`); V2 core and slice.

## Milestone ledger

- M0 through M7 are complete; M7.5 is absorbed by R; R, M8 and M9 are complete.
- M9 is complete. M10 is active.

## Known issues

- Balance: the first round of the Pro Draft needs elite play at a strong program (none in the 36-career harness, by design).
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
