# M11 playtest checklist (rc.2 + art)

This is a manual pass by a person. The automated gate already covers crashes, missing copy, accessibility scans and saves; this pass is about **feel**: whether the looks are readable, whether the board helps, and whether the art sits right.

## Setup (2 minutes)

1. Start the game from the repository root: `corepack pnpm dev`, then open <http://localhost:5173>.
2. For a clean run, use **New Career** (새 커리어) in the top bar. It keeps the Alumni Wall.
3. **EN / KO** in the top bar switches language at any time.
4. Keep a note open. For every issue, write the position, the season and week, the screen, what you expected and what happened. Add a screenshot when it's visual.

How a week flows: **Plan** (pick three focuses) → **Practice report** → optional scenes (breakthrough card, midweek event, NIL offer, medical check) → **Pregame** → **snaps** → **Final** → **Post-game** → next week.

## What to know about snap looks before you start

- Each snap belongs to a **family** (the title, for example "Pass selection"). The family has five hidden **looks**. Two of them are **disguises**: they line up like another look, show the same pre-snap arrows, and share the same first tell. Only the **second and third tells** give a disguise away.
- **How many tells you get:**
  - Live snaps show 0–2 tells from your preparation and football IQ, plus 1 from certain skill cards or events, up to 3.
  - Sideline reps (when you're a backup) show 1, 2 or 3 tells at Preparation 35, 55 or 75.
- **The board:**
  - The dashed white arrows show pre-snap movement, which is always visible.
  - The red, glowing arrows show movements your tells exposed. The players they belong to have a red ring.
  - Before you choose, those players act the movements out on a loop.
- **Picking:** use the cards or the keys **1–3**. Hovering or focusing a card previews your own path in lime.
- **After the snap:**
  - The whole field plays out, and a lower third shows the result and your read grade (Sharp, Solid or Missed).
  - The side panel reveals the **real look**, the **answer**, and any tells you **didn't see** (marked with a dot).
  - **Replay** plays the snap again.

## A. Art pass (one career, about 10 minutes)

| # | Where | Check | ✓ |
| --- | --- | --- | --- |
| A1 | Creation / landing | The stadium backdrop shows at the top and fades into black. Text stays readable over it. | |
| A2 | Position picker | Each of the six cards shows its figure (QB, RB, WR, CB, LB, EDGE) bottom-right and faded. The abbreviation and glyph stay readable, and nothing is cropped awkwardly (helmet cut off, empty corner). | |
| A3 | Recruiting | The campus-at-dusk backdrop is used. | |
| A4 | Week hub (This week / Build / Team / Profile) | The locker-room backdrop is used, and the panels stay readable on it. | |
| A5 | Midweek event | The walkway figure shows on the right, and the left half under the text stays dark. | |
| A6 | NIL offer | The director's chair and camera art shows. (NIL offers are chance-based; you may need a few weeks.) | |
| A7 | Medical check | The taped-ankle art shows (only when injured). | |
| A8 | Breakthrough card pick | The glowing-ball art shows (when the gauge fills). | |
| A9 | Post-game, season review, career end | The tunnel backdrop is used. | |
| A10 | Phone width (browser dev tools, 390 px) | Repeat A1, A2 and A4. The art doesn't crowd the text, and there's no sideways scroll. | |
| A11 | First load | No slow pop-in that jumps the layout. After one visit, a reload with the network off still shows the art (it's precached offline). | |

## B. Snap looks: are they readable? (the main test)

Play **one full season as a QB** and **one as a CB or LB**. For every live snap, record a row in the grid in section F.

| # | Check | ✓ |
| --- | --- | --- |
| B1 | Before choosing, can you say *why* one card is right from the tells and the arrows (not a guess)? | |
| B2 | With 2–3 tells, how often was your answer the revealed answer? Target: most of the time. If you read carefully and still miss, note the look name from the reveal. | |
| B3 | With 0–1 tells, it should feel like an honest guess, not a trick. A disguise and its twin look identical at this depth, by design. | |
| B4 | When you missed a disguise, did the reveal's unseen tells explain it? ("Ah, tell 2 would have shown me.") | |
| B5 | The same family repeats across weeks. Did the look vary enough that you couldn't just memorize "this family = card 2"? | |
| B6 | Raise preparation for a week (more study/film-type focus, less grind) and compare. Do you see more tells and more red arrows? Does that feel worth it? | |
| B7 | Tell wording: is any tell unclear, too technical, or reads like the answer? Note the exact line. Check both languages (EN/KO). | |
| B8 | Family titles and prompts: do they set up the decision without giving it away? | |

## C. The moving board

| # | Check | ✓ |
| --- | --- | --- |
| C1 | Before choosing, red-ringed players move along their red arrows, then snap back and loop. Is it readable or distracting? | |
| C2 | Pre-snap movement (dashed white arrows) happens first in the loop, then the read movements. | |
| C3 | After choosing, the whole field moves once: the line steps forward, receivers release, defenders close on the ball. Your athlete and the ball travel together with the rest. | |
| C4 | The result tag (TD, INT, sack…) appears after the play finishes and stays inside the board. | |
| C5 | **Replay** restarts the whole play from the snap. | |
| C6 | Turn on reduced motion (Windows: Settings → Accessibility → Visual effects → Animation effects **off**), then reload. Nothing moves; arrows and results still show. | |
| C7 | The phone board (compact) is still legible with players moving. | |

## D. Wide receiver (the reported problem)

| # | Check | ✓ |
| --- | --- | --- |
| D1 | Create a WR and play at least three games. | |
| D2 | Choosing the revealed answer grades **Sharp**; a reasonable alternative grades Solid, not everything Missed. | |
| D3 | The WR gets targeted in most games (receptions, not only "not targeted"). | |
| D4 | The post-game staff grade and season awards feel comparable to the other positions. | |

## E. Every position, quick smoke (one game each)

| Position | Plays a game | Board/arrows make sense | Tells are understandable | Notes |
| --- | --- | --- | --- | --- |
| QB | | | | |
| RB | | | | |
| WR | | | | |
| CB | | | | |
| LB | | | | |
| EDGE | | | | |

Also play one week as a **backup**. Sideline reps should show the look, the arrows and the reveal as well.

## F. Snap log (fill in while playing)

| Pos | Season/week | Family (title) | Tells seen | Your pick | Revealed look | Answer | Grade | Felt fair? (Y/N + why) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

About 20 rows are enough to judge B2 and B5.

## G. General feel (one line each)

- Did any screen feel slow, cluttered, or confusing?
- Is the Night Game look consistent with the art, or does anything clash (colors, contrast)?
- Keyboard only: can you play a whole Saturday with Tab, Enter and 1–3?
- Save: close the tab mid-game, reopen it, and check it resumes at the same snap.

## What to send back

Send the filled tables (or just the ✗ items) and the snap log. The most useful inputs are:
- looks that felt unfair, with the look name from the reveal;
- tells that were confusing, with the exact text;
- art that crops or clashes, with a screenshot.
