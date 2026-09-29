# Project Progress

> Primary resume checkpoint. Historical detail is preserved under `docs/execution/progress-archive/` (pre-rebuild state: `2026-09-29-pre-rebuild.md`).

## Target

M10 — 1.0 Release Candidate (unchanged).

## Current milestone

M8 — Six-position beta and 64-program world (started 2026-09-30). Plan: `docs/exec-plans/active/m8-six-position-beta.md`.

## Status

R is COMPLETE (2026-09-30). The gate met is:
- full two-season careers for QB/RB/WR/CB, covering recruit, climb, Saturday decisions, transfer, two reviews, retirement and the Alumni Wall, in the real app;
- run across both locales × phone/desktop/320 (`E2E_FULL=1 e2e/career.spec.ts`, 24 journeys green);
- the packaged desktop smoke passes (rebuilt Tauri app, offline, exact save across process exit);
- `pnpm check` is green.

The plan is archived at `docs/exec-plans/completed/r-product-reconciliation.md`. M8 starts with step 1, the LB/EDGE position foundation.

## Last completed task

R5 closeout (2026-09-30):
- the release-boundary journey suite (`e2e/career.spec.ts` with `e2e/support/career.ts`, a revision-gated command driver);
- the desktop smoke ported to the new app, with the Tauri app rebuilt;
- the parity ledger extended to the lifecycle and season arc;
- a Tier 3 gate.

Before that: balance harness and first balance pass (R1.6, 2026-09-30). `career-vnext-balance.test.ts` simulates a season per position × focus strategy (grind, balanced, coach, study), prints the table and asserts the product bands.

| Measure | Before | After |
|---|---|---|
| Overall growth per season | +1 | +2 to +5, from the position-weighted overall and focus XP ×3 |
| Body at kickoff, balanced plan | ~98 (pinned at 100) | 45–95 |
| Body at kickoff, grinding | — | under 10, and grinding invites injuries |
| Coach trust at season end | 0–29 | 26–58 |
| Verdict on low-volume games | harsh | a staff grade weighted by live-snap volume |

What changed:
- **Trust:** the staff grade drives post-game trust around a neutral 60, and sideline-only Saturdays leave trust alone.
- **Recovery:** now +20 Body, so Body is a budget.
- **OVR:** the nameplate, creation card and review now show the position-weighted rating the depth model already evaluates, not a flat mean of 16 attributes.

Before that: the season arc (postseason, review, offseason, four seasons, Alumni Wall).

- **Postseason:** the top four of the final rankings play a semifinal and a final (world kernel, higher seed breaks ties). A qualifying program plays them as weeks 13 and 14 with the full weekly loop; otherwise the world resolves them.
- **Season review:** finish (champion, runner-up, semifinalist, missed), record, rank, the champion, and the athlete's year (overall and depth start to end, live games, stat totals, cards, injuries).
- **Offseason:** stay, or one of three transfers (a reach, a fit, a role) on a named stream. Every option previews the exact next-season room. Staying ages the room (seniors graduate, returners gain a year, freshmen arrive through `buildPositionRoomSeason`, a new core kernel). Trust carries over at the shipped stay/transfer retention. Body heals and preparation resets.
- **Graduation and retirement:** after the senior season, or retiring from an offseason, the career becomes an Alumni Wall plaque (programs, seasons, titles, best finish, record, totals, final overall). The plaque is stored beside the live save.
- **Prototype alumni:** a best-effort, read-only scan of prototype records shows parseable alumni (name, position, games) on the wall.
- **Save:** `career_vnext` v3 (history, season start snapshot), with v1 → v2 → v3 migrations tested. The log now holds only the current season, since finished seasons live on as reviews; a four-season career stays well under the 1 MB bound (about 260 KB).
- **UI:**
  - season review, offseason and Alumni Wall screens;
  - round labels on Game Day and the recap;
  - the nameplate names the class year and the season stage;
  - postseason games on the Team schedule.

Before that: the weekly lifecycle (Team, Profile and academics completed it).

