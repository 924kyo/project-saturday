# Balance Targets

These are directional metrics for simulation, not hard promises. Codex may refine ranges only with documented reasoning and reports.

## Vertical-slice expectations

- A high-rated recruit at a powerhouse should not automatically start Week 1.
- A mid-tier recruit at a less stacked program should have a plausible early-rotation/starter path.
- Multiple weekly action patterns should appear in simulated successful careers.
- Body-, Preparation-, Confidence/role-, and development-oriented weekly strategies should each be viable in at least one representative context; no global strategy should dominate by optimizing Body alone.
- No skill should be chosen nearly universally across unrelated build contexts.
- Breakthrough rewards should average approximately 4–6 drafts per season and come from multiple progress-source families rather than calendar repetition alone.
- Recovery should matter, but the dominant simulated strategy should not be `recover every fixed N weeks`.
- Promotions/demotions should not oscillate every week without meaningful cause.
- Representative offensive key-decision counts should stay within WR1 6–10, WR2 4–8, WR3 2–6, WR4 1–4, and bench 0–2 while all roles receive meaningful participation feedback.
- Injury risk must remain bounded below 50% per weekly assessment in the vertical slice, increase directionally with low Body, low Durability, greater snap workload, and recent training load, and remain legible through saved component evidence. LIMITED play may reduce opportunities; OUT always produces zero player opportunities for that week.

## Report segments

At minimum segment simulations by:

- recruiting tier/background;
- program prestige/depth strength;
- WR archetype;
- major skill family/build;
- Body/Preparation/Confidence band and weekly focus strategy;
- depth role and projected participation band;
- injury/durability band.

## Long-term 1.0 distribution goals

The game should produce a broad career distribution: stars, starters, role players, transfers, injured/derailed careers, and depth careers. Exact percentages are tuned through player testing and simulation rather than hardcoded here.

## Current M2 skill baseline

The checked-in `packages/testkit/reports/m2-skill-build-baseline.jsonl` is the initial skill-loop evidence, not a final tuning target. Across 64 paired seeds per strategy, three repeated matching actions raise the associated B-grade card weight from 70 to 112. Coverage Ledger appears at 78‰ of film-repeat offer slots versus 42‰ for weight-repeat; Late Set Engine appears at 115‰ for weight-repeat versus 83‰ for film-repeat. A controlled shared-career comparison also confirms that equipped builds change decisions: Coverage Ledger raises low-Body Film Study XP from 15 to 16, while Recovery Window raises Recovery from 32 to 40 Body. Future larger samples may tune magnitudes, but must retain reproducible seeds, paired strategy comparisons, and non-universal outcomes.

## Current M3 depth baseline

The checked-in `packages/testkit/reports/m3-depth-baseline.jsonl` is the initial program/depth evidence. It uses four literal seeds across five identity/program profiles and three repeated six-week strategies for 60 careers and 360 weeks. It covers every recruiting background, recruit tier, program-strength band, WR archetype, and four primary acquired skill families. The current tuning produces 15 careers with a promotion, 2 Body-risk careers with a demotion, 12 careers that start in or reach the top-four rotation band, and no adjacent-week promotion/demotion reversal. National blue-chip careers do not start automatically, while Builder careers can earn rotation through the practice-push path. Every room consumes 35 RNG draws and every authoritative transition is round-trip checked. These values are evidence for the vertical slice, not permanent distribution promises.

## Current M5 skill checkpoint

The 40-card catalog meets the target 8/7/10/5/6/4 family split with 13 explicit tradeoffs and no removed or reinterpreted prior card. Exhaustive seeded reachability checks cover every legal offer; focused mechanical evidence distinguishes Development XP/Practice, Game Day information/execution, and Body recovery/injury-risk builds. Injury-risk skill effects aggregate additively around 1,000 permille in equipped slot/effect order and clamp to 500–1,500 permille. These are bounded system contracts; pick rates and season-level build success remain for the M5 report rather than being inferred from catalog tests.

## Current M5 full-season baseline

