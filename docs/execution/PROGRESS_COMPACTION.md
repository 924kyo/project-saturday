# PROGRESS.md Compaction Policy

## Problem

`PROGRESS.md` is the primary resume checkpoint and is therefore read frequently.
It must not become a complete append-only development diary.

## Size target

Keep the live file concise enough to scan in one pass.

Preferred contents:
- target
- current milestone
- current status
- last completed task
- current/next task
- active exec plan(s)
- latest green verification
- open known failures
- hard blockers
- current assumptions/pointers
- compact milestone ledger
- at most the five most recent checkpoints

Move older detail to archive files.

## Archive structure

Recommended:

`docs/execution/progress-archive/`
- `M0-M3.5.md`
- `M4-M6.md`
- `M7.md`
- `M7.5.md` once complete
- later milestone files as needed

The archive preserves exact historical evidence. It is not loaded during ordinary continuation.

## Compaction procedure

At the next safe checkpoint:

1. Copy existing historical entries to the appropriate archive file without deleting evidence.
2. Replace live `PROGRESS.md` with the compact structure.
3. Keep links/pointers to archived evidence.
4. Verify no automation/parser depends on old prose structure.
5. Record the compaction itself as a non-gameplay documentation change.

## Recent-checkpoint rule

When a sixth detailed checkpoint would be appended:
- move the oldest recent checkpoint to the relevant archive,
- keep only the five newest in the live file.

## Never archive away

Always keep live:
- current hard blockers
- currently failing checks
- current save/writer/schema version
- current active-plan name
- current target
- immediate next task
