# UX and Flow

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Primary platform

Mobile portrait PWA first. Desktop browser is supported.

Added-position current careers use the same five-purpose contract: Home, Week, Team, Skills and Player. Purpose changes are read-only. Week prioritizes the actual saved Game Day phase, then unresolved skill/event decisions, then available core-projected planning or season commands. Team uses current membership and saved named-room comparison factors; Player includes shared physical/mental and position attributes, original identity and literal season game history. Historical fields absent from the saved contract are omitted, never reconstructed in presentation. Failed saves block commands but preserve read-only navigation and exact retry.

## Home/week screen

The player should quickly understand:

- current week/opponent;
- depth rank and projected role/snaps;
- Body;
- Preparation;
- Confidence;
- Coach Trust;
- GPA risk/status;
- Brand when relevant;
- remaining weekly actions;
- the next meaningful action.

For added-position current careers, Home and Week select season/week and the player's fixture through the shared core calendar/fixture lookup before focus commitment. Opponent and venue remain identical through Game Day; rounds without a player fixture say so. Review/completion phases do not fabricate a new week or opponent. During an in-flight week, Home labels the athlete's last-settled state and directs the player to Week for saved preparation and live consequences.

Avoid showing every backend statistic at once.

Home is a concise career dashboard and next-action launcher, not the container for every feature. It includes the persistent athlete portrait, the three short-horizon football states, role/opponent context, and the next meaningful command.

## Interaction rules

- One primary decision per screen/modal.
- Avoid confirmation prompts for reversible routine actions.
- After an action, show concise consequence summary and return to the main flow quickly.
- Important changes (depth promotion, starter role, injury, major award, S card) deserve stronger presentation.
- Detail views are optional; the main flow stays clean.

### M2 skill flow

- A persisted Breakthrough is its own choose-one phase; weekly planning is not shown until the selection has been saved.
- The four-slot loadout and owned inventory live in a collapsed detail surface. Loadout changes are available only during action planning and autosave as one authoritative command each.
- Weekly action cards label catalog Body/GPA figures as base changes before equipped skills. Resolved consequences show authoritative applied skill traces; the UI must not imply that a base value is a fully contextual forecast.
- Week advance previews core-derived passive Body recovery and the following phase retains the exact applied recovery evidence across save/reload.

### M3 program and depth flow

- A new career opens one five-offer program decision before weekly planning. Each offer shows prestige, player development, academics, NIL strength, Scheme Fit, projected depth path, and program traits using persisted evidence plus validated content.
- The chosen program and generated WR room are not shown until the commitment save succeeds. A failed write keeps the same offer selected, locks conflicting input, and retries the exact career payload.
- Once enrolled, the compact home status shows the program, WR rank, role, projected snap range, Coach Trust, and Practice Form. The ordered eight-player WR room is a collapsed optional detail, not a permanent table.
- Authored Practice Form impact is visible with weekly action base information. Week end prominently explains the persisted promoted/demoted/held result, weekly practice score, form/trust changes, and updated snap range.
- A migrated pre-program planning save uses one save-aware offer handoff. Migrated in-flight action or breakthrough phases finish before recruiting replaces the planning decision.

### M4 Game Day flow

- A committed Week End opens one saved game preview before kickoff. It shows opponent/venue, earned role and opportunity budget, Body, Preparation, Confidence, and whether Film Study applies without exposing hidden resolution formulas.
- Game Day publishes one persisted key snap at a time. The compact score, clock, down/distance, pattern, information tier, and revealed clues frame exactly three athlete-level receiver techniques; play-calling and team control remain simulated.
- Preview, game start, every decision result, post-game, and next-week state publish only after the authoritative save succeeds. A failed write keeps the prior surface visible and disables conflicting commands until exact retry or reload.
- Post-game leads with result, score, opportunity-normalized grade, truthful role participation, receiving line, Body/Confidence/Coach Trust movement, attribute XP, and career record. The exact key-play log remains collapsed secondary evidence.
- Passive Body recovery and Preparation rollover are previewed only after the saved post-game result, immediately before the player finishes review and advances the week.

## Information hierarchy

Internal values can be precise decimals. Primary UI can use readable labels/bars and rounded numbers. Exact detail may be available via info panels.

## Navigation concept

The M3.5 mobile shell has five purpose-based primary destinations:

- Home
- Week
- Team
- Skills
- Player

Home summarizes current context and points to the next command. Week owns the three focus choices, action results, events, practice review, game flow, and week transition. Team owns program identity, depth explanation, competitor context, role, and snap projection. Skills owns Breakthrough Gauge, offers, loadout, and inventory. Player owns the persistent portrait, identity, attributes, XP, proficiency, and appearance detail.

Week presents Body, Preparation, and Confidence together before planning. Every focus card previews its base changes, each resolved result shows authoritative before/after consequences, and week end exposes the persisted Practice Grade factor breakdown plus next-week Preparation carryover. These screens call or format core projections; they do not duplicate weekly formulas.

