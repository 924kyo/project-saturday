# Project Progress

> Primary resume checkpoint. Historical detail is preserved under `docs/execution/progress-archive/`.

## Target

M10 — 1.0 Release Candidate (unchanged).

## Current milestone

M7.5 — Career operations and Game Day experience.

## Status

IN PROGRESS. M7 and M7.5 Phase A complete; B1 tactical evidence staged, not live; B1c shared WR presentation verified 2026-09-29 (App still v7). Bounded efficiency/desktop snapshot detour complete. B6 Four-position UX Parity Pass is mandatory after B2–B5, before Phase C and M8. M10 unchanged.

## Last completed task

Shared read-only WR v7/v8 presentation (2026-09-29, Claude handoff session). Career/Season/Game/Program/Off-field/Skill surfaces accept both saved versions; explicit saved `SNAP_RESOLVED` panel with separate continuation; tagged two-season review (both retained seasons, career totals, explicit retirement) and current two-season completion panel. Off-field projection validates v7 or full-source v8 and reads relationships via new pure `projectRelationshipContextV1`. Paired ko-KR/en-US copy. Shared real v8 auto-player test helper; 11 new presentation cases. No App activation or B6 claim.

## Current / next task

B1c: connect App/Hub ports to the staged v8 dispatcher, atomic storage and eight-entry history page alongside equivalent added-position current aggregate retention; then coordinated activation (browser save writer change ⇒ full production browser matrix trigger). Preserve original proofs and bounded per-envelope/command budgets. B1d/B2–B6/Phase C still precede M8.

## Active exec plan

- Completed bounded detour: `docs/exec-plans/completed/m7-5-desktop-snapshot.md`.
- Tactical task: `docs/exec-plans/active/m7-5-tactical-evidence.md`.
- Parent: `docs/exec-plans/active/m7-5-playtest-correction.md`.
- Queued after B2–B5: `docs/exec-plans/active/m7-5-four-position-ux-parity.md`.

## Current compatibility boundary

- WR shipping: CareerRunV7 / CareerSessionV7 / envelope 7 / MetaProfileV1. Staged v8 supports neutral migration, source-replayed current games and explicit two-season review/completion; staged WrMetaProfileV2 preserves literal legacy alumni plus archived-source current alumni. No browser alias/writer activation.
- QB/RB/CB: PositionAlphaSessionV2; current wire/envelope 3 and PositionAlphaPersistenceV3 writer; history pages max four records, 30 snapshots, atomic pruning.
- Shipping checkpoint: completed M7 four-position game flow, M7.5 Phase A hotfixes and Career Hub. Staged `tactical_game_v1` QB/RB/CB paths have no shipping caller.
- No gameplay rules or RNG may move to React/native packaging. Historical abstract outcomes remain literal.

## Latest green verification

