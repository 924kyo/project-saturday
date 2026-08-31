# Autonomous Execution Protocol

## Purpose

Allow Codex to make sustained progress without the user having to write a new handcrafted prompt for every task.

The repository is the durable project manager.

## Activation

Autonomous mode is active when the user uses the startup/resume prompt or otherwise asks Codex to execute the project roadmap autonomously.

## Main loop

Repeat until `TARGET.md` is complete or a hard blocker exists:

1. **Re-orient**
   - read `AGENTS.md`;
   - read `TARGET.md` and `PROGRESS.md`;
   - inspect actual repository/git/test state;
   - read relevant specs and active exec plan.

2. **Select work**
   - choose the first incomplete roadmap/backlog item required for the target;
   - keep the task small enough to verify coherently;
   - do not skip foundational prerequisites merely because later UI is more visible.

3. **Plan when needed**
   - for a feature spanning multiple modules, create/update `docs/exec-plans/active/<feature>.md`;
   - include goal, scope, non-goals, acceptance criteria, test plan, and risks.

4. **Implement**
   - follow architecture/specs;
   - use subagents/worktrees only for independent work streams when available;
   - never let parallel agents implement overlapping ownership without an integration plan.

5. **Verify**
   - run focused tests during iteration;
   - run the milestone gate before marking milestone complete;
   - fix failures caused by the change before moving on.

6. **Review**
   - inspect diff for accidental rule invention, hardcoded strings, nondeterminism, duplicate code, weak tests, and doc drift;
   - if practical, use a separate review agent for large milestones.

7. **Checkpoint**
   - update `PROGRESS.md`;
   - tick `BACKLOG.md`;
   - append important decisions to `DECISION_LOG.md`;
   - append assumptions if any;
   - move completed exec plan to `docs/exec-plans/completed/`;
   - commit a coherent checkpoint when git is available.

8. **Continue immediately**
   - do not ask whether to continue;
   - do not stop because a milestone ended if the durable target is later.

## Ambiguity policy

### Level A — routine/reversible

Examples:

- internal helper naming;
- test fixture shape;
- library configuration detail consistent with architecture;
- modest placeholder tuning value explicitly marked tuneable.

**Action:** decide, document if meaningful, continue.

### Level B — product-relevant but reversible

Examples:

- exact first-pass threshold not defined;
- which of two small UI arrangements better preserves flow;
- temporary content count inside specified range.

**Action:** choose the smallest conservative solution aligned with product beliefs; record in `ASSUMPTIONS.md` or an ADR; continue.

### Level C — hard blocker

Stop and record a blocker only when work requires one of:

- credentials/secrets not present;
- irreversible/destructive external action;
- public deployment/publishing/purchase without authorization;
- a legal/licensing decision that cannot safely be assumed;
- mutually contradictory source-of-truth requirements with major product consequences;
- required external service/environment is unavailable and no local substitute can satisfy the acceptance criteria;
- user-owned asset/content decision that cannot be represented by a placeholder without invalidating the milestone.

If stopping, make `BLOCKERS.md` precise and leave the repo in a verified checkpoint state.

## Context compaction / interruption resilience

Before a long task reaches a natural checkpoint, keep `PROGRESS.md` current enough that a new agent can resume without chat history.

`PROGRESS.md` must always identify:

- current milestone;
- last completed task;
- current/next task;
- active plan;
- last verification commands/results;
- known failures/blockers;
- important uncommitted state if any.

## Multi-agent policy

Good parallelization:

- game-core mechanic;
- unrelated UI shell;
- content batch after schema exists;
- independent test/review pass.

Bad parallelization:

- two agents redesigning the same skill system;
- one agent changing schemas while another generates content against the old schema without coordination.

Primary agent owns integration and final verification.

## Stopping at target

When all target acceptance gates pass:

1. run release/full milestone checks;
2. update `PROGRESS.md` to target complete;
3. produce a concise readiness report;
4. list known non-blocking follow-up work;
5. do not silently expand scope beyond target.
