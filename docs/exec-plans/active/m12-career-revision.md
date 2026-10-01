# M12 — Career Revision (exec plan)

**Goal:** a convincing college-football player career.
- Create a distinct athlete and earn opportunities.
- Develop through four seasons and navigate people and programs.
- Pursue honors and the draft.
- Leave a legacy that matters to the next career.

**Requirements:** `docs/execution/M12_REQUIREMENTS.md` (the definition of done).

## Architecture principles

These follow the project invariants.

1. **Rules live in game-core.**
   - Every new system is a pure function over `CareerVNext` plus mechanics, with its own named seeded stream (`:vnext:<purpose>:…`).
   - Presentation never computes a gameplay rule; it calls core projections (for example, `injuryRiskBreakdownVNext`, `planPreviewVNext`, `roleStatusVNext`).
2. **Saves use optional fields with documented defaults.**
   - `CareerVNext` stays at version 3; new state is optional and absent means the empty baseline (the M8 precedent).
   - The codec validates each new field only when it is present.
   - rc.3 fixtures (mid-season, offseason, complete) must load and continue.
3. **Kernels stay literal.**
   - New kernel behavior is gated by input flags set only by VNext (like `sceneRules`), so historical sessions and replays are unchanged.
   - The clock jitter uses a string hash of the game ID and snap, not an RNG draw.
4. **Content and locale.**
   - New catalogs (program profiles, story beats, workshop prices, legacy perks, gear) live in game-content with schema tests.
   - Every key ships in en-US and ko-KR in the same change.
5. **IDs are stable** and never derived from display names. People are referenced by roster ID or by generated staff IDs.
6. **One currency per purpose.**
   - NIL dollars: services and gear.
   - Insight: cards.
   - Legacy points: cross-career unlocks.
   - They are never merged.

## New state, all optional on `CareerVNext`

| Field | Holds |
| --- | --- |
| `athlete.creation` | Allocation, preset ID, home region (narrative), legacy perks applied |
| `athlete.potential` | Derived and stored at creation (background curve ID) |
| `development` | Camp, midseason commitment and offseason program records per season |
| `people` | Cast entries (rival, coach, captain, reporter) with relationship values and a memory-flag set |
| `story` | Pending story beat, beat history and season goals |
| `cards` | Insight balance, mastery levels, duplicate count, pity counter, draw history |
| `shop` | Owned gear cosmetics, equipped gear, NIL purchases ledger |
| `legacyClaim` | Legacy points credited at completion (written into the alumni plaque) |

Profile-level storage (device), outside the save:

| Store | Holds |
| --- | --- |
| `career-vnext-legacy` (profile store) | Legacy point balance, unlocked perks and claimed career IDs; claims are idempotent per career ID |

## Phases and order

The order follows dependencies; each phase lands as complete vertical slices.

| Phase | Name | Contents |
| --- | --- | --- |
| 1 | Match feedback | MATCH-01…15: execution explanations, leverage-scored highlights, tri-part results, clock jitter, five-band outlook, look variation, copy audits, branch fixtures |
| 2 | Development calendar and explanations | DEV-01…09, CRE-02 (potential): camp, midseason review, offseason program, risk breakdown, plan preview, milestones |
| 3 | Creation and identity | CRE-01…10: allocation and presets, source breakdown, scouting report, appearance expansion, full-body figure, names, name display, home region |
| 4 | Schools and transfers | REC-01…07: program profiles driving scheme fit, XP, exposure, NIL market and academics; offer comparison and rationale; transfer consequences; coordinator changes |
| 5 | Roles and depth | ROLE-01…06: role status, demotion credibility, role-aware scenes, movement reasons |
| 6 | Relationships and narrative | REL-01…08: cast, story beats with memory, year goals, interviews and reputation, personality |
| 7 | Cards, Insight and NIL economy | CARD-01…08, NIL-01…03: attribution, workshop, draws with odds and pity, mastery and fusion, senior slot, NIL shop, style tokens |
| 8 | Legacy | LEG-01…06, CAR-02/05: legacy points, unlocks, mentor choice, Hall of Fame, Combine |
| 9 | UI and information architecture | UI-01…08: Team/Profile sub-tabs, change-first week, compact post-game, glossary, top-25 |
| 10 | Accessibility, compatibility and validation | A11Y, COMPAT, CAR-01, harness routes (novice, ordinary, optimized × positions × backgrounds), four-year careers, carryover flow, full gate, desktop build, EN/KO UI review |

Each phase ends with:
- focused tests;
- the requirements matrix and PROGRESS updated;
- a local commit.

The full gate runs at phase boundaries 5 and 10 and before the final handoff.

## Validation plan

**Harness** (`packages/testkit`). It adds `m12-careers`, which plays four-year careers on three routes:

| Route | Plan | Reads | Card picks |
| --- | --- | --- | --- |
| Novice | Recommended preset; balanced plan | 45% right | Random |
| Ordinary | — | 65% right | — |
| Optimized | Two position focuses plus recovery | 90% right | Planned |

These routes run across all six positions and three backgrounds. The harness reports:
- annual overall gains;
- role timeline;
- awards;
- draft outcome;
- Insight and NIL flows;
- relationship values;
- legacy points.

Assertions cover:
- target bands;
- background and personality differences;
- transfer differences.

**E2E:**
- a create → week → game → resume journey;
- a full carryover journey (completed-career fixture → new career sees perks);
- the motion override under emulated reduced motion;
- 390px layouts for the new screens.

**Direct UI review:** EN and KO screenshots of every changed flow (`scripts/capture-screens.mjs` plus targeted captures).

## Risks

| Risk | Mitigation |
| --- | --- |
| Save size | Story and card histories are bounded (last 40 entries); the log is still per season |
| Balance drift | Award and draft thresholds are re-based only from harness evidence, never to pass a test |
| Test budget | Long e2e journeys get explicit budgets with a comment; real slowdowns are investigated (WebKit ~20s is noted in PROGRESS) |
