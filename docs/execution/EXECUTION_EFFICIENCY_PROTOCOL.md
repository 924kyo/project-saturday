# Execution Efficiency Protocol

Status: authoritative supplement to the autonomous execution protocol.

## Goal

Keep the existing M10 quality bar while avoiding repeated context ingestion,
duplicate full-suite runs, and browser matrices that do not materially increase confidence.

This protocol changes *when* validation runs, not what the final milestone must prove.

## Core rules

### 1. Read the minimum context needed

On routine continuation, read:
1. `AGENTS.md`
2. compact `docs/execution/PROGRESS.md`
3. current active exec plan
4. only the product/engineering specs named by that plan

Do not reread archived milestone history unless:
- a historical compatibility failure occurs,
- the active plan explicitly requires an old invariant,
- a migration/report hash is being changed or investigated.

### 2. Group implementation before validation

Do not run the same unchanged test/build command repeatedly after every tiny edit.

Prefer:
- make a coherent bounded change,
- run focused checks,
- fix all findings,
- run the next appropriate tier once.

A failed check may be rerun after a fix. A green unchanged check is not rerun without a reason.

### 3. Full gates are milestone evidence, not edit-loop tools

The full workspace + production browser matrix is mandatory for milestone closeout,
but should not be the default inner loop.

### 4. No validation overlap unless explicitly safe

Do not run CPU-heavy workspace tests, simulation reports and Playwright matrices
concurrently when prior logs show resource-contention timeouts.

Sequential verification is preferred to false failures and repeated reruns.

### 5. Preserve deterministic/historical contracts

Efficiency must never waive:
- save/migration correctness,
- career/world RNG separation,
- historical report/hash contracts,
- localization,
- accessibility,
- PWA/offline behavior,
- stable IDs,
- production browser verification at required gates.

### 6. Keep checkpoint reporting compact

For each atomic step, `PROGRESS.md` records:
- what changed,
- focused checks run,
- whether a higher-tier gate is pending,
- next action.

Do not append the entire historical test narrative to `PROGRESS.md`.
Detailed evidence belongs in the active/completed exec plan or QA archive.

## Model-time discipline

High-reasoning model time should be spent on:
- architecture and schema boundaries,
- migrations,
- cross-position mechanics,
- game-design consequence chains,
- difficult regressions,
- final review.

Do not spend long deliberation re-summarizing old green logs.
When a command is running, wait for the command result rather than re-deriving already-tested facts.

## Stop conditions

Continue autonomously unless:
- a true external dependency blocks work,
- a destructive decision needs user approval,
- the repository is not recoverably green after bounded investigation,
- a required platform/toolchain for desktop packaging is unavailable and cannot be installed in the current environment.

Ordinary failing tests are not hard blockers.
