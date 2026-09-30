# Game Simulation and Key Snaps

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## M7.5 staged current WR physical evidence

The existing WR owning resolver may explicitly receive a validated tactical pre-context only on its staged current path. That context must equal its actual pending clock, down/distance/line, score, offered decisions and earned clues before resolution; no extra gameplay draw is needed to retain existing facts. Original calls omit the context and keep literal outcome/stat/draw behavior. New path: a scored reception credits the remaining distance to the goal line; a non-scoring reception or lost YAC fumble stops before the goal line; no-target ball location remains untracked. A turnover without a reception is an interception at the bounded modeled intended-pass distance, with no invented return or opponent score; a turnover after a reception is a lost fumble. Keep raw calculated/hook-adjusted yards as resolution evidence distinct from actual field-bounded credited yards. Reuse shared core field rules and preserve six original resolution draws. Current drive initialization and saved-result validation/retention must complete under v8 before any shipping caller selects this path; migration never turns an in-progress historical game into it.

## Goal

Staged current WR drive cadence retains the same owning drive loop, duration/pattern/field/matchup draws and aggregate scoring formulas. Before presenting a new opportunity, cap only the newly sampled distance at the goal and cap duration to reserve one second for each still-required player/opponent drive boundary. Never patch an already-saved historical context. A retained or untracked player snap finishes the remainder of that same player drive in the aggregate layer (one duration and one score draw, no extra drive index), then advances to the opponent; a score or known turnover proceeds directly to the opponent. This later aggregate score is not attributed to the prior personal snap. The saved resolved result must remain independent from the next pending opportunity/final score. Zero-opportunity games use the original aggregate loop and award no personal statistics or XP. Selection remains internal and unactivated until v8 replay and commands are complete.

Make football outcomes meaningful without building a full 3D action football game.

## Two layers

1. **Full simulation layer** — simulates drives/plays and all non-player moments.
2. **Key Snap layer** — pauses when the player's role creates a meaningful decision.

## Determinism

Given identical game state, seed, content version, and player decisions, simulation results must reproduce.

## Vertical-slice game scope

WR only.

Behind the scenes, simulate enough context to produce:

- score/game clock/down/distance;
- offensive drives and possessions;
- target opportunities;
- defender matchup context;
- catches/incompletions/YAC/TDs;
- team result;
- player stat line and grade.

Do not overbuild full playbook fidelity before the player loop is fun.

## Key Snap frequency

Current added-position preview reads the same zero-draw kickoff initialization used by its advance command. Its public projection exposes current program/opponent/venue, prepared player state, earned rank/role and the final capped opportunity count. No scores, hidden pattern details, unrevealed clues or resolution probabilities are exposed. Preview does not publish a revision or advance either RNG stream; zero-opportunity games retain a truthful preview and post-game boundary. This current M7 adapter does not replace M7.5's tactical evidence and board contract.

Role targets for offensive key decisions:

- WR1: **6–10**
- WR2: **4–8**
- WR3: **2–6**
- WR4: **1–4**
- bench/developmental: **0–2**

Scarcity remains part of the early career experience, but every scheduled game has a meaningful Game Day surface. When offensive opportunity is absent, provide truthful role-appropriate participation or feedback from special teams, packages, garbage-time work, sideline learning, or scout-team preparation. Do not manufacture targets, catches, or importance the athlete did not earn.

Participation feedback is persisted as a stable content ID and localized in both supported locales. It may summarize an abstracted role contribution, but its stat line must remain zero unless the simulator produced an offensive target/catch/yards result.

The vertical-slice simulator derives a raw opportunity budget from the saved projected snap range, then clamps it to the saved depth rank's range above. Rotation-policy breadth may change the raw projection but cannot silently promote WR3/WR4 control to starter volume.

## WR key-snap decisions

Possible decision families:

- release technique;
- route leverage/stem adjustment;
- catch approach;
- YAC/security choice;
- situational route option when unlocked.

## Information model

