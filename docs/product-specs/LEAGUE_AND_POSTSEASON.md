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
