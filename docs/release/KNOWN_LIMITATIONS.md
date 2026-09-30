# Known limitations — 1.0 release candidate

Date: 2026-09-30. None of these is a critical or high defect. Each one is a scope boundary, a deferred polish item, or an external step outside this repository.

## Content depth versus the long-range direction (`CONTENT_DENSITY.md`)

| Area | Ships | 1.0 direction |
| --- | --- | --- |
| Programs / conferences / positions | 96 / 8 / 6 | 96 / 8 / 6 |
| Archetypes | 18 | ~18 |
| Skill cards | 100 | 100–130+ |
| Authored events | 254 | 250–350 |
| NIL deal templates | 10 (in 5 categories) | 40–60 |
| Injury outcomes | 8 | 25–30 |
| Key-snap patterns | 8 per position (48, plus sideline reps) | 60–80 |
| Awards and major honors | 12 awards plus conference titles, the bracket and the Pro Draft | 25+ |

The first four rows meet the direction. NIL, injuries, patterns and awards are functional and tested but thinner, so repeated careers will see these repeat sooner than events or cards.

## Design scope

- **Legacy is information only.** Alumni show up as familiar names, mentors, cameos and the record book. They never grant unlocks or bonuses. Unlock-style meta rewards (`META_PROGRESSION.md`) are not in 1.0, a deliberate choice to keep careers fair (DECISION_LOG, M9 step 3).
- **No combine or pro day.** Draft stock is a blend of saved facts plus a small draw, shown as a band.
- **Prototype saves** from before the R rebuild cannot be continued. They are detected and can be exported as JSON, and their alumni plaques are imported read-only.
- **No reset-all-data control.** New Career (with confirmation) ends the current run and keeps the Alumni Wall. Clearing the Alumni Wall requires clearing site data in the browser.
- **No career export or import, and no cloud sync.** Saves live in this browser's IndexedDB with a last-good backup. After the first save of each session the app asks for persistent storage, but whether it is granted is up to the browser.
- **Units follow the language.** en-US shows feet, inches and pounds; ko-KR shows cm and kg. There is no separate unit preference yet; stored values are metric, so one can be added without a migration.

## Balance

- In the checked 36-career report (`docs/qa/BALANCE_TARGETS.md`), no career went in the first round, and 35‰ of seasons reached the bracket. The first round is reachable for strong players at strong programs; the harness rotates decisions rather than playing well.

## Quality assurance not yet done by a human

- Screen-reader walkthroughs (NVDA, VoiceOver). The automated axe, keyboard and reduced-motion gates pass (`docs/qa/M10_ACCESSIBILITY.md`).
- A native-speaker proofread of ko-KR and en-US. The editorial pass and the copy audit are automated or author-reviewed (`docs/qa/M9_EDITORIAL_PASS.md`).
- Real iOS and Android devices. WebKit (iPhone 14 profile) runs a focused subset, and Chromium phone profiles run the full journeys. Firefox is not in the matrix.

## Distribution

- **Desktop:** the Windows Tauri build is unsigned. The executable is launch-tested, but the installer wizard has not been exercised (`apps/desktop/README.md`). The icon is temporary.
- Before commercial distribution:
  - a trademark clearance search for the product name and the program names;
  - the Barlow Condensed OFL notice in the about text or store listing (`docs/qa/M10_ORIGINALITY_REVIEW.md`).
- Nothing is published or deployed by this repository's tooling.

## Codebase

- The pre-R aggregates (the WR career, position-alpha sessions) and their locale keys stay in the repository for historical compatibility and tests. Deleting what is no longer reachable is deferred (BACKLOG).
- Hangul text uses the platform CJK fonts, so its appearance varies slightly by operating system.
