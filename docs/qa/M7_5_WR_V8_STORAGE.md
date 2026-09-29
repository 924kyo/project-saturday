# M7.5 WR v8 staged storage checkpoint

2026-09-14, approximately 21:11 KST. Shipping App still selects WR v7/meta1. This is not B6 actual-UI acceptance or a new native executable.

## Verified

- Existing WR locking/conflict/recovery engine reused through typed codecs; legacy facade remains unchanged.
- Original v1–v7 envelopes stay separate from migrated v8 sessions. Current preview, pending, resolved and post-game records save/retry/reload exactly; stale/future records and colliding original snapshot IDs remain protected. Added-position snapshots are untouched.
- Fixed 256-entry registry pages and constant-size checksum-bound manifest support 8,000 synthetic references beyond one logical 1 MB index while every envelope stays below 1,000,000 bytes. Missing/extra/reordered/duplicate/mixed-revision and same-revision page mixtures fail.
- Actual one-season legacy and two-season current alumni retain full literal/source-replayed detail and registry identity/schema/program binding.
- Actual memory and IndexedDB adapter tests queue writes then inject an invalid-store failure; the entire session/profile/pages/snapshot transaction rolls back to exact previous values. Retry succeeds, repeated/concurrent completion is idempotent and stale review cannot overwrite completion.
- Two successive actual two-season retirement fixtures retain the prior one-season alumnus and both current alumni, original legacy envelope proof and each earlier detail. Only obsolete derived registry pages are pruned.
- Damaged primary career/manifest recover from their saved snapshot/shadow and exact retry repairs the primary values. Damaged pages and future metadata fail closed. A persistent initialization marker prevents both missing manifests from silently creating an empty profile.
- Each measured actual first retirement on both adapters remains below 1,000 ms. These are automated adapter tests, not browser/native user journeys or 8,000 actually played careers.

## Gate

Full web: 390 cases/29 files pass in 53.40 seconds. Final initialization-marker addition: all 11 wire/atomic cases pass in 12.85 seconds. Repository static checks pass; final web typecheck/scoped lint/format/architecture/localized-copy/whitespace checks pass. Production/export/PWA: 357 modules, 21 resources/1829.63 KiB, football chunk 419.82 kB, every JS chunk below 500 kB, both career screens lazy.

Relevant commands: `vitest run --project=web`, focused `wr-meta-wire.test.ts`, `pnpm typecheck`, `pnpm lint`, `pnpm build` with the repository-local Corepack cache. Actual IndexedDB test databases are closed and deleted after each test; user browser storage was not touched.

Next: frontend/Hub command and registry consumers, equivalent QB/RB/CB retained-current aggregates and coordinated activation. Full required browser coverage precedes release activation; B1d/B2–B5, actual four-position B6 and Phase C still block M8. The previous desktop executable/installer remains the documented snapshot.
