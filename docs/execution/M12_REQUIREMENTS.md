# M12 Career Revision — Requirements Matrix

This matrix is the persistent record for the M12 revision. It is maintained throughout the work and is the definition of done: every row must reach **verified complete**, or **excluded** with the user's approval.

## Sources

| Key | Document | Role |
| --- | --- | --- |
| **SC** | The user's M12 scope prompt (2026-10-01), areas 1–10 | Delivery scope and completion standard |
| **RG** | `UPDATED_BUILD_REGRESSION_EN.md` (9 games, 44 decisions) | Latest evidence about the build; remaining issues |
| **PR** | `PLAYTEST_REPORT_EN.md` (65 games, 301 decisions) | Broad feedback and recommendations |
| **ID** | `INITIAL_DESIGN_EN.md` (Prompts 21–26) | Original intent; user goals separated from assistant proposals |

## Status vocabulary

| Status | Meaning |
| --- | --- |
| **not started** | No work yet |
| **in progress** | Work begun; acceptance not yet met |
| **verified complete** | Acceptance met, with the listed evidence (automated tests and/or direct UI observation) |
| **blocked** | Needs an external action; the exact blocker is named |
| **excluded (approval needed)** | Proposed for exclusion; awaiting the user's decision. Not done until approved |

Evidence key: **T** = automated test, **S** = simulation harness, **U** = direct UI observation in a real browser (EN/KO), **C** = code inspection.

## Conflicts and how they are resolved

| # | Conflict | Resolution |
| --- | --- | --- |
| K1 | The user wants earned-currency card draws and fusion (SC6). PR warns that random access to development cards adds a chance barrier and a grind loop. ID notes the cash-draw/fusion economy was never a settled original rule. | Build both, with safeguards. **Insight** is an earned development currency, separate from NIL money. The **Workshop** crafts any specific card at a fixed price, so essential cards are never luck-gated. A **Scouting Draw** is optional, shows its odds, and has a pity guarantee. **Fusion** consumes only duplicate copies, previews the result, and never consumes an equipped or unique card. There are no real-money purchases. |
| K2 | The user wants meaningful carryover (SC7). PR and ID favor story/cosmetic/mentor carryover over stat bonuses. | Carryover is mostly **options**: a mentor choice, unlocked backgrounds and starts, commemorative cosmetics and a Hall of Fame. Starting power is capped at **+3 allocation points** (stat caps unchanged). The first career is the baseline. |
| K3 | The user wants more development time (SC3). PR warns that more windows can become chores and inflate growth. | Three windows, each a single decision: **Preseason camp** (once a season), **Midseason review** (one optional commitment after week 6) and an **Offseason program** (once between seasons). There is no extra weekly click. Their XP replaces part of the in-season growth target (re-based by the harness), so total growth is not simply inflated. |
| K4 | "English-only names" appeared as a player suggestion. | It becomes an optional **name display** setting. Typed names are never changed, and the language does not determine nationality. |
| K5 | ID's five-year arc (redshirt, combine) vs the shipped four-year career. | ID says the durable goal is a multi-year role change plus a meaningful ending, not five years. A **Pro Combine** is added at the career end. The **redshirt/fifth year** is proposed for exclusion (row CAR-07). |
| K6 | Blanket freshman OVR increase vs growth pacing (PR). | No blanket increase. First-season milestones (skill points, tells, depth gaps, goals) become visible, and growth pacing is re-based by background **potential**, validated by the harness on novice, ordinary and optimized routes. |
| K7 | Background modifiers vs "no double counting" (SC1). | Each source has one job. Position and style shape the attribute distribution. The background shapes the **opportunity and development curve** (recruit standing, potential, story). Personality shapes **story choices and their costs**. Allocation is the player's own trade-off. The creation preview shows each contribution separately. |

## Matrix

Phases (see `docs/exec-plans/active/m12-career-revision.md`):

| Phase | Scope |
| --- | --- |
| 1 | Match feedback |
| 2 | Development calendar and explanations |
| 3 | Creation and identity |
| 4 | Schools and transfers |
| 5 | Roles and depth |
| 6 | Relationships and narrative |
| 7 | Cards, Insight and NIL economy |
| 8 | Legacy |
| 9 | UI and information architecture |
| 10 | Accessibility, compatibility and validation |