Football IQ, Preparation, Film Study, skills, and opponent scouting may change **what information is shown**, assignment certainty, or coach usage—not merely add a flat success probability.

Preparation has two explicit but separate jobs: it helps recognize the assignment before a snap and helps execute after the player chooses. Information-tier arithmetic is never reused as an outcome modifier, so better clues matter through the player's decision rather than secretly changing the same hidden context.

M3.5 establishes deterministic equipped-skill hook contracts for assignment reliability, package snap access, and pressure composure. M4 owns their actual football resolution and any resulting Game Day gauge awards; UI and content do not interpret these hooks independently.

M4 persists the exact information breakdown on every pending snap: Football IQ and Preparation weighted 650/350, whether the completed week contains Film Study and its authored bonus, ordered Coverage Ledger evidence, final score/tier, and only the clue IDs actually revealed. One Coverage Ledger clue is represented as the authored one-clue hook plus a 30-point tier-span contribution; a low base score still receives that explicit extra clue. This conversion is centralized in game-core and does not consume RNG.

For an active M6 off-field career, scheduled Game Preview also persists `off_field_game_context_v1`: the three bounded relationship projections, injury maximum, academic restriction before/after, and final maximum opportunities. Relationship opportunity context adjusts the saved projection midpoint before the existing depth-role opportunity clamp. Relationship information context is recorded on each new pending snap and changes the clue tier only; it does not alter the hidden resolution score. Legacy/pending migrated careers omit this additive evidence and retain exact M4/M5 behavior.

A one-game fictional academic restriction forces the composed maximum opportunities to zero and appends an academic game-ID consumption record in the same season command. The game still resolves through truthful zero-opportunity participation, with no fabricated offensive production.

Example:

Low-information state:

> Coverage: uncertain

High-information state:

> Safety rotation suggests Cover 2; outside leverage detected.

## Resolution concept

Outcome should combine:

- relevant WR attributes;
- defender/matchup attributes;
- decision fit;
- QB/offense context;
- Body/Preparation/Confidence;
- active skill modifiers;
- deterministic RNG.

Return structured resolution details so UI can explain the major factors without exposing exact hidden formulas by default.

The M4 content catalog owns fixed-point component weights and bounds. Game-core consumes the mechanics-only projection and persists each named contribution; React must not duplicate or reinterpret those values.

Each key-snap resolution consumes exactly six draws in order: bounded outcome roll, target, catch, risk, touchdown, and yard variation. The weighted score records attribute fit, defender matchup, decision fit, QB/offense context, Body, Preparation, and Confidence separately. Assignment reliability and eligible pressure composure adjust execution; High-Point Wager adjusts aggressive contested-catch success and tipped-turnover risk; Open-Field Dare adjusts aggressive YAC and fumble risk. Package-snap access is applied and recorded against the saved projection before the preview, while Coverage Ledger is recorded on the pending information evidence. Hook order is equipped slot then authored effect index.

Resolution advances the same abstract game cursor until the next player opportunity or the bounded final whistle. `POST_GAME` retains the exact key-play log as well as its derived stat line, so save/reload cannot erase decision evidence before the result UI or the next-week transition consumes it.

Post-game grade starts at the authored base, scales receptions/yards/touchdowns and drop/turnover penalties to the authored four-opportunity reference, adds average decision fit through the authored divisor, and clamps to 0–100 before selecting the localized band. This keeps scarce bench decisions consequential without granting starters a raw-volume grade advantage.

Each key snap awards the family base XP plus non-negative fit XP, distributed exactly across that family's authored attribute weights. The final transition applies bounded Body cost and band-based Confidence/Coach Trust once, persists before/requested/actual/after evidence, updates the player and cumulative history atomically, and performs no second depth-chart evaluation. Zero-offense games retain truthful participation, take half the base game Body cost, award no fabricated attribute XP, and leave Confidence/Trust neutral.

