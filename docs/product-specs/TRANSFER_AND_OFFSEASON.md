# Transfer and Offseason

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Purpose

Offseason changes the player's career situation without becoming a second management game.

## Inputs to offseason projection

- returning/departing teammates;
- incoming recruits;
- coach/coordinator changes;
- scheme changes;
- current Coach Trust;
- performance and depth role;
- program trajectory;
- injury/health;
- NIL/brand opportunities.

## Transfer decision

When relevant, compare stay vs offers on:

- projected depth role;
- estimated snaps;
- scheme fit;
- player development;
- program prestige/championship outlook;
- NIL opportunity;
- academics;
- relationships;
- region/personal tags.

## Offer volume

Present a curated shortlist, not a giant spreadsheet of every interested program.

## Uncertainty

Projected role is not guaranteed. Program familiarity, agent/advisor quality, Coach Trust, and career experience may improve information confidence.

## Transfer consequences

Transfer updates:

- program/roster membership;
- relationship context;
- coach trust baseline according to offer promise and background;
- scheme fit;
- schedule/program history;
- event tags.

Career stats and prior history remain intact.

## Stay value

Remaining at a program should preserve relationship/trust/familiarity benefits so transfer is not always optimal.

## Current M6 comparison contract

The first surface compares Stay with exactly three curated offers. Nine stable factors—projected role, snap range, Scheme Fit, development, program outlook, NIL opportunity, academics, relationships, and familiarity—form a content-owned 1,000-permille evidence model. Stay receives a modest familiarity input; transfer retains only the explicitly authored portion of Coach Trust and resets destination relationships to a neutral baseline.

Every option carries a high, medium, or low information-confidence tier. Lower confidence widens the saved projection range; it never hides a fixed promised role behind vague copy. The offseason catalog allows continuity, a position-coach change, or one scheme shift per program projection, with canonical weights and explicit trust/relationship effects. Live commands must persist the selected outcome, draw range, comparison evidence, and resulting program context so reload cannot reroll the shortlist.

The shipping comparison is a single mobile-first Season Review board, not a recurring portal. It resolves localized program/content labels from stable IDs and presents all four saved options with the same role, rank, snap, range, confidence, staff/scheme, and factor vocabulary. Projection, commitment, and season-two bootstrap each use a separate deferred-publication command so a failed write cannot display an unpersisted shortlist, destination, or returning-season state.

### Deterministic projection boundary

For a newly activated v6 career, projection begins only from the completed-postseason `SEASON_REVIEW` boundary after both fictional academic checkpoints and after pending NIL business is resolved. The command freezes the first season into the completed-season aggregate, advances the saved season and academic-term indices, and leaves all prior calendar, game, role, skill, injury, relationship, and program-history evidence intact. This path does not reopen a migrated `CAREER_COMPLETE` alumnus.

Programs resolve in canonical stable-ID order. Each consumes exactly three world draws: one weighted continuity/position-staff/scheme-shift result, one bounded departing-room relief value, and one bounded incoming-room pressure value. V1 stores aggregate room talent pressure rather than inventing named roster members. A scheme shift selects the program's content-authored alternative offense style; a program has at most one saved staff/scheme result in this projection.

The shortlist consumes exactly three career draws through stable-ID-ordered weighted selection without replacement and always excludes the current program. Stay plus those three destinations each persist projected rank/role, the destination rotation-policy snap range, all nine factor scores/weights/contributions, the rounded comparison score, information score, confidence tier, uncertainty points, and clamped minimum/maximum. Stay uses the saved final depth role, current relationships, and familiarity; transfer projections use the authored neutral relationship/familiarity values. Brand and saved Advisor Insight improve destination information, widening or narrowing uncertainty without changing hidden football odds.

### Deterministic commitment boundary

Commitment accepts only the exact saved Stay option or one of the three saved transfer options. It does not recompute the shortlist, selection score, uncertainty, or selected destination. A rejected or repeated decision returns the original session unchanged. A successful decision consumes no world RNG and exactly 35 career RNG draws to construct the committed eight-player destination room through the same canonical deterministic generator used for initial program commitment.

Stay applies the saved staff/style and aggregate room projection, retains Coach Trust through the authored staff-outcome rule, preserves the open program-history stint, and resets only relationship actors explicitly named by that outcome. Transfer changes current program, offense style, rotation, room, trust, relationship, and program-trait event context. It closes the prior zero-based program-history stint and opens the destination at the next season index, resets the three destination relationship tracks to neutral, and applies an evidenced destination-baseline-plus-retained-trust equation.

