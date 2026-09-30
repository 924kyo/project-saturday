# NIL and Off-field Life

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Current added-position calendar and program coverage

Current QB/RB/CB offer cutoff and obligation feasibility use the local regular-season round, not career-week modulo. Stored offers, expiry, actions and cooldowns retain absolute career dates: migrated season two begins at offset 12, while a new season after both current bracket slots begins at offset 14. Both postseason slots are zero-offer-draw cutoff weeks. Historical WR dates and timing remain unchanged.

Every one of the 32 current transfer destinations must have NIL strength-band context. Preserve the original twelve authored bands. The twenty added programs map aggregate peak to national, contender to contender, and competitive/building to builder. This content-owned conservative exposure mapping does not change world ratings or authored offer thresholds.

## Separation of concerns

Personal interaction is broader than NIL.

### NIL / Brand

- sponsorship offers;
- agent/advisor interactions;
- promotional appearances;
- public/social visibility;
- money/benefits in the fictional economy;
- time/body/reputation tradeoffs.

### Team Relations

- head coach;
- coordinator;
- position coach;
- teammates;
- direct depth competitors;
- locker-room dynamics.

### Campus / Academics

- GPA;
- study hall;
- academic-risk events;
- friends/social life;
- contextual campus events.

### Media / Reputation

- interviews;
- local/national attention;
- controversy;
- award/draft narratives.

## UI principle

Do **not** expose four mandatory management dashboards. Most interaction arrives through weekly actions, contextual events, or concise status indicators.

## NIL gameplay

NIL offers have:

- requirements (Brand, role, program market, achievements, personality, etc.);
- reward;
- obligation/time cost;
- possible body/academic/reputation effects;
- duration/expiration.

Avoid `money directly buys +10 Speed`. Spending can support recovery, training access, lifestyle/cosmetic options, or advisors without trivializing development.

## Academics

Use a simplified fictional eligibility model rather than attempting to reproduce every real-world rule. The player should understand academic risk without needing a rulebook.

### Current M6 contract

The first version uses three persisted status IDs—eligible, warning, and ineligible—and two term checkpoints. Content owns the tuneable GPA thresholds and any short Game Day restriction; saved command evidence must show the GPA, threshold, obligation contribution, prior/result status, and restriction before the player advances. Presentation must identify this as a fictional in-world model.

After the first offseason decision, season-two bootstrap advances the active academic term to the exact saved next-term index without discarding checkpoint or restriction history. Relationships and NIL state carry forward unchanged at that boundary; only later ordinary commands may evolve them. The M6 start-of-season slice does not invent additional second-term checkpoints beyond the two validated v1 definitions.

The relationship model is deliberately compact: position coach, teammate/room leader, and direct depth competitor. Each 0–100 track records a stable source ID and bounded before/requested/actual/after evidence. The three tracks have distinct, content-owned emphasis across Coach Trust, football information, and opportunity context; relationships inform those systems rather than replacing attributes, practice performance, or depth rules.

New committed active-season careers activate academics and relationships from the neutral v6 migration state during action planning without consuming RNG. Academic checkpoints resolve only at the exact authored completed-week boundary and persist the GPA plus obligation contribution, safe/warning threshold, prior/result status, and any one-game restriction. Missing, duplicate, or non-due resolutions reject without mutating the session.

Weekly relationship changes derive from completed ordinary football choices rather than a separate interaction chore. Film Study and Extra Practice build position-coach context, Hands/Catch Work builds the room-leader track, and Route Drills builds direct-competitor context; Extra Practice also adds a small competitor tension. Changes aggregate by canonical action then actor order and persist applied skill-hook evidence. The equipped Campus Bridge life skill multiplies positive relationship gains by 1.20 but never magnifies negative changes. Saved relationship standings project bounded Coach Trust, information, opportunity, and high/low event-context effects; they cannot directly set depth rank, role, or snaps.

The first NIL catalog contains exactly ten original bilingual templates, two in each of local-business, community, equipment-workshop, media-project, and regional-campaign categories. Every offer declares Brand/depth/GPA/program/tag requirements, weight, expiration, reward effects, and one bounded obligation with duration, focus cost, weekly tradeoff, and default consequence. At most one primary obligation may be active. The supported effect registry has no direct attribute-rating, depth-rank, role, or snap grant.

