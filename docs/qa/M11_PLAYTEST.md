# Playtest checklist — round 2

This is a manual pass by a person. The automated gate already covers crashes, missing copy, accessibility scans and saves; this pass is about **feel**. Round 2 checks the fixes from your round-1 notes first (section R), then repeats the core checks.

## Setup (2 minutes)

1. Start the game from the repository root: `corepack pnpm dev`, then open <http://localhost:5173>.
2. **Saves** (저장 슬롯) in the top bar lists five slots. Your earlier career is in slot 1. Start round 2 in an **empty slot**, so the old career stays as it is.
3. **Settings** (설정) holds the height/weight units and the **Play Review** switch. **EN / 한** switches language at any time.
4. Keep a note open. For every issue, write the slot, position, season and week, the screen, what you expected and what happened. Add a screenshot when it's visual.

How a week flows: **Plan** (three focuses) → **Practice report** → optional scenes (breakthrough card, midweek event, NIL offer, medical check) → **Pregame** → **snaps** → **Final** → **Post-game** → next week.

## R. Round-1 fixes: check each one

Your note number is in brackets.

| # | Where | Check | ✓ |
| --- | --- | --- | --- |
| R1 | Creation [1] | Nothing is pre-picked: no position, style, background or name until you choose them. Next stays off until each step is complete, with a hint saying what's missing. | |
| R2 | Creation card [1] | The card shows no name until you set one (no "No name yet"). The play style sits under the position, top right, in the display font. | |
| R3 | Creation card | The recruiting background appears as a colored foil band on the card's bottom edge, with a different color per background. | |
| R4 | Buttons [2] | "Back / 이전" never wraps to two lines (check EN, KO and phone width). The bottom action button is smaller than before. | |
| R5 | Name [3] | **Suggest a name** fills a name. Switch EN/한: a suggested name changes language, and the Korean order is given name first (e.g. 제이든 박). A typed name stays exactly as typed. | |
| R6 | Units | Settings → units switches cm/kg ↔ ft/lb on creation and Profile, whatever the language. | |
| R7 | Save slots | Play a few weeks, open **Saves**, start a **New career** in an empty slot, play a week, then **Resume** slot 1. It is exactly where you left it. Delete asks for confirmation and removes only that slot. | |
| R8 | School cards [4] | Every recruiting card is readable: the school name sits on a solid color band with contrasting text, and the details sit on a dark body. Each card shows the **mascot**, 2–3 **atmosphere tags** and a **tradition**. | |
| R9 | Team tab [4] | The Team header shows the mascot medallion, tags, tradition and a **home jersey** in the school colors. | |
| R10 | Training [5] | Focuses are grouped as Position technique / Physical / Film & mental / Recovery & academics. Each tile says what it trains, with gains and costs on separate lines. | |
| R11 | Practice report [6] | "Growth this week" lists each trained attribute with its rating (+1 when it went up), an XP bar, the XP gained and the XP left to the next point, plus overall before → after. | |
| R12 | Depth chart [6] | Over 4–6 weeks, teammates' form moves. If you practice poorly (pick heavy grind with low Body, or academics only), you can **lose** a spot. Note whether it feels fair. | |
| R13 | Reads [7] | With Play Review **on**, the result shows the real look and the best read. With it **off**, only your read grade shows (Sharp/Solid/Missed), with no answer reveal. | |
| R14 | Reads vs results [7] | When a right read (Sharp) still fails, the result says the read was right and why the play failed. When a wrong read works, it says the staff grades the read. | |
| R15 | Staff grade [7] | Games where you read well grade well even when the box score is thin. A string of Missed reads grades poorly even after a lucky big play. | |
| R16 | Post-game [8] | A short news report tops the screen (headline, your line, how many looks you read right, play of the game, staff grade). "Growth from this game" shows the same bars as the practice report. With Play Review on, every snap is listed with your call and the best read. | |
| R17 | Breakthrough [9] | The gauge fills at 50 now. Your first card offer should come by about week 3; equip it in **Build** and see it apply. | |
| R18 | Profile [10] | A trading card (overall, position, style, series plate, program crest) sits beside the facts. Ratings are grouped as Position skills / Physical / Mental, each with its average. | |

## P. Fixes from the written playtest report (2026-10-01)

