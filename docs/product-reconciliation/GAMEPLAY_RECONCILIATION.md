# Gameplay Reconciliation

Date: 2026-09-29. Scope: mechanics that exist but do not produce good decisions, redundant metrics, missing feedback loops, position problems, and UI problems whose root is the domain model.

Findings are labeled:

- **[Observed]** seen in the audited real-app run.
- **[Code]** read from the implementation.
- **[Verify]** a hypothesis that R1 balance simulations must confirm before tuning.

## 1. The biggest domain problem: two career models

- **[Code]** WR runs on `CareerRun` v1–v8, a 12-program world, a 3-slot history (with v8 staging) and one-season alumni v1.
- **[Code]** QB/RB/CB run on `PositionAlphaSession` v1–v3, a 32-program world, 4 slots, two-season lifecycle and different week phases.

Consequences:

- Different creation, recruiting, week, Game Day and Hub behavior per position.
- Every cross-position feature is built twice.
- The UI cannot be designed once.

**Decision:** unify on one position-generic career aggregate. The position-alpha aggregate is the better base (32 programs, 4 slots, explicit two-season lifecycle, direct per-snap Game Day, paged history). WR becomes an engine adapter inside it: the existing WR key-snap resolver, WR attributes, WR skills and events plug into the same `PositionGameEngine` interface as QB/RB/CB.

Recruiting also moves into the unified aggregate. It is currently WR-only; QB/RB/CB get a dropdown.

## 2. Mechanics that don't produce good decisions

| Mechanic | Problem | Direction |
|---|---|---|
| **Nine weekly focuses (WR)** | **[Observed]** A fixed plan (route drills + film + recovery) carried the auto-player to key snaps with Body at 94–100 and never needed to change. **[Verify]** a dominant plan exists across roles. | Reduce to 6–8 focuses with sharper trade-offs. Make one focus opponent-specific each week (film on *this* opponent). Scale Body cost so a heavy week is a real bet. Add a "Coach's plan" default. |
| **Body saturation** | **[Observed]** Body sits near 100 with passive recovery, so it is rarely a constraint. | Tune recovery/costs so Body is the currency of ambition. Injury risk visibly follows low Body. |
| **Preparation carry-over** | **[Code]** Preparation decays toward neutral and resets in effect every week. It is invisible as strategy. | Keep it, but surface it only as "game readiness", paired with the opponent's keys. |
| **Relationships (3 tracks)** | **[Observed]** All sit at 50 for weeks. Modifiers show "+0". There is no decision surface. | Relationships change through events and choices, not passive drift. Show them only when non-neutral. Each track owns one clear effect (coach → trust, leader → info/clues, competitor → rival pressure). |
| **NIL** | **[Observed]** "Fictional funds $0", and funds have no use. **[Code]** Offers/obligations work, but the reward is Brand plus money with nothing to spend it on. | Remove the funds display until spending exists. NIL offers are events with a clear trade (a focus slot or confidence risk for Brand/trust). Brand feeds recruiting/transfer/draft visibility. |
| **GPA / academics** | **[Code]** Checkpoints and eligibility work, but GPA mainly acts as a tax on focuses. | Keep it as a threat, not a meter. Show it only near a warning line, with a clear consequence (suspension = no snaps). |
| **Zero-opportunity games** | **[Observed]** A developmental player's Game Day has no decisions: "the game script did not call your number". This violates Core Belief #10 in spirit. | Add **sideline/scout/special-teams reps**: 1–2 role-appropriate decisions per game for bench roles. They are deterministic, owned by the position engine, and feed Practice Form and Coach Trust, never offensive stats. |
| **Performance grade for zero snaps** | **[Observed]** A grade of 50 is shown with no participation. | No offensive grade without snaps. Show the sideline-rep evaluation instead. |
| **Report-hash-pinned abstract outcomes** | **[Code]** Historical WR/QB/RB/CB outcomes can be physically incoherent (a TD with short yardage, a fumble without a spot), and they are pinned. | The new save line uses the tactical rules (coherent field, score, possession) for all games. The old abstract branch is deleted. |

## 3. Redundant resources and metrics

Too many overlapping "how the coach sees me" numbers:

- Practice Grade (weekly)
- Practice Form (rolling)
- Coach Trust
- Talent Fit
- Scheme Fit
- Experience readiness
- Depth composite
- OVR

