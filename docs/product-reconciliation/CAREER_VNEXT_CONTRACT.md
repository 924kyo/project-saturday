# Career VNext Contract

Date: 2026-09-29, updated for the 1.0 release candidate on 2026-09-30. Status: authoritative for the shipped career (R through M10). Where an older product spec conflicts with this document, this document describes what ships.

Career VNext is a new, canonical, position-generic career model designed from the player experience inward. It is **not** a promotion of `CareerRun` or `PositionAlphaSession`. It reuses their best proven *kernels*: the position game engines, the room/depth evaluation, focus resolution, practice grade, creation profile, the world simulator and the content catalogs. It does not reuse either aggregate, phase list or save format.

## Design principles

1. **Flow and Game Day first.** The phase machine mirrors the player's week:
   plan → practice report → Saturday → post-game → next week.
   A saved boundary exists only where the player decides something or where a payoff should be savored. Everything else resolves inside one command.
2. **One shape for every position.** Position is data plus an engine adapter. The aggregate, phases, views and UI are shared.
3. **Game evidence is board-ready.** Every snap stores its tactical context before the choice, and every result stores field/ball/possession/score after it. There is no historical abstract branch.
4. **Every role plays Saturday.** When a game grants fewer than two live snaps, **sideline reps** fill the remainder. They use the same pattern/clue/decision content; they grade the read only, never create stats, and feed next week's practice.
5. **Lean integrity.** Commands are the only writers. The codec validates structure, invariants, bounds and a checksum. Full-history replay validation is not used (single-player offline game; replay stays available in tests and tools).
6. **Deterministic.** The saved `career` stream drives the player, practice and snaps. Everything else uses streams derived from the seed plus a purpose name, so no feature perturbs another and a preview equals the committed result:
   - `:vnext:recruiting`, `:vnext:room[:<season>]:<program>` (offers and rooms);
   - `:vnext:world:<season>` (every other program's results; the career never reads it);
   - `:vnext:event|injury|life|mentor|nil|sideline|overtime:<season>:<week>` (weekly scenes, sideline reps, overtime);
   - `:vnext:breakthrough`, `:vnext:transfer:<season>` and `:vnext:draft`.

   `Math.random` is never used for gameplay.

## Aggregate (`career_vnext` v3)

```text
CareerVNext
  model 'career_vnext', version 3, careerId, seed, revision, contentVersion
  rng { career }
  athlete   identity (name, position, archetype, background, traits, appearance, measurables)
            attributes (position attribute progress), readiness { body, preparation, confidence }
            proficiency uses, gauge
  build     equipped [4 | null], owned[], pendingOffer | null
  recruiting { offers: RecruitOffer[] (3–5), committedProgramId | null }
  program   { programId, room: PositionRoomContext } | null
  season    { index, weekIndex, sidelineCredit, startOverall, startRank,
              world: alpha (32, pre-M8) | conference 64 (M8) | conference 96 (M9, worldId) }
  condition { injury | null, injuryHistory[], availability | null,
              recentEvents[], eventHistory[], nextGameModifiers }   (v2)
  nil?      funds, brand, active deals, benefits, locker room      (M8, optional)
  legacy?   bounded Alumni Wall snapshot taken at creation         (M9, optional)
  flow      FlowPhase (below)
  log       GameRecap[]  (current season)
  history   SeasonReview[]  (one per finished season; awards, draft stock)
```

Fields added after v3 are optional, so a save written by any earlier release keeps loading without a migration. Checked fixtures prove it (`packages/game-content/src/validation/fixtures/`).

### Flow phases

| Phase | Player sees | Commands |
|---|---|---|
| `RECRUITING` | 3–5 offers with an honest depth preview | `commitProgram(programId)` |
| `WEEK_PLAN` | Week header, readiness, rival, focus planner | `planWeek([f1,f2,f3])` |
| `PRACTICE_REPORT` | Practice grade band, readiness/XP/trust change, depth movement, pregame injury-risk band | `toGameDay()` |
| `BREAKTHROUGH` (gauge ≥ 80) | Three weighted, unowned cards; the pick joins the collection and fills the first open slot | `chooseBreakthrough(skillId)`, then `toGameDay()` |
| `EVENT` (optional) | Midweek scene card: authored situation, choices with exact consequence previews, then the applied outcome | `chooseEvent(choiceId)`, then `toGameDay()` |
| `NIL` (optional, M8) | A deal offer: payment, brand and the weekly obligation (practice time) | `chooseNil(accept: boolean)`, then `toGameDay()` |
| `INJURY` (only when injured) | Pregame medical check: injury, weeks left; rest vs. play-limited when the injury is limiting | `chooseInjury(choiceId)`, then `toGameDay()` |
| `GAME` | Sub-state below | `kickoff()`, `chooseSnap(id)`, `continue()` |
| `POST_GAME` | Recap story | `nextWeek()` |
| `SEASON_REVIEW` | Season story, awards, draft stock | `continueSeasonReview()` |
| `OFFSEASON` | Stay plus three transfer options; after the junior season, declare for the Pro Draft | `commitOffseason(programId)`, `declareForDraft()`, `retire()` |
| `CAREER_COMPLETE` | The alumni plaque and the record book | none |

`GAME` sub-states:

1. `PREGAME`: matchup and keys.
2. `SNAP`: a pending live snap or sideline rep, with its board context.
3. `RESULT`: the last resolved snap, waiting for an explicit continue. Animation replays only this saved result.
4. `FINAL`: the final score before the recap.

`toGameDay()` walks report → breakthrough (when the gauge is full) → optional event → injury check → `PREGAME`, stopping only where the player reads or decides. The event and the injury check each draw from their own named stream (`:vnext:event:<season>:<week>`, `:vnext:injury:<season>:<week>`), never the career stream. Event game modifiers apply to the next kickoff only; injury availability caps live snaps (OUT still gets the sideline reps); weekly rollover advances recovery. Injury risk is VNext pacing (`VNEXT_INJURY_TUNING`, convex in Body) over the shared exposure components and the shared outcome catalog.

Build: `equipSkill(slot, skillId | null)` during `WEEK_PLAN` only; a card occupies one slot. Equipped cards reach every owning rule: skill-aware focus resolution, weekly rollover (passive recovery), pregame injury risk, the position game kernels (QB/RB/CB card effects; WR game hooks in the WR kernel, including package snaps) and event choices (unlocks, WR option access). Offers draw from `:vnext:breakthrough:<season>:<week>`.

Academics use the shipped checkpoint rule on the regular-season calendar. When the GPA after practice and events falls below the warning floor at a checkpoint week, the game is marked `academicHold`: zero live snaps, sideline reps kept. This is an additive optional field, so no version bump.

Season arc (v3):

- New seasons play the 96-program world: eight conferences of 12, three non-conference rounds, then nine conference games. After week 12 comes a 12-team bracket (eight conference champions plus four at-large, the top four seeds get byes) over four bracket weeks. A qualifying program plays each round through the normal weekly loop. A season that began on the 32- or 64-program world finishes there (its semifinal/final or bracket rules are unchanged).
- Games do not end tied: a regulation tie goes to one overtime on its own stream.
- Season awards and conference titles are decided from saved facts only and appear on the review, the plaque and draft stock.
- Then comes `SEASON_REVIEW` → `continueSeasonReview()`, which leads to `OFFSEASON` (`commitOffseason(programId)` or `retire()`), or to `CAREER_COMPLETE` after the fourth season.
- Stay ages the room through `buildPositionRoomSeason`; a transfer builds a fresh room from `:vnext:room:<season>:<program>`. The next world season draws from `:vnext:world:<season>` and the transfer shortlist from `:vnext:transfer:<season>`.
- `history` keeps one review per season, and `log` holds the current season only.

NIL (M8) is an optional weekly scene: an accepted deal pays, raises brand and costs practice time each week of its obligation. The Pro Draft (M8) opens after the junior season; stock is a transparent blend of saved facts plus a small draw on `:vnext:draft`. Legacy (M9) is information only: familiar alumni on offers and Team, the mentor scene, cameos and the record book; it never changes ratings or offers.

## Game adapter interface (core)

```ts
interface PositionGameAdapter<State> {
  positionId: PositionId;
  start(input: GameStartVNext): State;                 // tactical rules always on
  pending(state: State): PendingSnapVNext | null;      // context + decisions + clues
  resolve(state: State, decisionId: string): State;
  lastResult(state: State): ResolvedSnapVNext | null;  // context + result + stat delta
  summary(state: State): GameSummaryVNext | null;      // score, stat line, grade, growth
}
```

The QB, RB and CB adapters wrap the existing kernels, WR uses its tactical kernel, and LB and EDGE share one data-driven defender kernel with per-position authored content (M8).

## Projections (the only UI inputs)

Pure functions return frozen, locale-neutral view models (message keys + params, never display strings):

- **Pre-game and planning:** `NextAction`, `WeekHeaderView`, `ReadinessView`, `FocusTileView[]`, `PracticeReportView`.
- **Team:** `DepthBoardView`, `RivalCompareView`.
- **Recruiting:** `RecruitOfferView`.
- **Game Day:** `PregameView`, `SnapBoardFrame` (schematic geometry derived from context and result, no RNG), `PlayResultView`, `PostGameStoryView`.

Core owns the football frames. The web app owns layout and localization.

## Save line and prototype boundary

- The new store keys are separate from prototype keys, and the envelope carries a checksum.
- Every future change gets an explicit version and migration, starting from v1. v1 → v2 (weekly condition) migrates in `parseCareerVNext`: the empty condition, and recaps at full availability.
- The browser keeps a last-good backup; a current save that fails its checksum restores from it with a notice, and when both fail the app reports the corruption instead of guessing (M10).
- **Prototype data:** best-effort detection of old keys, a one-tap JSON export, and a lightweight alumni import (name, position, programs, headline stats) where it parses. Nothing more.

## Cutover criterion (met in R; kept as history)

The old frontend and both old career presentation stacks are deleted once **one** production-quality vertical slice passes all of these:

1. **Journey:** QB Create → Recruit → This Week → Practice → Game Day board → snap animation → Post-game → Next week works for a full 12-game regular season without dead ends.
2. **Real-browser check:** in ko-KR at 390 px and en-US at 1440 px, with screenshots reviewed against the audit's failure list (no developer language, one focal action, Game Day with football every week).
3. **Save quality:** save → reload → offline reload resumes exactly, and a failed write can be retried.
4. **Keyboard:** the slice can be completed by keyboard, and the board has a text equivalent.

Remaining positions and lifecycle stages then grow directly in the new stack. The old app is not maintained in parallel.

## Test strategy (orthogonal, tiered)

- **Core:** deterministic unit tests per kernel adapter, per phase command and per projection. One seeded full-season simulation per position runs as a smoke/balance probe.
- **Web view models:** pure tests for projections and formatting.
- **Components:** interaction and accessibility checks, in one locale by default. A locale-completeness guard covers all keys.
- **Browser:** one journey spec per lifecycle (not per locale × viewport). Viewport and locale layout checks run as a separate small screenshot set. Offline/retry is its own spec.
- **Cartesian matrices** (all positions × locales × viewports × lifecycle) run only at release boundaries (R5 closeout, M10).