- **Four destinations while planning:** This week / Build / Team / Profile.
  - Team: program header (rank, record), the full position room, the 12-game schedule with results and the rival, and the top 10 of the rankings.
  - Profile: identity, measurables, every rating, season totals, GPA with academic standing and the next check, health and readiness.
- **Academics (the shipped rule):** at the week-6 and week-12 checkpoints, a GPA below 2.00 after practice and events sits that game (sideline reps still happen). The planner alert appears only when a check is two weeks or less away and GPA is below 2.30.
- **Verified:** tests for all four positions, the App journey through all four tabs, and a real-browser review at ko-KR 390/320 and en-US 1440.

Before that: weekly lifecycle part 2 (breakthrough cards and the Build screen).

- **Core (`vnext/build.ts`):** a full gauge (80) opens a `BREAKTHROUGH` scene after the practice report with three weighted, unowned cards on a named stream. The pick joins the collection and fills the first open slot. `equipSkillVNext` edits the four slots while planning.
- **Rules consume every live card effect:** skill-aware focus resolution, rollover recovery, the injury-risk multiplier, QB/RB/CB kernel card effects, event unlocks. The WR kernel now consumes the shipped WR game hooks with the old WR semantics (clue, reliability, pressure composure, contested catch and tipped risk, YAC and fumble risk, package snaps).
- **WR card set:** the 40 shipped WR cards, with old drill scopes mapped onto focus tags of the VNext WR drills.
- **UI:** a card face (grade, family, Saturday effect, live weekly effect), the "This week / Build" tabs, a slot and collection editor, and the breakthrough scene. NIL and relationship build lines are hidden until those systems exist.
- **Also fixed:** the nameplate at 320 px (the portrait yields its column).
- **Tests:** every card of every position equips and plays; WR cards measurably change the Saturday; about two to three cards per season on a balanced plan.

Before that: weekly lifecycle part 1 (events and injuries as scene cards, `career_vnext` v2).

- **Core (`vnext/weekly.ts`):** `toGameDay()` now walks report → optional midweek event → pregame injury check → Game Day. QB/RB/CB events reuse their position selectors and choice rules; WR uses the shipped WR catalog with the same eligibility semantics. Event modifiers reach the next kickoff only. Injury availability caps live snaps; OUT still gets sideline reps; rollover advances recovery; drills follow the shipped injury workload policy.
- **Pacing:** `VNEXT_INJURY_TUNING` is convex in Body. A test locks the contrast: a balanced plan sees about 0.5 injuries per season, grinding Body to zero about 2.5.
- **Save:** `career_vnext` v2 with a v1 → v2 migration test.
- **UI:** event and medical scene cards with exact consequence previews; restricted drills and an injury banner in the planner; a pregame injury-risk band; availability on the pregame strip and in the recap. Per-event choice labels for QB/RB/CB (the shipped names were generic) in both locales, with a coverage test.
- **Verified:** real browser at ko-KR 390/320 and en-US 1440 on injected deterministic saves.

Before that: WR adapter plus the four-position parity checkpoint (2026-09-29).

- **WR kernel:** a standalone WR kernel on the authored WR content and the shared tactical rules, reached through the VNext game seam.
- **WR training and creation:** WR position training (3 actions and 3 proficiencies, with paired copy); WR is restored in creation.
- **Board:** per-position boards (`app/board.ts`) with the authored coverage and leverage, a distinct technique drawing for every decision, and saved-fact result motion. Sideline results show the chosen read against the best read.
- **Parity:** real-browser parity for QB/RB/WR/CB at 390 px ko-KR and 1440 px en-US. Six findings were fixed. Ledger: `docs/qa/R_FOUR_POSITION_PARITY.md`.

## Current / next task

V4 continues in the new stack, in priority order:

1. **Game Day depth:** done 2026-09-29.
   - Pregame stakes: matchup outlook, rivalry, rankings and records.
   - A "meanwhile" ticker for background scoring.
   - Authored trigger-based post-game reactions.
   - Pregame game plan (2026-09-30): an exact kickoff preview (live snaps, sideline reads, clues on the first read, first look).
   - Not planned: on-board clue markers. Clues carry no authored board anchor, so markers would invent positions.
2. **Weekly lifecycle:**
   - contextual events and injuries as scene cards: done 2026-09-29;
   - breakthrough card offers on the Build screen: done 2026-09-29;
   - off-field alerts only when actionable: done 2026-09-30 (academics; NIL and relationships are not in VNext yet);
   - Team depth-board and Profile screens: done 2026-09-30.
3. **Season arc:** done 2026-09-30 (postseason, review, offseason stay/transfer, four seasons, retirement, Alumni Wall with prototype alumni).
4. **Balance pass:** done 2026-09-30 through the harness. Still open: confidence saturates high (80–97) on sensible plans; rest credit on a one-week injury is inert; a fit-program freshman often reaches the top of the depth chart within season one.

## Active exec plan

- Active: `docs/exec-plans/active/m8-six-position-beta.md`. R is complete: `docs/exec-plans/completed/r-product-reconciliation.md`.
- Contract: `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md` (cutover criterion met, see below).
- Evidence/decisions: `docs/product-reconciliation/`.
- Superseded M7.5 plans remain for reference only.

## Current compatibility boundary

- Live save line: `career_vnext` v3 (v1 and v2 migrate on load), plus the Alumni Wall record `career-vnext-alumni` in the `profile` store, `currentCareer`, id `career-vnext`. It is a checksummed JSON envelope with lean structural validation and a 1 MB bound, published only after a successful save, with exact retry.
- Every future schema change needs an explicit version and a migration test.
- Prototype records (WR CareerRun v1–v8, position aggregate v1–v3, meta/alumni, snapshots) stay on the device, unread. The only obligations are the export and a later lightweight alumni import.
- Core still contains the old WR and position-alpha aggregates. VNext reuses their kernels (engines, room/depth, focus, practice grade, creation, world). Removing the unused aggregates is an R cleanup task after the WR adapter lands.
- Deterministic seeded RNG: the career stream plus purpose-named derived streams (offer preview room == committed room; sideline reps; weekly event; pregame injury); world RNG inside the world state. No RNG in presentation.

## Cutover criterion evidence (all met 2026-09-29)

- **Journey:** a full 12-game QB regular season in the production browser (390 px en-US) with no dead ends. The QB climbed to QB2.
- **Visual review:** ko-KR at 390 px and en-US at 1440 px, reviewed against the audit failure list, with fixes applied:
  - inverted rival comparison
  - button specificity
  - top-bar wrap
  - figure margin
  - clock glyph
  - Hangul letter-spacing
- **Save/reload/offline:** save → reload → offline reload (service worker) resumes exactly; a failed write shows a banner and the exact retry succeeds (unit + App test).
- **Keyboard:** keyboard-only play from creation through a snap result; focus draws the route preview; the board has an aria text equivalent.

## Latest green verification (2026-09-30, R closeout — Tier 3)

- `pnpm check`: typecheck, lint/boundaries/localized copy, format, node script tests (10), vitest 821/100 files, content 386, sim 390, e2e 8 passed / 6 skips, and build/PWA (22 entries / 1406 KiB).
- The full matrix `E2E_FULL=1`: 28 passed (24 two-season journeys).
- The packaged desktop smoke passed.

## Earlier verification (2026-09-30, balance pass)

- Typecheck, lint, boundary and localized-copy checks.
- 821 tests in 100 files, including the balance harness.
- Build/PWA: 19 entries / 1339.34 KiB.
- Playwright: 4 passed / 2 skips.

## Earlier verification (2026-09-30, season arc)

- Typecheck, lint, boundary and localized-copy checks.
- 820 tests, including a four-season career with a transfer, a playoff run and the v1/v2 migrations.
- Build/PWA: 19 entries / 1338.59 KiB.
- Playwright: 4 passed / 2 skips.
- Real browser: review, offseason, Alumni Wall and postseason Game Day at ko-KR 390/320 and en-US 1440.

