# Performance and PWA

## Platform targets

Primary target is modern mobile Safari/Chrome-class browsers and installable PWA behavior.

## Performance principles

- Keep game-core simulation separate from rendering.
- Measure before moving work to Web Workers, but keep simulation APIs worker-friendly.
- Use tiered world simulation fidelity rather than simulating every unseen player at maximum detail.
- Avoid unnecessary rerenders of large league/roster lists.
- Lazy-load heavy secondary screens/content where appropriate.

## PWA

Bootstrap should provide:

- web app manifest;
- installable shell;
- service worker strategy appropriate to Vite/PWA tooling;
- offline-safe local career where feasible;
- clear update behavior to avoid old bundle/new save incompatibility.

## Storage

Request persistent browser storage when supported after user engagement. Failure must not block play.

## Budgets for vertical slice

Initial targets, to be measured rather than worshipped:

- usable first screen quickly on modern phone/network;
- no multi-second blocking simulation on normal weekly advance;
- game sim progress remains responsive;
- no visible layout clipping in ko-KR or en-US at supported phone widths.

If a simulation exceeds a comfortable main-thread budget, profile and move the expensive world work behind an async/worker boundary.

## M5 measured vertical-slice evidence

The M5 public-command report is the conservative engine profile because it runs six complete careers, 72 regular-season games, two player postseason games, all aggregate other-program fixtures, and an exact JSON parse/validation comparison after every requested transition. Three direct production-build runs on 2026-09-01 completed 1,060 validated round trips in 3,829.75 ms, 3,412.31 ms, and 3,492.07 ms: 3.22–3.61 ms per command plus serialization/validation round trip. No weekly or aggregate-world operation approaches the multi-second boundary, so M5 does not add a worker.

Production-browser gates complete the entire Korean and English season/legacy path on native mobile and desktop, plus one dedicated 320×760 path, with exact IndexedDB saves, event/injury reloads, offline resume, and final cross-store retry. Those test durations include deliberate persistence polling and are not used as main-thread simulation timings.

The production PWA build verifies its manifest, service worker, emitted package exports, and precache. The main JavaScript chunk is 1,082.96 kB before gzip (275.79 kB gzip), above Vite's advisory 500 kB threshold. This is a non-blocking M5 diagnostic because first-screen and offline gates pass, but route/content code splitting remains a concrete M6 performance backlog item before world/position expansion increases the bundle.

## M6 measured vertical-slice evidence

The M6 production build separates the 62.22 kB application entry from 285.52 kB vendor-runtime, 361.65 kB deterministic game-core, and 458.03 kB bilingual game-content chunks. The 94.55 kB active-career presentation is a real dynamic import and is not module-preloaded on the creation shell. Every JavaScript chunk is below the 500 kB advisory ceiling. The service worker precaches all 17 required resources (1,301.84 KiB total), so the split does not weaken offline resume after the PWA assets have been cached.

`corepack pnpm --filter @project-saturday/testkit profile:m6` profiles public-command Stay and transfer careers from built packages without serialization cost or timers in gameplay state. Three repetitions of each branch on 2026-09-01 produced 117 weekly-boundary and 117 aggregate-world samples plus six samples for each offseason operation. Weekly work measured 19.334 ms mean / 27.850 ms p95 / 32.847 ms max; aggregate world rounds 4.343 / 6.816 / 7.705 ms; offseason projection 3.639 / 5.047 / 5.047 ms; offseason decision 3.766 / 4.925 / 4.925 ms; and next-season bootstrap 4.390 / 5.450 / 5.450 ms. The repeatable command fails if any observed operation reaches 1,000 ms. No operation approaches the multi-second boundary, so M6 does not add a worker.

## M7 current bundle evidence

The verified current split build separates deterministic core (311.81 kB), football engines (254.11 kB), content (356.66 kB) and paired locale resources (342.94 kB). The entry is 92.38 kB; WR and added-position career screens are dynamic imports of 85.36/40.34 kB and are absent from creation HTML preloads. All 21 PWA resources (1808.26 KiB) remain cached. The full production matrix passes 76 executions, with two existing intentional desktop skips for mobile-only narrow journeys. This validates the split, not full M7 completion.

`pnpm build` now fails if any emitted JavaScript asset exceeds 500,000 bytes, if a script is absent/duplicated in offline precache, or if either career screen is missing as a lazy asset or eagerly referenced by creation HTML. Positive/negative guard tests run with `pnpm test`. Chunking does not alter gameplay, schema, profile limits or historical reports.

Paged-save activation build (2026-09-14): core 313.58 kB, football 254.11 kB, content 356.92 kB, paired locales 344.17 kB, entry 94.98 kB and lazy WR/current career chunks 85.37/40.97 kB. All 21 PWA resources (1814.68 KiB) pass export/precache/preload/size verification. Core/shipped plus 56 codec/Hub cases, 24 bilingual App cases and static checks pass. The complete original/browser-life profile matrix preserves 3,155 exact reloads across eighteen paths. The final native matrix passes 88 executions with two intentional mobile-only skips, including all twelve current two-season careers. M7 is verified; M7.5 remains the next required product milestone.