Team leads with the projected participation range, role, and WR rank. A short causal chain connects focus/readiness to Practice Grade, Practice Form/Coach Trust, the five saved depth factors, and the rotation-owned snap range. The adjacent relevant WR is compared with qualitative direction labels rather than a decimal composite score, followed by one or two suggestions selected from saved contribution gaps. The complete room remains optional detail.

Navigation never changes or infers the authoritative phase. If a required decision is pending, destinations may inspect other information but the primary action returns to the phase-owned surface. Future League and Career/Legacy destinations may be added when their systems exist.

### M5 season flow

Home and Week share a compact projection of the saved season: camp/regular/postseason stage, schedule progress, program record and rank, next opponent, current availability, latest explainable injury risk, and an optional top-four standings detail. It reads `CareerSessionV5`; React does not recompute fixtures, standings, risk, or eligibility.

Week owns each phase-required season command. A saved event presents its original bilingual context, two choices, and exact supported consequences. A saved limited-injury decision presents the fictional outcome, opportunity cap, and rest/rehab versus limited-play consequences. Pending season bootstrap, postseason initialization, postseason completion, season review, and career completion each receive one explicit primary action. Required decisions hide ordinary weekly planning until resolved, while purpose navigation continues to expose read-only context.

Season review combines the persistent athlete portrait with saved outcome, record, rank, games, grade, receiving production, final role, injury history, and best game. Career completion is published only after the final session and meta profile save together; the resulting surface shows alumni history and states the bounded legacy rule. “Start another career” returns to Creation, where the latest alumnus and completed-career count remain visible while the new athlete still starts without inherited ratings, skills, trust, role, or snaps.

### M6 off-field and offseason flow

M6 does not add separate NIL, academics, relationship, or Career dashboards. Home adds a concise saved academic/relationship/NIL strip; Team expands the three relationships into their bounded Coach Trust, transfer-information, and opportunity-snap context; Week owns pending offers and due obligations beside the existing event/action/game flow. The academic surface states that its eligibility thresholds are a fictional in-world model, and NIL funds are labeled fictional USD.

A pending offer shows the immediate reward, obligation description and duration, mandatory attention value, weekly effects, default effects, and inclusive expiration before accept/decline. It may remain open while the player plans. A due active obligation replaces ordinary weekly planning until fulfill/default is saved, but it does not silently reduce the existing three discretionary football actions. Offer and obligation transitions publish only after save; failure keeps the prior choice authoritative and locked for exact retry.

For a newly activated v6 career, Season Review first retains the saved portrait and completed-season summary, then explicitly builds the deterministic offseason board. Stay plus three transfers show program, projected rank/role/snap range, bounded outlook range, information confidence, staff/scheme result, and all nine projection factors. Choosing one option publishes its actual saved role/rank/snap/trust result; a second explicit command returns to the ordinary season-two Week flow. Migrated completed M5 careers retain their alumni-completion surface and are never reopened.

## Accessibility

- touch targets around 44 px minimum when practical;
- reduced motion support;
- high readable contrast;
- semantic controls;
- keyboard usability on desktop;
- visible keyboard focus through `:focus-visible`, without persistent yellow outlines after ordinary pointer clicks;
- avoid color-only state communication;
- localized text must not be clipped at supported viewport sizes.

## Visual identity

Avoid cloning another game's card layout or navigation. Build an original broadcast/campus/locker-room visual language suited to American college football.

## Contextual onboarding and help

The first visit to Creation, Week, Team, and Skills presents one concise bilingual explanation of purpose and actual consequences. Tutorials are skippable, persist completion per system, and can be replayed from Help. They point to live UI concepts rather than teaching invented controls or generic sports trivia.

Guides are non-modal contextual regions, never a global blocking sequence. The first implementation uses four stable topics—Creation, Week, Team, and Skills. A player can acknowledge the current topic or skip all guides. Help & settings keeps the same four explanations available for review and can reset one topic for its next contextual visit or reset all topics. Keyboard access, 44 px targets, 320 px containment, and both supported locales are required for every guide and replay control.

M7 extends the shell with an initial QB / RB / WR / CB choice. WR continues through its exact established creation and five-purpose career surface. QB, RB, and CB creation simultaneously exposes position-owned archetypes, the complete 32-program fictional world, the shared background/personality tradeoffs, dimensions, and the same persistent graphical identity controls. Added-position Home explains the current Body / Preparation / Confidence and football consequence chain; Week owns focus, proficiency threshold, game approach, and atomic resolution; Team explains Coach Trust, depth rank, role, projected opportunities, and the adjacent room comparison; Player owns position attributes, exact XP-to-next-rating meters, season statistics, and participation evidence. All values come from the saved public-command aggregate rather than React-side rule reconstruction.