### 1. Player creation and identity

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CRE-01 | SC1; PR "Player creation" | Shape the athlete with a visible point budget and clear trade-offs | Attributes = position base + style + background + personality (C: `position-creation.ts`). No allocation | Allocation step: a budget, position-relevant attributes only, per-attribute caps, lowering an attribute refunds points, resettable, plus role presets (Recommended = valid default) | 3 | The core rejects an over-budget or out-of-cap allocation; the preview updates live; a preset can be confirmed untouched | T core validation; U creation EN/KO | verified complete (budget 10, +5/−3 caps, refund cap 6, ceiling 85, four presets; T m12-creation budget/preset tests; U EN/KO build step) |
| CRE-02 | SC1; PR "Explain OVR" | Know what OVR, potential, condition and situational modifiers each mean | OVR = position-weighted ability (C: `overallVNext`). Potential does not exist. Condition values have no explanation | Define **potential** (background growth curve). Show the OVR weights (top contributors) consistent with the real calculation. Separate condition (Body/Prep/Confidence) and situational modifiers (cards, events) | 2–3 | The explanation lists the actual weights used; the potential multiplier matches the XP applied | T weights equal `recruitingAbilityWeightsPermille`; U | verified complete (potential curve; OVR contributions = room weights and sum to overall for six positions, T; condition vs situational note; U Profile EN/KO) |
| CRE-03 | SC1; PR K7 | Background and personality have distinct, explainable roles with no double counting | Background and personality both add attribute deltas and tags (C) | Each source has one documented job (K7). Preview the contribution of each source separately | 3 | The creation preview itemizes sources; the core exposes the per-source breakdown | T breakdown sums to the result; U | verified complete (per-source breakdown sums to each rating, T; preview table Position/Style/Background/Traits/Yours; K7 jobs documented) |
| CRE-04 | SC1; PR personality | Background and personality matter after creation | Tags gate a few events; no visible consequences (PR) | Background: recruit standing, potential, unique story beats. Personality: story-beat access and choice costs (REL-05) | 3,6 | Two careers that differ only in background/personality get different beats or choices | S controlled comparison; T | in progress (background sets recruit standing and the potential curve, done in Phases 2–3; story beats and personality choice costs land in Phase 6) |
| CRE-05 | SC1; PR, ID §5 | Wide face, skin, hair and body variety | 4 faces, 6 skins, 6 hair styles, 4 hair colors, 3 bodies (C: `appearance.ts`) | Add hair colors (blond, auburn, gray, dyed), facial hair, more hair styles and body builds, rendered via painted art where present and drawn layers otherwise. Write an art spec for painted upgrades | 3 | Every option visibly changes the portrait and full-body preview | T catalog; U screenshots | blocked (external: user-supplied art) — options wired (4 new hair colors, facial hair none/stubble/mustache/goatee/beard; additive save key), T copy and no-ability tests pass; painted layers are listed in ASSET_LIST round 3 D–E and the user is making them |
| CRE-06 | SC1; PR "Body shape, gloves…" | Equipment (gloves, visor, footwear, jersey fit, sleeves, tape, towel) is visible | The painted bust hides gloves/visor/footwear (C: `AthletePortrait.tsx`) | A full-body figure preview in creation and an enlarged Profile view, showing every equipment option | 3 | Each equipment option changes the full-body figure | T render props; U | blocked (external: user-supplied art) — full-body figure wired in creation and enlarged on Profile with every equipment option as a layer; it appears once ASSET_LIST round 3 F art is delivered |
| CRE-07 | SC1; PR names | Varied, plausible suggested names; typed names preserved | 65 roster names; the suggestion can repeat (PR) | Larger, broader name pool; no repeat within the last N suggestions; typed names never altered | 3 | 50 suggestions contain no repeat within a window; a typed name survives a language switch | T | verified complete (suggestion pool ≥70 given and family names; no pair repeats in 60 suggestions and both names change each time, T names.test) |
| CRE-08 | SC1; K4 | Optional English-only name display | None | Settings: name display (localized / original). Typed names unaffected | 3 | The toggle changes only generated-name rendering | T; U | verified complete (Settings name display localized/original; only generated-name copy changes, T names.test; U) |
| CRE-09 | SC1; PR firm boundary | Nationality and appearance never affect ability or personality | Appearance is cosmetic (C) | Optional home region (narrative only). A test proves appearance and region never touch ratings | 3 | Ratings are identical across all appearance/region values | T | verified complete (optional home region, narrative only; ratings and offers identical across appearance and region, T) |
| CRE-10 | PR "Recommended alternative" | The creation preview compares role, strengths, weaknesses, expected role and training differences | Preview card only | A scouting report: strengths, weaknesses, expected first role band, development curve | 3 | The report text derives from the actual numbers | T; U | verified complete (scouting report: strengths, weaknesses, recruit score and offer target, expected first role from the real offers with the career's own seed, potential curve; T App journey; U EN/KO) |

### 2. Recruiting, schools and transfers

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REC-01 | SC2; PR recruiting | School quality and the reasons to choose it are clear | Rating pips, depth preview, tags (C/RG) | Offer comparison: last-season record, strength, competition ahead, projected role and path (when the starter graduates), scheme fit, development, exposure, academics, NIL market | 4 | Every fact comes from saved or derived data; forecasts are labeled | T derivation; U | not started |
| REC-02 | SC2; PR "Offers need genuine tradeoffs" | Schools differ in gameplay, not only description | Scheme fit is per archetype only; no program effects (C) | **Program profile** (generated): scheme, development tier, exposure tier, academic support, NIL market. These drive the depth scheme-fit component, the focus XP multiplier, brand gain, draft exposure, NIL offer chance and the study-hall effect | 4 | The same athlete at two programs gets measurably different XP, fit, brand and offers (harness) | S; T | not started |
| REC-03 | SC2 | Offer rationale and unmet requirements | "Why they call" reach/fit/role only for transfers (RG) | Each offer names its real reason (positional need, scheme fit, recent play, awards). A "not yet" school explains the unmet gap (recruit score or ability needed) | 4 | The rationale matches the generator's inputs | T | not started |
| REC-04 | SC2; PR transfers | Transfers have real consequences | Trust carried over, new room (C) | Transfer: relationships reset (rival, coach), scheme/development change, an adjustment week (prep penalty) and a "fresh start" story beat. Staying keeps trust and relationships, plus a loyalty beat | 4,6 | A harness transfer shows the consequences; stay vs transfer differ | S; T | not started |
| REC-05 | SC2; ID §8 | Progression toward better offers | Transfer band tracks ability only (C) | The offer target also weighs awards, role, recent grade and exposure. Explain "what would improve your offers" | 4 | A better season yields stronger offers in the harness | S | not started |
| REC-06 | RG strength pips a11y | Accessible names convey strength values | The accessible name lacks the pip values (RG) | aria-label "Strength 3 of 5" | 4 | The accessible name includes the value | T | not started |
| REC-07 | ID §8 proposal | Coaching changes reshape seasons | None | Offseason coordinator change (seeded) can shift the scheme; shown in the offseason preview | 4 | Change visible, affects scheme fit | T | not started |

### 3. Training, academics and progression

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEV-01 | SC3; PR "More development windows" | More development opportunity without chores | 3 focuses × 12 weeks (C) | Preseason camp (2 emphases, once a season) | 2 | Camp applies once a season, with a report; deterministic | T; U | verified complete (T m12-development camp; U EN camp screen and report) |
| DEV-02 | SC3 | Midseason checkpoint | None | Midseason review after week 6: a coach-assigned focus; following it for 3 weeks earns trust and XP | 2,6 | The commitment is tracked and the reward is applied only when met | T | verified complete (T met/missed/declined; U EN midseason review) |
| DEV-03 | SC3 | Offseason development | Offseason heals only (C) | Offseason program: choose one project (strength, speed, film, position clinic, academics) with costs | 2 | Applied once per offseason; shown in the season preview | T | verified complete (T strength program; U EN offseason picker with real XP/costs) |
| DEV-04 | SC3; PR "XP… distinct" | XP, readiness, coach evaluation, academics, fatigue, injury risk and breakthrough are distinct and understandable | Separate values; limited explanation (PR) | A Development guide panel: what each meter is, what moves it and its thresholds; contextual help in the week screen | 2,9 | Each meter has a definition sourced from the real rules | U; T copy keys | verified complete (U EN guide with live rule values; copy EN/KO) |
| DEV-05 | SC3; PR "risk legible" | Injury risk shows its causes | "Low/Elevated" label (PR) | A risk breakdown (Body deficit, workload, durability, training load, position, cards) computed by the core | 2 | The breakdown components sum to the risk | T | verified complete (T parts add up to the rolled risk; U KO disclosure) |
| DEV-06 | SC3 | Expected benefits, costs and thresholds before confirming | Gains and costs per focus; no XP-to-next (C) | Plan preview: projected XP per attribute, points that would tick over, next-point ETA, projected Body/risk | 2 | The preview equals the resolved result for the same plan | T | verified complete (T preview equals the planning command; U EN/KO preview panel) |
| DEV-07 | SC3; K6 | Growth pacing across four years | +3/+5/+5/+6 in one route (PR) | Potential curve by background; balance re-based on harness novice/ordinary/optimized routes | 2,10 | Harness: annual gains in the target bands; novice ≥ +12 over 4 years | S | in progress (calendar added, focus XP ×3 → ×2.6: harness 4.4 → 5.0 OVR/season; full novice/ordinary/optimized validation in Phase 10) |
| DEV-08 | PR academics | Academics have context | GPA checkpoints (C) | Exam weeks flagged ahead, with the risk explained; study effect tied to program academic support | 2,4 | Warning shown before a checkpoint when at risk | T; U | in progress (checkpoint warning exists; program academic support lands in Phase 4) |
| DEV-09 | PR "Growth guidance" | Actionable next milestones | Overall-help line only (C) | "Next milestones": next tell (prep/IQ needed), depth gap to the next rank, next skill point, the draft outlook's weakest factor | 2,5 | Values match the core calculations | T | verified complete (T tell math; U EN tell, next points, depth points incl. the move margin) |

### 4. Ratings, competition and playing opportunity

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ROLE-01 | SC4 | Attributes materially affect execution, and this is shown | Kernels weight attributes (C: `cb.ts` attributeScore × 350); not shown | The result shows the execution factors used (relevant attribute vs matchup) | 1,5 | Displayed values equal the kernel inputs | T | not started |
| ROLE-02 | SC4; PR "OVR vs strengths" | OVR relates to position strengths | The overall-help line exists (RG) | OVR component chart (weights × ratings) in Profile/creation | 3,9 | Matches `overallVNext` | T | not started |
| ROLE-03 | SC4; PR role security | Understandable depth changes; security and risk | Neighbor comparison; no security/risk state (C) | Role status: Secure / Contested / At risk, from score gaps and hysteresis, with a recovery path | 5 | The status agrees with the next-week movement rule | T | not started |
| ROLE-04 | SC4; PR demotion | Credible promotion and demotion | Demotion via hysteresis exists; unproven for the player (PR) | Harness and test: poor practice demotes; good practice promotes; trust buffers | 5 | Controlled sim shows demotion within N bad weeks | S; T | in progress (teammate trust now follows their practice; portal transfers; full role security in Phase 5) |
| ROLE-05 | SC4; PR "five snaps repetitive" | Role changes are felt in opportunities and gameplay | Snap counts by role band (C) | Role-aware scenes: starters get late/high-leverage moments; rotation and reserve get package/specialty moments. The pregame states the expected involvement | 5 | Scene mix differs by role (test); pregame text shows the band | T; U | not started |
| ROLE-06 | PR "promotion differs from grade" | A short explanation of why the role changed | Movement shown without a reason (PR) | The practice report names the deciding component (trust, form, talent, rival form) | 5 | Matches the adjacent explanation | T | not started |

### 5. Career narrative and relationships

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REL-01 | SC5; PR "small cast" | Persistent, identifiable people | Named roommates in the depth chart; coach trust and locker room as numbers (C) | Cast: a depth rival (stable roster ID), a position coach (named), a veteran leader/captain, a campus reporter; relationship values with history | 6 | Names persist across weeks and seasons; values change from choices | T | not started |
| REL-02 | SC5 | Consequential follow-up events | Events are mostly one-off (PR) | Story beats with memory flags and follow-ups (rival overtakes, you overtake, coach focus, interview, captain vote, mentoring a freshman, transfer farewell) | 6 | A later beat references an earlier choice; consequences apply to practice, trust, brand, NIL | T | not started |
| REL-03 | SC5; PR year arc | Changing stakes by class year | None explicit | Season goals by year (earn a role → key player → contender → senior legacy/team/pro), shown on the week screen and graded in the season review | 6 | Goals are evaluated from facts; legacy uses them | T; U | not started |
| REL-04 | SC5; PR media | Media/reputation affect opportunities | Brand number; Campus Radio reactions (PR) | Interviews after awards/defeats set a reputation tone that changes NIL offers and teammate responses | 6 | Tone affects the NIL pool/weights and later beats | T | not started |
| REL-05 | SC5; SC1 | Personality shapes choices | Traits are tags only | Personality enables or alters beats and choice costs (competitive → rivalry; social → teammate; disciplined → coach; …) | 6 | Controlled comparison differs | S | not started |
| REL-06 | SC5; PR "scheme fit as plays" | Tactical fit tied to identity and opportunities | Scheme fit shown as a comparison row (PR) | Scheme fit from the program scheme × style; explained with the plays and skills it favors | 4,6 | The explanation matches the computation | T | not started |
| REL-07 | PR CB1 rotation scene | Events fit the current role | Rotation contests filtered for starters (C) | Starter-specific alternatives (defend the spot / mentor the backup) | 1,6 | A test across all catalogs shows no rotation contest for a starter | T | not started |

### 6. Breakthrough cards, collection and NIL economy

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CARD-01 | SC6; PR attribution | Card contributions visible in planning, training and play | Effects described, not attributed (PR) | Per-card attribution: plan preview ("Rep Archive +38 XP, +2 Body cost"), practice report, snap ("+1 tell: Split Key") | 7 | Attribution equals the with/without difference | T | not started |
| CARD-02 | SC6 | Activation conditions, synergies, costs, actual bonus | Description only | Card detail: condition active/inactive for the current plan; costs. No invented synergies | 7 | Condition evaluation matches the resolver | T | not started |
| CARD-03 | SC6; RG P8 | Collection-end fully resolved | Last cards offered; complete holds the gauge at 50 (C) | Complete collection: the gauge converts to Insight; the state is explained; near-exhausted offers tested | 7 | Tests for 2, 1 and 0 remaining, plus save/load | T | not started |
| CARD-04 | SC6; K1 | Earned-currency acquisition | Only breakthrough offers | **Insight** currency (sources: gauge overflow, skipped offers, awards, duplicate refunds). **Workshop**: craft a specific card at a fixed price | 7 | Crafting is deterministic; no randomness on the essential path | T | not started |
| CARD-05 | SC6; K1 | Optional random draw with odds | None | **Scouting Draw**: Insight cost, odds disclosed, pity (A+ guaranteed within N), duplicates handled | 7 | Observed distribution matches the disclosed odds (seeded sim); pity holds | T; S | not started |
| CARD-06 | SC6; K1 | Upgrade and fusion | None | Card **mastery** levels 1–3 (effect +25%/+50%), bought with Insight or by fusing a duplicate, with a preview. Equipped/unique cards are never consumed | 7 | Before/after preview equals the applied effect | T | not started |
| CARD-07 | SC6 | Rarity and duplicate rules are understandable | Grades C/B/A/S (C) | Rarity legend, duplicate rule text, acquisition rules page | 7 | Copy present EN/KO | T keys; U | not started |
| CARD-08 | ID §4 proposal | Fifth "Senior" slot | 4 slots | Fifth slot unlocked in the senior season | 7 | Slot available only as a senior | T | not started |
| NIL-01 | SC6; PR NIL | NIL money has useful, balanced uses | Funds accumulate unused (PR) | **NIL shop**: fixed-price services (recovery session, film package, tutor, agent/visibility) and gear cosmetics; shows earned vs spendable vs obligations | 7 | Spend → effect applied → shown; balance never negative | T; U | not started |
| NIL-02 | PR "Appearance Style" | Earned style rewards are applicable | The Appearance Style benefit has no use (PR) | The style token unlocks a gear cosmetic of choice | 7 | Token consumed, gear unlocked and visible | T | not started |
| NIL-03 | SC6 | Obligations are balanced choices | Practice cost shown (C) | Before accepting: the total cost over the deal (weeks × focus cost), reward use preview | 7 | Preview equals the applied effects | T | not started |

### 7. Multi-career progression and legacy

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LEG-01 | SC7 | Completed careers earn visible rewards | Alumni Wall, Record Book, mentor scenes (C) | **Legacy points** per completed career from achievements (starter, awards, team, academics, relationships, draft, Hall of Fame), capped by category; claimed once per career ID | 8 | No double claim; points shown with reasons | T | not started |
| LEG-02 | SC7; K2 | Unlocks for later careers | None | Unlocks: mentor choice, legacy backgrounds/starts, commemorative gear, card-pool previews; capped head start (+3 allocation max) | 8 | Fresh career viable; bonus capped; tests | T; S | not started |
| LEG-03 | SC7 | Hall of Fame | None | Induction criteria; Hall of Fame in the Record Book | 8 | Deterministic induction from the plaque | T | not started |
| LEG-04 | SC7 | Explain what was earned, why, and the effect on the next athlete | None | Career-complete legacy summary; a creation "Legacy" step explaining each perk | 8 | Copy matches the applied effect | U; T | not started |
| LEG-05 | ID §10 | Former players reappear | Mentor cameo exists (C) | Keep; mentor choice ties to it | 8 | Chosen mentor appears in beats | T | not started |
| LEG-06 | SC10 | Carryover is verified end to end | Untested (PR) | E2E: finish a career → new career sees perks → applied | 10 | Playwright plus a harness flow | T; U | not started |

### 8. UI and information architecture

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI-01 | SC8; PR Team 2565px | Team is organized for tasks | One long stack (PR) | Sub-tabs: Depth / Schedule / Conference / National | 9 | Each task ≤ 2 interactions; keyboard tablist | T; U | not started |
| UI-02 | SC8; PR Profile 1980px | Profile is a summary plus detail | One long stack | Sub-tabs: Overview / Attributes / Stats / Cards / People | 9 | Same | T; U | not started |
| UI-03 | SC8; PR "change-first" | Week home shows what changed and what's next | Week screen stack (C) | "Since last week" summary (role, ratings, injuries, NIL costs, cards); warnings; next action | 9 | Summary derived from saved facts | T; U | not started |
| UI-04 | SC8; RG density | Compact post-game | Long page (RG) | Lead with result, why the grade, key moment, growth summary; details collapsed | 9 | Key info above the fold at 1366×768 | U | not started |
| UI-05 | PR Top 25 | National ranking title matches the content | "Top 25" shows the top 10 + your rank (PR) | Show the true Top 25 (collapsible) and your rank | 9 | 25 rows or a correct title | T | not started |
| UI-06 | SC8; PR Korean jargon | Terminology is plain | Jargon (PR) | Glossary and first-use explanations ("look = actual defensive shape"; down & distance) EN/KO | 9 | Glossary present; key terms linked | T; U | not started |
| UI-07 | SC8 | Development, cards and records views | Build tab; legacy panel | A Cards view with attribution and shop; a records view with Hall of Fame | 7–9 | Reachable in ≤ 2 interactions | U | not started |
| UI-08 | PR usability tasks | Find role and next competitor; next opponent; when Zone increases; what the new card changed | — | Validate each task in the UI | 10 | Each task observed in ≤ 2 interactions | U | not started |

### 9. Match logic, feedback and presentation

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MATCH-01 | RG P5 primary | A correct read with failed execution gets an honest, action-specific explanation | No explanation for correct strip/tackle misses (RG W4 S2, W6 S4, KO W5 S1) | Execution-failure explanations by family and action (strip, break down, drive boundary, play hands, …) | 1 | Every correct-read failure branch has a specific line, EN/KO | T branch coverage | verified complete (T m12-match-season branch + season tests; U EN result 'couldn't finish the tackle… 78%… Tackling 46') |
| MATCH-02 | RG P9 | Defensive recap credits successful plays | Turning point = 11-yard catch; PBUs omitted (RG W6) | Leverage-scored highlight selection (down, distance, quarter, score); positive defensive plays eligible for the lead and Defining plays | 1 | The RG W6 fixture picks a PBU; both PBUs in Defining plays | T fixture | verified complete (T m12-match W6 fixture; U post-game picks by leverage) |
| MATCH-03 | RG; PR #5 | Offense short-of-sticks and "worked" context | 3rd & 15 7-yard completion with no context; slide on 3rd & 14 "worked" (RG) | Short-of-sticks explanation for offense; "worked" only when the situation succeeded | 1 | Fixture lines | T | verified complete (T 3rd & 15 short, slide 3rd & 14 not a highlight) |
| MATCH-04 | SC9 | Decision quality, execution outcome and team result are separate | Read + why line (C) | Tri-part result: Read · Execution · Situation; post-game: personal contribution vs team result | 1 | Each part derived independently | T; U | verified complete (U EN/KO result: read · execution · the down; U post-game split) |
| MATCH-05 | SC9; PR #8 | Down, distance, possession and scene agree | "Marker 3 yards away" vs 2nd & 11 (PR) | Mid-run tell wording made explicit; scene/tell content audit (WR corner alignment, RB "only four rush" in drop-eight) | 1 | Copy audit test for distance phrasing; content review done | T; C | verified complete (T m12-copy: drop seven, mid-run distance, neutral WR release prompt) |
| MATCH-06 | SC9; RG twin prompts | Variation beyond unique look IDs | Same family/first tell back-to-back; cross-week repeats (RG) | Avoid adjacent same-family + same-first-tell; prefer looks not seen in recent games | 1 | Sim: adjacent twins ≤ threshold; cross-game repeat rate down | T; S | verified complete (T season: 0 twins, recent-game repeats < 25%, saved look IDs) |
| MATCH-07 | PR clock | No fixed clock pattern | Q1 3:00 → Q4 12:00 every game (C: `tactical-alpha-v1.ts`) | Deterministic per-game clock jitter (hash, no RNG draw); quarters vary | 1 | Clocks differ across games; same game replays identically | T | verified complete (T order/variety; U clocks Q2 11:06, 2Q 0:02) |
| MATCH-08 | PR Toss-up | Pregame previews contrast | Thresholds 58/42 → almost always Toss-up (C) | Five-band outlook (Heavy favorite … Heavy underdog) from the matchup score; post-game "upset" consistent | 1 | Band distribution across a season has variety; upset label agrees | T | verified complete (T bands + upset rule; U KO pregame 'Favored') |
| MATCH-09 | SC9; PR #7 | Best / safe alternative / partial labels | Solid says "sharper option" (C) | Consistent labels and their grade contribution | 1 | Labels shown with read score values | T; U | verified complete (copy: safe alternative = Sharp, partial = Solid; T read basis) |
| MATCH-10 | RG "Reads 90" scale | Explain the read score scale | Equal-weight sentence (RG) | "Sharp 90 · Solid 65 · Missed 30" explanation in the verdict | 1 | Present EN/KO | T | verified complete (U EN post-game scale line) |
| MATCH-11 | RG verification | Successful forced fumble, receiving fumble headline, throwaway explanation | Unobserved (RG) | Fixture tests that force each branch | 1 | Each branch rendered with the correct copy | T | verified complete (T fixtures: throwaway, catch fumble, forced fumble, strip held/missed) |
| MATCH-12 | PR defensive copy | Defensive viewpoint copy | "offensive opportunities", "Reading the defense" for a CB (PR) | Position-neutral or defense-aware copy | 1 | Copy audit test for defensive positions | T | verified complete (T m12-copy viewpoint audit) |
| MATCH-13 | PR pacing | A starter's scenes are framed as selected moments | Unexplained (PR) | The pregame says "key moments from the full game"; situation types (red zone, two-minute, goal line) | 1,5 | Visible text; scene tags | U | verified complete (U KO pregame key-moments note) |
| MATCH-14 | PR team loss | Personal contribution vs decisive events elsewhere | Partial (RG WR A in loss) | Post-game "Elsewhere in the game" line from background scoring | 1 | Derived from engine background points | T | verified complete (T split; U EN 'On your snaps … Elsewhere …') |
| MATCH-15 | Prior fixes (RG pass) | Preserve the scene rules, slide, airborne, post-catch, fumble headlines, no look repeat | Pass in sample (RG) | Keep the regression tests | 1 | `scene-rules.test.ts` stays green | T | verified complete (T scene-rules.test + v2 kernel tests green) |

### 10. Accessibility, animation and compatibility

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A11Y-01 | SC10; RG P13 | The Motion override works under OS reduced motion | Cloud Linux verified; Windows untested (RG) | E2E with emulated `reduce`: Motion On animates; System stays still | 10 | Playwright asserts animation state | T | not started |
| A11Y-02 | SC10 | Board motion is distinct from screen transitions | One setting | Separate "Interface animation" setting; CSS transitions follow it | 10 | Both settings independent | T | not started |
| A11Y-03 | SC10; PR keyboard | Keyboard use across new screens | Saturday verified (PR) | Tablists with arrow keys; focus return; new screens keyboard-tested | 9–10 | E2E keyboard flow | T | not started |
| A11Y-04 | SC10; PR 390px | Narrow layouts | 485px verified (PR) | 360/390px checks for all new screens | 10 | No horizontal overflow (e2e) | T | not started |
| A11Y-05 | SC10 | Language behavior and parity | Parity tests exist (C) | All new keys in both locales; KO screenshots reviewed | 10 | Parity test; U KO | T; U | not started |
| A11Y-06 | SC10 | Web and desktop paths | Desktop rc.3 built (C) | Desktop build and smoke after M12 | 10 | Build and smoke pass | T | not started |
| COMPAT-01 | SC10 | Existing saves load and continue | v1–v3 migrations (C) | All new state optional with defaults; rc.3 save fixtures (mid-season, offseason, complete) continue | 10 | Fixture tests continue 2+ weeks without error | T | not started |
| COMPAT-02 | SC10 | Historical replays unchanged | Kernels literal; scene rules gated (C) | New kernel behavior gated on input flags only | 1–10 | Historical tests green | T | not started |
| COMPAT-03 | SC10 | Alumni and record compatibility | Plaques sanitized (C) | Legacy claims keyed by careerId; old plaques valid | 8 | Old plaque fixtures | T | not started |

### 11. Career arc items from the initial design

| ID | Source | Intended experience | Current (evidence) | Required change | Ph | Acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAR-01 | ID §9; PR | Postseason play exercised | Bracket exists; unplayed in the report (PR) | Harness/test plays a postseason game | 10 | Test reaches a postseason round | T | not started |
| CAR-02 | ID §9 | Pro Combine before the draft | None | Combine results (from attributes) shown at career end; small stock effect | 8 | Deterministic; shown | T; U | not started |
| CAR-03 | ID §9 | Early declaration | Exists after the junior season (C) | Keep; explain stock and options | 8 | — | T | in progress |
| CAR-04 | ID §6 | A role change rewards more than a rating | Depth moves (C) | Role milestones in the season review and legacy | 5,8 | — | T | not started |
| CAR-05 | PR awards | Position-appropriate awards for defensive and limited roles | 12 awards incl. positional (C) | Add "Contributor"-type honors (team captain, most improved) to legacy achievements | 6,8 | — | T | not started |
| CAR-06 | ID §11 | Content density is judged by choices, not counts | — | No count restoration; tracked as a principle | — | — | — | verified complete (principle, no work) |
| CAR-07 | ID §9 proposal | Redshirt / fifth year | Four seasons (C) | **Proposed exclusion:** ID calls five years non-durable; the four-year arc plus a Combine meets the need | — | User approval | — | excluded (approval needed) |
| CAR-08 | PR "Heisman-level star arc" | A star arc aspiration | Player of the Year exists (C) | Covered by year goals and award contention (REL-03); no separate Heisman | 6 | — | — | not started |

### 12. Verification items (RG "verification still open")

| ID | Source | Item | Required | Status |
| --- | --- | --- | --- | --- |
| VER-01 | RG | Near-complete and full card collection | Fixture tests (CARD-03) | not started |
| VER-02 | RG | Successful forced fumble | Fixture (MATCH-11) | verified complete (T m12-match strip tally; m12-match-season fixture) |
| VER-03 | RG | Receiving-fumble headline | Fixture (MATCH-11) | verified complete (T headlines.test + explanation fixture) |
| VER-04 | RG | Throwaway feedback | Fixture (MATCH-11) | verified complete (T qb_throwaway fixture) |
| VER-05 | RG | Universal starter-event filtering | Test all catalogs (REL-07) | verified complete (T m12-role-events: 6 positions × 4 seasons × 12 weeks) |
| VER-06 | RG | All-school tags incl. Wolf Creek | Test over the whole inventory | verified complete (T program-culture: every program 2–3 tags, EN/KO) |
| VER-07 | RG | Windows reduced-motion override | A11Y-01 | not started |
| VER-08 | RG | Old reports lack the grade breakdown (pre-feature saves) | Documented as expected; UI tolerates absence | not started |