Recruiting origin, player identity and visual appearance, skills and breakthrough state, injuries, academics/NIL state, cumulative games, and completed-season evidence remain intact. Strict validation binds the chosen option, program context, trust/relationship equations, program history, room evaluation and projection, and exact draw range so JSON reload cannot reinterpret the commitment.

### Current-program authority

Recruiting selection is permanent origin/history evidence, never current membership after a transfer. One domain-owned selector returns current WR membership from `career.programId` and current QB/RB/CB membership from `lifecycle.currentProgramId`. Team, depth, coach, active schedule, record, standings, opponent, event context, and Game Day surfaces must resolve through that selector and agree with the active room/world context. Transfer, reload, snapshot recovery, and offline resume must not fall back to the recruiting-origin program.

### Next-season bootstrap boundary

An explicit zero-RNG command starts season two only after a valid decision. It archives the completed calendar under the prior player program, activates a distinct calendar under the selected current program, advances the fictional academic term, resets current-season ledgers, and preserves cumulative career/season-one evidence. Both Stay and transfer must then traverse the ordinary camp and scheduled Game Day commands; the chosen destination owns the detailed matchup, room, role, and event context. Decision-time trust, relationship, and role evidence remains immutable history while live values may evolve once weekly play resumes.

### M7 four-position staged boundary

A neutral migrated v1 save already paused at `OFFSEASON_DECISION` retains its literal saved shortlist and original transition, even though it has no current review archive. The current owning commitment command may bridge only that exact v1-valid state by removing the migration-only Game Day tag and empty fourth slot, applying the original selected-option command and migrating its result without extra draws. An occupied fourth slot, current clock/training/history or other current-only evidence cannot be discarded to enter this bridge. Historical second-season terminal/meta behavior remains literal; newly played current careers use the separate retirement command and never invent a third program or season. The UI must distinguish the legacy saved-decision confirmation from a new-current return/transfer offer.

The current first-season Stay/transfer command retains the exact reviewed season in a bounded lossless archive and binds its chosen program, clock, injury carryover and 32 projected world profiles to replay. It reuses the lifecycle trust/relationship equations and the returning 35-draw room generator. The returning room's baseline mean 68 receives saved incoming-minus-departing pressure (clamped 0–100); spread 9 and returning readiness remain unchanged. Season-two world and detailed matchup inputs use the saved projected profiles and continue from the saved world-offseason RNG with zero bootstrap draws. The original v1 seed-reset/room history stays literal.

Current season two starts at career-week offset 14. Academic history/restrictions carry to term two without additional checkpoint definitions; NIL state remains intact with a fresh empty planning list; injury duration receives only the last recorded recovery credit, not invented offseason healing. Skills, appearance, proficiency, events, completed season/world history and program stints persist. The first current week must match the replayed commitment source, while planning may legitimately change equipped slots or record NIL actions. This first-to-second-season command is not yet current career-completion or live browser activation.

Current direct-play review freezes the actual four-slot build, regular/postseason statistics, bracket finish, and recorded injury occurrences/unavailable weeks. It preserves complete weekly and snap evidence and archives the completed world. Its small version-tagged review record saves pre-shortlist career RNG and the canonical 32-program staff/room projection; the summary and exact Stay-plus-three shortlist stay in the lifecycle ledger. Repeated review is rejected. Strict parsing reconstructs and verifies the pre-review boundary before re-deriving these fields. Historical v1 summaries and choices remain literal.

The 32-program lifecycle projection sorts candidate programs by stable ID and consumes exactly three career draws for three unique destinations beside Stay. Each option records position rating, incoming-versus-departing room pressure, staff continuity, relationship and familiarity inputs, projected rank/role, and a comparison score. Reordering the supplied world projection cannot reroll the shortlist.

Stay and transfer are explicit commands over those saved options. Stay keeps the open program stint and applies tuneable trust retention; transfer closes the prior zero-based stint, opens the destination at the next season index, resets its three relationships to neutral, and applies a bounded baseline-plus-retained-trust equation. Both paths reset opponent Preparation to neutral and preserve identity, appearance, completed season/stat/injury/skill evidence. Position-room generation and browser publication are composed by the step-11 public command rather than invented inside this staged lifecycle module.