The checked `packages/testkit/reports/m5-season-baseline.jsonl` contains six literal, fully reloaded careers with 72 regular-season and two player postseason games. It covers all three recruit tiers, program-strength bands, and WR archetypes; five weekly strategies; six skill-choice/build policies; 28 observed event IDs; both rest/rehab and play-limited injury decisions; every depth role and skill family; two qualifiers; and four non-qualifiers. One Builder possession path reaches starter, while National and Contender paths include developmental, reserve, and rotation evidence. Three careers incur injuries and three reach an injury choice. This small crossed sample proves coverage and deterministic plumbing rather than population balance; final M5 profiling and later large-batch tuning must not treat its qualification, injury, or role percentages as target rates.

## M7 current gauge probe — 2026-09-12

A bounded twelve-week public-command probe uses seeds `direct-position_qb`, `direct-position_rb`, and `direct-position_cb`, Ember Peak Polytechnic, late-bloomer disciplined/leader identities, each position's first archetype, first offered event/snap/skill choices, and rest/rehab. Balanced rotates position drills with Film/Study and Recovery; Development uses the first drill/Weight Room/Recovery; Preparation uses the second drill/Film/Recovery. Injury-unavailable focuses fall back to Recovery. The same three strategies are protected by the exact-reload twelve-week domain suite.

| Position | Balanced draft weeks | Development draft weeks | Preparation draft weeks |
| --- | --- | --- | --- |
| QB | 3, 5, 7, 9, 11 | 3, 5, 8, 10, 12 | 2, 4, 6, 8, 10, 12 |
| RB | 3, 5, 7, 9, 11 | 3, 5, 8, 11 | 3, 5, 7, 9, 10, 12 |
| CB | 3, 5, 7, 9, 11, 12 | 3, 5, 8, 10, 12 | 2, 4, 6, 8, 10, 11 |

This small probe meets the 4–6 drafts/season starting target with different source mixes and timing. Serialized saves range from 487,447 to 558,313 bytes (probe display name `Gauge Probe`, 188 cm/92 kg/default appearance). It is coverage evidence, not a population balance claim. Historical M1–M6 report bytes remain unchanged; a larger current multi-season balance report still belongs to M7 closeout.

## M7 current two-season retention probe — 2026-09-14

Built-package current QB/RB/CB careers use seeds `direct-position_qb/rb/cb`, display name `Archive Probe`, Ember Peak, the first archetype for each position, late-bloomer disciplined/leader identity, 188 cm/92 kg/default appearance, first drill + Film + Recovery, first actual event/snap/skill choices, rest/rehab and declined/expired NIL offers. The first saved shortlist branches to Stay and its first transfer offer. Every command round-trips through the tagged current wire writer and strict reader; the unchanged 1 MB UTF-8 guard is checked on every payload. A three-Recovery fallback occurs once for RB and CB, never for QB.

| Position | Transfer destination | Peak persisted bytes across both branches | Largest measured gameplay command | Commands with exact wire reload |
| --- | --- | --- | --- | --- |
| QB | Capital Commonwealth | 570,257 | 386.157 ms | 420 |
| RB | Amber Coast | 561,832 | 401.382 ms | 373 |
| CB | Kingsport Technical | 529,270 | 352.133 ms | 407 |

All six paths reach the second validated season review. QB/RB Stay include two second-season playoff games; both transfers and both CB branches are non-qualifiers. Original retained first-season archives are 142,341 / 141,758 / 131,976 bytes. Expanded runtime records remain 1.20–1.39 MB; no evidence is discarded. The earlier raw QB Stay payload crossed 1 MB at 1,009,113 bytes, motivating the explicit lossless wire contract; the measured persisted payloads now pass without raising that limit. Timings exclude serialization/validation round-trip cost, and are coverage/profile evidence, not mobile-device or population-balance claims. This probe predates current final alumni completion and does not replace its remaining gate or the browser/full M7 gate.

### Final current completion verification

