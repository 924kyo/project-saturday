# Spec conformance — 1.0 release candidate

Date: 2026-09-30.

The shipped game is **Career VNext**. `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md` describes it (updated for the RC) and wins over older spec text where they differ (`PRODUCT_REBASELINE.md`).

The product specs below were written before the R rebuild. They carry two kinds of text:
- durable intent, which the release is measured against;
- milestone-numbered contract sections (M3–M7.5). Those describe the pre-R aggregates (WR career, position-alpha sessions). The aggregates are kept only so historical saves, replays and reports stay exact; the shipping app no longer writes them.

Status key:
- **Met**: the intent ships as written.
- **Met, adapted**: the intent ships with a documented design change.
- **Partial**: see `KNOWN_LIMITATIONS.md`.

## ADRs

| ADR | Status | Evidence |
| --- | --- | --- |
| 0001 Web/PWA first | Met | React/Vite PWA; the Tauri desktop shell wraps the same build |
| 0002 Pure game core | Met | `check-boundaries.mjs` forbids browser and UI APIs in `game-core` |
| 0003 Seeded RNG | Met | named derived streams (contract §6); `Math.random` is lint-forbidden in gameplay |
| 0004 Fictional programs | Met | `M10_ORIGINALITY_REVIEW.md`, `copy-audit.test.ts` |
| 0005 Localization first | Met | typed message keys, locale parity tests, `check-localized-copy.mjs` |
| 0006 Repository-driven autonomy | Met | `PROGRESS.md`, exec plans, `DECISION_LOG.md` |

## Product specs

| Spec | Status | Shipped behavior and deviations |
| --- | --- | --- |
| CORE_BELIEFS | Met | Flow-first weekly loop, sideline reps so every role plays Saturday, bilingual parity |
| CORE_LOOP | Met, adapted | Week: plan three focuses → practice report → optional scenes (breakthrough, event, NIL, injury) → Game Day → post-game. Four seasons, with an offseason stay/transfer/declare decision |
| PLAYER_MODEL | Met | Six positions, 18 archetypes, backgrounds, traits, appearance; measurables stored metric and shown in the locale's units |
| SKILL_SYSTEM | Met, adapted | 100 cards, four equipped slots; breakthrough gauge at 80 buys one card from three weighted offers (DECISION_LOG R V4 build) |
| TRAINING_AND_BODY | Met, adapted | Focus XP ×3, Recovery +20 Body, practice grade, confidence reverts toward 60 (M10) |
| DEPTH_CHART | Met | Room evaluation and snap-share projection; each new season is a fresh depth competition |
| GAME_SIMULATION | Met, adapted | Every Saturday plays through key snaps on the Tactical Board. The world simulates in aggregate; overtime decides ties (M8) |
| GAME_DAY_PRESENTATION | Met | Pure snap-board frames from saved results; animation replays saved results only; reduced motion removes animation |
| EVENT_SYSTEM | Met | 254 events with eligibility by position, tags and context, on per-week named streams |
| NIL_AND_OFF_FIELD | Partial | NIL deals pay, raise brand and cost practice time. Academics use the checkpoint rule. The team-relations and media tracks are folded into brand and the locker room. 10 deal templates |
| INJURY_AND_RECOVERY | Partial | Convex risk in Body, rest or play-limited choices, truthful rest credit (M10); 8 outcomes |
| PROGRAM_WORLD | Met | 96 programs, 8 conferences of 12, original identities and palettes, familiarity from the Alumni Wall |
| LEAGUE_AND_POSTSEASON | Met | Three non-conference rounds plus nine conference games; a 12-team bracket (eight champions, four at-large, top-four byes). There are no bowls outside the bracket |
| RECRUITING_AND_PROGRAM_CHOICE | Met | Four offers, each with an honest depth preview from the same stream as the committed room |
| TRANSFER_AND_OFFSEASON | Met | Stay plus three destinations (reach, fit, role) around current ability |
| DRAFT_AND_CAREER_ENDINGS | Met, adapted | Transparent stock blend shown as a band; declare after the junior season, retire, or complete four seasons. No combine |
| META_PROGRESSION | Met, adapted | Alumni Wall, record book, familiarity, mentors, cameos. Legacy is information only, with no unlock rewards |
| ROSTER_IDENTITY | Met | Stable name-token IDs; reserved real-person combinations are never shown (M10) |
| CAREER_MANAGEMENT | Met, adapted | New Career with confirmation keeps the Alumni Wall. No reset-all-data control |
| SAVE_SYSTEM | Met, adapted | Lean integrity: a checksummed envelope with structural validation, a last-good backup with recovery, checked migration fixtures, persistent storage requested. The M7.5 registry and replay contracts apply to historical data only |
| UX_AND_FLOW | Met | One focal action per screen, Week/Build/Team/Profile tabs, contextual help |
| LOCALIZATION | Met | ko-KR and en-US in every change; Intl USD currency formatting in the app language; en-US ft-in/lb |
| ART_AND_PRESENTATION | Met | Original "Saturday Broadcast" design system, generated crests, program palettes with contrast-safe ink |
| CONTENT_DENSITY | Partial | See the table in `KNOWN_LIMITATIONS.md` |
| BALANCE_PHILOSOPHY | Met | Checked 36-career report with bands (`docs/qa/BALANCE_TARGETS.md`) |

## Engineering specs

| Spec | Status | Notes |
| --- | --- | --- |
| CODING_STANDARDS | Met | Enforced by eslint, typecheck and the boundary check |
| CONTENT_ARCHITECTURE | Met | Stable IDs, typed catalogs, validators in `game-content/src/validation` |
| TEST_STRATEGY | Met | Tiered gates (`TEST_GATE_TIERS.md`); orthogonal e2e by default, full matrix at release |
| PERFORMANCE_AND_PWA | Met | Command, save and bundle budgets tested; throttled phone transitions under 1.5 s; offline and update flow tested |
| DEBUG_AND_DEVTOOLS | Met, adapted | Balance and report CLIs in `testkit`; no in-app developer surface ships |
