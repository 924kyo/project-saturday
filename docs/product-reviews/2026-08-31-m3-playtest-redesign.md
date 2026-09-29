# M3 Playtest Product Correction Directive

Date: 2026-08-31
Status: **AUTHORITATIVE PRODUCT CORRECTION**
Applies after: M3 closeout, before live M4 game UI/commands

This document records owner playtest feedback after M3 and converts it into product decisions.
It supersedes conflicting assumptions in existing product specs. Do not treat it as optional polish.

The repository's deterministic simulation, migrations, localization, accessibility, PWA, and test harness are good foundations and must be preserved. The problem is not the engineering foundation; the current player experience and several gameplay incentives are too opaque, too Body-centric, and too dashboard-like.

## 1. Product diagnosis

### 1.1 The current UI communicates implementation, not play

Observed problems:

- creation uses large generic headline + gray explanatory copy rather than actionable guidance;
- many screens resemble a generic AI-generated SaaS/dashboard layout;
- too many rounded cards with equal visual weight;
- the same page contains planning, execution, results, skills, stats, and detail sections, producing high vertical-scroll fatigue on mobile;
- functional hierarchy is weak: the player does not know what matters now, what can be influenced, or what is merely informational;
- pointer clicks leave visually loud yellow focus boxes that read as broken selection state rather than accessibility focus.

This violates the original Flow pillar. Visual polish alone will not solve it; information architecture must change.

### 1.2 Character creation does not yet create attachment

The appearance model exists as data, but selection without a visual preview does not feel like customization.
Showing appearance fields later as collapsible text has almost no player value.

The game needs a persistent visual representation of the created athlete. Appearance data is useful only insofar as it changes that visual identity, alumni continuity, equipment/cosmetics, or accessibility/debug information.

### 1.3 Attribute progression is mechanically correct but unreadable

The current presentation exposes ratings and raw XP without answering:

- how much XP is required for the next rating;
- how close the athlete is to the next increase;
- which attributes matter most for the current archetype/role;
- why a training action was valuable when the rating number did not change;
- how training proficiency changes outcomes;
- how many uses remain before the next proficiency level.

A result such as `Route Running 47 -> 47, applied XP +24` is technically accurate but poor feedback.

### 1.4 The weekly decision model has collapsed into Body management

M1/M2 intentionally began with Body as the first resource, but the live experience now makes nearly every decision feel like:

> train if Body is high; recover if Body is low.

Coach Trust, Practice Form, Scheme Fit, and Depth Rank exist, but the player does not clearly understand how to influence them. Confidence was in the player design but has not yet become a meaningful weekly decision axis.

A college-football career should make the player balance physical readiness, assignment/game preparation, confidence, role competition, and occasional life obligations. It should not copy another game's resource trio, but it does need multiple football-specific pressures.

### 1.5 Skill cards are mechanically functional but the acquisition loop is not exciting enough

Current concerns:

- too many useful cards ultimately modify Body cost/recovery or training efficiency;
- breakthrough acquisition feels like an automatic reward for repeating actions rather than a scarce, anticipated game reward;
- the player has limited ability to pursue or shape a build beyond simply playing longer;
- cards do not yet interact enough with Coach Trust, Depth competition, Preparation, game information, target roles, confidence, or key-snap decisions.

The card system is the headline build system. It must influence how a career is played, not merely how cheaply the athlete can train.

### 1.6 Football participation must begin before starter status

M4 game simulation is not implemented yet, so the current absence of game participation is expected at the M3 build. Do not misdiagnose the current build as starter-gated gameplay.

However, the old M4 statement that a deep bench player may receive no meaningful game interaction for long stretches is too passive for this product.

A rotational WR (especially WR3) must normally participate in games. Deep depth players may have low offensive involvement, but Game Day itself must still matter through special teams, package snaps, garbage time, sideline/film learning, or other role-appropriate participation.

## 2. New experience model

The game remains a deep simulation underneath, but the player's visible weekly model becomes:

> **Role + Body + Preparation + Confidence -> Practice/Game opportunities -> Coach Trust/Depth -> Skill/attribute growth**

### 2.1 Three short-term player-facing states

#### Body (0-100)
Physical capacity/readiness.

Affected by:
- physical training;
- extra reps;
- recovery;
- injury;
- game workload.

Influences:
- training efficiency at extremes;
- game physical execution;
- injury risk;
- practice quality.

