# Known limitations — 1.0 release candidate

Date: 2026-09-30, updated for rc.2 (M11). None of these is a critical or high defect. Each one is a scope boundary, a deferred polish item, or an external step outside this repository.

## Content depth versus the long-range direction (`CONTENT_DENSITY.md`)

| Area | Ships | 1.0 direction |
| --- | --- | --- |
| Programs / conferences / positions | 96 / 8 / 6 | 96 / 8 / 6 |
| Archetypes | 18 | ~18 |
| Skill cards | 100 | 100–130+ |
| Authored events | 254 | 250–350 |
| NIL deal templates | 10 (in 5 categories) | 40–60 |
| Injury outcomes | 8 | 25–30 |
| Key-snap looks | 120 looks in 24 decision families (5 each, including 48 disguises) | 60–80 patterns |
| Awards and major honors | 12 awards plus conference titles, the bracket and the Pro Draft | 25+ |

The first four rows and the snap looks meet the direction. NIL, injuries and awards are functional and tested but thinner, so repeated careers will see these repeat sooner than events or cards.

## Design scope

- **Legacy is information only.** Alumni show up as familiar names, mentors, cameos and the record book. They never grant unlocks or bonuses. Unlock-style meta rewards (`META_PROGRESSION.md`) are not in 1.0, a deliberate choice to keep careers fair (DECISION_LOG, M9 step 3).
- **No combine or pro day.** Draft stock is a blend of saved facts plus a small draw, shown as a band.
- **Prototype saves** from before the R rebuild cannot be continued. They are detected and can be exported as JSON, and their alumni plaques are imported read-only.
- **Save slots, no reset-all-data control.** Five save slots hold separate careers; deleting a slot asks first. Clearing the Alumni Wall requires clearing site data in the browser.
- **No career export or import, and no cloud sync.** Saves live in this browser's IndexedDB with a last-good backup. After the first save of each session the app asks for persistent storage, but whether it is granted is up to the browser.
- **Units are a setting.** Settings switches cm/kg and ft/lb in any language (first launch follows the language once). Stored values are metric.

## Balance

- In the checked 36-career report (`docs/qa/BALANCE_TARGETS.md`), no career went in the first round, and 35‰ of seasons reached the bracket. The first round is reachable for strong players at strong programs; the harness rotates decisions rather than playing well.

## Quality assurance not yet done by a human

- Screen-reader walkthroughs (NVDA, VoiceOver). The automated axe, keyboard and reduced-motion gates pass (`docs/qa/M10_ACCESSIBILITY.md`).
- A native-speaker proofread of ko-KR and en-US. The editorial pass and the copy audit are automated or author-reviewed (`docs/qa/M9_EDITORIAL_PASS.md`). The M11 look copy (308 strings) had an author pass for register and phrasing, and a test keeps every Korean tell in the plain register; it has not had a native-speaker read.
- Play-testing of the snap looks by people. The harness confirms every look is readable (its best read grades Sharp for all six positions) and that disguises share their twin's picture, but whether tells feel learnable and disguises fair is untested with players.
- Real iOS and Android devices. WebKit (iPhone 14 profile) runs a focused subset, and Chromium phone profiles run the full journeys. Firefox is not in the matrix.

## Distribution

- **Desktop:** the Windows Tauri build is unsigned. The executable is launch-tested, but the installer wizard has not been exercised (`apps/desktop/README.md`). The icon is temporary.
- **Art:** the 14 Night Game images (`docs/design/ASSET_LIST.md`: backdrops, scene art, position art) ship in `apps/web/public/art/` and are precached for offline play. Every slot keeps its CSS fallback. Round 2 added 24 mascot emblems, 8 uniform layers and 80 painted portrait layers. Program crests and the logo are still drawn in code.
- Before commercial distribution:
  - a trademark clearance search for the product name and the program names;
  - the Barlow Condensed OFL notice in the about text or store listing (`docs/qa/M10_ORIGINALITY_REVIEW.md`).
- Nothing is published or deployed by this repository's tooling.

## Codebase

- The pre-R aggregates (the WR career, position-alpha sessions) and their locale keys stay in the repository for historical compatibility and tests. Deleting what is no longer reachable is deferred (BACKLOG).
- Hangul text uses the platform CJK fonts, so its appearance varies slightly by operating system.
