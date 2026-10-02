# Project Progress

> Primary resume checkpoint. Historical detail lives under `docs/execution/progress-archive/`. The full M8 step log is in `2026-09-30-m8-closeout.md`, and the pre-rebuild state is in `2026-09-29-pre-rebuild.md`.

## Target

M10 — 1.0 Release Candidate: **reached** (2026-09-30). Current build: `1.0.0-rc.2` (M11, post-RC).

## Current milestone

**M12 — Career Revision (active, 2026-10-01).**
- Plan: `docs/exec-plans/active/m12-career-revision.md`.
- Requirements matrix and definition of done: `docs/execution/M12_REQUIREMENTS.md`.
- Sources: the user's M12 scope prompt plus `PLAYTEST_REPORT_EN.md`, `UPDATED_BUILD_REGRESSION_EN.md` and `INITIAL_DESIGN_EN.md` (in the user's Downloads, summarized in the matrix).

M10 is complete (plan: `docs/exec-plans/completed/m10-release-candidate.md`), and the M11 follow-ups are complete.

### M12 progress log

- 2026-10-01: audit done; matrix and plan written.
- 2026-10-01: Phase 1 (match feedback) is verified complete:
  - MATCH-01…15 and VER-02…06;
  - tests: m12-match, m12-match-season, m12-copy, m12-role-events and headlines;
  - EN/KO screenshots.
- 2026-10-01: Phase 2 (development) is done.
  - DEV-01…06 and 09 are verified complete.
  - DEV-07, 08 and CRE-02 are in progress: harness validation in Phase 10, academic support in Phase 4, OVR weights in Phase 3.
  - A Phase 1 locale-key regression was found and fixed (see DECISION_LOG).
  - Restart point: Phase 3, creation and identity (CRE-01…10).
- 2026-10-02: Phase 3 (creation and identity) is done.
  - CRE-01, 02, 03, 07, 08, 09 and 10 are verified complete.
  - CRE-05 and CRE-06 were blocked on the owner's art. The Round 3 v3 pack (335 WebPs plus `portrait-overlays.json`) is now integrated, so both are verified complete.
    - The pack adds 16 faces, 14 hairstyles and per-face placement; the bust swaps atomically, and every layer is precached in one release.
    - Gate after the pack: vitest 942, content 472, sim 398, e2e 20, build with the precache check; 250 busts inspected on contact sheets.
  - CRE-04 is in progress: story beats come in Phase 6.
  - Gate: typecheck, lint and format clean; vitest 934, content 471, sim 398, e2e 20, build; EN/KO screens of the build step, Look and Profile.
  - Next: Phase 4, schools and transfers.
- 2026-10-02: Phase 4 (schools and transfers) is done.
  - REC-01, 02, 03, 05, 06, 07 and DEV-08 are verified complete.
  - REC-04 is in progress: its story beats come in Phase 6.
  - Gate: typecheck, lint and format clean; unit 952, sim 398, e2e 20, build; EN/KO recruiting and offseason screens.
  - One open item: the 12-career climbing harness drafts 12 of 12 against its "fewer than 12" band. Its assertion is unchanged and awaiting the user's call (DECISION_LOG).
  - Next: Phase 5, roles and depth.
