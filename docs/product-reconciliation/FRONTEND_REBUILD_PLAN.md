# Frontend Rebuild Plan

Date: 2026-09-29. Scope: replace the web frontend from the shell upward. It consumes one position-generic career model (see `GAMEPLAY_RECONCILIATION.md`). The goal is a coherent sports-RPG presentation language, not a restyle.

## Design language: "Saturday Broadcast"

Original, not copied from any game or network. There are four visual registers, each tied to a moment:

| Register | Used for | Signature elements |
|---|---|---|
| **Broadcast** | Game Day, post-game, season review | Score bug, lower-third name bars, down-and-distance chip, field graphics, big numerals, program color wipes |
| **Recruiting graphic** | Creation, recruiting, transfer, commitment | Player card with star rating, program cards in team colors with mark, "commits to" moment |
| **Depth board** | Team | Magnetic-board style ranked rows, your tile highlighted, rival tile with factor arrows |
| **Locker room** | Home, week flow, Skills, Player | Nameplate/locker header, clipboard-style coach's report, collectible skill cards |

**Principles**

- **Program identity drives color.** Every program has primary/secondary colors and a generated original mark (monogram + shape). The shell accent follows the athlete's current program.
- **Numbers are for stakes.** A large number appears only when it is a rank, score, stat line or change. Everything else is a bar, chip or word.
- **One focal element per screen.** Secondary information goes to a peek sheet or drawer, never a second full-height card.
- **Copy budget.** One sentence of help at most per surface, and only on first visit (contextual onboarding). No disclaimers in the main flow.
- **Motion with purpose.** Promotions, commitments, breakthroughs and big plays animate. Everything respects `prefers-reduced-motion`.
- **Typography.** A condensed athletic display face for names, numbers and headlines, plus a highly legible text face. Korean uses a paired Hangul face with matching weight. Self-hosted, offline.

## Component and design-system strategy

- **Tokens** (CSS custom properties): color roles (surface, ink, accent = program primary, accent-2, win, loss, warn), spacing scale, radii (mostly square or slightly chamfered, not pill cards), elevation, motion durations, and z-layers.
- **Primitives:** `Screen`, `Stack`, `Cluster`, `Sheet` (bottom sheet on mobile, side panel on desktop), `Tabs`, `Button` (primary/secondary/ghost), `Chip`, `Meter` (always labeled with a value), `Stat`, `Delta` (+/−, with an accessible text form), `Avatar`/`Portrait`, `ProgramMark`, `Icon`.
- **Sports components:** `ScoreBug`, `LowerThird`, `PlayerCard`, `ProgramCard`, `DepthBoard`, `RivalCompare`, `FocusTile`, `SkillCard`, `TacticalBoard` (SVG), `PlayResult`, `ReactionFeed`, `TimelineStep`.
- **CSS approach:** co-located CSS Modules per component plus a small token/global sheet. The 4,105-line `styles.css` is retired.
- **View models:** every screen reads a pure `selectXxxView(career, content, locale)` projection from a new `apps/web/src/view/` layer. Components never receive saved aggregates. Projections are unit-tested; components are tested for interaction and accessibility, not layout.
- **Storybook-like gallery.** A dev-only `/gallery` route renders every component in both locales, at 320/390/1440, with fixture view models. It is used for visual review screenshots.

## Information architecture

Four primary destinations plus the Hub, arranged around the **Week** as the heartbeat:

1. **This Week** (default)
2. **Team**
3. **Build** (skills + development)
4. **Profile** (player + career history)

The **Career Hub** sits behind the program/athlete header. The separate Home tab is removed: Home and Week merge into This Week, which always shows the one next action at the top.

- **Mobile:** a bottom tab bar with four icons + labels (44 px+ targets). Game Day takes over the full screen with its own chrome; there is no tab bar during a snap.
- **Desktop (≥1024 px):** left rail navigation plus a two-column layout. The main flow sits on the left. The context column on the right holds the depth snapshot, rival and readiness. Game Day is centered, with the board at up to 960 px wide and the play log in a side column.
- **Tablet:** the mobile layout with wider cards.
- **320 px:** everything must still fit. The board scales, and chips wrap.

## Screens

### This Week (replaces Home + Week)

- **Header:** a locker nameplate with portrait, name, position, program mark, depth rank chip (e.g. "WR5 ↑"), and week/opponent ("Wk 4 · vs Prairie Forge, Home").
- **Next Action card:** always first, with one primary button. The phase decides the content: plan focuses / see practice report / resolve event / kick off / play snap / review game / offseason decision.
- **Readiness strip:** Body, Preparation and Confidence as labeled meters with values and a projected change once focuses are picked.
- **Focus planner:**
  - A 2×4 (mobile) or 4×2 (desktop) grid of compact focus tiles: icon, name, and two primary effects.
  - Tap to add; three slots fill at the top.
  - "Coach's plan" auto-fills a sensible default.
  - A projected readiness change and "rival gap" indicator update live.
  - Details (skill-modified effects, XP) live in a peek sheet.
- **Practice report** (after commit): a clipboard view with the practice grade band and three bullets ("Hands work paid off", "Coach noticed…"), plus depth movement animated on a mini depth board.
- **Event:** a scene card (illustrated backdrop + two choices with a one-line consequence each).
- **Off-field alerts:** shown only when actionable (probation warning, NIL offer, obligation due, coach conflict), as compact alert rows.

### Game Day (full-screen broadcast mode)