- Presentation scope (2026-09-29 ~16:30 KST): 404 web cases/31 files, 363 content, 322 core; repo typecheck, lint/boundary/localized-copy, scoped format/whitespace; build/export/PWA (360 modules, 21 entries/1847.98 KiB, football 429.31 kB, all JS < 500 kB). No browser run (no writer/codec/shell change). Handoff re-check before edits: repo typecheck/lint and 14 focused v8 command/wire cases green.
- Tier: Tier 1 unselected save-8 codec atomic gate; terminal non-browser integration green, full B1 and live writer/browser integration pending.
- Date: 2026-09-14, approximately 20:41 KST (registry); codec 20:23; full domain/workspace/build 20:15; native build 17:59, actual offline smoke approximately 18:07.
- Static: repository typecheck, lint, architecture/localized-copy checks, scoped format and whitespace pass.
- Latest frontend-port scope (approximately 21:29 KST): two full two-season command paths pass (41.84 seconds); 12 wire/atomic/history cases pass (13.24 seconds), web typecheck and scoped lint/format pass. Historical registry details remain literal; eight-entry pages do not call store-wide history scans. Shared visual/App integration remains next; none of these adapter tests establish B6 parity.
- Latest atomic scope (approximately 21:11 KST): 390 web cases/29 files plus final 11-case missing-manifest sentinel regression pass. Real two-season retirement/retry and exact cross-store rollback pass on both adapters, each measured retirement below 1,000 ms. Repo static, final scoped lint/typecheck/format/whitespace and production/export/PWA pass. Details: `docs/qa/M7_5_WR_V8_STORAGE.md`.
- Shared-engine scope (approximately 20:59 KST): all 388 web tests/29 files, repo static and whitespace pass. Legacy v7 facade remains selected. Staged v8 actual Game Day save/failure/retry/reload and every original-version proof/recovery pass through the same conflict/locking engine. Atomic alumni completion still pending; no live writer/browser matrix claim.
- Latest wire scope (approximately 20:50 KST): 61 affected storage cases, four core registry cases, repo static/core export/format/whitespace pass. Fixed 256-entry pages and constant-size checksum-bound manifest reject missing/reordered/duplicate/mixed-revision/same-revision mixtures; actual legacy/current detail identity/source and terminal envelopes pass. No storage writer selected yet.
- Registry scope: 390 core/testkit and ten real-season content cases pass; all four updated actual-life profiles exit 0 with identical 2,394 reloads/100 games/four alumni. Maximum operation/assertion batch 600.910 ms and parse 50.258 ms. Synthetic 1,000-reference indices plus actual new retirement use 140,360–140,962 bytes and 89.914–106.630 ms; not a claim of 1,000 played/stored careers. Wire/transaction verification next.
- Latest codec scope: 52 storage/IndexedDB regression cases, web typecheck, focused lint/format, boundary/localized-copy and whitespace pass. Original v1–v7 proofs and all current Game Day saved boundaries covered; no storage engine or active writer changed.
- Tests: full workspace 1,126 cases/117 files plus ten script cases pass in 94.33 seconds; final focused comparator regression passes. Four full domain profiles exit 0: 2,394 session reloads, 100 games/389 snaps/82 events/five injury choices, four preserved alumni plus genuine mixed-legacy tests. Peak envelope estimate 339,307 bytes; meta 313,774 bytes at four alumni; max operation/assertion-batch 543.705 ms and session parse 45.623 ms. Static/format/whitespace and export builds pass. No actual storage/UI retirement claim.
- Desktop-focused checks: two new configuration tests, focused lint/format, architecture/localized-copy and whitespace pass. No new gameplay changes; unchanged green game suites not rerun.
- Browser: last shipping M7 matrix `test-results/m7-v3-final`: 88 passed / two intentional mobile-only skips; all twelve native two-season careers including transfer/Team/retry/retirement/Hub passed. No new browser run claimed for staged-only engine changes.
- Build/PWA: production/export/PWA passes: 357 modules, 21 precached resources / 1829.63 KiB, football chunk 419.82 kB, all JS below 500 kB, both career screens lazy. Shipping v7 writer semantics/rules remain unchanged; new v8 facade is unselected. Desktop executable remains the earlier verified snapshot, not rebuilt for this staged-only update.
- Desktop: actual executable and NSIS produced; app launch/key snap/post-game/Hub/both locales/offline/exact relaunch pass, zero page errors. Installer installation/uninstallation not exercised. Full details/hashes in `apps/desktop/README.md`.

## Desktop artifacts

- Application: `C:\project-saturday\apps\desktop\src-tauri\target\x86_64-pc-windows-msvc\release\project-saturday.exe` (8,762,368 bytes).
- NSIS: `C:\project-saturday\apps\desktop\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Project Saturday_0.7.5_x64-setup.exe` (217,762,512 bytes).
- Commands: `pnpm desktop:dev`, `pnpm desktop:build`, `pnpm desktop:smoke`. Unsigned local snapshot, not M10 release. Rust local tooling installed; sandbox Schannel required a permitted unsandboxed native build/launch. Never disable TLS checks.

## Recent checkpoints

