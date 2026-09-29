# M7 Playtest Review — Round 2

Date: 2026-09-01

This is authoritative product feedback, not a cosmetic-polish request.

## 1. Team tab fails after transfer

Observed:
- After transferring programs, the Team destination renders nothing.

This is a correctness bug. Team/depth/schedule/coach presentation must resolve
through the player's **current program**, never a stale recruiting/origin program.
Keep origin program only for career history.

Required:
- one authoritative current-program selector
- transfer -> reload -> Team regression coverage for QB/RB/WR/CB
- offline/recovery coverage

## 2. Too many repeated roster names

Repeated first/surnames make generated rosters feel fake and competitors hard to
remember.

Required:
- full names unique inside a roster
- repeated first/surnames allowed but diversity-weighted
- deterministic seeded generation
- stable player IDs never derived from names
- enlarge name catalogs before 64/96-program scaling
- names never influence ratings/potential/personality

## 3. No practical career management

The user should never need to clear browser storage to test another run.

Add a Career Hub:
- Continue
- New Career
- Abandon Current Career
- Alumni / Legacy
- save/recovery status
- Reset All Data as a separate destructive action

Starting a new run preserves MetaProfile, alumni, unlocks, program familiarity,
achievements, and settings. Abandoning an unfinished career gives no normal
completion/alumni power reward.

## 4. Game Day is too text-dependent

Football-literate players can infer alignment and choices from text. Beginners
cannot.

Create a reusable **2D Tactical Snap Board**. It should visualize real simulation
evidence, not invent a second game model.

Before choice:
- line of scrimmage / first-down marker
- ball
- offensive/defensive alignment
- controlled athlete highlight
- down, distance, quarter, score
- only clues actually revealed by Preparation/Film/Football IQ/skills

Choice preview:
- preview route/track/read/leverage/coverage assignment
- plain-language intent first
- football terminology second

After choice:
- short deterministic replay animation
- movement of relevant players/ball
- target/catch/tackle/throw/gap/coverage outcome
- concise explanation from real engine evidence

Prefer responsive SVG or equivalent lightweight web-native graphics. Do not add
a full 3D engine. The projection layer must work for QB/RB/WR/CB and later LB/EDGE.

## 5. Snap and match results lack payoff

Add three feedback layers.

### Immediate snap payoff
- visual resolution
- outcome headline
- concise football explanation
- actual play/stat consequence
- grade/coach/build consequence only when real

### Game atmosphere
- compact score bug
- quarter/down-distance
- recent-drive summary
- game-importance/crowd tone
- participation counter

### Post-game story
Answer:
- did we win and why did it matter?
- what did my player do?
- what were 1–3 defining snaps?
- how did the coach evaluate me?
- what changed in XP, ratings, Body/Preparation/Confidence, trust, depth and
  Breakthrough Gauge?
- were there appropriate coach/teammate/media/fan/NIL reactions?

Use deterministic authored reaction templates and real state tags. No runtime LLM
is required.

## Reinforced principles

1. Complexity may be hidden; consequences must be visible.
2. Football knowledge should improve mastery, not be required for comprehension.
3. Players should remember teammates, opponents, games and previous careers.
4. Game Day is the emotional payoff for weekly preparation.
5. Presentation visualizes authoritative engine state; it does not create rules.
6. Repeated-run usability is a core roguelite feature.
