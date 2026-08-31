# ADR-0006 — Repository-Driven Codex Autonomy

**Status:** Accepted

## Decision

Use durable roadmap/progress/exec-plan files so Codex can select and execute successive tasks without feature-by-feature prompting.

## Why

Long development can exceed one agent context/runtime. Repository state survives those boundaries.

## Consequence

Codex must update `PROGRESS.md` and related execution docs after verified tasks and resume from them after interruption.
