# Start Codex Here

## One-time initial prompt

Paste this **once** into the Codex project:

```text
Read AGENTS.md first, then read docs/INDEX.md and docs/execution/AUTONOMOUS_EXECUTION_PROTOCOL.md.

Enter autonomous delivery mode for Project Saturday.

Your durable target is defined in docs/execution/TARGET.md. Starting from the repository's actual current state, execute the roadmap in order and keep working through successive tasks and milestones without waiting for my confirmation after ordinary steps.

Before implementing a milestone, read the relevant product specs and create or update an exec plan under docs/exec-plans/active/. After each atomic task, run the required checks, update docs/execution/PROGRESS.md, BACKLOG.md, DECISION_LOG.md, and any affected documentation, then immediately choose the next incomplete task.

Do not stop merely because planning is finished, one task is finished, one milestone is finished, or a reasonable product detail is underspecified. For reversible ambiguity, choose the smallest conservative solution consistent with the specs and record the assumption. Stop only for a hard blocker defined by AUTONOMOUS_EXECUTION_PROTOCOL.md or when TARGET.md is fully complete and verified.

Korean and English must be implemented simultaneously from the first UI. No user-visible string may be shipped in only one supported locale.

Do not copy source code, assets, names, text, events, UI layouts, or proprietary data from The Rookie or any other game. The prior game is design inspiration only; this repository must be an original implementation.

At completion, leave a runnable local build, passing automated checks, updated documentation, and a final release/readiness report.
```

## Resume prompt after any interruption

If Codex stops because of runtime, context, usage, computer restart, or another non-product interruption, do **not** reconstruct the project history manually. Start a new Codex task and paste:

```text
Resume Project Saturday autonomous delivery. Read AGENTS.md, docs/execution/TARGET.md, docs/execution/PROGRESS.md, docs/execution/BLOCKERS.md, and the active exec plan. Verify the repository state, then continue from the first incomplete task toward the target under AUTONOMOUS_EXECUTION_PROTOCOL.md. Do not wait for confirmation between normal tasks.
```

## Why this structure exists

A long project may outlive a single agent context or product runtime window. The repository therefore stores the plan, current milestone, decisions, assumptions, blockers, and verification status as files. Agent memory is helpful; repository memory is authoritative.