### Current NIL command contract

Selection and ordered effect arithmetic are shared pure game-core helpers. They operate on explicit validated eligibility context, NIL state, player state, relationship tracks, funds, and benefits—not a WR aggregate. Public commands retain all phase, catalog, ownership, hook, and due guards. Historical WR evidence and results remain unchanged. Current QB/RB/CB v2 commands now stage the ledger/phase integration described below; the browser remains on v1 until the complete direct-game activation gate.

- New active v6 careers own one pending-offer slot, one active-obligation slot, a bounded benefit ledger, fictional non-debt funds, the latest selection attempt, and immutable history.
- Selection occurs after a completed week during camp or the first nine regular-season rounds. The shipping cutoff leaves enough ordinary planning boundaries for every authored one-to-three-week obligation to close before offseason; postseason and the final three regular-season rounds consume no offer-selection RNG. Eligibility uses the saved Brand, depth rank, GPA, program-strength band, and canonical player/runtime tags. Previously offered IDs are excluded and eligible definitions sort by stable ID before one unbiased weighted integer sample.
- No eligible offer is a saved zero-draw outcome. A selected offer saves its complete context, canonical eligible IDs, total weight, roll, exact RNG draw range, offered week, and inclusive expiration week.
- Accept, decline, and expiration occur during planning and consume no RNG. Acceptance applies reward effects in authored order and creates the one active obligation; decline and expiration apply no hidden penalty.
- An equipped Campus Bridge applies 1.10 only to positive numeric acceptance rewards. Discrete benefit quantities, weekly tradeoffs, and defaults remain at their authored values. Hook and effect evidence persist across reload.
- Fulfill/default resolves in planning before football actions. The command saves the obligation's focus cost, remaining duration before/after, and every bounded effect. Fulfillment advances one obligation week; default closes the obligation immediately.
- Funds clamp to 0–1,000,000 fictional USD without debt. Benefit quantities clamp to each authored maximum. Sequential before/base/multiplier/requested/actual/after traces make every clamp auditable.
- The shipping completed-week adapter settles relationships and a due academic checkpoint before the contextual event, then attempts NIL only after the event and injury boundary. This preserves the existing fast loop while allowing saved weekly choices, relationship tags, event outcomes, Brand, GPA, role, program band, and skills to affect the same canonical offer context.
- One pure `off_field_week_projection_v1` exposes academic thresholds/next checkpoint/restriction, relationship football effects, pending-offer rewards/expiration/obligation costs, funds/Brand, and any active required resolution. It returns stable IDs and mechanics only; Korean and English presentation continue to resolve through the paired content keys.
- An active obligation blocks ordinary football action commitment until fulfillment/default has saved its one- or two-focus demand and effects. That focus value is mandatory off-field attention in v1, not a silent reduction of the existing three discretionary football choices.
- A saved academic restriction composes with injury availability at Game Preview, sets the next game's offensive-opportunity maximum to zero, and is consumed once with game ID/week/before/after history. It does not fabricate targets or stats; the existing zero-opportunity participation feedback remains authoritative.

## Transfer

Transfer decisions become most important in offseason/role crises and compare:

- projected depth/role;
- scheme fit;
- program prestige;
- development;
- NIL opportunity;
- championship outlook;
- existing relationships/familiarity.

Transfer is a major career branch, not a routine weekly menu action.

## M7 four-position lifecycle contract

Current planning presentation reads a pure available-command projection: it exposes the exact current NIL-adjusted state and previews only commands accepted at that saved boundary. Previews retain acceptance skill multipliers, real clamping, funds/benefits, relationships, remaining duration and expiry guards through the owning command. They consume no RNG, publish no revision and do not commit base player state. Never display stale week-start values as the post-NIL state or rebuild reward arithmetic in React.

Current v2 NIL attempts occur after the resolved contextual event and injury boundary. They use prepared player state, current role/program band, canonical identity/relationship tags, and prior completed football context. Each saves selected/empty/blocked/cutoff evidence and its exact career-RNG range; world RNG never participates. Migration remains neutral, with no invented ledger, reward, offer, or history. Existing authored offer/obligation IDs, effects, and inclusive expiration remain unchanged.

