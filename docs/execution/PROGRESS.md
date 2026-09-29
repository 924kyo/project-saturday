# Project Progress

> Primary resume checkpoint. Historical detail is preserved under `docs/execution/progress-archive/` (pre-rebuild state: `2026-09-29-pre-rebuild.md`).

## Target

M10 — 1.0 Release Candidate (unchanged).

## Current milestone

R — Product Reconciliation & Frontend Rebuild (inserted before M8 on 2026-09-29; absorbs unfinished M7.5 Game Day work).

## Status

IN PROGRESS. The following steps are done:

- R0 audit/rebaseline.
- V1 Career VNext contract.
- V2 QB/RB/CB vertical slice.
- V3 cutover (2026-09-29): the rebuilt "Saturday Broadcast" app on Career VNext is now the only app. The old frontend, the old web career/storage facades and the M1–M7 browser specs are deleted; they are recoverable at tag `pre-cutover` (and `pre-rebuild`).

Prototype saves are left untouched on the device, with a one-tap JSON export notice. M8 stays blocked until R closes.

## Last completed task

WR adapter plus the four-position parity checkpoint (2026-09-29).

- **WR kernel:** a standalone WR kernel on the authored WR content and the shared tactical rules, reached through the VNext game seam.
- **WR training and creation:** WR position training (3 actions and 3 proficiencies, with paired copy); WR is restored in creation.
- **Board:** per-position boards (`app/board.ts`) with the authored coverage and leverage, a distinct technique drawing for every decision, and saved-fact result motion. Sideline results show the chosen read against the best read.
- **Parity:** real-browser parity for QB/RB/WR/CB at 390 px ko-KR and 1440 px en-US. Six findings were fixed. Ledger: `docs/qa/R_FOUR_POSITION_PARITY.md`.

## Current / next task

V4 continues in the new stack, in priority order:

1. **Game Day depth:**
   - pregame keys from preparation and film;
   - on-board clue markers;
   - crowd/stakes tone and a drive ticker;
   - a post-game reaction feed.
2. **Weekly lifecycle:**
   - contextual events and injuries as scene cards;
   - off-field alerts only when actionable;
   - breakthrough card offers on the Build screen;
   - Team depth-board and Profile screens.
3. **Season arc:** postseason, season review, offseason Stay/transfer, season two, retirement, Alumni Wall and Career Hub (with the lightweight import of prototype alumni).
4. **Balance pass:** Body/recovery near-binary; coach verdict harsh on low-volume games; QB trust erosion.

## Active exec plan

- Active: `docs/exec-plans/active/r-product-reconciliation.md` (product-owner corrections and revised sequence V1–V5).
- Contract: `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md` (cutover criterion met, see below).
- Evidence/decisions: `docs/product-reconciliation/`.
- Superseded M7.5 plans remain for reference only.

## Current compatibility boundary

- Live save line: `career_vnext` v1 in store `currentCareer`, id `career-vnext`. It is a checksummed JSON envelope with lean structural validation and a 1 MB bound, published only after a successful save, with exact retry.
- Every future schema change needs an explicit version and a migration test.
- Prototype records (WR CareerRun v1–v8, position aggregate v1–v3, meta/alumni, snapshots) stay on the device, unread. The only obligations are the export and a later lightweight alumni import.
- Core still contains the old WR and position-alpha aggregates. VNext reuses their kernels (engines, room/depth, focus, practice grade, creation, world). Removing the unused aggregates is an R cleanup task after the WR adapter lands.
- Deterministic seeded RNG: the career stream plus purpose-named derived streams (offer preview room == committed room; sideline reps); world RNG inside the world state. No RNG in presentation.

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

## Latest green verification (2026-09-29, parity checkpoint)

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