#### Preparation (0-100)
Opponent- and assignment-specific readiness.

Affected by:
- film study;
- position meetings/drills;
- team practice;
- certain cards/events.

Behavior:
- partially resets/decays at the start of a new opponent week;
- should rise quickly enough that a player can intentionally prepare for an important matchup.

Influences:
- Practice Grade;
- assignment correctness;
- key-snap information quality;
- route/coverage reads;
- Coach Trust opportunities.

#### Confidence (0-100)
Mental momentum/self-belief.

Affected by:
- successful/failed game plays;
- practice outcomes;
- coach/team events;
- rivalry/pressure;
- some NIL/media interactions;
- cards.

Influences:
- variance under pressure;
- clutch/contested situations;
- recovery from mistakes;
- some skill conditions.

Do not make all three mandatory maintenance bars. Different builds should make different states easier or harder to manage.

### 2.2 Long-term / derived states

- **Coach Trust** remains a long-term role/reliability relationship.
- **Practice Grade** becomes a clear weekly derived result, not a mysterious independent resource.
- **Depth Rank** and **Projected Snap Share** remain outputs, not directly spendable meters.
- **Scheme Fit** remains mostly structural.
- **GPA** and **Brand** remain periodic pressures/opportunities, not always-on weekly chores.

### 2.3 Weekly actions become focus blocks

The football program has mandatory team activities automatically in the background. The player chooses **3 discretionary focus blocks** each week.

This avoids the strange implication that the player decides whether to attend basic team practice at all.

Vertical-slice focus families:

- Position Work
- Weight Room
- Speed/Explosiveness
- Film Study
- Extra Team Reps
- Recovery
- Study Hall
- optional contextual NIL/relationship focus

Each choice card must preview meaningful effects before commitment.

Example directional profiles:

| Focus | Direct growth | Body | Preparation | Coach/Practice | Other |
|---|---|---:|---:|---|---|
| Position Work | WR attributes | - | + | Practice + | proficiency |
| Weight Room | Strength/physical | -- | 0 | small | physical tags |
| Speed Work | Speed/Burst | -- | 0 | small | physical tags |
| Film Study | IQ/mental | ~ | ++ | assignment + | key-snap information |
| Extra Team Reps | mixed modest | -- | + | Trust/Practice ++ | role competition |
| Recovery | none | +++ | 0 | indirect | injury risk down |
| Study Hall | none | ~ | 0 | 0 | GPA |

Exact values remain tuneable content.

## 3. Mobile information architecture

Stop rendering the career as one vertically stacked mega-page.

Primary mobile navigation for the vertical slice:

1. **Home**
2. **Week**
3. **Team**
4. **Skills**
5. **Player**

Desktop may use a rail/sidebar representation of the same destinations.

### Home
Must answer in under five seconds:

- who am I?
- what week/opponent is next?
- what is my role now?
- am I likely to play?
- what condition am I in?
- what is the next decision?

Suggested hierarchy:

- athlete portrait + name/program/position/year;
- Depth Rank + projected snap range prominently;
- next opponent/game status;
- Body / Preparation / Confidence compact status row;
- current coach objective / development objective;
- important alerts only (injury, GPA risk, breakthrough ready, NIL obligation).

Do not put the complete attribute table on Home.

### Week
Dedicated planning/execution surface:

- weekly opponent context;
- three focus slots;
- available focus actions;
- effect previews;
- practice/game readiness summary;
- action resolution and results.

Planning and action resolution may be separate subviews within Week to avoid long-scroll mixing.

### Team
Contains:

- WR depth room;
- role labels;
- projected snap ranges;
- competitor comparison;
- schedule/game access;
- explanation of why the player is currently WRn.

### Skills
Contains:

- 4-slot active loadout;
- owned cards;
- Breakthrough gauge/reward status;
- card filters/details;
- card draft when available.

### Player
Contains:

- persistent athlete portrait;
- position/archetype summary;
- grouped attributes and XP progress;
- career stats/awards later;
- identity/cosmetic edit entry.

Do not show appearance as a textual accordion in the primary player profile.

## 4. Contextual onboarding instead of decorative copy

Replace generic headline/subtitle explanation with contextual teaching.

Tutorial principles:

- teach a system when the player first reaches it;
- point at the actual control/value being explained;
- explain what the player can do and why it matters;
- keep each teaching beat to one or two short ideas;
- allow skip and replay from Help;
- persist tutorial completion per system, not one giant tutorial flag.

