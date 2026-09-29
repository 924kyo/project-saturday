# Career Management

Initial creation uses the same save-before-publication contract as an active career. If its first save fails, retain the exact prepared athlete/seed, expose a focused bilingual retry and disable draft/position changes until that save succeeds. Never silently generate a second athlete when the player retries. Retried envelope timestamps may change; gameplay payload and RNG must not.

## Goal

Users must be able to test/replay without deleting browser data.

## Career Hub

No active career:
- New Career
- Alumni / Legacy
- Settings / Help

Active career:
- Continue
- Career Summary
- New Career
- Abandon Current Career
- Alumni / Legacy
- Settings / Help

Completed:
- Career Review
- New Career

Starting again from a completed athlete keeps that athlete's earned history. Pending/retry copy must describe this preservation, not abandonment or forfeited completion rewards. Retirement may use nonterminal phase metadata only to exclude impossible completion candidates; every possible completion proof still requires the full versioned reader and exact conflict comparison before any clear/write transaction.

## New Career

If an unfinished career exists:
- explicit confirmation
- abandon atomically or cancel
- never silently overwrite

Preserve:
- MetaProfile
- alumni
- unlocks
- familiarity
- achievements
- settings

## Abandon

- remove/deactivate current run
- no normal completion reward
- no normal alumni power reward
- do not corrupt world/meta history

## Reset All Data

Separate destructive action with clear warning and second confirmation.

## Save UX

The staged WR registry-backed Hub reader pages eight canonical alumni references at a time and validates only the requested detail records. Continue-page requests carry the observed registry revision; if a completed career changes the index, reload the list instead of mixing pages or duplicating rows. A missing/corrupt detail must remain distinguishable from an empty profile, without preventing valid history from being inspected. Normal reads are side-effect free and never replay all prior games merely to open the Hub. Visual pagination and bilingual status controls must be integrated before selecting the new registry writer in App.

The game remains autosave-first. Show:
- autosave status
- last save time
- recovery status
- restore latest valid snapshot where supported

Manual save must not become required.

## Persistence boundary

Career operations share the existing career-save lock across WR, added positions, and meta completion. A confirmation captures the current application-store contents; a concurrent change rejects the operation and requires reviewing the updated state. A failed storage transaction can retry the same captured operation without removing any data.

Selected-record deletions may join the existing clear-and-write storage batch. Added-position autosave prunes only obsolete same-career snapshots inside that authoritative transaction, retaining thirty snapshots and other careers' records. A pruning failure must roll back the current write and snapshot changes together, so exact retry cannot encounter a falsely reported already-committed revision. Post-commit cleanup is not part of the save success/failure decision.

Retirement atomically removes active runs and their recovery snapshots, retains profiles/settings/migration metadata, and writes the neutral `NONE` active selector. New WR and added-position saves atomically select their own kind. Ordinary saves from a retired or differently selected run are rejected.

Completed QB/RB/CB runs retain their exact checksummed completion envelope in the profile store, keyed by stable career ID. The envelope includes the already-earned versioned alumni, unlocks, familiarity, and full career/world history. Retirement also preserves completions written before this archive existed. This compatibility archive does not mint rewards for abandonment or reinterpret the WR MetaProfileV1 record. The Hub presents both histories; future unified meta migration must preserve these completion proofs.

Added-position envelopes v2 and v3 store compact wire data, not raw domain sessions; v3 partitions canonical bounded history pages without changing domain v2. Version-aware Hub operations decode literal v1/v2/v3 into a common read-only domain-v2 view while retaining their original envelopes separately. Migration reads never write. Retirement compares normalized completed sessions, preserves an existing equivalent proof byte-for-byte, and backfills a missing proof from the exact saved completion. Invalid or conflicting existing/pending proofs reject retirement without clearing active or recovery stores. Recovery confirmation identifies the current wire athlete or the highest valid mixed-version snapshot; a corrupt checksum does not erase the visible athlete's identity. The bilingual Hub presents this decoded current view and literal historical archives together. Its `loadPositionAlumniV2` method names the domain view, not the envelope version.

After two UI confirmations, Reset All Data clears only the application's five IndexedDB stores in one transaction, retaining only the neutral `NONE` selector to reject stale pre-reset saves. It does not delete browser caches, unrelated sites, or the PWA installation.

## Tests

Cover every current position, transfer/offseason/completed phases, offline,
failure/retry, preservation of meta/alumni/settings and new run after abandon.
