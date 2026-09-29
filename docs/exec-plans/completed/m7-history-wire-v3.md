# M7 — Long-career wire correctness

Status: complete and verified, 2026-09-14. M7 is complete and verified on 2026-09-14: 1,069 workspace tests/111 files, eight script checks, explicit 351 content and 343 simulation cases, typecheck/lint/format/whitespace, build/export/PWA and the full production browser matrix (88 passed / two intentional mobile-only skips, 38.4 minutes). All twelve native two-season paths pass, including the reproduced overflow seed, offline/retry, transfer, alumni and New Career. Eighteen full profiles retain 3,155 exact reloads under unchanged limits. Continue with M7.5 B1, not M8.

## Verified closeout

M7 is complete and verified on 2026-09-14: 1,069 workspace tests/111 files, eight script checks, explicit 351 content and 343 simulation cases, typecheck/lint/format/whitespace, build/export/PWA and the full production browser matrix (88 passed / two intentional mobile-only skips, 38.4 minutes). All twelve native two-season paths pass, including the reproduced overflow seed, offline/retry, transfer, alumni and New Career. Eighteen full profiles retain 3,155 exact reloads under unchanged limits.

Current build: 344 modules; core/football/content/locales/entry 313.58/254.11/356.92/344.17/94.98 kB; all 21 PWA resources (1814.68 KiB) verified; both career chunks remain lazy. Browser output: `test-results/m7-v3-final`. No process remains live. The earlier long-save/Hub-delay findings pass all twelve native current-career paths. Historical progress notes below preserve the implementation sequence and do not reopen completed work.

## Evidence and goal

Core and shipped adapter checkpoint: 18 focused page/archive/wire/migration cases plus three shipped position cases, repository typecheck/lint and core/content/testkit builds pass. The exact overflowing QB browser-life seed passes both Stay/transfer through actual retirement with `--wire-v3`: 356 exact reloads, peak wire 614,619 bytes / command 590.954 ms, zero fallback. All six original-strategy careers also pass with 1,206 exact reloads. Full browser-life seed sets and aggregate/native gates remain required.

The final native matrix exposed a second-season QB save failure. The opt-in current browser-life profile reproduces it from `career-seed:77777777-7777-4777-8777-000000000004`, default QB creation at Ember Peak, Film/Recovery/Study, first offered skill/event/snap and first available NIL action, rest/rehab, then Stay. At revision 207 the valid regular-history array expands to 1,061,282 JSON characters. Encoding the whole array in one `json_archive_v1` correctly rejects it at the existing 1,000,000-character expansion limit.

Make every required current two-season path persistable without increasing that codec limit, the 1 MB envelope limit, dropping evidence or changing gameplay. The prior training/decline profile alone is insufficient coverage.

## Read before implementation

- `SAVE_SYSTEM.md`, `CAREER_MANAGEMENT.md`, `LOCALIZATION.md`
- `ARCHITECTURE.md`, package AGENTS, `TEST_STRATEGY.md`, `PERFORMANCE_AND_PWA.md`
- Current session strict reader, wire v2, `json-archive.ts`, prior-season archive reader
- Shipped mechanics adapter, version-neutral persistence engine, v2 codec and Hub readers
- Current wire/migration/persistence/Hub/App tests and current profile CLI

## Atomic sequence

1. Preserve the completed Hub candidate-filter/copy and atomic snapshot-pruning checkpoint with its static, focused, aggregate/content/build evidence before changing wire compatibility.
2. Stage `position_alpha_session_wire_v3`, keeping the complete gameplay value `PositionAlphaSessionV2`. Encode contiguous history pages of at most four original records using `json_archive_v1`. Accept at most three regular pages/twelve records and one postseason page/two records. Empty history is an empty page list; all non-final pages contain exactly four records. No optional alternate encodings or arbitrary chunk sizes. Per-page codec limits remain unchanged.
3. Add strict new wire parse/serialize and shipped adapters. Check the overall UTF-8 limit before publishing; reject extra/shadowed fields, malformed/sparse/noncanonical/oversized pages, future tags and invalid decoded gameplay. Return detached immutable values. Preserve exact v1/raw-v2/wire-v2 readers, migration and domain semantics, including both RNG streams and the existing prior-season proof.
4. Reproduce the failing profile with wire v3 before browser activation. Cover full current-life and original strategy paths, all positions, both Stay/transfer, actual retirement and exact whole-domain reload after every command. Record page/whole-envelope sizes and unchanged command bounds. A new overflow elsewhere remains a bug, not permission to raise limits.
5. Add envelope version 3 on the shared persistence engine. Read original v1/v2/v3 envelopes without writes; checksum original data before parsing. Protect version 3 from older writers even on replacement. Keep current/snapshot/selector/completion/pruning publication atomic, with exact retry and unchanged retention. Hub history/identity/recovery/retirement must understand all three encodings and preserve an equivalent existing proof byte-for-byte.
6. Activate App through the new codec while retaining the same explicit domain commands and bilingual UI. Update only current-browser assertions to version 3; keep literal old-version tests rather than rewriting their fixtures as new history. Run the long native careers with pinned seeds and retained failure artifacts, including the reproduced boundary and completed-New-Career delay.
7. Run the complete M7 gate, profiles, final 90-browser matrix, audit and document synchronization. Close/archive this and the M7 plans only when every acceptance item passes. Immediately activate M7.5, not M8.

