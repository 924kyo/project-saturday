# The Rookie — Behavioral Reference for Project Saturday

## Purpose

This document gives Codex enough context to understand the comparison product repeatedly referenced by the designer.

The Rookie is **not** a source implementation for Project Saturday. It is a behavioral and product-design reference used to explain what the designer found effective or ineffective in a mobile-first single-athlete career simulation.

Project Saturday must remain an original college-football game with its own mechanics, presentation, content, formulas, UI composition, terminology, assets, and code.

---

## What The Rookie is at the player-experience level

The Rookie is a Korean browser/PWA-style high-school baseball career simulation centered on one athlete rather than on managing the whole team.

The player repeatedly advances a calendar, chooses development/life actions, manages the athlete's condition, acquires/equips skill cards, plays or simulates games, receives growth and career outcomes, and progresses toward larger baseball milestones.

Its strongest design lesson for Project Saturday is not baseball-specific content. It is that a relatively dense simulation can still feel fast because the player usually understands:

1. what state the athlete is in;
2. what can be done from the current surface;
3. what the selected action costs;
4. what the selected action is likely to improve;
5. what changed afterward;
6. what the next useful decision is.

---

## Information architecture

The Rookie does not make every system live in one long interaction surface.

The player's information is separated into purpose-specific areas. The observed game contains distinct surfaces/tabs for concepts such as:

- player abilities;
- skill cards;
- equipment/items;
- traits and relationships;
- records;
- goals;
- home/current progression;
- settings.

The exact UI must not be copied, but the product lesson matters:

> A mobile career simulation should let the player enter a surface with one clear purpose rather than forcing training, skill management, progression explanation, player inspection, and action resolution into one continuous vertical scroll.

For Project Saturday, this supports a purpose-based navigation model such as Home / Week / Team / Skills / Player rather than one giant career page.

---

## Athlete-state model

The Rookie exposes multiple short-term and long-term states rather than allowing one resource to explain every decision.

Observed athlete-state concepts include, among others:

- HP/body resource;
- Condition;
- Motivation;
- injury risk;
- academic score;
- reputation;
- core baseball attributes;
- relationships;
- training proficiency;
- career and match records.

This creates choices where a mechanically strong action may still be undesirable because another state is poor.

### Project Saturday lesson

Do **not** recreate these exact variables merely because the reference game has them.

Instead, Project Saturday should create college-football-specific decision tension. The current direction is:

- **Body** — physical readiness, fatigue, injury exposure;
- **Preparation** — opponent/playbook/assignment readiness for the current game week;
- **Confidence** — short-term mental momentum and pressure response;
- **Practice Grade** — a weekly outcome derived from preparation, execution, body state and relevant traits, not another meter to micromanage;
- **Coach Trust** — a persistent relationship/performance result that affects role and opportunities;
- **Depth Rank / Snap Projection** — the concrete football consequence of development and trust.

The user should be able to influence several of these through meaningful choices. Body must not become the only state the user actually cares about.

---

## Attribute presentation and progression

One reason the designer finds The Rookie easier to read is that ability growth is treated as a visible progression system, not as a raw debug table.

The product lesson for Project Saturday is:

- group attributes by football meaning;
- show the current rating prominently;
- show progress toward the next rating;
- show how much XP remains;
- show temporary/equipment/skill modifiers distinctly from the base rating;
- explain which attributes matter most to the current archetype and role;
- when an action resolves, show before/after progress instead of only `rating X -> X, XP +N`.

Example Project Saturday presentation:

```
ROUTE RUNNING 67
[███████████------] 72 / 100 XP
28 XP to 68

This week: +18 XP
```

The numbers above are illustrative; the UI must always use the actual configured thresholds.

---

## Training proficiency

The Rookie tracks repeated use of individual training actions and gives those actions a separate proficiency progression.

The useful product lesson is that repeating a training method can become a strategic investment rather than merely clicking the same button again.

Project Saturday should therefore make training proficiency legible:

- current proficiency level;
- progress toward the next proficiency level;
- required repetitions/XP;
- concrete current proficiency benefit;
- concrete next-level benefit where appropriate.

The player should never have to infer whether proficiency matters from hidden calculations.

---

## Skill-card system

The Rookie's skill-card system is the designer's strongest positive reference.

Observed skill definitions span multiple kinds of effects, including training, match, development, lifestyle/condition and more complex effects. The analyzed build contains a large card pool rather than only a handful of generic buffs.

The important lesson is that a skill can change **how the player values actions and situations**.

Examples of the kind of design property worth preserving abstractly:

- reducing action/body costs changes how aggressively the player can train;
- increasing a specific training category changes weekly allocation;
- conditional match bonuses change situational strengths;
- condition-dependent effects make short-term state management relevant;
- development effects can change how the whole run grows.

### What Project Saturday should improve

The current prototype's card system is technically robust but risks collapsing into "Body optimization cards." That is not enough.

Project Saturday cards should meaningfully span:

