# Core Loop

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Career arc

```text
Create player
→ recruit/program choice
→ fall camp
→ weekly season loop
→ postseason/offseason
→ stay/transfer/role decision
→ later seasons
→ declare/complete career
→ alumni record + legacy rewards
→ new career
```

## Weekly loop

Default regular-season phase order:

```text
WEEK_START
→ RECAP
→ PLAN_ACTIONS
→ RESOLVE_ACTIONS
→ OPTIONAL_DEVELOPMENT_SKILL_BREAKTHROUGH
→ WEEK_END (practice review / depth projection in current v4)
→ WEEK_EVENT_ATTEMPT (zero-draw no-event or persisted EVENT_CHOICE)
→ WEEK_INJURY_ASSESSMENT (persisted FULL / LIMITED / OUT evidence; optional INJURY_CHOICE)
→ GAME_PREVIEW
→ GAME_SIMULATION / KEY_SNAPS
→ POST_GAME
→ OPTIONAL_GAME_DAY_SKILL_BREAKTHROUGH
→ NEXT_WEEK
```

The phase is authoritative domain state, not inferred by UI route. The M3 implementation's persisted `WEEK_END` practice/depth review remains the compatibility checkpoint immediately before `GAME_PREVIEW`; a future calendar migration may rename that phase without reinterpreting old saves. Game consequences feed the next evaluation rather than causing a second same-week depth swap.

## Weekly actions

Default discretionary focus budget: **3**. Mandatory meetings, ordinary team practice, and the basic game schedule happen automatically; the player chooses where to add emphasis.

Possible families:

- position training;
- strength/speed/conditioning;
- film study;
- extra practice;
- recovery/rehab;
- academics;
- coach/team interaction;
- NIL/media obligation.

Not every family must be available every week.

Each focus must make its primary effects on Body, Preparation, Confidence, development, Practice Grade evidence, or life obligations visible before commitment. The viable choice should depend on the athlete's role, upcoming opponent, build, and current state; no single Body-only loop should dominate ordinary weeks.

## Experience model

The core causal chain is:

```text
Role + Body + Preparation + Confidence
→ practice and game opportunities
→ Coach Trust + depth movement + snaps
→ attribute/proficiency growth + career trajectory
```

The UI must expose the major links and actionable gaps while keeping exact hidden formula detail optional.

## Session rhythm

- Normal non-game decisions: seconds, not minutes.
- Normal week target: 30 seconds–3 minutes.
- Important rivalry/playoff weeks: intentionally longer.
- Avoid modal chains and repeated confirmation for obvious actions.

## Career pacing

The emotional goals evolve:

- freshman: earn snaps;
- early starter: secure role;
- established player: become impact player;
- star: compete for awards/championships/NIL visibility;
- draft-eligible: balance development, health, production, and declaration decision.

## Season/offseason

Offseason may include:

- season review;
- awards;
- coach/scheme changes;
- roster/depth changes;
- transfer decision;
- development block;
- incoming recruit pressure;
- role projection.

Do not turn offseason into a separate spreadsheet game.

## Current added-position pregame status

The staged added-position v2 flow has an explicit due-only `ACADEMIC_REVIEW` after practice/relationship preparation. Ordinary non-checkpoint weeks do not require that extra acknowledgement. Both paths then save exactly one contextual-event attempt before injury. A selected event requires `EVENT_CHOICE`, followed by a saved `EVENT_RESOLVED` consequence review; a miss or empty eligible pool proceeds without an extra acknowledgement. Injury and football use the resolved event state/modifiers, while the earlier academic result remains literal. A restricted scheduled game produces zero-opportunity feedback with once-only restriction consumption. NIL and obligation provenance remain pending; the staged flow is not a completed browser activation.

## M5 calendar orchestration

The M5 saved session bootstraps its season only from a committed `PLAN_ACTIONS` boundary. Three camp weeks use the ordinary development actions and Breakthrough Gauge but close without a game. Each regular-season week then uses the existing practice/depth flow, a schedule-owned M4 matchup, the detailed player game, and one aggregate world update that records the other five fixtures before the next planning boundary.

