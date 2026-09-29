# R — Product Reconciliation & Frontend Rebuild

Status: complete 2026-09-30. The R gate is met: full two-season careers pass for all four positions × both locales × phone/desktop/320 in the real app, including recruit, climb, Saturdays, transfer, review and the Alumni Wall. The packaged desktop smoke passes, and `pnpm check` is green. Deferred to M10 hardening: removing the unused pre-R aggregates and locale keys.
Originally activated 2026-09-29. Supersedes the remaining M7.5 B1c–B6/Phase C sequencing, whose intent (tactical evidence, board, choice comprehension, payoff, four-position parity, full validation) is absorbed below. M8 does not start until R closes. M10 is unchanged as the target.

Authoritative inputs: `docs/product-reconciliation/` (the audit, rebaseline, frontend plan and gameplay reconciliation), `PRODUCT_VISION.md` and `CORE_BELIEFS.md`.

## Product-owner corrections (2026-09-29, authoritative)

1. Implementation priority: **Flow and Game Day first**, then build expression, depth climb and identity. Game Day is the payoff of the whole loop.
2. Build a new canonical position-generic **Career VNext** from first principles (`docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`), reusing the best kernels from both stacks. It is not a promotion of either aggregate.
3. Keep the parallel app2 period short. Cutover happens at the concrete criterion in the contract, after which the old frontend and career presentation stacks are deleted.
4. No combinatorial test burden. Journeys, locales, viewports, accessibility and offline are orthogonal; Cartesian coverage runs only at release boundaries.
5. Prototype saves: best-effort export plus lightweight alumni import only.

## Sequence (revised)

1. **V1 — Contract** (done 2026-09-29).
2. **V2 — Vertical slice, QB (done 2026-09-29; RB/CB also run in core and UI):** Create → Recruit → This Week → Practice → Game Day tactical board → snap animation → Post-game → Next week, polished in the real browser.
3. **V3 — Cutover (done 2026-09-29; criterion evidence in PROGRESS):** meet the contract criterion, then delete the old UI and career presentation.
4. **V4 — Expansion:** RB/CB/WR adapters; events, injuries, NIL alerts; season review, offseason/transfer, season two, retirement, Alumni Wall and Hub.
5. **V5 — Release-boundary gate** for R.

Phases R1–R5 below remain the topical breakdown; execution follows this sequence.

## Guardrails

- Deterministic seeded RNG, career/world separation, stable IDs, both locales, accessibility, PWA/offline.
- A git checkpoint before each structural rewrite (tag `pre-rebuild` at R2 start). The repository stays runnable: the old app remains default until R5 switch-over.
- Presentation never invents football. Boards draw engine evidence only.
- No compatibility layers for prototype saves beyond the single R5 boundary (export + alumni import).
- Verification is experiential. Every slice is checked in the real browser (390 and 1440, both locales, plus 320 for final layouts) with screenshots, plus focused automated tests. Full browser matrices are reserved for R5.

## Phases

### R0 — Audit and rebaseline (complete 2026-09-29)

The four reconciliation documents are written. The M7.5 staged work is committed (`3565ae1`, `00632f9`) as recoverable history.

### R1 — Unified career core

1. **View-model contracts:** `WeekView`, `NextAction`, `DepthBoardView`, `RivalCompareView`, `FocusTileView`, `PracticeReportView`, `SnapBoardFrame`, `PlayResultView`, `PostGameStoryView`, `ProgramCardView`, `PlayerCardView`, `AlumniCardView`. Detached, frozen and localized-key based.
2. **New save line:** a position-generic `CareerV1` built from the position-alpha aggregate (32-program world, 4 slots, two-season lifecycle) with:
   - recruiting for all positions;
   - tactical rules mandatory for every game;
   - no legacy branches.
   Save-line codec and strict migrations policy from here on.
3. **WR engine adapter:** the existing WR resolver, attributes, skills and events behind the common position-engine interface.
4. **Sideline/scout/special-teams reps** for reserve and developmental roles. They are position-owned, deterministic, and feed Practice Form and Trust only.
5. **Metric consolidation projections:** Coach's view (Talent/Trust/Readiness), rival gap, and off-field alerts only when actionable.
6. **Balance harness:** batch simulations of focus plans per role and position to detect dominant plans, zero-decision Saturdays and Body saturation. Tuning follows the data.

### R2 — Design system and shell (can overlap R1 after step 1)

- Tokens, fonts (self-hosted Latin + Hangul), primitives, program identity (colors plus a generated original mark), the icon set, and the `app2` shell with a four-destination IA and desktop rail.
- A dev gallery route with fixture view models in both locales at 320/390/1440.

### R3 — Career loop screens

Creation stepper with a live PlayerCard, recruiting cards and the signing moment, This Week (next action, readiness, focus planner, practice report, events, alerts), the Team depth board, Build, Profile, and the Career Hub/Alumni Wall.

### R4 — Game Day

Pregame graphic; score bug and drive ticker; the SVG Tactical Board with WR/QB/RB/CB overlays; choice preview; deterministic result animation with Skip/reduced motion; sideline reps; the post-game story with defining plays; authored reaction templates driven by real triggers.

### R5 — Save boundary, switch-over and closeout

- Prototype detection, JSON export and alumni import.
- The new app becomes default. Delete the old UI and both old career stacks.
- A new e2e journey suite: 4 positions × full two-season life × both locales × mobile/desktop/320, with offline/retry/transfer.
- A four-position UX parity ledger with screenshots (the former B6).
- Full Tier 3 gate.

## Completion

R closes when:

- a first-time player can create any of the four positions;
- recruit, climb, play Saturdays with football decisions in every role, transfer, finish two seasons and see their alumni card;
- all of this works in both locales on phone and desktop, verified visually;
- all gates are green.

M8 (LB/EDGE, 64 programs, draft) then builds on the unified career.
