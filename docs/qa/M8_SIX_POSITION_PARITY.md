# M8 — Six-position parity ledger

Date: 2026-09-30. This extends `R_FOUR_POSITION_PARITY.md` (QB/RB/WR/CB) to LB and EDGE and to the M8 systems every position shares.

**Method:** production builds in real Chromium via Playwright.
- Screenshots were reviewed for LB and EDGE Game Day (snap, sideline read, result), post-game, conference Team, season review with the draft projection, the offseason declare panel, career completion, the NIL offer scene and the Profile NIL panel, at en-US and ko-KR 1280–1440 px.
- The release-boundary suite (`e2e/career.spec.ts`) plays full careers for all six positions.
- The domain harness `career-vnext-careers.test.ts` plays four-year careers for all six positions.

**Rule:** engine support is not parity; findings came from reviewing screens and harness output.

## Verdict

- All six positions complete multi-season careers with zero page errors, in both locales, on phone, desktop and 320 px (full matrix: see the M8 gate in `PROGRESS.md`).
- LB and EDGE make distinct football decisions: authored families, clues and outcome tables, not renamed CB stats. None of the reviewed surfaces is clearly worse for them than for the four R positions.
- The M8 systems (conference world, bracket, draft, NIL, overtime, star impact, life events) are position-neutral and verified for all six.

## LB and EDGE review

| Area | LB | EDGE |
|---|---|---|
| Creation | 3 archetypes (run stopper, coverage backer, hybrid blitzer), paired copy, attribute modifiers | 3 archetypes (speed rusher, power rusher, edge setter) |
| Training | run fits, coverage drops, pressure package; proficiencies; focus injury policies | get-off, hand fighting, edge discipline |
| Game Day decisions | key read, gap fit, zone drop, blitz: 4 families, 12 decisions, 8 patterns | rush move, contain vs chase, option responsibility, finish: 4 families, 12 decisions, 8 patterns |
| Outcomes | stop, loss, pass defended, interception, forced fumble, missed tackle, gain allowed (runs never end in a sack or an interception) | stop, loss, pressure, sack, forced fumble, pass defended, missed tackle |
| Board | LB at second level; 12 authored technique drawings | EDGE outside the tackle; 12 authored technique drawings (dip, long arm, squeeze, slow play, strip…) |
| Sideline reps | defender patterns with best-read feedback | same |
| Post-game | tackles, TFL, sacks, pressures, PBU, INT, FF, yards allowed; sack and takeaway reactions | same |
| Cards | 12 cards with baseOfferWeight on the defender effect vocabulary | 12 cards |
| Events | 12 position events, plus the 16-event campus-life pack | 12 position events, plus the life pack |
| Balance | grade band equal to the other four (base 47); six-position harness in range | same |

All authored decisions for all six positions draw a distinct technique (`app/board.test.ts`).

## Shared M8 systems, verified for every position

| System | Evidence |
|---|---|
| 64-program conference world, 12-team bracket | `world-vnext.test.ts`; conference standings on Team; bracket rounds in the Nameplate, post-game and review |
| Pre-M8 saves | a season in progress finishes on the 32-program world; the next season moves to the conference world (`career-vnext.test.ts`) |
| Overtime | no ties in 48 harness seasons, or in the conference world |
| Pro Draft | a stock band on every review; declaration after the junior year (browser); graduation drafts; alumni ending and draft result on plaques |
| NIL | offer scene with the exact reward preview; obligations cost practice time; benefits; locker room; brand from Saturdays; NIL reaches 12/12 harness careers. Receiver-only deals (route clinic, glove workshop) go only to WRs |
| Star impact | a starter lifts their own program in their own games; 6/48 harness seasons reach the bracket |

## Findings fixed during M8

1. Defender grades ran about 10 points above the other positions. The grade base went from 55 to 47.
2. EDGE Hand Fighting drained Body too fast. It now costs 13.
3. The alpha 32-program report counted the new positions. It is pinned to the original four.
4. The WR card test mixed practice effects with Game Day effects. Cards are now equipped for Saturday only.
5. Two NIL offers carried receiver-specific copy for every position. They are now restricted to WR.
6. Overtime weighed a matchup without star impact. It now uses the same matchup as the game.

## Open

- Clue text still has no on-board markers (carried from R).
- The NIL catalog is small: 10 deals, each offered once per career, 8 outside WR. M9's content scale grows it.
- Pregame keys and crowd tone (carried from R).
