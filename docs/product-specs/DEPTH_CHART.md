# Depth Chart and Snap Share

## Purpose

Depth movement is the primary visible progression of early careers.

A player should care more about:

> WR6 → WR4 → rotation → WR2 → starter

than about an isolated rating increase.

## Evaluation model

Depth evaluation is a derived score. Initial directional weights:

- 45% position/archetype talent fit
- 20% Coach Trust
- 15% recent Practice Form
- 10% Scheme Fit
- 10% experience/readiness

The M3 implementation uses exact integer permille weights of `450/200/150/100/100`. Each component is 0–100, each contribution and the total are persisted in score-milli, and talent fit is recalculated from the selected offense style's 1000-permille WR attribute weights. Keep these constants centralized and balance-test them.

That formula remains historical v3 evidence. The current v4 evaluation must make Preparation and Confidence materially relevant through the versioned Practice Grade/readiness inputs without double-counting them. Any revised weights and transformations are centralized, persisted as evidence, migration-tested, and simulation-tested before replacing the M3 current-writer calculation.

Health/availability can constrain the result.

## Hysteresis

Avoid noisy weekly rank swapping.

Use one or more of:

- incumbent/stability bonus;
- minimum evaluation gap for a rank swap;
- coach decision cadence;
- event/injury exceptions.

The M3 vertical slice permits at most one adjacent move each completed week. Promotion requires the player's score to beat the immediate player above by at least 2,000 score-milli; demotion requires the immediate player below to beat the player by the same margin. A smaller ordering advantage is held and records the relevant neighbor so the player can understand why no swap occurred.

## Snap share

Depth rank influences expected snaps but is not a direct fixed percentage.

Snap share should consider:

- personnel packages;
- rotation policy;
- game script;
- fatigue/injury;
- special role packages;
- blowout context;
- performance and coach trust.

The M3 vertical slice uses the committed program's validated rotation policy as its simplified deterministic model. Rank bands are Starter 1–2, Rotation 3–4, Reserve 5–6, and Developmental 7–8; each policy supplies one monotone min/max snap-permille range per rank. Trust and form affect the projection through evaluation and rank and are not counted a second time.

## UI requirements

Before a game, surface:

- current depth rank;
- projected role;
- projected snap range/share;
- major reasons for a change when known.
- the nearest relevant competitor as a readable comparison;
- one or two actions most likely to improve the athlete's opportunity.

After a game/week, prominently surface depth movement and trust changes.

The Team surface must answer four questions without exposing misleading decimal precision:

1. Why am I currently WRn?
2. What drove my latest Practice Grade and Coach Trust movement?
3. What snap/participation range should I expect?
4. What can I work on next?

React displays core-persisted factor labels, directions, and evidence; it does not reproduce evaluation rules.

The current Team implementation treats the immediately higher WR as the advancement target, or the immediately lower WR as role pressure when the player is WR1. It compares the five persisted evaluation components qualitatively, ranks at most two development suggestions from persisted contribution deficits, and omits the old decimal composite score from the room list. Exact mechanics remain available in saved evidence and tests without implying that a decimal UI score predicts a snap count.

Team always binds the displayed program and room to the domain-owned current-program selector. The original recruiting offer remains historical evidence after transfer and cannot be required to present the destination depth chart. A mismatch between selected current membership and the active room fails closed in validation/tests rather than rendering an origin-program fallback.

## M7 position-room foundation

Every alpha position retains an eight-athlete room—the player plus seven generated competitors—but owns its fixed-point evaluation weights and archetype fit. Initial generation consumes exactly five career-RNG draws per competitor for name pair, archetype, class, and talent, for the established 35-draw total. A position-aware competitor ID includes program and position, preventing cross-room identity ambiguity.

Weekly updates retain the established 40/60 Practice Form blend, bounded Practice Grade-to-Coach Trust bands, 2,000 score-milli threshold, and one-adjacent-rank movement limit. Talent is recalculated from the position's 16 recruiting inputs; the other four evaluation factors remain explicit contributions. The projection also provides the nearest advancement target—or the closest role pressure at rank one—with all five signed contribution gaps and the largest actionable player deficit. Role output uses position content's interactive-snap range and minimum feedback beats, so every role receives truthful football feedback and Reserve always has meaningful interactive participation.

Current v2 preparation turns that authored interactive range into a saved opportunity count: floored midpoint, a bounded one-snap relationship shift at ±50 permille, then role/alpha clamps. Saved injury or academic availability may further restrict it, including zero opportunities with truthful review feedback. Relationships do not directly move rank or expand the role's range; presentation reads the baseline, modifier, and result from core evidence. Historical maximum-based compatibility remains unchanged.
