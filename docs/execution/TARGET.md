# Durable Delivery Target

## Autonomy mode

`CONTINUE_UNTIL_TARGET`

## Current target

**M10 — 1.0 Release Candidate**

Codex should progress through the milestones in `MASTER_ROADMAP.md` in order, automatically, until M10 acceptance is complete or a hard blocker is recorded.

## Practical note

This target is intentionally larger than a single coding task. If the Codex runtime/context/usage window ends, the project is **not** considered blocked. Save a durable checkpoint in `PROGRESS.md`; the next Codex task can use the generic resume prompt from `START_CODEX.md` and continue without new feature-by-feature instructions.

## Quality gates cannot be skipped to reach the target faster

A later milestone may not be marked complete while a prerequisite milestone has failing required checks or missing bilingual content.
