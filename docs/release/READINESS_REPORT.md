# 1.0 release candidate — readiness report

Date: 2026-09-30. Build: `1.0.0-rc.2` (M11), on `master` (see `git log`). Gate: `docs/execution/RELEASE_CHECKLIST.md`.

**Verdict: ready as a 1.0 release candidate (rc.2).** Every checklist item is met with the evidence below. There are no critical or high defects (`docs/execution/BLOCKERS.md` is empty), and the scope boundaries are listed in `KNOWN_LIMITATIONS.md`. Publishing, signing and store submission are outside this repository and were not performed.

rc.2 re-ran the whole gate after M11 changed gameplay and presentation:
- snap looks, with the WR fit-scale fix, one staff-grade curve and new award thresholds;
- the Night Game redesign;
- the living board;
- the Korean register pass.

## Tier 3 run (2026-09-30, rc.2)

| Gate | Result |
| --- | --- |
| `pnpm check`: typecheck, lint (eslint, boundaries, localized copy), format, all suites, e2e, build | pass |
| `pnpm test` | 887 passed (116 files) |
| `pnpm test:content` | 430 passed (48 files) |
| `pnpm test:sim` | 397 passed (56 files) |
| `pnpm e2e` (default orthogonal plan) | 20 passed |
| `pnpm build` (budgets, package exports, PWA artifacts, precache) | verified |
| `E2E_FULL=1` release matrix | 52 passed, 22 skipped by project assignment: Chromium phone, 320 px and desktop (50) plus WebKit iPhone 14 (2) |
| Desktop: `pnpm desktop:build` and `scripts/desktop-smoke.mjs` | pass: `1.0.0-rc.2` executable and NSIS installer built; offline launch, both-locale creation, a full Saturday, and save equality across relaunch (`apps/desktop/README.md`) |

rc.1 (the M10 gate) passed the same gate with 874 + 420 + 397 tests.

## Checklist evidence

### Product

| Item | Evidence |
| --- | --- |
| Six positions complete and distinct | `docs/qa/M8_SIX_POSITION_PARITY.md`; two-season journeys for all six positions (`e2e/career.spec.ts`, full matrix); `career-vnext-careers.test.ts` |
| 96 programs / 8 conferences validated | `world-vnext.test.ts` (shape, schedules, bracket, hosting); `M10_ORIGINALITY_REVIEW.md` |
| Full career from creation to ending or draft | the declaration journey and the retire-to-plaque journeys (e2e); four-season graduation (`career-vnext.test.ts`); 36 four-year careers (`m10-balance.jsonl`) |
| Snap decisions reward reading, not memorizing (M11) | `snap-looks.test.ts`: 24 families × 5 looks, every technique wins somewhere, 48 disguises share their twin's picture and first tell but not its answer, and the look's best read grades Sharp for all six positions; `board.test.ts` (look arrows and player movement come only from the look and the saved spot) |
| Balance after M11 | `BALANCE_TARGETS.md` M11 table: 28‰ bracket seasons, 201‰ award seasons, 826‰ starters, 417‰ drafted |
| Skill builds alter decisions | `career-vnext.test.ts` ("turns practice into breakthrough offers…", "makes WR cards change the Saturday…"); QB/RB/CB/LB/EDGE card effects in the kernels (`M8_SIX_POSITION_PARITY.md`) |
| Depth and snap progression clear and stable | depth board and practice-report movement; 757‰ of seasons end as the starter, overall growth +4.3 per season (`BALANCE_TARGETS.md`) |
| Events vary by identity, tags and context | 254 events (`library.test.ts`); the variation assertions in `career-vnext-careers.test.ts` |
| NIL creates tradeoffs without chores | optional chance-based offers; money and brand against practice time (`career-vnext.test.ts`, NIL); 667‰ of careers take a deal |
| Transfer flow works | every two-season journey transfers (`transferred === true`); stay and three options (`career-vnext.test.ts`) |
| Alumni and legacy persist and inform future careers | the two-career journey (full matrix); `legacy.test.ts` (information only, never ratings or offers) |

### Localization

| Item | Evidence |
| --- | --- |
| No missing ko-KR or en-US keys | `localization.test.ts` (keyset, ICU and variable parity); typed `MessageKey`; `copy-audit.test.ts` |
| Full career smoke in ko-KR and en-US | two-season journeys in both locales, which assert no raw key and no Hangul in English at every step |
| Unit, date, number and currency formatting | `Intl` USD currency formatting in the app language ($ / US$) and en-US ft-in/lb (`format.test.ts`); no dates are displayed |
| Mobile layouts in both locales | 320 px layout test in ko-KR and en-US (all tabs and a full week); 320 px career journeys |

### Save and data

| Item | Evidence |
| --- | --- |
| Fresh install and new profile | slice journey from an empty profile (Chromium and WebKit) |
| Autosave and reload | resume after reload (slice) and after the season-two reload (career journeys); retryable failed write (`App.test.tsx`) |
| Snapshot recovery | last-good backup restore (`persistence.test.ts`) |
| Migration fixture suite | `save-fixtures.test.ts` (v1, pre-M8 v3, M9 Game Day); v1/v2 migration (`career-vnext.test.ts`) |
| Corrupt or old save recoverable and communicated | the recovered and corrupt notices (`persistence.test.ts`, `App.test.tsx` tampered save); prototype detection and export |

### Engineering

All items pass in the Tier 3 run above. No critical or high known defects.

### Performance and PWA

| Item | Evidence |
| --- | --- |
| PWA installs where supported | installability e2e (manifest and a controlling service worker) |
| Offline and local save path | offline resume e2e; persistent storage requested after the first save |
| Service-worker update | `PwaUpdatePrompt.test.tsx` (the update applies only on the player's choice) |
| Weekly transitions responsive on mobile | 4× CPU-throttled phone week, each transition under 1.5 s |
| Long world simulation within budget | `performance.test.ts`: every command of a 96-program season under 100 ms (measured 2–13 ms), save round trip under 60 ms, save under 600 KB |

### Accessibility

| Item | Evidence |
| --- | --- |
| Keyboard smoke on desktop | `e2e/keyboard.spec.ts` |
| Reduced motion | `e2e/keyboard.spec.ts` (no board animation); under reduced motion the board's players stay still before and after the call |
| Contrast and state semantics | axe WCAG 2.2 AA on every screen in both locales; `theme.test.ts`; `M10_ACCESSIBILITY.md` |
| Touch targets | axe target-size on the phone projects |

### Legal and originality

| Item | Evidence |
| --- | --- |
| No copied proprietary code, assets or text | `M10_ORIGINALITY_REVIEW.md`; `REFERENCE_USE_POLICY.md` |
| Fictional names and marks reviewed | the program list review; `copy-audit.test.ts` trademark rule |
| No unlicensed real-player likeness | reserved roster names (`originality.test.ts`); no real people, photos or statistics |

### Documentation

| Item | Evidence |
| --- | --- |
| `PROGRESS.md` marks M10 complete | this closeout |
| ADRs and specs match the implementation | `SPEC_CONFORMANCE.md`; updated `CAREER_VNEXT_CONTRACT.md` |
| Known limitations documented | `KNOWN_LIMITATIONS.md` |
| Release and readiness report | `RELEASE_NOTES_1.0_RC.md` and this report |

## Recommended before a public 1.0

These are manual steps, none of them blocking:
- screen-reader walkthroughs;
- a native-speaker proofread (including the 308 M11 look strings);
- play-testing the snap looks with people;
- real-device checks;
- a trademark clearance search;
- signing the desktop build and exercising its installer.
