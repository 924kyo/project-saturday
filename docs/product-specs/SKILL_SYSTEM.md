# Skill Card System

## Purpose

Skill cards are the game's headline build system. A run should be memorable partly because of the cards acquired and how they changed weekly choices.

## Grades

- C
- B
- A
- S

Grade is rarity/power budget, not a guarantee of strict dominance.

## Families

- **Development** — training, practice, learning, progression
- **Game Day** — key snaps, situational performance, information
- **Body** — fatigue, recovery, injury risk, workload
- **Mindset** — confidence, pressure, rivalry, composure
- **Life** — academics, relationships, campus, NIL/brand

## Equipped slots

Default: **4**.

A fifth slot may be a rare late-career/legacy possibility, not assumed in the vertical slice.

## Acquisition

A **Breakthrough** offers three eligible cards; select one.

Eligibility/weight can depend on:

- position;
- archetype;
- current tags;
- recent training/activity tags;
- career phase;
- program traits;
- legacy unlocks;
- rarity/pity configuration.

Same seed + same state + same acquisition history must produce the same offer.

For the M2 development scaffold, a Breakthrough occurs after completed weeks 1, 5, 9, 13, and so on while at least three eligible unowned cards remain. The exact three-card offer and RNG draw range are persisted before the player chooses. Selection consumes no additional RNG, records the acquisition, fills only the first open equipped slot, and returns to weekly planning. A full loadout is never replaced automatically.

Loadout edits are explicit planning-phase commands. The initial vertical slice stores exactly four dense nullable slots; clearing or replacing a slot autosaves and never changes ownership.

## Draft philosophy

A player's behavior should subtly shape the pool:

- weight-room behavior increases weight/strength-development card weight;
- film-heavy behavior increases knowledge/read card weight;
- recovery-heavy behavior increases body/recovery card weight.

Do not make the result deterministic; keep meaningful surprise.

## Card quality rule

Good:

> `Gym Rat A` — weight training XP ×1.20; weight-training Body cost ×0.90.

Good:

> `Film Junkie S` — film study learning improved; once per game reveal an additional coverage clue on an eligible key snap.

Good:

> `Training Maniac S` — major training boost at low Body, but increased injury risk.

Weak design:

> `Power +3` with no interaction.

Flat modifiers can exist but should not dominate the set.

## Tradeoffs

High-grade cards may have:

- narrower conditions;
- risks;
- opportunity costs;
- build dependencies.

This preserves useful C/B cards.

## Duplicates — v1 decision

During the vertical slice, do **not** offer a card already owned by that career unless a specific card explicitly supports upgrades. This keeps the first implementation understandable.

Future duplicate/mastery mechanics require an ADR/spec change.

## Monetization

No real-money skill pulls are part of the current design. Randomized cards are earned gameplay rewards.

## Legacy interaction

Legacy progression may:

- unlock cards into future eligible pools;
- slightly alter offer information/choice count in bounded ways;
- enable alumni-themed cards/events.

Legacy should not guarantee S cards or erase early-run uncertainty.

## Vertical-slice content target

At least 36 polished WR-compatible cards:

- 8 Development
- 7 Game Day
- 7 Body
- 7 Mindset
- 7 Life

Include multiple viable build directions and at least 6 meaningful tradeoff cards.

M2 ships the first 18 validated WR cards across all five families, including nine mechanically inferred tradeoffs. M5 expands this same stable-ID catalog to the 36-card vertical-slice target rather than renaming the initial cards.
