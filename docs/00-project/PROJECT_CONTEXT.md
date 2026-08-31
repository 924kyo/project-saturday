# Project Context — Distilled Design Conversation

This file preserves the relevant decisions from the ideation conversation so later Codex tasks do not depend on chat memory.

## Origin of the idea

The designer enjoyed a browser-based Korean high-school baseball career simulation, especially:

- skill cards with randomized acquisition;
- skills that alter training efficiency, body/HP management, and decision value;
- the feeling that a run develops a distinct build;
- smooth, low-friction progression through actions and events.

The designer disliked that character identity was comparatively shallow: aside from name, position, and school, appearance and event variation were limited, so different runs could feel like the same person with different numbers.

**Important:** the prior game is inspiration for design lessons only. Project Saturday must not copy its code, assets, text, UI, event content, data, or proprietary implementation.

## New setting

The new game is about **American college football** because the ecosystem offers a larger world and more career drama:

- recruiting and program choice;
- depth-chart competition and snap share;
- redshirt/eligibility-like career decisions in a simplified fictional ruleset;
- training and position development;
- coach trust and scheme fit;
- academics and campus life;
- NIL and brand opportunities;
- transfer decisions;
- rivalries, ranked games, conference races, bowls/playoffs;
- pro draft declaration and draft stock.

## Core fantasy

The player does **not** run the whole program. The player is one athlete trying to survive and thrive inside a huge program.

The emotional progression should resemble:

> highly regarded recruit → anonymous depth player → rotational player → starter → campus star → national recognition → draft decision

or a completely different career when things go wrong.

## Weekly flow

The intended basic unit is one week, not one day.

Typical flow:

1. recap current role/body/season context;
2. choose approximately three weekly actions;
3. resolve contextual event if one occurs;
4. preview projected role/snaps;
5. simulate the game, pausing for a small number of player-relevant key snaps;
6. show performance, growth, coach trust, depth movement, and possible skill-card reward;
7. advance.

The player should usually spend **30 seconds to 3 minutes** progressing a normal week and longer on important game weeks.

## Skill cards

Skill cards are a headline system, not a side bonus.

They should affect:

- training XP and body costs;
- recovery;
- practice/depth competition;
- information revealed on key snaps;
- game-day risk/reward;
- confidence/pressure;
- relationships or campus management;
- NIL/brand behavior;
- event pools or choices.

A build should change **what the player chooses to do**, not merely increase overall rating.

Current design direction:

- grades C/B/A/S;
- about four equipped slots;
- three-card choice when a breakthrough is earned;
- position and behavior tags influence offer pools;
- S is not always a strict upgrade over C/B; stronger cards may require conditions or tradeoffs.

## Character identity

A new career should meaningfully differ through:

- appearance;
- height/weight/body type;
- position and archetype;
- recruiting background;
- personality traits;
- program choice;
- skill build;
- relationships;
- tags earned through the career;
- equipment/cosmetics;
- unique or conditional event eligibility.

Events must be tag/condition driven so different players do not receive the same life story.

## Programs

Schools are fictional. They should be legible enough that college-football fans understand the *archetype* immediately—southern powerhouse, northern traditional giant, west-coast speed program, Texas money powerhouse, blue-collar development school, academic elite, etc.—without being 1:1 renamed copies of real institutions.

Recognizability should come from:

- region;
- program prestige;
- recruiting footprint;
- football philosophy;
- fan pressure;
- development reputation;
- NIL strength;
- rivalry structure;
- presentation and culture.

Avoid copying exact names, marks, mascots, stadiums, slogans, signature uniforms, or distinctive protected identities.

## NIL and personal interaction

NIL does **not** own all personal interaction.

- NIL/Brand: sponsorships, public image, agent, money, commercial obligations.
- Team Relations: coaches, teammates, competitors, locker room.
- Campus: academics, friends, social life, personal events.
- Media/Reputation: interviews, controversy, national attention.

The UI should not expose four micromanagement dashboards. Most off-field interaction should arrive contextually through weekly choices/events.

## Legacy / roguelite meta progression

Completed players become persistent alumni records with appearance, career history, awards, program, stats, and signature skills.

Meta progression should mostly:

- preserve history;
- unlock new cards/backgrounds/cosmetics/options;
- reveal program information;
- enable alumni mentor or alumni-event possibilities;
- make the persistent world feel like the player's own football history.

It should only provide **small raw-power advantages**, so later careers are not trivialized.

Failed/ordinary careers must still contribute to discovery and legacy progression.

## Career length target

Full 1.0 target: a typical completed career should be roughly **7–10 hours**, with shorter sessions naturally advancing several weeks.

## Initial playable scope

Start with WR only. The final target expands toward:

- QB
- RB
- WR
- CB
- LB
- EDGE

WR is the vertical-slice position because it exposes training, depth, snap share, route/key-snap decisions, and skill builds without requiring a full user-controlled offense.

## Localization decision

Korean and English must be developed simultaneously from the first implementation.

- Korean locale: `ko-KR`
- English locale: `en-US`

Korean is the primary design/review language. Missing English is a build/content error, not future backlog.

## Development philosophy

The project is intended to be built heavily with Codex. Therefore:

- product decisions live in repository docs;
- game rules live outside UI;
- deterministic tests are mandatory;
- progress and assumptions are durable files;
- Codex should autonomously select the next roadmap task instead of requiring a handcrafted prompt for every step.