**Direction.** Keep them all in the engine, but the player sees:

- **OVR:** a single card rating.
- **Depth rank + snap outlook:** the stakes.
- **Coach's view:** three levers with a direction each.
  - **Talent:** ratings the scheme values.
  - **Trust:** Coach Trust plus Practice Form.
  - **Readiness:** body, prep, confidence and experience.
- **Rival gap:** which lever separates you from the player above.

Practice Grade becomes the weekly *event* that moves these levers, not another persistent number.

Off-field numbers (GPA, Brand, funds, three relationships) collapse into **alerts and events** and appear only when non-neutral.

## 4. Missing feedback loops

1. **Preparation to Game Day is invisible.** The film study → better clues link exists but isn't celebrated. Show "Film paid off: you recognized two-high" on the board.
2. **Game to depth.** Big games should visibly move trust and the rival gap in the post-game, then land as a promotion in the next practice report.
3. **Build to play.** Equipped skill cards should appear on the board when they trigger ("Deep Threat: +separation vs single-high").
4. **Rival as a character.** The named player above you should have a face, a line, and events (rivalry, mentorship, injury opening a spot).
5. **Season stakes.** Rivalry games, rankings and postseason bubble should drive crowd tone and post-game significance.
6. **Legacy.** Alumni should appear in later careers (as mentors, as the record you chase on the program's record board).

## 5. Position-specific problems

| Position | Problem | Direction |
|---|---|---|
| WR | A strong key-snap vocabulary is hidden in text. The world is smaller (12 programs), and the WR is the only position with recruiting. | Board with route stems and leverage; unified world and recruiting. |
| QB | **[Observed]** Creation labels "WR archetype"; backgrounds cite WR attributes; there is no recruiting; the week is dropdowns. **[Code]** The engine has reads/targets/pressure evidence. | The board shows coverage shell, progression and pressure clock. Backgrounds get position-aware copy. |
| RB | Same shell gaps as QB. **[Code]** Gaps, cuts and protection exist in the engine. | The board shows the blocking front, gap arrows and blitz pickup. |
| CB | **[Observed, earlier desktop smoke]** Unlabeled Home meters. **[Code]** Leverage, ball and tackle evidence. | The board shows receiver stem, leverage, ball flight and tackle angle. |
| All | A bench career has few football decisions. | Sideline/scout reps (above). |

## 6. UI problems that are domain-model problems

- **Two aggregates mean two UIs.** This cannot be fixed in CSS. It needs unification.
- **Components receive persistence aggregates.** The UI mirrors storage. The fix is a view-model layer, and the domain should expose purpose-built projections (`WeekPlanView`, `DepthBoardView`, `SnapBoardFrame`, `PostGameStory`).
- **Phase granularity leaks.** Many save boundaries (practice review, academic review, event resolved, injury resolved, snap resolved) are each a screen with a button. Keep the saved boundaries for determinism and retry, but the UI should **auto-advance through no-decision boundaries** and stop only where the player decides or should savor a payoff.
- **Snap evidence is abstract.** The tactical context (field, clock, possession) was staged only for current rules. The new save line makes it mandatory, which unblocks the board.
- **Legacy-only metrics exist because the aggregate stores them.** Presentation should be driven by what the player needs, and the domain can keep extra detail privately.

## 7. Historical contracts: keep vs retire

| Contract | Decision |
|---|---|
| Seeded deterministic RNG, career/world separation | **Keep** (core value) |
| Engine replay validation of saved state | **Keep**, simplified to the new line |
| Stable content IDs | **Keep** |
| Bilingual completeness, a11y, PWA/offline | **Keep** |
| Atomic storage, retry, recovery snapshot | **Keep** |
| Byte-literal WR v1–v7 and position v1–v2 save readers/proofs | **Retire** at the boundary (export plus alumni import) |
| Literal report hashes for abstract outcomes | **Retire.** Record new golden fixtures on the new line. |
| Alumni v1 one-season record format | **Retire.** Import into the new legacy registry. |
| Paged history wire v3, WR meta registry paging | **Re-derive** only what the new line needs (bounded history remains a real constraint). |
| 1 MB envelope / 1,000 ms command budgets | **Keep** as performance guards |