- Development;
- Game Day;
- Role / Coach Trust / depth competition;
- Body;
- Mindset / Confidence;
- Life / Academics / NIL.

Cards should be capable of changing:

- weekly Focus choice;
- Preparation strategy;
- practice outcomes;
- Coach Trust gain/loss;
- snap opportunity;
- key-snap information or decision space;
- confidence recovery/loss;
- injury/recovery choices;
- academic/NIL opportunity cost;
- event eligibility.

A card pool is successful when two careers with comparable ratings lead to different weekly decisions because their builds are different.

---

## Card acquisition and anticipation

The designer does **not** want cards to feel like a passive reward that appears simply because enough routine actions were clicked.

The positive lesson from the reference is the excitement of acquiring/building a skill deck; Project Saturday must create its own acquisition loop that makes the next card feel earned and anticipated.

Current preferred direction:

- explicit or clearly communicated Breakthrough progress;
- major contribution from practice excellence, games, goals and career milestones;
- three-card choice at a breakthrough;
- rarity/pity or other collection pressure where appropriate;
- behavior/position/build tags can shape the offer pool;
- roughly limited, memorable breakthrough cadence rather than constant random drip;
- cards can contain tradeoffs and conditional power, so S is not automatically the only correct choice.

Do not copy The Rookie's exact probabilities, pity rules, card names, grades, formulas, card text or presentation.

---

## Games as development feedback

The Rookie's game participation feeds back into career growth and records. The player can see that the athlete being developed is eventually being tested in the sport itself.

For Project Saturday this principle is more important because football role hierarchy is a headline system.

A low depth rank must reduce opportunity, but it must not turn the game into weeks of menu-only training with no football feedback.

The game-week experience should provide football connection at multiple role levels:

- starter and major rotation: regular meaningful snaps/key snaps;
- WR3/rotation: recurring offensive participation, not repeated zero-participation weeks;
- deeper depth: limited package snaps, special teams, garbage time, injury replacement, scout-team or observation/development feedback as appropriate;
- every game week: team result and role context should be visible even if the player's direct action is small.

The user must understand why projected snaps changed and how football performance feeds growth, confidence, Coach Trust, role, skill breakthroughs and career history.

---

## Contextual guidance and onboarding

The designer values that The Rookie gives contextual/tutorial-like explanations of what different areas are for.

Project Saturday's current prototype instead often uses a large bold heading plus generic gray explanatory text. This is visually generic and frequently fails to answer the question the player actually has.

Guidance should therefore be contextual and actionable.

Bad:

> Build your unique player. Background, personality and play style make every start different.

Better:

> Deep Threat WRs win with Speed, Burst and Release. You can change your body and background now; ratings will still develop during the career.

Better still when possible:

- point at the relevant control;
- explain consequences before commitment;
- disappear once learned;
- allow the player to reopen Help/Why? explanations;
- use football examples rather than generic product copy.

The user should not need a separate manual to understand why Body, Preparation, Practice Grade, Coach Trust, Depth and projected snaps matter.

---

## Character identity and visual feedback

This is an area Project Saturday must deliberately improve beyond The Rookie.

The designer felt The Rookie's character identity was too shallow because appearance and many events did not meaningfully differentiate runs.

Project Saturday therefore requires visual identity to remain present during the career.

Creation options are not sufficient if they are only labels in a form.

At minimum:

- changing appearance must update a graphical player preview immediately;
- the same player portrait/model should appear on Home, Player, depth/role moments, awards and Alumni records;
- appearance data should not be presented during normal play primarily as an accordion of text such as `face shape: square`;
- cosmetic progression and gear should visibly modify the player;
- conditional events should use background/personality/role/program/build tags so careers diverge beyond ratings.

A temporary layered 2D representation is acceptable before final art. A purely textual representation is not an acceptable completion state for customization UX.

---

## Mobile flow lesson

The reference game's strongest transferable property is flow.

Project Saturday should preserve these outcomes while using an original interface:

- one surface has one primary job;
- the user can read the current decision quickly;
- results are summarized before the next decision;
- secondary information is reachable without dominating the action flow;
- long-scroll fatigue is minimized;
- the game does not look or behave like a CRUD/dashboard application;
- the player is visually present;
- game-state consequences are more prominent than generic explanatory copy.

---

## Explicit non-copy boundary

Codex must never use this document as permission to reproduce The Rookie.

Do not copy or approximate too closely:

- source code;
- save implementation;
- bundled data;
- exact formulas;
- card IDs/names/text;
- event text or event chains;
- assets;
- character art;
- UI layouts;
- colors and visual identity;
- school/team names;
- specific progression tables;
- proprietary content.

Use the reference only to understand the designer's product-language phrases such as:

- "the skill system feels meaningful";
- "I understand what this training does";
- "the flow is smooth";
- "I can tell what changed";
- "different systems compete for my attention";
- "my player is actually playing the sport".

Project Saturday should achieve those outcomes through original college-football-specific systems.