| # | Where | Check | ✓ |
| --- | --- | --- | --- |
| P1 | QB scramble | Slide early never ends in a breakaway touchdown. | |
| P2 | CB, ball in the air | When the scene says the ball is already in the air, you are always targeted (never "Nobody throws at you"). | |
| P3 | CB, after the catch | When the scene says the catch is made, the result is a tackle, a missed tackle or a forced fumble, never a pass breakup or an interception. Attacking the strip can force a fumble. | |
| P4 | Headlines | A fumble shows in the play headline (sack-fumble, run fumble, catch fumble), not only in the box score. | |
| P5 | Read feedback | With few tells visible, a missed read says the information was limited. A Solid read says there was a sharper option. Short-of-the-sticks plays, throwaways, and right-read/bad-play cases each explain themselves. | |
| P6 | Preparation | When preparation is already at the cap, the pregame says more tells are not available from prep. | |
| P7 | Looks | No look repeats within one game. | |
| P8 | Breakthrough | When fewer than three cards are left, the remaining ones are offered; a complete collection stops the gauge at 50/50 and the report says so. | |
| P9 | Post-game | "Play of the game" is a good play for you; otherwise the news says "Turning point". The coach's verdict explains the grade (reads and box score, weighed equally). Play Review is folded until you open it. | |
| P10 | Events | Rotation-contest events (fighting for a rotation spot) no longer reach a starter. | |
| P11 | Week | After week 1, a **Last week's plan** chip reuses your previous three focuses. The practice report explains why overall can stay the same while XP grows. | |
| P12 | Offseason | Transfer offers show last season's record, why the school calls (reach / fit / role) and strength pips. | |
| P13 | Settings | **Motion**: System / On / Off. On plays the board even when Windows animation effects are off. | |
| P14 | Schools | Every program has at least two atmosphere tags. | |

## Snap looks: are they readable? (the core test)

Play **one season as a QB** and **one as a CB or LB**. For every live snap, add a row to the snap log below.

| # | Check | ✓ |
| --- | --- | --- |
| B1 | Before choosing, can you say *why* one card is right from the tells and the arrows (not a guess)? | |
| B2 | With 2–3 tells, how often was your pick the best read? Target: most of the time. | |
| B3 | With 0–1 tells, it should feel like an honest guess, not a trick. A disguise looks identical to its twin at this depth, by design. | |
| B4 | Reading right now changes the play. Over a season, do right reads clearly produce better plays than wrong ones (not every time)? | |
| B5 | Did the looks vary enough that you couldn't just memorize "this situation = card 2"? | |
| B6 | Tell wording: is any tell unclear, too technical, or gives the answer away? Note the exact line, in both languages. | |

How many tells you get: live snaps show 0–2 from your preparation and football IQ, plus 1 from certain cards or events (up to 3). Sideline reps show 1, 2 or 3 tells at Preparation 35, 55 or 75. Disguises share their twin's first tell; only tells 2–3 give them away.

## The moving board

| # | Check | ✓ |
| --- | --- | --- |
| C1 | Before choosing, red-ringed opponents act out their red arrows on a loop. Readable, or distracting? | |
| C2 | After choosing, the whole field plays once, and **Replay** restarts it. | |
| C3 | Reduced motion (Windows: Settings → Accessibility → Visual effects → Animation effects **off**, then reload): nothing moves; arrows and results still show. | |

## Every position, quick smoke (one game each)

| Position | Plays a game | Reads feel fair | Grade matches your reads | Notes |
| --- | --- | --- | --- | --- |
| QB | | | | |
| RB | | | | |
| WR | | | | |
| CB | | | | |
| LB | | | | |
| EDGE | | | | |

Also play one week as a **backup**: the sideline reps should show the look, the arrows and (with Play Review on) the answer.

## Snap log (fill in while playing)

| Pos | Season/week | Situation (title) | Tells seen | Your pick | Best read | Grade | Play result | Felt fair? (Y/N + why) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

About 20 rows are enough to judge B2, B4 and B5.

## General feel (one line each)

- Did any screen feel slow, cluttered or confusing (especially the new post-game and profile)?
- With the round-2 art in, check the painted portraits (creation, nameplate, profile), the mascot medallions and the home jersey on several schools. Does any combination of skin, face and hair look misaligned, or any school color make a jersey or emblem hard to read?
- Keyboard only: can you play a whole Saturday with Tab, Enter and 1–3?
- Close the tab mid-game, reopen it, and check it resumes at the same snap in the same slot.

## What to send back

Send the filled tables (or just the ✗ items) and the snap log. The most useful inputs are:
- anything in section R that still feels off;
- depth-chart moves that felt unfair;
- reads that felt unfair, with the situation title and look name;
- confusing text, with the exact wording.

All round-2 art is in (`docs/design/ASSET_LIST.md`, "Round 2").