1. **Pregame:** matchup graphic in both programs' colors, venue/crowd, your role and snap outlook, your readiness, and the keys to the game (earned clues). Primary: "Kick off".
2. **In-game:**
   - A score bug stays pinned.
   - Between snaps, a drive ticker ("Q2 · Gulf Meridian drives 64 yds, FG").
   - A **Tactical Board** for each decision (the position-specific overlay: WR routes/leverage, QB read/pressure, RB gaps/protection, CB leverage/ball/tackle).
   - Three choice buttons below the board; hover, focus or long-press previews the assignment on the board.
3. **Snap result:**
   - The saved result animates (1.5–3 s, with Skip; a static frame under reduced motion).
   - Then a lower-third headline ("Reyes beats press, 22-yard catch"), one reason chip and the stat delta.
   - "Next" is explicit.
4. **Sideline rep** (reserve/developmental roles): a compact decision in the same frame language (scout-team read, special-teams lane). Its result feeds the practice/coach meters.
5. **Final:** a final score graphic, then the Post-game.

### Post-game

A broadcast wrap in this order:

1. result and stakes
2. your stat line (position-specific and only non-zero stats)
3. one to three defining plays (tap to replay the board)
4. coach grade with one sentence
5. changes (trust, depth outlook, card gauge, XP as a single "progress" block)
6. reaction feed of one to three authored reactions

Primary: "Next week".

### Team (Depth Board)

- A full depth chart for your position room as a ranked board. Your tile is highlighted; the rival above and the player below are expanded.
- **RivalCompare:** five factors as "you vs them" arrows, plus the single best lever this week.
- Program header: colors, mark, coach, scheme, record, and conference standing (top four plus your program).
- Snap outlook as a range bar.
- Relationships appear only as coach/room-leader/competitor portraits with mood when they are non-neutral.

### Build

- **Card collection:** equipped four-slot loadout as large collectible cards with rarity frames, and the owned inventory as a grid.
- **Breakthrough:** a pick-one card reveal with a flip animation when it triggers (also reachable from the Next Action).
- **Development:** attributes grouped as physical/mental/position with bars and next-rating progress. Proficiencies sit here too.

### Profile

- Player card (front: ratings/archetype/portrait, back: bio/background/traits), season stats, game log, awards, and program history.
- Career timeline (commit, promotions, big games, transfer).

### Career Hub

- Current athlete card with Continue / Abandon.
- **Alumni Wall** of card tiles with a detail view.
- New Career, and Settings (language, motion, guides, data).
- Save status/recovery and Reset All Data go in a Data section with a two-step confirmation.

### Creation and recruiting

- **Stepper:** Position → Archetype (large illustrated tiles) → Background → Traits → Look → Measurables and name.
- A live **PlayerCard** preview stays visible (a sticky top strip on mobile, a side column on desktop).
- Units follow locale: ft/in and lb for en-US, cm and kg for ko-KR. The same rule applies to every position.
- **Recruiting:** a swipeable/scrollable stack of ProgramCards in team colors, each with "The pitch", "Your path" (depth position and seniors ahead), scheme fit and development/prestige/NIL as three simple pips. Then commit, followed by a signing moment.

## Accessibility and localization

- Every graphic has a text equivalent. The Tactical Board has an ordered text summary: situation, what you see, options, result.
- Focus order follows the flow. Visible `:focus-visible` rings, 44 px targets, and color is never the only signal (deltas carry ± and words).
- Reduced motion replaces animations with static frames and instant transitions.
- All copy lives in locale resources, and components are tested in both locales at 320 px for overflow. Korean line-breaking uses `word-break: keep-all` where appropriate.

## Retained vs replaced

| Existing | Decision |
|---|---|
| `AthletePortrait` renderer | **Retain and extend** (sizes, poses, program uniform colors). |
| i18n setup, locale resources, localized-copy guard | **Retain.** Copy is rewritten for the new surfaces; old keys are pruned. |
| PWA shell, service worker, offline, update prompt | **Retain.** |
| Storage adapter (IndexedDB/memory, atomic batches, locking) | **Retain the engine.** Replace the career-specific persistence facades with one new-line codec. |
| `CareerScreen`, `SeasonFlow`, `GameFlow`, `ProgramPanels`, `OffFieldPanels`, `PositionAlpha*` components | **Replace.** |
| `styles.css` | **Replace** with tokens + component CSS. |
| `*-ui.ts` selector modules | Mine them for logic, then **replace** with the new `view/` projections over the unified career. |
| Career Hub | **Rebuild** on the new components; keep its semantics (continue/new/abandon/reset, alumni). |
| Web component tests coupled to old DOM | **Rewrite** alongside the new components. Storage and determinism tests stay. |
| e2e specs M1–M7 | **Replace** with a new journey suite: four positions × create → recruit → week → Game Day → post-game → offseason → season 2 → retire, in both locales, at mobile/desktop/320. |

## Migration path (keep the repository runnable)

1. **Git checkpoint** before any structural rewrite (done: `00632f9`; tag `pre-rebuild` at the start of R2).
2. **Build the new UI alongside the old one.** New code lives in `apps/web/src/app2/` (shell, design system, view models) behind a dev flag, with the gallery route first.
3. **Engine unification** lands in core (see the gameplay doc). The new UI is developed against the unified career from the start.
4. **Switch-over:** the new app becomes the default at the save boundary (prototype export/import). The old UI and old career stacks are deleted in the same milestone, and version history preserves them.
5. Each slice is verified in the real browser with screenshots, in both locales, at 390 and 1440, before being considered done.
