# Product Rebaseline

Date: 2026-09-29. This document is authoritative over existing UI structure, presentation APIs and implementation-driven spec text. `PRODUCT_VISION.md` and `CORE_BELIEFS.md` remain authoritative intent. Where older specs conflict with this document, this document wins until those specs are rewritten.

## The game, from first principles

**Project Saturday is a college-football player-career RPG.** You are one athlete. You never coach, manage a roster or call plays.

The fantasy is:

> I arrived as a recruit nobody was sure about. I fought my way up the depth chart, made the play that got me noticed, built a player nobody else would have built, and left a name in this program's history.

Everything the player touches should serve one of five feelings, in priority order:

1. **Flow.** A week takes about a minute, and every tap is a meaningful choice or a payoff.
2. **Expression.** My build (skill cards plus weekly emphasis) produces a player unlike my last one.
3. **Climb.** I can see the person above me on the depth chart and the specific reason I am behind them.
4. **Identity.** This is a specific human, at a specific program, with specific relationships.
5. **Game Day.** Saturday is the payoff. It looks and sounds like football, and my decisions visibly decide plays.

World simulation exists to make those five true. It is never the thing on screen for its own sake.

## One career, four (later six) positions

There is **one career model**. Position changes the football: attributes, key-snap families, stats, Game Day board and skill pool. It does not change the career shell.

- Every position recruits from the same world.
- Every position has the same week, Team, Skills and Player surfaces, with the same Hub and alumni.

The QB/RB/CB aggregate (four slots, 32-program world, two-season lifecycle) becomes the base. WR is re-expressed as a position inside it, reusing its existing WR engine, content and skill cards.

## Desired player experience, beat by beat

### 1. Create (target under 2 minutes, one screen per idea)

- **What:** position → archetype → background → two traits → look → name and measurables.
- **Understand:** what kind of player this is ("a deep threat who needs to earn the coaches' trust").
- **Hidden:** attribute arithmetic. Show a player-card preview with 4–6 headline ratings and a scouting blurb.
- **Exciting:** the card assembling itself, and the player's first recruiting ranking (stars).

### 2. Recruiting (the first real decision)

- **What:** 3–5 offers presented as recruiting pitches: program colors and mark, head coach, depth-chart path ("You'd be WR6 behind two seniors"), scheme fit, and the one thing the program sells.
- **Understand:** the trade-off between playing time now, development and prestige.
- **Hidden:** the recruit score, priority and interest numbers.
- **Exciting:** the commitment moment, a hat-pick or signing graphic.

### 3. The week (the core loop, target 30–90 seconds)

- **Shape:** a single guided sequence, not five tabs to visit: **Coach's report → Choose 3 focuses → Practice results → (event) → Game Day → Post-game → Next week**.
- **Understand:**
  - where I stand (depth position, snap projection, the rival above me);
  - my readiness in three bars (Body, Preparation, Confidence);
  - what this opponent will test.
- **Focus choice:**
  - Pick from a compact, grouped set of **six to eight** focuses, each with one line of intent and a visible effect on the three bars and on the rivalry.
  - A good default plan is always one tap away.
  - Skill-card modifiers are already applied in what you see.
- **Hidden:** Practice Form, Talent Fit, Scheme Fit and experience readiness as separate numbers. They collapse into a **Coach's view** that tells you which of three levers is holding you back.
- **Exciting:** practice-report movement ("You passed Lawson in the coaches' eyes"), depth promotions, card breakthroughs.

### 4. Game Day (the payoff)

- **Broadcast framing:** score bug, quarter/clock, down and distance, venue and crowd tone.
- **Every game has football for every role:**
  - Starters and rotation players get live key snaps.
  - Reserves and developmental players get **sideline/special-teams/scout reps**: truthful, role-appropriate decisions that feed Practice Form and Coach Trust. They do not create offensive stats.
  - A zero-decision Saturday should be a rare, explained exception (injury, academic ineligibility), not the freshman norm.
- **Key snap:**
  - A 2D tactical board with alignment, line of scrimmage, first-down line, the athlete highlighted and the earned clues drawn on the field.
  - Three choices, plain-language intent first.
  - Resolution animates the play in 1.5–3 seconds, then gives a headline, one reason, and the stat/grade consequence.
- **Hidden:** fit scores, probabilities and hidden defensive patterns.
- **Exciting:** a touchdown, a pick, the moment the board shows you read it right.

### 5. Post-game (the story)

- Lead with the result and why it mattered (rivalry, ranking, streak).
- Then your line, your one to three defining plays, the coach's verdict, and what moved: trust, depth outlook, card gauge, XP.
- Reactions come from real triggers (coach, teammate, media, fans, NIL) and are authored, never generated.
- Zero rows and default values are not shown.

### 6. Season arc and offseason

- Postseason and a season review with awards and a ranking context.
- Offseason is one decision board: Stay or one of three transfer options, each shown as a recruiting pitch with an honest role outlook.
- The second season follows. Later milestones add more seasons and the draft.

### 7. Career end and legacy

- A career-summary broadcast package: best game, final role, programs, awards, stat line.
- The athlete joins the **Alumni Wall**. Future careers can meet alumni as mentors or references.
- Starting a new career shows what the legacy unlocked.

## What the player should understand at each moment

| Moment | Must understand | Must not need |
|---|---|---|
| Creation | Player identity and what kind of career it implies | Attribute formulas |
| Recruiting | Playing-time path vs prestige vs development | Recruit score math |
| Week start | Rank, rival, snap outlook, readiness, opponent | Factor weights |
| Focus choice | Effect on readiness and on the rivalry | Base-vs-modified deltas |
| Game Day | Situation, what I saw, my three options | Fit scores |
| After snap | What happened and why | RNG / roll values |
| Post-game | Result, my impact, what changed | Zero rows, default values |
| Offseason | Where I would play and how much | Nine projection factors |

## Automated or hidden

- Mandatory team practice, meetings, the schedule and other programs' games.
- Neutral off-field state. Relationships, GPA and NIL appear **only when they become a decision or a warning** (probation risk, an offer, a coach conflict).
- Passive recovery and preparation carry-over. Report them only when they matter.
- Save state. A single "Saved" indicator. The storage/recovery detail lives in the Hub.

## Simulation rules we keep

- Deterministic seeded RNG with separate career and world streams.
- Presentation never invents football. Boards and animations draw only engine evidence.
- Both locales complete, with accessibility, PWA and offline.

## Deliberate save boundary (the 1.0 line)

The game has never shipped. Historical save compatibility for prototype saves (WR v1–v8, position aggregate v1–v3, envelope proofs, report hashes) is **not** a product requirement.

At the rebuild's activation:

1. **One new save line.** A single career schema (v1 of the new line) for all positions, plus one alumni/legacy registry.
2. **Prototype data is not silently destroyed.** On first launch, the app detects prototype saves, offers a one-tap JSON export, and imports completed alumni as read-only legacy entries (name, position, programs, headline stats) where they parse. In-progress prototype careers are retired with a clear notice.
3. **From then on, strict discipline:** every schema change after the boundary gets explicit versioned migrations and tests, as before.
4. **Determinism and replay remain,** but historical report hashes are retired for mechanics we intentionally change. New golden fixtures are recorded for the new line.

## What changes in the definition of done

A feature is done when the experience works in both locales on phone and desktop, as seen in the real app, and not only when automation is green. Tests protect intended behavior. Tests that protect a layout or flow we are replacing are rewritten or deleted along with it.
