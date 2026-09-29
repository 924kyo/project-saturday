# Current Product Audit

Date: 2026-09-29. Reviewer posture: senior game designer + product engineer reviewing an inherited prototype.
Evidence: real production build driven with Playwright at 390×844 (mobile) and 1440×900 (desktop): WR creation → recruiting → five destinations → camp → event → breakthrough → Game Day preview → zero-snap post-game → first key snap; QB creation → Home → Week. Code/doc volume measured from the repository at commit `00632f9`.

## Verdict in one paragraph

The simulation underneath is serious, deterministic and often thoughtful. The product on top of it is not yet a game. It reads as a well-tested database of career state, presented as stacked rounded cards with labels, numbers and explanatory gray text. The two most important moments, choosing a program and playing a snap, have good raw content but no stagecraft. The biggest structural problem is that the game has **two parallel career implementations**: WR on the original CareerRun v1–v8 lineage and a 12-program world, and QB/RB/CB on the PositionAlphaSession aggregate and a 32-program world. They have two different UIs, two save systems and two creation flows. Much of the recent effort went into keeping those two stacks and every historical save byte-compatible, rather than into the experience.

## What works (keep and build on)

- **Deterministic, owned simulation.** Career and world RNG are separate. Engines own rules; replay proves saved state. This is a genuine asset for balance tooling and bug reproduction.
- **Key-snap concept.** Pattern + earned clues ("Two-high zone", "Inside leverage") + three athlete-level techniques is the right shape for a player-perspective football decision. Film study visibly improves the read, so the link between preparation and Game Day is real.
- **Depth-chart rivalry data.** Team knows the next player above you by name ("Darius Lawson at WR7") and compares five factors with you. This is the emotional core of "earn your snaps" and is currently wasted in a table.
- **Recruiting offers with distinct program identities.** Five offers with prestige, development, NIL, scheme fit and a depth path is a real decision.
- **Breadth of authored content.** 40 WR skill cards, 171 events, 32 fictional programs, paired ko-KR/en-US, and position engines for QB/RB/CB with position-specific decisions.
- **Persistent athlete portrait.** The athlete appears throughout, and creation choices persist.
- **Career Hub, alumni, transfer, two-season arc.** The roguelite shell exists.
- **Engineering hygiene worth keeping:** localization guard, architecture boundary check, PWA/offline, lazy chunks under 500 kB, IndexedDB atomic writes.

## What is mediocre

- **Home is a dashboard, not a locker room.** Season box, identity card, four stat tiles, four state meters, then an off-field panel with disclaimers. The single thing to do next ("Open this week") sits about 2,000 px down on mobile.
- **Week focus selection is a 3,400 px list** of nine visually identical cards. Each repeats "Base change before equipped skills" plus four ± chips. The three picks are the most frequent decision in the game, and they are the most tedious.
- **Recruiting shows programs as stat grids** (Prestige 96 / Academics 66 / NIL 90…) with no program identity: no colors, mascot mark, campus, coach or pitch.
- **Team's "depth chart" has no depth chart.** It shows a percentage, two numbers, a numbered paragraph explaining the formula, and a collapsed "WR room".
- **The post-game has no story.** A season box comes first, then "Win" plus a grade for a game you did not play in, a zero-filled stat table, and a before/after list.
- **Desktop is the mobile column stretched to 1,150 px.** The player's name appears twice within 400 px.
- **Visual language is generic.** Dark navy, rounded bordered cards inside rounded bordered cards, gold eyebrow labels, condensed uppercase headings, gray helper sentences on every block. There is no broadcast, recruiting-graphic, locker-room or scoreboard identity.

## What actively harms the experience

1. **Game Day often contains no football.** A developmental freshman (0–2% projected snaps) plays games with zero decisions. The first scheduled game in the audited run had no snap. Four weeks of preparation led to a "Package readiness: the game script did not call your number" card. Core Belief #10 ("every role participates") is met only as text.
2. **The key snap is a text screen.** There is no field, alignment, line of scrimmage or animation. The full season box renders above the play, so the snap is not the focus of its own screen.
3. **The two position stacks make QB/RB/CB feel like a second-class game:**
   - The QB creation screen labels the archetype group "WR archetype".
   - Recruiting backgrounds describe WR attributes (Burst, Release) for a QB.
   - Height is in cm, where WR uses ft/in.
   - The starting program is a 32-item dropdown; there is no recruiting.
   - QB Home has three unlabeled meters, a portrait overlapping the name, and a nav bar without icons.
   - QB Week picks focuses from three `<select>` dropdowns labeled "Focus 1 / Focus 1", and shows GPA as a bare "3".
   - The position picker tells players QB/RB/CB are a "32-program position alpha path".