Required first-run beats:

1. Character creation: archetype/background tradeoffs and live appearance preview.
2. Program choice: Prestige, Scheme Fit, depth opportunity.
3. First Week: Body, Preparation, Confidence and 3 focus blocks.
4. First Team view: Coach Trust / Practice / talent fit -> Depth -> projected snaps.
5. First Skill Draft: gauge, rarity, three-card selection, four equipped slots.
6. First Game Day: projected role, snap opportunity, key-snap decisions.

Provide a lightweight glossary/info button for optional detail. Do not write paragraphs of low-value gray copy into every card.

## 5. Character visual identity is now an acceptance requirement

The existing composable appearance data must drive a visual athlete representation.

### Vertical-slice implementation

A polished 3D creator is not required. A layered 2D/vector/placeholder system is sufficient if it visibly reacts to selections.

Minimum:

- skin tone;
- face/head shape;
- hair/style/color;
- body type;
- eye black;
- sleeves;
- gloves;
- visor;
- towel/tape where supported.

### Creation UX

Desktop:
- persistent preview pane beside controls.

Mobile:
- sticky or compact preview header with a full-preview action.

Every appearance change updates the preview immediately.

### Career UX

The portrait appears at minimum on:

- Home;
- Player;
- major skill/award/depth-promotion moments when useful;
- alumni record.

Appearance text is not a main gameplay view. Keep raw appearance fields only for accessibility labels, save/debug details, or edit controls.

## 6. Attribute and progression legibility

### 6.1 Group attributes

WR Player view should group rather than dump a flat matrix.

Suggested groups:

**Athleticism**
- Speed
- Burst
- Agility
- Strength
- Conditioning
- Durability

**Receiving**
- Release
- Route Running
- Hands
- Catch in Traffic
- YAC
- Blocking

**Mental**
- Football IQ
- Composure
- Discipline
- Work Ethic

### 6.2 Every trainable rating needs visible progress

Presentation should answer:

- current rating;
- current XP toward next rating;
- XP required for next rating;
- distance remaining.

Example:

> Route Running 47
> `[█████████░] 92 / 100 XP`
> **8 XP to 48**

Do not use `XP 0` without a denominator/context.

### 6.3 Archetype relevance

Highlight the 4-6 attributes most relevant to the current archetype/role.

The user should be able to answer:

> "What should this Deep Threat improve next?"

without reading an external guide.

Do not reveal every exact hidden weight by default. An optional Details panel may show deeper evaluation logic.

### 6.4 Training result presentation

Bad:

> Route Running 47 -> 47, Applied XP +24

Good:

> **Route Running +24 XP**
> 68/100 -> 92/100
> **8 XP to rating 48**

If a rating levels:

> **Route Running 47 -> 48**
> New progress: 12/108 XP

Only animate/show `rating -> rating` when the rating actually changes.

### 6.5 Proficiency presentation

Bad:

> Level 0 -> 0, uses 0 -> 1

Good:

> Route Drills Proficiency
> **1 / 3 sessions to Lv.1**
> Lv.1 benefit: **+5% Route Drill XP**

Use the real configured threshold/benefit; do not hardcode this example.

### 6.6 Explain effect composition on demand

Results may expose an optional breakdown:

- Base XP
- Archetype modifier
- Skill-card modifier
- Proficiency modifier
- Body/Preparation modifier

The main result stays concise.

## 7. Make depth competition understandable and actionable

The player needs a readable answer to:

> Why am I WR3, and what can I do about it?

Team view should provide an explainable role panel such as:

- Talent / role fit: Strong
- Coach Trust: Average
- Practice trend: Rising
- Scheme Fit: Good
- Experience/readiness: Average

Also surface one or two actionable suggestions based on current gaps, for example:

> Best current path to challenge WR2: improve Route Running and post stronger Practice Grades.

Do not promise a promotion from one action. Do not expose fake precision.

Projected Snap Share is a primary reward and must be visible before every game.

## 8. Skill-card system v2 direction

Preserve deterministic seeded offers and the existing four-slot architecture. Redesign acquisition cadence and card ecology.

### 8.1 Acquisition should be anticipated, earned, and scarce

Introduce a visible **Breakthrough Gauge** (working name; localize final terminology).

