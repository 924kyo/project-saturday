# League World and Postseason

## Fictional ruleset principle

The game evokes modern American college football but uses a clearly data-driven fictional competition structure so the product is not coupled to annually changing external rules.

## 1.0 world target

- 96 programs
- 8 fictional conferences
- 12 programs per conference

## Season baseline

Initial design baseline:

- approximately 12 regular-season games per program;
- conference standings/rivalries;
- conference championship where applicable;
- bowls/postseason;
- 12-team national playoff-style bracket in the fictional universe.

Exact scheduling and qualification rules live in tuneable configuration and can evolve without save-schema redesign.

## M7 staged alpha world

Manifest schema 9 validates a 32-program intermediate world as four original fictional groups of eight. Its first seven rounds are complete within-group play; five cross-group rounds then give every program five distinct opponents without repeats. Every round has 16 fixtures and includes all 32 programs exactly once. Reciprocal rivalry and explicit aggregate-tier/profile references are validated before the world can replace the current live 12-program season.

This schedule is staged content, not active career evidence. M7's later world-engine step must version and connect rankings, detailed-player fixture selection, aggregate simulation, postseason, offseason projection, and archive growth before any current adapter consumes it.

That staged engine is now complete. Each regular round preserves one detailed player fixture when applicable and resolves the other fixtures in canonical stable-ID order. The top four transparent national rankings seed 1–4 and 2–3 semifinals followed by a final; the higher seed hosts and advances an aggregate regulation tie without another draw. If the player's program qualifies, its semifinal/final remains a supplied detailed result and consumes no world RNG. All other bracket games remain Tier 2 aggregate results.

M7 history retains the two newest seasons with fixture/postseason detail and up to eight older compact summaries containing champion, top four, and final program records. Adding an eleventh retained season discards the oldest summary, so repeated careers cannot grow the staged world archive without bound.

### Current added-position postseason calendar boundary

Direct current postseason reserves two bracket calendar slots after the twelve regular rounds. A current second season therefore starts at career-week offset 14, regardless of whether the athlete qualified; non-qualification does not invent player games or career RNG. Historical added-position season-two dates used offset 12 and remain literal on migration. An explicit current season clock must distinguish these paths so event cooldowns, NIL expiry/obligation evidence, academics, and skill acquisitions cannot accidentally share overlapping dates. Defining the clock does not activate postseason or add fields during neutral migration.

Current added-position playoff fixtures use the same three discretionary focuses and actual practice/event/injury/Game Day decisions as regular weeks. Weeks 12/13 create no extra exams or NIL offers; an existing academic restriction still affects scheduled football. A round without the player's fixture advances the existing bracket engine only: no fabricated player game, training, recovery, event, gauge reward or career RNG. Current postseason records retain player-chosen IDs and authoritative snap evidence; historical compact records remain literal.

## M5 vertical-slice implementation

The first complete WR season uses three fall-camp rounds and twelve regular-season rounds across the existing 12 original programs. Rounds 1–11 are a complete round robin; round 12 repeats only the six reciprocal authored rivalries as spotlight fixtures. Every round contains six games with each program appearing once, and every program receives exactly six home games over the season.

Standings order programs by wins, then head-to-head result when available, authored schedule-strength evidence, and stable program ID. Team ratings are the rounded aggregate of the existing M4 offense, defense, and quarterback projections. Schedule strength is the rounded average of all twelve saved opponents' aggregate ratings, and content validation recomputes both values so duplicated evidence cannot drift.

The M5 postseason is a tuneable four-program fictional bracket: seeds 1–4 and 2–3 meet in two semifinals, followed by one final. The higher seed is the home program. Regulation ties advance that higher seed without an extra random draw; the saved result explicitly records the advancing program and whether this tiebreak was used. Localized outcomes cover champion, runner-up, semifinal exit, and regular-season completion outside the field. This compact vertical-slice format is original project configuration and does not represent a real competition's rules.

The deterministic world model stores the canonical mechanics definition, one result slot per fixture, all 12 records, and ranked standings in the active session. A completed player game occupies its scheduled slot without drawing world RNG; the other five fixtures resolve in stable fixture-ID order with two bounded score-variance samples each. Reordering input profiles or fixtures canonicalizes to the same saved world and result stream. Persisted records and standings are recomputed from saved results during validation so totals cannot drift from fixture evidence.

After regular-season round 12, `initializePostseason` freezes the ordered four qualifiers. A non-qualifier resolves both semifinals and the final through the aggregate world simulator, consumes no career RNG, and proceeds to review without fabricating player statistics or games. A qualifier plays only their own bracket fixture through the existing detailed M4 simulator while other fixtures resolve through world RNG. Each completed bracket round persists its fixtures and results, and the final state retains the champion, player's regular-season rank, optional seed, and exact outcome ID. Season review is a separate explicit phase before career completion.

## Rankings

Rankings should be understandable and stable enough to support:

- ranked-opponent card effects;
- rivalry/prime-time events;
- playoff race;
- media/brand context.

The initial model can combine record, opponent strength, program prior, and recent results. Do not overbuild a perfect ranking model before the player career is fun.

## Simulation fidelity tiers

### Tier 1 — player's program/current game

Detailed roster/depth/player simulation.

### Tier 2 — relevant ranked/conference opponents

Moderate detail sufficient for matchup, stats, injuries, standings, and recognizable stars.

### Tier 3 — distant world

Aggregated simulation sufficient for standings/rankings/history without per-snap cost.

Promote/demote simulation fidelity based on relevance.

## World history

Persist season outcomes required for:

- program records;
- championships;
- awards;
- rankings history;
- alumni context.

Avoid unbounded save growth: summarize old low-value detail while preserving record-book facts.