Final current completion rerun: `corepack pnpm --filter @project-saturday/testkit profile:m7-current` is now a repeatable built-package command. On 2026-09-14 all six paths reached actual alumni completion and all 1,206 snapshots were compared for complete domain equality after compact-wire reload. Current completion adds no RNG, player reset or third program stint. Peak persisted bytes across both branches are QB 572,549 / RB 563,962 / CB 531,493; largest measured gameplay commands are 526.491 / 531.809 / 489.148 ms. The CLI enforces the unchanged 1,000,000-byte and 1,000-ms bounds. These are deterministic coverage and host-profile results, not a mobile performance or population-balance claim.

Final M7 Home-context profile rerun (2026-09-14): the same six completed Stay/transfer paths retain exactly 1,206 complete-domain wire reloads (QB 422 / RB 375 / CB 409) and the same peak persisted bytes (572,549 / 563,962 / 531,493). Largest gameplay commands measured 527.868 / 533.561 / 495.508 ms respectively. All unchanged 1 MB/1,000 ms guards pass; historical M7 public-builder scenarios measure 47.796–82.114 ms under their unchanged 10-second bound. These host measurements do not claim real-device population performance.

### Paged wire correctness profile — 2026-09-14

The actual browser-life policy exposed a valid v2 single-archive overflow at QB UUID suffix 4, revision 207 (1,061,282 expanded regular-history characters). Explicit wire v3 fixes that seed through Stay and transfer with 356 exact reloads. The unchanged domain and historical readers remain protected; this is a transport fix, not balance tuning.

All six original-strategy v3 paths now also complete with the same 1,206 exact reloads (QB 422 / RB 375 / CB 409). Measured maxima include the fixed envelope overhead; the checksum itself is validated by storage tests.

| Position | Whole-envelope bytes | Largest page bytes | Largest expanded page characters | Gameplay command ms |
| --- | ---: | ---: | ---: | ---: |
| QB | 611,674 | 47,871 | 298,570 | 528.230 |
| RB | 602,540 | 45,673 | 287,465 | 780.508 |
| CB | 569,942 | 46,013 | 286,721 | 524.143 |

Both browser-life UUID seed sets also complete all twelve Stay/transfer paths, with zero Recovery fallback. Together with the original strategy, all eighteen completed paths retain 3,155 exact full-domain reloads. The seeds use prefix `career-seed:77777777-7777-4777-8777-` and the suffixes below.

| Position / seed suffix | Reloads across branches | Whole-envelope bytes | Largest expanded page characters | Gameplay command ms |
| --- | ---: | ---: | ---: | ---: |
| QB / 000000000001 | 342 | 610,001 | 418,191 | 522.000 |
| RB / 000000000002 | 400 | 624,692 | 489,831 | 702.473 |
| CB / 000000000003 | 264 | 533,981 | 203,921 | 583.494 |
| QB / 000000000004 | 356 | 614,776 | 420,120 | 936.346 |
| RB / 000000000005 | 319 | 546,632 | 205,239 | 488.555 |
| CB / 000000000006 | 268 | 531,670 | 204,967 | 469.615 |

All unchanged 1 MB/1,000 ms/codec guards pass. Peak compressed history page across the matrix is 48,374 bytes. The suffix-4 command peak includes overlapping content-test load; its earlier isolated reproduction measured 590.954 ms. These are host observations, not real-device or population-balance claims. The isolated full automated gate and final native matrix subsequently pass (88 passed / two intentional mobile-only skips), completing M7 verification.

## Current M6 off-field/offseason baseline


The checked `packages/testkit/reports/m6-off-field-transfer-baseline.jsonl` contains six literal careers with 295–399 exact round trips each. It crosses all three recruit tiers, archetypes, and starting program bands; three relationship strategies and all up/flat/down results; safe/ineligible inputs and eligible/warning/ineligible checkpoint outcomes; all accept+fulfill, accept+default, and decline NIL policies; three Stay and three transfer decisions; every staff-change outcome in the projected world, including one selected scheme shift; and developmental, reserve, and starter next-season roles. Seven original NIL offers appear. This is a compact coverage matrix, not evidence for target transfer, academic-risk, NIL uptake, staff-change, or role percentages.