4. **Developer and compatibility language reaches players:**
   - "position alpha path"
   - "Fictional in-world eligibility model"
   - "Fictional funds $0"
   - "These labels compare saved evaluation factors, not a decimal composite score"
   - "Base change before equipped skills"
   - "Choose all three focuses to see a forecast from the actual resolution rules"
5. **Too many visible metrics with unclear stakes.** About 25 numbers compete on the main screens: OVR, Body, Preparation, Confidence, GPA, Coach Trust, Practice Form, Practice Grade, Talent Fit, Scheme Fit, Experience readiness, depth rank, role, snap %, Brand, funds, three relationship tracks, Breakthrough gauge, XP, proficiency, injury risk, program record, standing. Several are shown at their neutral default (relationships all 50) for weeks with no visible effect.
6. **Redundant, context-blind panels.** The season box appears on Home, Week, key snap and post-game. The off-field panel appears on Home and Team. The screen does not change shape around the moment that matters.

## Technical debt influencing product decisions

- **Two career domains** (CareerRun v1–v8 vs PositionAlphaSession v1–v3) and two worlds (12 vs 32 programs). Every new feature, such as the tactical board, the Hub or retirement, has been built twice or bridged with version adapters. The just-completed WR v8 two-season terminal and the in-progress QB/RB/CB v3 retention both exist only to keep the split alive.
- **Validation and migration mass.** In game-core, `player/validation.ts` is about 6,000 lines, and migration/validation-related modules total about 13,900 of 48,600 lines. Historical v1–v7 save proofs, literal report hashes and paged history wires are protected with the same rigor as gameplay, although no public release has ever shipped a save.
- **Process documentation has become a second codebase.** `DECISION_LOG.md` is 158 KB and `BACKLOG.md` 35 KB. The product specs (for example `UX_AND_FLOW.md`, `CORE_LOOP.md`) are dominated by save/phase/compatibility detail instead of experience intent. Agents optimized for passing gates and preserving literal bytes.
- **Presentation types mirror persistence types.** Components receive whole saved aggregates (`CareerRunV7|V8`, `PositionAlphaSessionV2`) and pick fields, so UI structure follows storage structure. There is no view-model layer designed around what the player needs to see.
- **Monolithic screens.** `CareerScreen.tsx` is 1,546 lines and `styles.css` 4,105 lines. There is no design system, only per-surface class names.

## UI/UX inconsistencies by position

| Area | WR | QB / RB / CB |
|---|---|---|
| Creation | Recruiting to 5 offers; ft/in; WR copy | Program dropdown of 32; cm/kg; "WR archetype" label; WR-attribute background copy |
| Home | Season box + stat tiles + off-field panel | Portrait overlaps name; unlabeled meters; formula paragraph |
| Week | Nine focus cards (long) | Three `<select>` dropdowns, duplicated labels |
| Nav | Icon tab bar | Text-only tab bar |
| Game Day | Text key snap, then (v8 staged) resolved result | Direct snaps in a different component set |
| World | 12-program Saturday Circuit | 32-program world |
| Save | CareerRun v7 (v8 staged) | Position aggregate v2, wire v3 |

## Systems overengineered relative to player value

- **Byte-literal historical save compatibility for a pre-release game** (WR v1→v8 readers, original-envelope proofs, 8,000-entry registry paging tests). No player has these saves.
- **Paged, checksummed, shadow-manifest alumni registry** designed for 1,000+ careers before the game is fun for one.
- **Report hash pinning** that forces old abstract outcomes to stay byte-identical even where the physical results are known to be incoherent (TD with short yardage, fumbles without a spot).
- **Relationship tracks, NIL funds and GPA checkpoints** that produce state and screens but rarely a decision the player feels.
- **Nine weekly focus actions** whose differences reduce to chip deltas. The richer ideas (film helps the read, recovery trades for Body) are drowned out by the uniform presentation.

## Summary judgement

Keep the engines, content, determinism and the key-snap/depth-rivalry ideas. Replace the frontend from the shell up. Collapse the two career stacks into one position-generic career. Take one deliberate save reset at the 1.0 line instead of adding more compatibility layers.