Gain comes primarily from meaningful career performance:

- strong Practice Grades;
- game participation/performance;
- coach objectives;
- firsts/milestones;
- selected events.

Do **not** award cards simply because the player repeated enough routine training actions.

When the gauge fills:

- trigger a three-card draft;
- preserve deterministic seeded offer rules;
- show rarity/reveal feedback;
- allow the player's recent behavior/tags/archetype/role to influence weights;
- keep pity/rarity rules visible enough to feel like a system rather than arbitrary RNG.

Vertical-slice pacing target: roughly **4-6 meaningful drafts per season**, subject to simulation/balance validation. Fall camp may guarantee an early first build-defining card so the system becomes relevant quickly.

### 8.2 Add a Role/Coach family

Revised families:

- Development
- **Role/Coach**
- Game Day
- Body
- Mindset
- Life

Body remains valuable but must not dominate the build space.

Suggested 40-card vertical-slice direction:

- Development: 8
- Role/Coach: 7
- Game Day: 10
- Body: 5
- Mindset: 6
- Life: 4

Exact counts may be adjusted after auditing existing cards, but Game Day + Role/Coach + Preparation/Mindset effects should materially outnumber pure Body-management cards.

### 8.3 Cards should change decisions and information

Priority mechanics:

- Coach Trust gain/loss rules;
- Practice Grade conversion;
- Preparation efficiency;
- depth-underdog/next-man-up roles;
- target or package opportunities;
- key-snap information;
- route/release/catch decision options;
- confidence loss/recovery;
- opponent/rivalry situations;
- academics/NIL opportunity cost;
- Body/recovery as one family among several.

Examples of direction, not mandated literal cards:

- **Film Junkie**: Film Study raises Preparation more; eligible key snaps reveal an extra coverage clue.
- **Reliable Assignment**: correct assignment/practice outcomes grant extra Coach Trust; repeated mental mistakes are punished less.
- **Next Man Up**: when a player ahead on the depth chart is unavailable, temporary Confidence/Preparation benefits.
- **Third Down Specialist**: changes third-down route/key-snap value rather than generic training XP.
- **Short Memory**: drop/failure Confidence penalties recover faster.
- **Academic Routine**: Study Hall is more efficient, freeing future focus capacity.
- **Recovery Window**: a legitimate Body card remains useful.

Keep C/B cards viable through reliability, broad conditions, or low tradeoff. S must not mean unconditional strict upgrade.

## 9. Game Day participation requirements for M4

M4 is now responsible for making football visible every scheduled game week.

### 9.1 Every scheduled game has a Game Day surface

Even when the player receives no offensive target, the player sees:

- opponent;
- score/game flow;
- role/snap projection;
- actual snaps/role after game;
- team result;
- development/coach consequences.

### 9.2 Rotation players must actually rotate

Directional WR key-snap expectations after simplification/tuning:

- WR1 / featured starter: ~6-10 meaningful decisions
- WR2: ~4-8
- WR3 rotation: ~2-6
- WR4 package/rotation: ~1-4
- deep bench: ~0-2 offensive key snaps depending on script

These are design targets, not hard guaranteed counts.

A healthy WR3 with a non-zero projected snap range should not routinely finish multiple games with zero participation.

### 9.3 Deep bench still has football context

WR5+ may receive:

- special teams reps;
- package snaps;
- garbage-time snaps;
- injury replacement;
- sideline/film-learning feedback;
- scout-team development where appropriate.

Realism may produce an occasional zero-offensive-snap game, but the career loop must not become weeks of training menus with no football feedback.

### 9.4 Games must feed the full career loop

Game outcomes can affect:

- position attribute XP;
- Confidence;
- Coach Trust;
- Practice/role reputation;
- Breakthrough Gauge;
- Brand later;
- injury/Body;
- depth evaluation;
- career stats.

This is how early-career football becomes the payoff for weekly planning.

## 10. Visual system correction

The current dark navy + accent direction may remain, but the visual language needs stronger sports identity.

### 10.1 Visual references in principle

Blend original interpretations of:

- college-football broadcast graphics;
- locker-room/player personnel boards;
- playbook/field diagram language;
- recruiting media;
- athlete identity/profile presentation.

Do not copy a specific game's UI.

### 10.2 Anti-patterns to avoid

Do not default to:

- oversized generic marketing headline on functional screens;
- gray paragraph copy that does not help a decision;
- identical rounded rectangles for every piece of information;
- enterprise-dashboard stat matrices;
- excessive card-within-card nesting;
- giant empty padding;
- raw backend labels/evidence in primary UI;
- bright persistent outline around pointer-clicked content.

### 10.3 Cards are reserved for meaning

Use card surfaces mainly for:

- choices;
- skill cards;
- opponent/game modules;
- major status/alerts.

Use dividers, tables, bars, scorebug patterns, typography, and spatial grouping for passive information.

### 10.4 Focus treatment

Accessibility focus must remain.

Use `:focus-visible` for keyboard focus. Pointer selection should not retain a loud focus rectangle unless the control is actually selected.

Recommended direction:

- 2px high-contrast focus ring;
- small offset;
- contextual accent/neutral focus color;
- distinct selection styling (fill, side marker, icon, etc.).

Do not remove keyboard focus visibility to make the UI prettier.

### 10.5 Sports typography hierarchy

Establish roles rather than one giant bold size:

- broadcast/display number;
- screen title;
- section label;
- body;
- dense stat label;
- metadata/caption.

Korean and English typography must be tested independently for hierarchy and line breaks.

## 11. Implementation timing and save-schema implication

This feedback arrives at an ideal boundary:

- M3 is complete;
- M4 is in specification/planning;
- M4 atomic task 1 is creating CareerRun/save-envelope v4 before live game commands.

Therefore:

1. Finish only the current atomic operation if stopping mid-write would leave the repository red.
2. Before freezing/publishing v4, incorporate the new short-term states required by the approved model, especially Preparation and Confidence.
3. Do not intentionally publish a v4 schema and immediately require v5 solely because this review was ignored.
4. Insert **M3.5 — Experience Foundation and Gameplay Legibility** as a blocking milestone before M4 live UI/game completion.
5. Pure M4 simulation infrastructure may be preserved if already implemented and compatible, but M4 player-facing UI must use the revised information architecture.

## 12. M3.5 acceptance criteria

M3.5 is complete only when all of the following are true in both ko-KR and en-US:

### Identity
- creation has a live visual athlete preview;
- appearance changes visibly update it;
- Home/Player show the athlete portrait;
- textual appearance accordion is removed from the primary profile experience.

### Navigation
- mobile has stable Home / Week / Team / Skills / Player destinations;
- the weekly flow no longer requires one giant vertical page;
- 320px-wide supported layouts remain usable without horizontal overflow.

### Onboarding
- first-visit contextual tutorials exist for creation, Week, Team/depth, Skills;
- generic decorative guidance is reduced/removed;
- tutorial state is persisted and replayable.

### Progression legibility
- every trainable rating shows current rating + XP progress + next threshold;
- training result shows XP progress even when rating does not level;
- proficiency shows uses to next level and next benefit;
- archetype/key attributes are visually identified.

### Weekly strategy
- Body, Preparation, Confidence are visible and mechanically meaningful;
- at least four focus choices create clearly different tradeoffs across these dimensions and/or role progression;
- Coach Trust/Practice/Depth relationship is explainable from Team view;
- Body-only spam/recovery is no longer the dominant obvious loop in deterministic evidence.

### Skill system
- Breakthrough Gauge/reward acquisition replaces routine repeated-action free-card cadence;
- Role/Coach and Game Day mechanics exist in the initial card ecology;
- the active card set demonstrates at least three distinct viable strategy directions beyond Body management;
- acquisition remains deterministic by seed/state and save-safe.

### Visual foundation
- no persistent pointer-click yellow focus boxes;
- keyboard focus remains clearly visible;
- passive information is not universally placed in identical rounded cards;
- Home and Player visually read as a sports career game, not a generic dashboard.

### Verification
- existing deterministic/save/localization/PWA guarantees remain green;
- new mechanics have deterministic unit/scenario tests;
- Playwright covers both locales and mobile navigation;
- an updated balance/evidence report compares at least three weekly strategies across Body/Preparation/Confidence/role outcomes.

## 13. Explicit non-goals for this correction

Do not block M3.5 on:

- final commissioned illustration quality;
- full 3D athlete models;
- final 96-program art sets;
- all six positions;
- final NIL/transfer content;
- final sound design;
- full M4 game simulation completion.

The goal is a readable, emotionally legible, visually credible vertical-slice foundation that M4/M5 can build on.
