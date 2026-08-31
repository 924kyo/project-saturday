# Game Simulation and Key Snaps

## Goal

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

Typical meaningful game for a rotational/starter WR: approximately **6–10 player decisions**, scaled by snap share and role.

A deep bench player may receive very few or no key snaps; that scarcity is itself part of the early career experience.

## WR key-snap decisions

Possible decision families:

- release technique;
- route leverage/stem adjustment;
- catch approach;
- YAC/security choice;
- situational route option when unlocked.

## Information model

Football IQ, Film Study, cards, and opponent scouting may change **what information is shown**, not merely the success probability.

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
- Body/confidence;
- active skill modifiers;
- deterministic RNG.

Return structured resolution details so UI can explain the major factors without exposing exact hidden formulas by default.

## Presentation

Text/2D broadcast-style presentation is acceptable. Fast transitions and clarity matter more than animation complexity.
