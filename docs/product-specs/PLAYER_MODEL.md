# Player Model

## Playable-position rollout

The verified M0–M6 vertical slice is **WR** only. M7 expands the alpha to QB, RB, WR, and CB. Its first v7 compatibility checkpoint reserves all four position, archetype, and position-attribute IDs but intentionally keeps live creation, commands, persisted players, and alumni WR-only until the position-aware contracts and engines activate together.

Long-term playable positions:

- QB
- RB
- WR
- CB
- LB
- EDGE

## Identity

A player has:

- stable player ID and career seed;
- localized display name input by user or generated;
- appearance configuration;
- height/weight/body type;
- position;
- archetype;
- recruiting background;
- personality traits;
- handedness where relevant;
- program;
- earned tags;
- skill inventory/equipped cards.

## Ratings scale

Use a mechanically clear **0–100** scale internally unless a later ADR changes it. UI may round and selectively hide ratings. Overall is derived, never a directly trained attribute.

## Common physical attributes

- Speed
- Burst
- Agility
- Strength
- Conditioning
- Durability

## Common mental attributes

- Football IQ
- Composure
- Discipline
- Work Ethic

## WR position attributes

- Release
- Route Running
- Hands
- Catch in Traffic
- YAC
- Blocking

## M7 alpha position attributes

QB:

- Throw Power
- Short Accuracy
- Intermediate Accuracy
- Deep Accuracy
- Pocket Presence
- Read Progression

RB:

- Vision
- Ball Security
- Contact Balance
- Elusiveness
- Receiving
- Pass Protection

CB:

- Man Coverage
- Zone Coverage
- Press
- Ball Skills
- Tackling
- Recovery Technique

These stable attribute families are not aliases for WR ratings. Position-aware creation, training, depth evaluation, opportunity, grading, and football decisions must consume the responsible position family before that position becomes playable.

M7 progression uses exactly the ten shared physical/mental attributes plus the six attributes owned by the selected position. Overall is the rounded mean of those 16 responsible ratings, preserving the verified WR result while excluding unrelated position ratings. Each attribute exposes canonical progress evidence: current rating, stored XP, next rating, XP remaining, and 0–1000 permille progress. Rating 100 is terminal with zero stored XP, no next rating, and complete progress. Cross-position, missing, unknown, malformed, or nonterminal XP shapes are invalid rather than silently ignored.

Schema-9 creation mechanics provide one exact baseline per alpha position, three position/archetype tradeoff profiles, and five background projections per position. Personalities remain shared because their current effects target shared mental/state values. The pure pre-career builder owns seed-derived player identity, appearance, measurements, canonical personalities/tags, state, ratings, XP, and overall; it consumes no RNG. These profiles remain staged until weekly, depth, and game systems can accept the same position-aware shape together.

M7 step 10 carries that same selected position and archetype through a versioned staged lifecycle containing player state, relationships, program stints, season summaries, offseason evidence, and alumni projection. Position statistics use stable position-owned IDs rather than one cross-position numeric blob. This lifecycle is browser-independent; the strict WR `CareerSessionV7` remains the production save until public commands prove the complete aggregate in step 11.

## Derived/temporary state

These are not permanent attributes:

- Body: 0–100 physical readiness; workload and recovery change it.
- Preparation: 0–100 opponent/assignment readiness; film, assignment work, weekly context, and opponent rollover change it.
- Confidence: 0–100 mental momentum; recent execution, role feedback, events, and relevant focus choices change it.
- Injury risk/readiness state
- Coach Trust: 0–100
- Brand: 0–100
- GPA: 0.0–4.0 simplified fictional academic model
- Scheme Fit: derived 0–100
- Practice Form/Grade: recent state
- Depth Rank
- Projected Snap Share
- Draft Stock

Body, Preparation, and Confidence are the primary short-horizon football states. They must have distinct consequences rather than functioning as three labels for the same modifier:

- Body changes physical efficiency, fatigue, availability, and risk.
- Preparation changes assignment reliability, Practice Grade evidence, pre-snap information, and coach willingness to use the athlete.
- Confidence changes composure, risk response, and momentum-sensitive execution.

Preparation partially resets or decays when the opponent/week context changes. Current tuning retains half of the deviation from neutral 50 at rollover, with one deterministic rounding step. New and v3-migrated v4 careers begin at neutral Preparation 50; legacy v1-v3 payload shapes remain unchanged. Migrated in-flight weeks carry a v4 weekly-model discriminator so their phase/result evidence finishes literally before the current model activates.

## Archetypes (WR v1 examples)

- Deep Threat
- Route Technician
- Possession Receiver

Archetype changes initial distributions and evaluation weights; it must not hard-lock future development.

M7 reserves three archetypes per added alpha position: Field General, Gunslinger, and Dual Threat for QB; Power Back, Elusive Back, and All-Purpose for RB; Press Man, Ball Hawk, and Zone Technician for CB. Their localized presentation and mechanics become shipping content only with the validated M7 position contract; the reserved IDs alone do not make them selectable.

## Recruiting backgrounds (v1 examples)

- Blue-Chip Star
- Late Bloomer
- Small-Town Star
- Legacy Recruit
- Under-Recruited Athlete

Backgrounds provide tradeoffs, tags, initial recruiting context, and event eligibility more than raw permanent power.

## Personality (v1 examples)

Pick two compatible traits from a controlled list:

- Competitive
- Quiet
- Leader
- Hot-Headed
- Disciplined
- Social
- Independent
- Confident

Each trait should affect at least one system or event eligibility. Avoid purely cosmetic personality choices.

## Appearance

Use a composable 2D/layered representation first:

- skin tone;
- face;
- hair/style/color;
- body type;
- eye black;
- arm sleeves;
- gloves;
- visor;
- wrist/tape;
- towel;
- jersey fit/details;
- footwear cosmetic.

Separate cosmetic identity from performance equipment.

The selected appearance must render as a deterministic layered 2D athlete during creation and persist as the same recognizable portrait on Home and Player. Every layer is selected by stable ID, has bilingual accessible text, and remains cosmetic unless a separate rules system explicitly says otherwise.