- 2026-10-02: Phase 5 (roles and depth) is done.
  - ROLE-01…06 are verified complete.
  - Starter seasons 646‰ (juniors and seniors are no longer automatic starters).
  - Gate: typecheck, lint and format clean; unit 959 with the one known climbing-harness band failure (the user's decision: revisit in Phase 10); sim and e2e (see the commit).
  - Next: Phase 6, relationships and narrative.
- 2026-10-02: Phase 6 (relationships and narrative) is done.
  - REL-01…07, REC-04, CRE-04 and CAR-08 are verified complete.
  - CAR-05's honors are graded; their legacy display comes in Phase 8.
  - Restart point: Phase 7, cards, Insight and the NIL economy.

## Status

M10 is COMPLETE (2026-09-30). Every item in `RELEASE_CHECKLIST.md` is checked, with evidence in `docs/release/READINESS_REPORT.md`:
- the Tier 3 run: `pnpm check` green (874 + 420 + 397 tests, e2e 20, build verified); `E2E_FULL=1` 52 passed (Chromium phone, 320 px and desktop, plus WebKit iPhone 14); the desktop `1.0.0-rc.1` build and smoke passed;
- the release docs: `docs/release/` (release notes, readiness report, known limitations, spec conformance);
- there are no critical or high defects; the manual to-dos before a public 1.0 are listed in `KNOWN_LIMITATIONS.md`.

M9 is COMPLETE (2026-09-30), and its Tier 3 gate is met (`docs/qa/M9_GATE.md`):
- 96 programs in 8 conferences of 12, fictional awards and conference titles, legacy history (snapshot, record book, familiarity, mentors, cameos), 254 events and 100 cards, and a bilingual editorial pass;
- the six-position harness shows variation across repeated careers;
- a two-career browser journey shows history persists;
- `pnpm check` is green; `E2E_FULL=1` passed 42; the desktop build and smoke passed.

M8 is COMPLETE (2026-09-30): see `docs/exec-plans/completed/m8-six-position-beta.md`.

## Last completed task

The written playtest report (2026-10-01): the P1/P2 items are addressed (see DECISION_LOG).
- Scene rules: no slide touchdown; a CB ball in the air is always targeted; an after-catch CB snap is a tackle, a missed tackle or a forced fumble.
- No repeated look within a game; the breakthrough gauge cannot stall; role-aware rotation events; the draft was re-based.
- Calibrated read feedback, fumble headlines, grade explanation, Turning point, folded Play Review, last week's plan, offseason offer facts, a Motion setting.
- The checks are section P of `docs/qa/M11_PLAYTEST.md`. Deferred: the pregame fixed clock, Toss-up previews, Team/Profile sub-tabs, Korean jargon help, cross-career rewards, creation point allocation.

Playtest round 1 (2026-10-01): the user's first playtest notes, all addressed.
- Five save slots and a Settings panel (units, Play Review).
- Creation starts empty, with a trading-card preview, a foil series plate and bilingual suggested names.
- Reads weigh on plays (the read edge) and on the staff grade; awards were re-based and the harness plays a decent reader.
- The depth chart moves (`rivalWeekVNext`), and the breakthrough threshold is 50.
- Training is grouped by kind, and the practice report and post-game show growth bars. Post-game has a news report and Play Review.
- The profile has a trading card and grouped ratings.
- School cards are readable, and program culture (mascot, tradition, atmosphere) and a home jersey were added.
- Round-2 art specs are written (24 mascots, 8 uniform layers, 80 portrait layers), with renderers and fallbacks wired.
- The playtest checklist for round 2 is `docs/qa/M11_PLAYTEST.md`.

The art drop (2026-09-30): the 14 Night Game images are in `apps/web/public/art/` (all to spec: sizes, transparent position art, each under 400 KB, precached). Two layout fixes after seeing them in place:
- the position abbreviation became a small tag beside the playbook glyph, clear of the figure;
- scene art now shows the whole image at the card's height, fading in from the left, and is dimmed under wrapped text on phones.

The playtest checklist is `docs/qa/M11_PLAYTEST.md`.

M11 follow-up and the rc.2 gate (2026-09-30):
- the living Tactical Board: players act out the look's revealed movements before the call, and the whole field plays toward the saved ball spot after it (presentation only; reduced motion stays still). The board remounts when a result arrives, so its animation starts at 0 instead of jumping to the end;
- the Korean register: 72 shipped QB/RB/CB tell lines now use -다, and 17 M11 look strings were rephrased; a content test guards the register of every tell;
- docs brought up to date: `docs/release/` (notes, readiness, limitations, conformance), the Career VNext contract (look stream, looks, grade curve), DECISION_LOG and this file;
- the desktop is `1.0.0-rc.2`, with the Tier 3 gate below.

M11 (post-RC, 2026-09-30):
- snap looks: 120 hidden looks across 24 decision families. Tells from preparation, board arrows for how opponents stand and move, and a post-snap reveal of the real look and its answer;
- the WR fit-scale bug is fixed, so WR reads grade correctly again;
- staff grades share one curve across positions;
- the "Night Game" frontend redesign;
- the art asset list (`docs/design/ASSET_LIST.md`).

M10 step 8, the gate (2026-09-30):
- NIL money uses Intl USD formatting;
- the desktop version is `1.0.0-rc.1`, and its README is refreshed with this build's artifacts and hashes;
- the Tier 3 run is complete, the checklist is checked, the readiness report is written, and the plan is archived.


M10 step 7, hygiene and documentation (2026-09-30):
- the originality review (`docs/qa/M10_ORIGINALITY_REVIEW.md`); a fix means Career VNext never shows generated full names that read as real players or a coach;
- the app now requests persistent storage after the first save of a session (it was dropped at the R cutover);
- the en-US creation height no longer shows 4′12″;
- `docs/release/`: release notes, known limitations and spec conformance; the Career VNext contract is updated to v3 and the 1.0 world; each older spec carries a pointer banner.


M10 step 6, localization QA (2026-09-30):
- NIL money is formatted as US dollars with `Intl` in the app language, not the device default (`formatUsd`: $2,500 in en-US, US$2,500 in ko-KR, signed on effect chips);
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

None required: the durable target (M10) is reached, and rc.2 is gated. Optional follow-ups before a public 1.0:
- the manual items in `docs/release/KNOWN_LIMITATIONS.md`: screen-reader and native-speaker passes, real devices, play-testing the snap looks, trademark clearance, and desktop signing and the installer wizard;
- content depth (NIL, injuries, awards);
- the pre-R code cleanup (BACKLOG).

## Active exec plan

None. M8, M9 and M10 are archived in `docs/exec-plans/completed/`.

## Current compatibility boundary

- Live save line: `career_vnext` v3 (v1 and v2 migrate on load). It is a checksummed envelope with lean structural validation and a 1 MB bound (a four-season career peaks near 400 KB). The Alumni Wall is `career-vnext-alumni` in the `profile` store.
- M8 added only optional save fields: `nil`, the review's `averageGrade`/`draftStock`/`conferenceChampion`, the recap's `overtime`, and the alumni's `ending`/`draft`. The flow gained `NIL`.
- The world field is a union: the alpha 32-program season (`world_alpha_season_v1`, pre-M8 seasons in progress) or the conference world (`world_vnext_season_v1`). A new season always starts on the current world.
- Deterministic RNG: the career stream plus named streams (room, recruiting, world per season, sideline, event, life, injury, breakthrough, transfer, NIL, draft, overtime). There is no RNG in presentation.
- Prototype records stay on the device, unread, except for export and alumni import.

## Latest green verification

- Tier 2, 2026-10-01 (the playtest-report round): `pnpm check` green, with vitest 895, content 436, sim 398, e2e 20 and the build. The WebKit slice journey has a 90 s budget.
- Tier 3, 2026-09-30 (the rc.2 gate).
- `pnpm check`: typecheck, lint, boundaries, localized copy and format; vitest 887 (116 files); content 430; sim 397; e2e 20; build and PWA verified.
- Browser: `E2E_FULL=1` passed 52 (22 were project-assignment skips), including WebKit iPhone 14.
- Desktop: `desktop:build` (`1.0.0-rc.2`, NSIS) and `desktop:smoke` passed.

## Recent checkpoints

1. 2026-09-30: M11 and rc.2 (`84dbb93` through the rc.2 gate commit): snap looks, the Night Game redesign, the living board, the Korean register pass.
1. 2026-09-30: M9 complete (`18ce04f` through the closeout commit): the 96-program world, awards, legacy, the event library and the editorial pass.
2. 2026-09-30: M8 complete (`98a8a73` through the closeout commit). Steps covered LB/EDGE, the conference world, the draft, NIL, overtime, the life pack, and star impact with pacing.
3. 2026-09-30: R complete (`f62da91`), with the Career VNext app as the only app.
4. 2026-09-29: V3 cutover (tag `pre-cutover`); V2 core and slice.

## Milestone ledger

- M0 through M7 are complete; M7.5 is absorbed by R; R, M8, M9 and M10 are complete.
- M11 (post-RC: snap looks, the Night Game redesign, the living board) is complete as `1.0.0-rc.2`. It has no exec plan; its decisions are in `DECISION_LOG.md`.

## Known issues

- Balance: the first round of the Pro Draft needs elite play at a strong program (none in the 36-career harness, by design).
- The NIL catalog is small (10 deals).
- Unused pre-R aggregates and locale keys are still present (cleanup pending).
- Installer install/uninstall is unexercised.
- The snap looks have not been play-tested by people. The checklist is `docs/qa/M11_PLAYTEST.md`.

## Hard blockers

None.

## Resume note

No milestone is active. Before new work, confirm the goal with the user. Candidates are the playtest (`docs/qa/M11_PLAYTEST.md`), the manual items in `docs/release/KNOWN_LIMITATIONS.md`, content depth (NIL, injuries, awards) and the pre-R cleanup. Use the tiered protocol:
- focused core and content tests in the edit loop;
- the default e2e plan at feature boundaries;
- real-browser screenshots for new surfaces;
- the full matrix and desktop only at a release gate.
