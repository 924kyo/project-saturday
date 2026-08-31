# Player Model

## Initial playable position

Vertical slice: **WR** only.

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

## Derived/temporary state

These are not permanent attributes:

- Body: 0–100
- Confidence: 0–100
- Injury risk/readiness state
- Coach Trust: 0–100
- Brand: 0–100
- GPA: 0.0–4.0 simplified fictional academic model
- Scheme Fit: derived 0–100
- Practice Form/Grade: recent state
- Depth Rank
- Projected Snap Share
- Draft Stock

## Archetypes (WR v1 examples)

- Deep Threat
- Route Technician
- Possession Receiver

Archetype changes initial distributions and evaluation weights; it must not hard-lock future development.

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