The calendar never infers an opponent or home state from the UI or career week number. The saved canonical fixture supplies a stable game ID, player/opponent profiles, and home designation to the M4 engine. The career RNG resolves the player's detailed game; the world RNG resolves only the other-program aggregate games. Completing all twelve rounds advances to a persisted postseason boundary rather than silently beginning another regular week.

After the current-model `WEEK_END` evidence is complete, the event engine records exactly one weekly attempt before camp rollover or scheduled Game Day. No eligible event consumes zero RNG draws; an eligible pool consumes a density draw, and a successful density check consumes a stable-ID-ordered weighted-selection draw. A selected event persists `EVENT_CHOICE` with the exact completed week and selection evidence until one supported choice resolves. The UI cannot skip or reroll that boundary.

After that event attempt resolves, the injury engine records exactly one weekly assessment before rollover or Game Day. A fresh assessment uses one risk draw and only a hit uses one additional stable-ID-ordered weighted-outcome draw; an ongoing injury uses no RNG. FULL, LIMITED, or OUT availability is saved for the current week. LIMITED outcomes may persist `INJURY_CHOICE` until the player chooses rest/rehab or play limited, while OUT outcomes proceed with zero game opportunities. Recovery advances only at the week rollover, so reload cannot reroll, skip, or double-apply it.

M6 inserts compact off-field settlement around that existing boundary without adding a dashboard. The shipping order is completed football actions → relationship settlement → any exact-week academic checkpoint → contextual event → injury assessment → at most one eligible NIL attempt → camp rollover or Game Day. Relationship tags therefore inform the same event selection, while resolved event changes to Brand/GPA may inform the subsequent offer context. Each command persists independently, and repeating the boundary cannot reroll or double-apply it.

At the completed-postseason review boundary, an activated v6 career may freeze season one and create one persisted offseason projection before the player decides. World churn resolves first on the world RNG in canonical program order; the three-program shortlist resolves separately on career RNG without replacement. The saved screen model is always Stay plus three uncertainty-aware options. Projection itself does not choose, transfer, rebuild a room, or start season two; those remain explicit subsequent commands so save failure or reload cannot create a silent commitment.

The next explicit command commits exactly one saved Stay/transfer option. It applies the selected staff, scheme, room, trust, relationship, program-history, and event-context consequences while retaining the completed career. Season two still does not begin at commitment: its calendar and active weekly state are a separate persisted bootstrap boundary, keeping selection, room generation, and season scheduling independently retryable.

That bootstrap consumes no RNG. It archives the completed calendar under its historical player program, activates a distinct season-two calendar under the current selected program, advances the saved academic term, and starts fresh per-season event/injury/game/role ledgers while retaining cumulative football totals and all long-lived career evidence. Both Stay and transfer then use the ordinary camp → weekly off-field settlement → scheduled Game Day loop; the completed first season is never rewritten.

At the next `PLAN_ACTIONS`, expired offers settle automatically. A pending offer may be accepted, declined, or left until expiration. An accepted obligation must be explicitly fulfilled or defaulted before the three discretionary football actions can be committed; the saved focus cost and authored weekly/default effects are available through one consequence projection used by presentation in both locales.

The staged added-position v2 loop applies the same ordering through explicit saved commands: planning NIL decisions/projection → three focuses → relationships → due academics → event → injury/required choice → NIL attempt → direct Game Day → once-only settlement. Its base player remains at week start until settlement, while focus preparation and the eventual UI use the authoritative planning projection. An unresolved obligation cannot be skipped by committing focuses. Choosing injury treatment itself uses no draw; a saved resolved boundary precedes the next offer attempt. Current per-template season feasibility is defined in `NIL_AND_OFF_FIELD.md`, not in presentation. Browser activation still waits for the complete M7 v2 flow.
