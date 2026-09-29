# Fictional Program World

## Goal

Programs should feel immediately legible to college-football fans while remaining original fictional composites.

## Full target

- 96 fictional programs
- 8 fictional conferences
- roughly 12 programs each
- 12-team-style national postseason structure is acceptable as a fictional design baseline

The verified WR M0–M6 compatibility path uses 12 programs and retains its historical schedule contracts. M7's live added-position path uses the 32-program alpha world for recruiting, schedule, aggregate simulation and offseason. The four-position matchup projection remains reusable; this does not silently expand a saved WR WorldStateV1 calendar.

## Program attributes

Each program has tuneable values such as:

- Prestige
- NIL Power
- Facilities
- Academics
- Player Development
- Fan Pressure
- NFL Pipeline
- Recruiting Reach
- Scheme Stability

## Program identity

Also define:

- region;
- offensive/defensive style;
- recruiting hotbeds;
- 2–4 program traits;
- rivals;
- fan/culture presentation tags;
- localized name/short name.

## Originality rule

Do not make `real school + renamed mascot`.

A program may combine broad archetypal inspiration from multiple traditions, but must avoid exact or confusingly close:

- names;
- marks/logos;
- mascots;
- slogans/chants;
- signature color combinations when strongly distinctive;
- stadium names/design copies;
- exact traditions;
- roster/player identities.

## Example archetypes, not mappings

- deep-south national powerhouse with intense fan pressure;
- bayou-region defense-first program with loud night-game culture;
- Texas-region money/NIL giant with enormous expectations;
- northern traditional giant with huge stadium and rivalry pressure;
- west-coast speed/innovation program;
- academic elite with strong development and lower football pressure;
- small-market development factory;
- mountain/blue-collar physical program.

The player should understand the archetype without being told which real school it resembles.

## Vertical-slice program set

The implemented vertical slice contains 12 original programs, evenly divided into National, Contender, and Builder strength bands. Its supporting matrix contains eight regions, five WR offense styles, four defense styles, three rotation policies, and 16 program traits.

Program mechanics are data-driven. Offense styles provide positive WR evaluation weights totaling 1000 permille and explicit Scheme Fit for all three WR archetypes. Rotation policies provide monotone projected snap ranges for all eight depth ranks. Program room strength, spread, initial Coach Trust opportunity, recruiting interest by tier, rivals, and regional references are schema- and cross-reference-validated.

The content validator enumerates all 390 valid creation identities and requires each resulting recruit profile to reach five distinct programs across at least two strength bands. M5 adds one validated 12-program season profile: every program plays twelve games with six at home, aggregate team ratings match the existing Game Day projections, and schedule strength is recomputed from the authored opponent matrix.

Manifest schema 9 adds the M7 alpha world while content compatibility remains version 1. It preserves all 12 original IDs and adds 20 original fictional programs with paired Korean/English full names, short names, and descriptions. Four fictional groups contain exactly eight programs each; every program has one reciprocal within-group rival and one explicit aggregate team tier/profile. The 12-round matrix schedules every program exactly once per round, with all seven group opponents followed by five unique cross-group opponents. Schedule construction consumes no gameplay RNG. Current added-position recruiting, season, game and offseason adapters consume this catalog; literal WR adapters retain their original catalog.

The M7 staged engine adds explicit QB, RB, WR, and CB unit ratings to every aggregate profile. A selected-position matchup projects the player's unit, supporting offense/defense, opponent primary responsibility, CB-only opposing-QB responsibility, and home context as named integer contributions. Regular-season resolution sorts stable fixture IDs, consumes two world draws per non-player fixture, and reserves the player's detailed fixture for a supplied result with zero world draws.

Four group tables and national rankings are always recomputed from result evidence. Rankings expose record, full-schedule strength, program prior, and recent form at 550/200/150/100 permille. Tier 2 relevant games use narrower variance than Tier 3 distant games while sharing the same bounded expected-score model; neither aggregate tier creates athlete statistics.

## Offseason world projection

The M6 vertical slice projects all 12 programs after the completed first season without rewriting the finished calendar. Canonical program-ID order owns the draw order. Each program saves one weighted staff outcome plus bounded departing and incoming WR-room pressure; the resulting aggregate room talent remains within the established recruiting-room range. Continuity and position-staff changes preserve the authored offense style, while the single scheme-shift outcome uses that program's explicit alternative style.

These world changes are mechanics evidence, not regenerated presentation content. The completed calendar remains the historical source of standings/results. Strict world validation requires its own `offseason_world_rng_v1` tail, and linked session validation requires those bounds to equal the exact contiguous draw range persisted in `offseason_world_projection_v1`.

The player's subsequent Stay/transfer commitment does not advance or rewrite that world projection. It uses the selected program's saved aggregate room talent, offense style, and rotation policy to build a new committed career room on the career RNG stream. If the athlete transfers, the completed season calendar continues to validate against the prior program recorded in decision evidence while current membership and derived program-trait event tags use the destination.

The M6 season-two bootstrap archives that completed calendar with its historical player-program ID and creates a new calendar whose season, camp, round, and fixture IDs are all distinct. V1 deliberately retains the same validated 12-program profiles and round-robin structure while the selected current program owns detailed player fixtures; offseason room pressure affects the player's committed room and opportunity without silently changing aggregate team ratings.

The current M7 added-position offseason projects all 32 programs in canonical program-ID order with exactly three world draws each: staff outcome, departing pressure, and incoming pressure. Bounds apply independently to aggregate offense, defense, and all four position units. Current season two uses the saved projected profiles and world RNG; Stay/transfer cannot reroll them. This versioned evidence remains separate from literal M6 WR offseason evidence.

## Program familiarity

Persistent meta progression may reveal previously hidden culture/coach/development information for programs the player has experienced.
