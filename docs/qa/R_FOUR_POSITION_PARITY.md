# R — Four-position parity checkpoint (after the WR adapter)

Date: 2026-09-29.

**Method:** a production build in real Chromium via Playwright, running creation → recruiting → This Week → practice report → Game Day (pregame, snap with hover preview, saved result) → final → post-game → next week.

**Coverage:** each of QB/RB/WR/CB at 390 px ko-KR and 1440 px en-US. After the fixes, RB/WR/CB were re-run at 390 px ko-KR.

**Rule:** engine support is not parity; findings came from reviewing the screenshots.

## Verdict

- All four positions complete the slice with zero page errors.
- Before the fixes, WR and CB were clearly worse on Game Day, because the athlete was hidden under the board banner. That is fixed.
- No position is now clearly worse than the others on the reviewed surfaces.
- Remaining gaps are shared across positions, listed under "Open" below.

## Per-position review

| Area | QB | RB | WR | CB |
|---|---|---|---|---|
| Position-correct copy | QB archetypes, backgrounds with QB trade-offs, delivery/coverage/pressure focuses, QB plays/stats | RB equivalents; gap/cut/protection plays; carries/rush yards | WR archetypes restored from the WR creation catalog; route detail/separation/catch-point focuses (new); release/route/catch/YAC plays; targets/rec/drops | CB press/zone/tackle focuses; leverage/coverage/ball/tackle plays; targeted/allowed/yards allowed/PBU/tackles |
| Recruiting | 4 stratified offers, exact depth preview | same | same (WR room from the position room kernel) | same |
| Readiness/depth | meters with an exact projection; rival slice with a corrected comparison | same | same | same |
| Board: formation | QB highlighted; 5 OL, backs, receivers vs 4-3 two-high | RB highlighted; A/B/C gap letters between the linemen | WR at the top split; the authored coverage shell and leverage place the corner (press vs off, inside/outside) and safeties; the rival defender is ringed | Defense drawn as circles (our team), offense as crosses; CB across from his receiver (ringed) |
| Choice previews | read sightlines (pre-snap), pocket moves, throw arcs to the checkdown/layered window/boundary, scramble lanes | press/cutback/bounce lanes, contact finishes, protection steps, checkdown release | release stems (speed/hand clear/feint), route breaks (stack/settle/cross), catch point, YAC paths | jam/shade/bail/mirror/undercut/zone handoff, ball/hands play, tackle angles |
| Result animation | ball arc to the saved spot, carry for scramble/sack, outcome tag | carry to the saved spot along the chosen lane | route then throw; not-targeted throws go to the other receiver; reception carries to the saved spot | opponent throw to the receiver; CB technique; INT return / PBU / completion allowed to the saved spot |
| Post-game | result, QB line, defining plays, verdict | RB line | WR line (targets/rec/yards/TD/drops) | CB line |
| Mobile/desktop | 30-yard compact board / 40-yard desktop | same | same | same |

All authored decisions for all four positions draw a distinct technique (`app/board.test.ts`).

## Findings fixed at this checkpoint

1. WR crashed at creation: its archetypes were missing from the position catalog. Unified archetype views now include the WR creation catalog.
2. WR and CB athletes, and the ringed rival, were hidden under the board banner. The banner moved to the bottom, the split-end line moved off the sideline, and the yard numbers were raised.
3. The score-bug monogram wrapped ("M/A"); it no longer wraps.
4. RB gap labels overlapped in Korean. Both locales now use the letters A/B/C.
5. The read feedback said "what the defense showed", which is wrong for CB. The copy is now perspective-neutral in both locales.
6. Sideline results now draw the chosen technique (gold) and, when different, the best read (green).

## Engine and content changes behind WR

- New standalone WR kernel `games/wr-alpha.ts`, using the authored WR families, patterns, coverage/leverage, clues and outcome tuning, and the shared tactical field rules.
- VNext game seam `vnext/game.ts`.
- WR position training (3 actions and 3 proficiencies, appended to the position-training ID lists), with paired copy and injury policies.
- Tactical preparation admits WR.
- The focus-state validator accepts WR.
- Frames carry the authored look.

## Open (shared, not position-specific)

- The coach verdict can read harsh on low-volume games, where a single play dominates the grade. Handled in the balance pass.
- Clue text has no on-board markers yet (text list only).
- Pregame "keys" and crowd/stakes tone are not implemented yet (V4 Game Day depth).

## Lifecycle and season-arc parity (2026-09-30)

**Method:** the same real Chromium review, on deterministic saves injected per screen (all four positions generated through core commands), at ko-KR 390/320 and en-US 1440. The release-boundary journey suite (`e2e/career.spec.ts`) plays a full two-season life, transfer included, for every position.

| Surface | QB | RB | WR | CB |
|---|---|---|---|---|
| Midweek events | 12 position events with authored per-choice labels | 12 | the shipped WR catalog (authored choices) | 12 |
| Medical check / restricted drills | shared injury catalog; position exposure | same | same | same |
| Breakthrough cards | 12 position cards | 12 | 40 WR cards; WR game hooks now live in the WR kernel | 12 |
| Team / Profile | full room, schedule, rankings, ratings, season line | same | same | same |
| Postseason, review, offseason, Alumni Wall | shared | shared | shared | shared |

**Findings fixed here:**
- the nameplate squeezed its role line at 320 px;
- the nameplate showed "Week 15" after the season (it now names the stage);
- offer cards in grey program colours looked narrow (they now have a tinted border);
- the pregame snap band disagreed with injury/academic/package caps (it now shows the exact kickoff plan);
- "1 live snaps" plurals (the copy is now label-style).

**Open, shared:** confidence saturates high on sensible plans; see PROGRESS.
