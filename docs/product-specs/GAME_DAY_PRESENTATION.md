# Game Day Presentation

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Goal

Turn deterministic football simulation evidence into a readable and exciting
mobile-first experience without moving football rules into React.

## Stack

1. score/game context
2. Tactical Snap Board
3. decision preview
4. resolved-snap animation
5. result explanation
6. post-game story

## Pure presentation projection

Create a pure projection from existing preview/resolution evidence into
presentation frames. The projection:
- consumes zero gameplay RNG
- does not modify authoritative state
- is deterministic
- is reusable across positions

### Evidence ownership and compatibility

The board visualizes the source engine; it cannot make missing facts true. WR active snaps already record clock, down/distance, possession, field position and score, but historical play logs do not retain all of that pre-snap context. M7 added-position engines record choices, clues and position-specific outcomes but not equivalent live field/clock context. Establish the missing current facts and retained pre/post context in their owning game-core contracts before presenting them as authoritative. Version and test any save/rule extension explicitly; do not reinterpret already-started games, literal old logs or completed alumni.

Current context must exist before a choice and survive the saved resolution boundary. Never infer a pre-snap yard line from whether the future play scored, reveal the next play's clues as the previous play's information, or allocate a future final score in the UI. An old record with no context must say it is unavailable and retain its truthful stats. Historical compatibility is not permission to omit the required context from new current games.

Absolute endpoint geometry must agree with the owning current game's field bounds, scoring and possession evidence. Existing abstract logs can contain yardage/TD/fumble/tackle fields without a complete physical endpoint or recovery narrative; they are not sufficient to invent one. Retain those logs literally with explicit unavailable/ambiguous context. Any needed current rule/evidence extension belongs in versioned game-core contracts and their regression tests, before the renderer uses it.

Frame geometry is an original schematic explanation, not motion-capture data. Public assignment geometry and earned clues are distinct: unrevealed defenders remain uncertain, even when a saved hidden pattern has a known content definition. The projection exposes neither hidden fit/probability fields nor future outcomes. The same detached frame contract serves live choices, saved results and eligible key-moment replay; the renderer owns only layout, preview selection and animation time.

The staged B1 pre-snap contract is `tactical_snap_context_v1`: game/position/snap identity, period/clock, offense-relative line/down/distance/drive, current score, the three offered stable decision IDs and only earned clue IDs. The strict copy/validator detaches caller ownership and rejects missing/extra/future fields; source equality still requires owning-engine replay validation. This contract does not activate new rules or upgrade historical saves by itself. LB/EDGE are supported contract identities, not early playable-position activation.

## Tactical Snap Board

Use normalized field coordinates rendered responsively.

Required primitives:
- field / hashes
- line of scrimmage
- first-down marker
- ball
- offense / defense markers
- controlled-player marker
- route/track/read/coverage paths
- target/catch/tackle/end location
- hidden/uncertain defender states

Do not reveal information the career has not earned.

## Position presentation

M7.5 B6 is a required actual-UI parity gate after the board, choice previews, resolved animation and post-game payoff are integrated. Across QB/RB/WR/CB, a beginner must understand the available football action and consequence without WR-specific prior knowledge. The same shell must support equally complete controls, meaningful feedback and readable hierarchy, not merely renamed WR statistics. Inspect full career journeys as well as Game Day, in both locales and mobile/desktop layouts. Automated test success alone cannot establish parity; unresolved obvious breakage or inferiority in any position blocks M8.

WR:
- release, stem, route, break, leverage, catch point, YAC/tackle

QB:
- target/read options, pressure, throw lane/trajectory, scramble lane

RB:
- run track/gap, front alignment, cut, receiving path, protection assignment

CB:
- receiver release, leverage, zone/man landmark, target arrival, tackle/ball play

LB/EDGE extend this contract later.

## Decision cards

Each decision:
- short plain-language name
- optional football term
- one-line intent
- supported risk label if real
- live board preview
- no fake percentages

## Animation

Target 1.5–3 seconds, skippable, reduced-motion compatible, deterministic from
resolved evidence.

Only successful persistence publishes the animated result. Skip/replay/preview and animation completion are read-only; none automatically selects or advances a gameplay command. Reload must retain the same outcome and earned information. Both the static equivalent and the animated presentation carry the same concise accessible summary.

## Result hierarchy

The direct-input foundation reads saved position-owned result fields rather than reconstructing statistics in React. Game XP award and actual resulting rating/next-rating progress are distinct; maximum-rating copy must explain excess XP is not stored. No-opportunity games display their real feedback and no invented snaps or attribute growth. Choice buttons have concise accessible names with separate intent descriptions, and each saved phase moves keyboard focus to its heading. This foundation does not replace the required tactical-board, animation and richer payoff work below.

1. visual outcome
2. headline
3. one explanation
4. actual stat/result delta
5. actual progression/coach/build effects

## Post-game hierarchy

- opponent / score / win-loss / significance
- position-specific player line
- 1–3 key moments, optionally replayable
- coach review / depth implications
- growth and state changes
- contextual reactions when triggered

## Required tests

- same evidence -> same projection
- zero gameplay RNG
- all current positions
- ko-KR/en-US
- 320px containment
- keyboard/screen-reader equivalent summaries
- reduced motion
- reload boundaries throughout Game Day