## Required regression evidence

Native partial checkpoint: all 45 mobile executions pass, including all six current two-season paths, the reproduced QB seed, actual retirement/alumni/New Career, offline/retry and 320 px. Desktop early regressions also pass; its long paths remain in progress. The complete matrix is still required before closing this plan.

Final pre-browser gate is green: 1,069 workspace/eight script cases, 351 content, 343 simulations, typecheck/lint/format/whitespace/build/PWA and all eighteen profiles. The 90-execution native matrix is running with two workers, no concurrent heavy checks, and first-failure stop; output is `test-results/m7-v3-final`. It has passed the first 28 mobile regressions/Hub journeys; current two-season native paths remain in progress. Do not close the plan on a partial matrix.

Isolated gate: all 351 content cases, 1,069 workspace tests/111 files, eight script checks and repository-wide formatting/whitespace pass. Both earlier strategy timeouts pass unchanged in the isolated content and full workspace runs. Explicit simulation and final static checks are finishing before the native matrix.

Full profile matrix passes all eighteen original/browser-life Stay/transfer paths: 3,155 exact whole-domain reloads, maximum envelope 624,692 bytes, compressed page 48,374 bytes, expanded page 489,831 characters and command 936.346 ms. The exact overflow seed also has an isolated 590.954 ms probe. No limits changed. An overlapping content run had two five-second strategy timeouts; profiles are now finished and the isolated content/workspace/simulation/static gate is running before native verification.

Complete web regression passes all 375 tests across 28 files, retaining old WR/current-program recovery and current migration/Hub/retry coverage. Explicit content, full workspace/simulation, remaining browser-life profile paths and native matrix remain open.

App checkpoint: all 24 bilingual direct-publication/completion cases and final static/format/build/export/PWA pass. Current browser now writes v3; both career chunks remain lazy and all JS remains under 500 kB (21 precache / 1814.68 KiB). All six original-strategy careers pass with 1,206 exact reloads; browser-life sets are running before aggregate/native closeout.

Storage checkpoint: all 56 focused v3/v2/Hub cases and repository static checks pass. Native and memory mixed-version reads do not rewrite; both older writers reject v3 even with replacement; all three alumni envelope versions remain byte-for-byte proofs through upgrade/retirement; malformed tuples and future versions fail closed. Native pruning abort leaves current and snapshots unchanged, and exact retry retains thirty records. Full profile matrix is running with whole-envelope/page telemetry.

- A valid history exceeding the single-archive limit is losslessly paged; each page remains under its existing safety limit and the whole current envelope stays below 1 MB.
- Exact JSON/domain round trips and unchanged caller ownership/RNG across current preparation, snap, season, transfer, retirement and old migration boundaries.
- Missing/extra/reordered/overfull/short-intermediate pages, forged gameplay, archive bombs, shadowed root fields, future tuples and oversized UTF-8 inputs fail closed.
- Current and recovery snapshots may contain all supported versions; no eager rewrite, stale overwrite, lost prior alumni or partial transaction.
- Native failure/exact retry, both locales, all four positions, offline/PWA, 320 px, keyboard and all prior report/migration gates remain green.

## Non-goals and risks

No new football rules, tactical frames, skill tuning, save-limit increase, cloud service or UI bypass. The prior-season source archive remains literal; verify its actual bound in all full-career profiles. Pages may reduce cross-week deduplication, so measure real bytes rather than assuming the new format fits. Version-aware Hub work must not silently decode v3 through a v2 reader or replace old completed proofs merely because their encoding differs.