In the regular-only added-position clock, offers are attempted in rounds 0–8, and an individual template also requires `round + expirationWeeks + durationWeeks <= 12`. This ensures that acceptance on its inclusive expiry can finish before offseason without shortened durations or forced default. Pending offers and active obligations block new selection; blocked, cutoff, and empty-pool attempts consume zero offer draws. Historical WR timing remains literal.

Planning commands persist accept/decline/expiry/fulfill/default actions and the resulting NIL ledger without changing base week-start player/relationship state. A pure projection replays their authored effects before the three focuses; ordinary once-only settlement commits those player changes. Obligations block focus commitment until fulfillment/default, retain their explicit mandatory-attention cost, and contribute their actual GPA delta to the due academic evidence. Funds, benefits, relationship changes, expiry, and remaining duration remain inspectable and reload-stable. UI activation must display the projected state, not stale base values.

Current cooperative/spotlight supplements apply positive relationship/NIL multipliers with paired descriptions reserved for the v2 UI. NIL acceptance snapshots the actual four-slot loadout alongside the planning action and applies the shared 1.10 positive numeric reward multiplier. Discrete benefits, losses, fulfillment, and default effects retain authored values. The player may still change slots before focus commitment: replay uses each NIL action's snapshot, not today's equipped cards, so late equip/unequip never changes an accepted reward. Aggregate validation binds snapshot cards to owned skills acquired by that action's career week. Existing WR Campus Bridge behavior remains unchanged.

Current preparation collects relationship hooks from the actual focus-time four-slot loadout. The cooperative supplement multiplies each actor's net positive weekly gain by 1.20, rounded upward after aggregating that actor's actions; zero and negative totals remain literal. Tracks clamp to 0–100. Preparation and current weekly history save the ordered slot/effect trace and bounded multiplier. Replay derives them from the saved loadout, rechecks the resulting tracks, and commits pregame trust only once. Historical v1 relationship evidence retains its exact shape and baseline behavior. The shared positive-life multiplier helper preserves WR's 1.00–1.50 stacking bounds and consumes no RNG.

The current added-position alpha has a regular-season clock without WR's camp weeks. Its existing academic checkpoint IDs use regular-season indices 5 and 11 in season one, with the unchanged 2300/2000 milli-GPA thresholds and one-game restriction. A neutral migration does not invent academic history. First current activation starts from the saved GPA and skips dates already completed; it does not retroactively assess them. A due checkpoint resolves from the completed focus GPA after relationships and persists an academic review before event/injury/Game Day. A restriction composes with injury and role limits, permits only truthful zero-opportunity feedback, and is consumed once with that game's identity. Season-two carryover does not invent additional checkpoint definitions.

Current added-position preparation resolves the position-owned relationship track changes after practice/depth evidence and applies their bounded Coach Trust modifier before the same week's injury assessment and football. Film Study retains its common +3 position-coach context. Saved preparation records trust before/requested/actual/after; post-game settlement commits the tracks but must not add the modifier again or cause a second depth evaluation. Historical v1 commands keep their literal post-game behavior. Information/opportunity effects, academics, events, and NIL remain required parts of the coherent pregame activation; the trust checkpoint alone is not a complete off-field system.

Current QB/RB/CB snap engines also consume the relationship information score directly, bounded to -6 through +6 by the existing track formula, before their ordinary clue thresholds. They retain this named contribution separately from actual Preparation, skill clue bonuses, and event clue bonuses. Presentation cannot reveal additional hidden evidence or roll information RNG. Historical inputs omit the field and retain their exact result shape. Current opportunity context now projects a bounded one-snap shift within the saved role band as defined in `GAME_SIMULATION.md`; injury workload uses that same projection and availability can lower its result. It cannot directly grant a depth rank or exceed the role/availability cap.

QB, RB, WR, and CB retain the same compact position-coach, room-leader, and direct-competitor concepts, but each position owns the weekly football-focus deltas that move them. The resulting bounded tracks expose Coach Trust, information, and opportunity context without assigning rank or snaps directly.

A pure eligibility projection emits stable position, role, performance, and high/low relationship tags alongside Brand, fictional GPA, and canonical position-stat total. Position event resolvers and the NIL adapter consume this one evidence boundary, so an athlete's football role and relationships can affect eligibility without UI-owned rules. No new offer or event copy is introduced by this mechanics-only checkpoint; live selection remains behind the step-11 public command.