A current committed career can close the week only from saved `POST_GAME`. The Game Day Breakthrough source awards 6 points for a zero-offense role or a bounded 4–24 points from grade band plus opportunity participation, occupies the canonical source order after Role/Coach, and remains inside the existing 60-point weekly cap. Historical report-only commands retain prior pre-game cadence/gauge behavior and are not shipping adapters.

## Presentation

Text/2D broadcast-style presentation is acceptable. Fast transitions and clarity matter more than animation complexity.

Post-game presentation explains both production and participation: role, expected versus actual opportunities, key decisions when any occurred, Practice/Game feedback, state movement, development, and what the performance means for future trust or opportunity.

The M7 world layer classifies the player's scheduled fixture as Tier 1 detailed and consumes no world RNG for its supplied score. A fixture involving a current top-eight program or the player's fictional group is Tier 2 relevant with bounded ±7 aggregate variance; other fixtures are Tier 3 distant with bounded ±10 variance. Both aggregate tiers use exactly one mapped draw per team, persist expected score/variance/draw boundaries, and never create athlete statistics. Input catalog ordering cannot change the canonical result stream.

The shipping M4 surface is phase-owned inside Week: one concise preview, one persisted key-snap decision, and one post-game review. Each key snap presents exactly three localized receiver-technique choices with the saved information tier and revealed clues. Secondary play evidence stays collapsed, and no next snap or result may replace the visible state until its save succeeds.

## M7 QB vertical

Current v2 opportunity planning uses the authored role band's floored midpoint. The existing relationship opportunity modifier (-100…+100 permille) shifts that baseline by at most one at the +50/-50 thresholds. The result stays within the role band and the existing five-snap alpha limit; injury/academic availability then applies its potentially lower cap. Preparation saves the baseline, modifier, requested shift, and projected result. Injury workload and actual football use this one projection. Reserve retains its normal interactive minimum unless a saved availability restriction overrides it. This current-only tuneable contract consumes no RNG, does not alter depth rank, and preserves historical maximum-based adapters when the new context is absent.

The shared QB/RB/CB start adapter composes validated injury availability with the saved role maximum and existing five-snap alpha bound. Availability cannot promote a depth role, and the supplied player must match its Body/Confidence/Trust after-state. Rest/out routes into the existing zero-opportunity review, with no fabricated player statistics or attribute XP and no snap RNG. The saved current pregame aggregate owns assessment/choice timing and source identity; the low-level adapter's absent-cap form remains reserved for historical compatibility, not a bypass in current UI commands.

The browser-independent QB alpha owns four athlete-level families—pre-snap command, pocket response, throw decision, and scramble/open-field response—with three choices per family and two reachable patterns per family. It does not grant team play-calling. Checkdown, layered-window aggression, boundary risk, protection redirection, pocket movement, scramble, slide, and throw-away decisions produce QB-specific sacks, passing/rushing production, interceptions, fumbles, grade, and growth evidence.

Every played QB key snap consumes exactly six mapped draws in pressure, execution, completion, turnover, touchdown, and yard order. Assignment information derives visible clues from Football IQ, Read Progression, Preparation, event context, and equipped information skills; it is not reused as a hidden outcome roll. Zero opportunities consume no RNG, create no statistics or XP, and return localized signal-review feedback. The completed score may fill the player's scheduled 32-program fixture without advancing world RNG.

## M7 RB vertical

The browser-independent RB alpha owns track/gap vision, contact/ball security, protection, and receiving/YAC families. Pressing the landmark, cutting back, bouncing outside, finishing forward, making a defender miss, covering the ball, scanning/anchoring in protection, releasing late, settling underneath, turning upfield, and securing the boundary create distinct success, explosive, fumble, Body-exposure, protection, and yardage tradeoffs.

Each played RB snap consumes six mapped draws in contact, execution, outcome, turnover, explosive, and yard order. Its stat line separates carries/rushing, receptions/receiving, protection assignments/wins, touchdowns, and fumbles. Zero opportunities produce no statistics or XP and consume no RNG, while still returning truthful assignment-review feedback. The completed score uses the same no-world-draw Tier-1 handoff as QB.