## Earlier verification (2026-09-30, weekly lifecycle part 3)

- Typecheck, lint, boundary and localized-copy checks.
- 816 tests.
- Build/PWA: 19 entries / 1312.65 KiB.
- Playwright: 4 passed / 2 skips.

## Earlier verification (2026-09-29, weekly lifecycle part 2)

- Repo typecheck in all 4 packages; lint, boundary and localized-copy checks.
- 812 tests in 98 files (core, content, web, testkit), including 16 VNext season/lifecycle/build tests and the weekly and card copy coverage tests.
- Build/PWA: 19 entries / 1300.99 KiB.
- Playwright: 4 passed / 2 intentional skips (the driver passes the optional weekly scenes, breakthrough included).
- Real browser: breakthrough and Build at ko-KR 390/320 and en-US 1440 on injected deterministic saves.

## Earlier verification (2026-09-29, parity checkpoint)

- Repo typecheck in all 4 packages; lint, boundary and localized-copy checks.
- 726 tests in 78 files (core, content and web), including 6 VNext season tests and board geometry tests. Testkit 68.
- Build/PWA: 19 entries / 1167.88 KiB.
- Playwright: 4 passed / 2 intentional skips.
- Real-browser four-position review done.

## Previous verification (post-cutover)

- Repo typecheck, lint, boundary and localized-copy checks.
- Web: 30 tests in 4 files (storage adapter, i18n, portrait, app journey).
- Core: 322. Content: 368, including 5 VNext full-season/determinism/phase-guard tests.
- Scripts: build-budget tests 4/4. The copy checker now resolves JSX attribute elements.
- Production build/export/PWA verified: 19 precache entries / 1136.17 KiB, lazy `App` chunk, all JS < 500 kB.
- Playwright `e2e/slice.spec.ts`: 4 passed / 2 intentional skips in 23.5 s.

## Desktop artifacts

- The previous unsigned Tauri snapshot (0.7.5) packaged the old UI.
- `scripts/desktop-smoke.mjs` still drives old selectors and must be ported to the new slice at the next desktop build. It has not been run against the new app.

## Recent checkpoints

1. 2026-09-29 — V3 cutover: old frontend deleted, new e2e suite green, 320 px overflow fixes (`pre-cutover` tag before deletion).
2. 2026-09-29 — V2 slice frontend (`90ee242`, `acadba4`): creation, recruiting, week, practice report, Game Day board/animation, post-game. Typed message keys.
3. 2026-09-29 — V2 core (`2fc3a71`): Career VNext aggregate, stratified recruiting with an exact depth preview, sideline reps, board frames, lean codec, relative room tuning.
4. 2026-09-29 — Contract and corrections (`7a6fd6c`, tag `pre-rebuild`); R0 audit (`2609ad9`).
5. 2026-09-29 — Handoff: WR v8 shared presentation (`3565ae1`) and staged position rules (`00632f9`), now superseded history.

## Milestone ledger

- M0–M7 complete; M7.5 Phase A complete.
- R active: R0, V1, V2 and V3 done; V4 expansion and V5 gate pending.
- M8, M9, M10 not started.

## Known issues

- Balance:
  - Body/recovery tension is near-binary: one recovery restores Body to 100.
  - QB coach trust can erode after weak game grades.
  - A balance pass is part of V4.
- Unused prototype locale keys and core aggregates are still present (cleanup after WR adapter).
- The desktop smoke has not been ported.
- Installer install/uninstall is still unexercised.

## Hard blockers

None.

## Resume note

Start V4 with the WR adapter (the rest of V4 is listed under "Current / next task"). Use the tiered protocol:

- Focused core/content tests plus App tests for the edit loop.
- The Playwright slice suite at feature boundaries.
- Real-browser screenshots (ko-KR 390 px, en-US 1440 px) for every new surface.