1. 2026-09-29 — Claude handoff. Repository matched PROGRESS except: git history is squashed (two checkpoint commits, no per-task trail); pure selectors in `career-ui`/`program-ui`/`skill-ui` already accepted v7|v8 via `wr-view.ts` (unrecorded start of this task). Shared presentation then completed as above.
2. 2026-09-14 — Four full WR playing paths expose second-season review failure; harness 68 cases/static/build green, full-life profile exits 1. Peak estimate 319,644 bytes, max command/parse 99.237/42.149 ms. Versioned terminal fix next.
   Follow-up: explicit v8 review and full source-replayed records now pass 386 core/testkit + ten season content; all four paths reload the new review. Retirement is next, with no full-life completion claim.
   Terminal follow-up: explicit retirement/lossless alumni/mixed meta now pass four full domain profiles and 1,126 workspace/ten script cases plus build/PWA. Browser codec/persistence/activation remains next.
   Codec follow-up: unselected save-8 decoder/creator passes 52 storage cases and scoped static checks; original proofs remain literal. Meta capacity/registry and atomic engine integration next.
   Registry follow-up: 390 core/testkit + ten content/static/export/format checks and four actual-life/capacity profiles pass; paged wire/detail authentication and actual atomic storage remain next.
   Wire follow-up: 61 storage/four focused core plus repo static/export/format checks pass; 8,000-entry paging and real terminal/detail envelopes verified. Shared engine/atomic transaction integration next.
   Engine follow-up: 388 web cases plus repo static/whitespace pass; staged v8 uses the existing locking/conflict/recovery engine, original proofs retained and foreign snapshots excluded. Atomic retirement/meta publication next.
   Atomic follow-up: 390 web/final 11-case sentinel/static/build gate passes; actual memory/IndexedDB rollback/retry, legacy migration and two successive current alumni persist exactly. Frontend/Hub and equivalent four-position current aggregate integration remain next.
   Frontend-port follow-up: two complete Stay/transfer command paths and 12 wire/atomic/history cases plus scoped static gate pass. Shared view types/resolved and two-season panels/App wiring remain next.
3. 2026-09-14 — WR v8 explicit commands and lifecycle bridge: 316 core/38 focused/ten season content, repo static/core build green. Complete current-life profiles/persistence next.
4. 2026-09-14 — WR v8 current career/session integration: 1,117 workspace/ten script cases, static/build/PWA green. Prior 379-case whole-game and 376-case resolved-boundary gates retained in archive.
5. 2026-09-14 — WR owning-drive/context staging: 375 core/testkit, ten season content and static/format green; 64 current seeded games, shipping still historical.

## Milestone ledger

- M0–M3 complete.
- M3.5 complete.
- M4–M7 complete.
- M7.5 in progress; Phase A complete, B1 active, B2–B6 and Phase C pending.
- M8, M9, M10 not started; unchanged roadmap order.

## Known failures

The shipping WR v7 second-season terminal gap remains until coordinated v8 UI activation. Staged v8 domain and atomic storage now pass, but frontend/Hub integration and actual B6 UI acceptance remain pending. Missing/corrupt meta pages fail closed; primary manifest loss recovers from its shadow, and a persistent initialization marker prevents both missing copies from being misread as a new empty profile. Signed zero is explicitly JSON-equivalent; other evidence comparisons remain exact.

Desktop functional gate is green. Actual screenshots expose existing added-position portrait/name/program overlap and unlabeled visible CB Home meters; recorded in B6 plan for integration/parity repair. Native computer-use screenshot helper failed (`foreground window did not report a process id`); actual WebView2 screenshots were inspected instead. Installer-wizard install/uninstall verification remains pending. These do not block B1; they are not waived from eventual product acceptance.

## Hard blockers

None.

## Historical evidence

- Complete pre-compaction record, including M0–M7 and early M7.5: `docs/execution/progress-archive/2026-09-14-pre-compaction.md`.
- Completed milestone plans: `docs/exec-plans/completed/`.
- Compacted M7.5 checkpoints: `docs/execution/progress-archive/M7.5-checkpoints.md`.
- Detailed current evidence: active tactical plan and `docs/execution/DECISION_LOG.md`.
- Routine continuation does not reread archives unless compatibility investigation requires them.

## Resume note

Continue B1c with WR frontend/Hub command/meta integration and equivalent added-position current aggregate retention before coordinated activation. Staged WR atomic storage, all four terminal domain profiles and 1,000-reference capacity/8,000-reference wire probes pass; shipping aliases still v7/meta1. Preserve all detail records and original migration proofs. Desktop detour finished; no heavy processes running. B6 requires actual full UI journeys after B2–B5, and Phase C follows before M8. M10 stays active.
