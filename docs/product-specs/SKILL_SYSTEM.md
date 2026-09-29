# Skill Card System

## Purpose

Skill cards are the game's headline build system. A run should be memorable partly because of the cards acquired and how they changed weekly choices.

## Grades

- C
- B
- A
- S

Grade is rarity/power budget, not a guarantee of strict dominance.

## Families

- **Development** — training, practice, learning, progression
- **Role/Coach** — assignment reliability, package eligibility, Coach Trust, depth competition
- **Game Day** — key snaps, situational performance, information
- **Body** — fatigue, recovery, injury risk, workload
- **Mindset** — confidence, pressure, rivalry, composure
- **Life** — academics, relationships, campus, NIL/brand

## Equipped slots

Default: **4**.

A fifth slot may be a rare late-career/legacy possibility, not assumed in the vertical slice.

## Acquisition

A **Breakthrough** offers three eligible cards; select one.

Acquisition is driven by a visible **Breakthrough Gauge**. Meaningful progress—development thresholds, role/coach achievements, game-day execution, mindset recovery, body-management feats, and life/event decisions—adds deterministic gauge evidence. Crossing a threshold prepares an anticipated choose-one reward at the next safe phase boundary; routine repetition alone must not feel like a passive random card drip.

Eligibility/weight can depend on:

- position;
- archetype;
- current tags;
- recent training/activity tags;
- career phase;
- program traits;
- legacy unlocks;
- rarity/pity configuration.

Same seed + same state + same acquisition history must produce the same offer.

The M2 completed-week cadence after weeks 1, 5, 9, 13, and so on is a legacy scaffold only. Current-v4 careers use the gauge model without changing existing acquisition records or pending legacy offers. The target pace is approximately 4–6 meaningful drafts per season, tuned from checked-in deterministic simulations rather than hard-wired calendar drip.

### Current gauge contract

- threshold: 100 points;
- maximum contribution from one completed week: 60 points;
- persisted evidence: model ID, week, before/earned/after points, threshold, trigger flag, and ordered nonzero sources;
- live completed-week sources in canonical order: Development, Role/Coach, Game Day, Mindset, Body management, and Life;
- Game Day awards 6 points for truthful zero-offense participation or a bounded 4–24 points from the saved grade band plus role-scaled opportunities;
- offer affinity: each source contributes `ceil(points / 4)` subtle affinity units to matching authored cards;
- crossing the threshold subtracts 100 and saves the exact evidence on the offer; if three legal cards are unavailable, progress banks without an RNG draw.

The checked M3.5 ecology report runs three fixed strategies for 13 weeks with exact serialization after every transition. Development/Body, Role/Preparation, and balanced Life/Mindset earn 6, 5, and 4 drafts at different weeks. The report records source totals, acquired families, applied effects, equipped game/life hooks, state outcomes, depth outcomes, and round-trip counts.

The exact three-card offer and RNG draw range are persisted before the player chooses. Selection consumes no additional RNG, records the acquisition, fills only the first open equipped slot, and returns to the relevant flow. A full loadout is never replaced automatically.

The six-source calculation is shared through explicit completed-week focus, depth, and football evidence. The historical WR entry point maps its existing evidence into this pure helper without changing numbers or report bytes. Current added-position settlement uses the same calculation rather than fabricate a WR career or retain the average-practice/game-grade scaffold.

The current added-position gauge/offer foundation maps real focus thresholds/resources, practice-only trust and rank movement, and completed football into shared sources. Its common five-band gauge mapping uses the existing QB cutoffs 40/55/70/85, translating shaky/steady to the shared developing/solid source bands without changing game grades or historical results. Zero opportunities still contribute exactly six points before the overall source cap.

Current-only offer metadata covers every original QB/RB/CB card, preserves position/family/grade identity, and uses conservative base weights C=100, B=70, A=40, S=15. A matching family source adds four weight units per `ceil(source points / 4)` affinity unit. Eligible unowned IDs sort canonically before the shared weighted-without-replacement sampler; fewer than three available cards return no offer and consume no RNG. These are tuneable first-pass weights, not a guarantee that rare grades are stronger.

Current settlement saves the exact gauge, trigger, candidate weights, three offered IDs, and before/after career RNG in weekly history. Its bounded source retains actual gauge-before and owned IDs. Subsequent sources and final skill state must follow that record and the selected card's acquisition week; slot changes remain independent. The threshold is spent when a current offer is prepared, never again when selecting it. A saved migrated v1 offer keeps the literal historical selection behavior. Normal exhausted-pool banking caps at 100, but an older migrated surplus up to 160 is preserved until spent; migration itself changes neither progress nor offers. World RNG never enters this path. The live browser remains v1 until the complete direct-game activation gate.

Loadout edits are explicit planning-phase commands. The initial vertical slice stores exactly four dense nullable slots; clearing or replacing a slot autosaves and never changes ownership.

## Draft philosophy

A player's behavior should subtly shape the pool:

- weight-room behavior increases weight/strength-development card weight;
- film-heavy behavior increases knowledge/read card weight;
- recovery-heavy behavior increases body/recovery card weight.
- reliable role/coach behavior increases assignment, package, and trust card weight.
- game, mindset, and life milestones can qualify their corresponding families.

Do not make the result deterministic; keep meaningful surprise.

## Card quality rule

Good:

> `Gym Rat A` — weight training XP ×1.20; weight-training Body cost ×0.90.

Good:

> `Film Junkie S` — film study learning improved; once per game reveal an additional coverage clue on an eligible key snap.

Good:

> `Training Maniac S` — major training boost at low Body, but increased injury risk.

Weak design:

> `Power +3` with no interaction.

Flat modifiers can exist but should not dominate the set.

Across the catalog, builds must be able to alter development efficiency, role/package access, Coach Trust, game-day decisions or information, Preparation, Confidence, Body, academics/NIL, and event choices. A family label without a live decision or system consequence does not satisfy this rule.

## Tradeoffs

High-grade cards may have:

- narrower conditions;
- risks;
- opportunity costs;
- build dependencies.

This preserves useful C/B cards.

## Duplicates — v1 decision

During the vertical slice, do **not** offer a card already owned by that career unless a specific card explicitly supports upgrades. This keeps the first implementation understandable.

Future duplicate/mastery mechanics require an ADR/spec change.

## Monetization

No real-money skill pulls are part of the current design. Randomized cards are earned gameplay rewards.

## Legacy interaction

Legacy progression may:

- unlock cards into future eligible pools;
- slightly alter offer information/choice count in bounded ways;
- enable alumni-themed cards/events.

Legacy should not guarantee S cards or erase early-run uncertainty.

## Vertical-slice content target

Approximately 40 polished WR-compatible cards for the first complete WR season:

- 8 Development
- 7 Role/Coach
- 10 Game Day
- 5 Body
- 6 Mindset
- 4 Life

Include multiple viable build directions and at least 8 meaningful tradeoff cards.

M2 shipped the first 18 validated WR cards across the original five families, including nine mechanically inferred tradeoffs. M3.5 retained those IDs/mechanics and expanded the catalog to 27 cards. M5 now completes the target at exactly 40 original bilingual cards: 8 Development, 7 Role/Coach, 10 Game Day, 5 Body, 6 Mindset, and 4 Life, with 13 validated tradeoffs. The 13 additive cards preserve every prior ID/effect and add differentiated training/proficiency, information, assignment/package, contested-catch, pressure, YAC/risk, recovery, Confidence, and injury-risk consequences. Campus Bridge's event-access hook derives a live exclusive-event context tag; M6 also gives the equipped card a 1.20 positive relationship-gain multiplier while leaving conflict unchanged, and its existing 1.10 positive NIL-reward hook now executes in the acceptance command with saved evidence. Discrete benefits and adverse effects are not multiplied. The historical M3.5 report uses its frozen pre-M6 effect projection, so completed evidence remains byte-stable. Every card is reachable through the seeded offer pool, and focused tests demonstrate distinct Development, Game Day, and Body builds rather than a universal best card.

M7 stages twelve original QB cards across all six build families. Their live effects reveal assignment clues, change family/decision execution, add an explicit aggression-versus-turnover tradeoff, improve scramble value, reduce Game Day Body or Confidence loss, accelerate attribute XP, affect grade/Coach Trust, unlock cooperative event choices, or amplify only positive event consequences. Each effect is consumed and tested by a browser-independent resolver before the QB path may enter saves or UI.

M7 also stages twelve original RB cards across all six families. They change Vision clues, landmark patience, cutback explosion and fumble exposure, secure-ball risk, protection reliability, accumulated contact Body cost, Confidence loss, game XP, grade/role value, and event choice/reward behavior. The One Cut card deliberately improves explosive opportunity while increasing ball risk; it is not a flat-stat upgrade.

The twelve staged CB cards cover all six families and alter coverage clues, leverage execution, undercut completion/takeaway risk, catch-point takeaways, tackle reliability, boundary force, Body, Confidence, XP, grade, and event choices. Route Thief explicitly trades a larger takeaway window for greater completion exposure, preserving a meaningful build decision.

### M7 current weekly supplements

Current v2 keeps those existing card IDs and game/event effects, then adds a separate content-owned supplement catalog. Seven authored supplement types per position have paired Korean/English descriptions; the historical v1 UI keeps its literal descriptions until v2 activation.

- Film/development C: Film Study gains +3 Preparation.
- Repetition/development A: from the second occurrence of the same training focus in a week, XP ×1.25 and Body cost ×1.10. Recovery and Study Hall do not fabricate XP.
- Body C: training Body cost ×0.90 and weekly passive Body recovery +2.
- Mindset B: Recovery gains +2 extra Confidence when pre-action Body is at most 60.
- Role/Coach A: each training focus gains +2 practice impact when the plan contains at least two distinct focuses; this affects the existing Practice Grade/depth path, never a direct rank grant.
- Cooperative Life B: Study Hall gains +100 milli-GPA; the authored positive relationship multiplier is ×1.20.
- Spotlight Life S: the authored positive numeric NIL acceptance multiplier is ×1.10, excluding discrete benefits and adverse/obligation effects.

Focus, passive-recovery, positive relationship, and NIL reward ports use ordered slot/effect evidence and shared bounded arithmetic. Relationship gains scale each actor's net positive weekly total once; conflict is not amplified. Current preparation/history bind the multiplier and resulting tracks to the focus-time loadout, with no second trust award at settlement. NIL acceptance binds its reward to a saved action-time four-slot snapshot; later planning swaps remain available without retroactive reward changes. Snapshot cards require dated ownership. The owning command validates ownership; a tagged four-slot effect input passes only actual equipped IDs, without manufacturing WR acquisition records. Original Game Day/event behavior and historical reports remain unchanged. Current six-source gauge/affinity integration remains a separate requirement before browser v2 activation.