## M7 CB vertical

The browser-independent CB alpha owns leverage, coverage exchange, ball disruption, and tackle families. Pressing, inside shade, depth bail, mirroring, undercutting, zone handoff, playing the ball or hands, closing a catch, breaking down, driving the boundary, and attacking a strip create distinct completion, disruption, takeaway, tackle, and Body-exposure tradeoffs.

Each assigned coverage snap consumes six draws in release, execution, target, completion, takeaway, and yard order. The stat line records coverage snaps, targets, completions/yards/touchdowns allowed, passes defended, interceptions, tackles, and missed tackles. A no-target snap remains truthful coverage evidence; zero assigned snaps create no statistics or XP, consume no RNG, and return scout-review feedback. Completed CB scores use the same Tier-1 world handoff as other detailed positions.

## M7.5 authoritative tactical evidence correction

The September 1 playtest requires the shared 2D Tactical Snap Board and richer decision/result feedback before M8; the earlier text-first surfaces are a foundation, not completion of that requirement. Follow `GAME_DAY_PRESENTATION.md` and the active M7.5 plan.

The owning engines must establish current pre-snap context before a choice and retain it with the saved resolution. Field bounds/endpoints, scoring and possession facts cannot be reverse-engineered from a future outcome in React. Existing abstract yardage/TD/fumble/tackle fields are not full trajectories or recovery narratives. Preserve historical games and logs literally; supply honest unavailable context where it was never recorded.

Version any current rule/evidence extension explicitly. Preserve each position's six resolution draws and distinguish any owning-core context/aggregate advancement from that resolution evidence. Presentation preview, animation, Skip and replay consume no gameplay draws or commands. Career/world ownership, truthful role caps and zero-opportunity stats/XP, actual once-only progression, and historical report bytes remain invariants. Already-started historical games finish under their original contract; new current games must provide the context promised by the board rather than inheriting a permanent missing-data fallback.

### Staged tactical-game v1 rules (not yet shipping)

New-game-only `tactical_game_v1` is an explicit rule selection in the existing owning engines, never a reinterpretation of absent historical flags. QB/RB/CB retain their position formulas, choices, information and six resolution draws. Their previously absent aggregate context is supplied by a shared core helper: before each key snap, one player-team and one opponent background possession each use one mapped career draw for 0/3/7 points, followed by three mapped field-context draws (line 10–90, down 1–4, distance 1–15 capped at the goal). The period/clock places the limited opportunities evenly through regulation before the decision; there is one final pair of background possessions after the last key snap. Each background possession initially uses 250/150 permille TD/FG thresholds with a bounded rating-edge adjustment, shared tuneable core constants. Context draws are separate from recorded six-draw resolution boundaries. No opportunity means no new context or draws and retains the deterministic no-player-action aggregate result.

On the new rule path, an earned breakaway TD travels exactly from the saved line to the scoring goal and credits that distance; a non-TD advance is capped inside the field. A fumble represents an explicitly lost ball and precludes a TD, with no simulated return. A recorded successful CB tackle prevents the touchdown on that play. A sack has a five-yard field loss, without inventing individual passing/rushing yards; interception return yardage is not simulated. Dead-ball location is distinct from schematic throw/catch animation. Incomplete/short fourth-down plays explicitly turn over on downs. No-target/protection assignments retain actual personal outcomes but do not invent an untracked ball endpoint or team yardage. Each TD adds the existing abstract seven points; other scoring occurs only in the owning aggregate layer. WR retains its owning drive simulation, with the same versioned physical/retention correction rather than switching to the alpha aggregate helper.

These conservative tuneable rules are staged for B1 engine and migration tests. Their final current-career activation requires explicit session/save versioning, old-started-game preservation, replay validation, current-life profiles and all unchanged budgets. Structural context validation alone is not authorization to publish new gameplay.
