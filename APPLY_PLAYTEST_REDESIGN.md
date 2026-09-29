# Codex prompt — apply M3 playtest redesign

Paste the following into the active Project Saturday Codex task after copying the two accompanying docs into the repository.

---

A product-owner playtest review has changed several authoritative product decisions.

Read first:

- `AGENTS.md`
- `docs/execution/PROGRESS.md`
- the current active M4 exec plan
- `docs/product-reviews/2026-08-31-m3-playtest-redesign.md`
- `docs/exec-plans/active/m3-5-experience-foundation.md`

Treat the playtest redesign directive as authoritative where it conflicts with earlier product assumptions.

Important timing constraint:
M3 is closed and M4 is at the v4 persistence/specification boundary. If the currently executing M4 atomic task is mid-write, finish only to a safe green atomic checkpoint. Before considering v4 frozen/shipped, reconcile the approved Body/Preparation/Confidence model so we do not intentionally publish v4 and immediately need v5 for this review.

Then:

1. inspect the current repository rather than assuming the old docs are unchanged;
2. integrate the directive into the current source-of-truth product specs, roadmap, backlog, decision log/ADRs where necessary;
3. insert and execute M3.5 as a blocking experience-foundation milestone before live M4 player-facing game completion;
4. preserve all M0-M3 deterministic RNG, migration, save-publication, localization, accessibility, PWA, content-validation, and browser-test guarantees;
5. implement M3.5 task-by-task, keeping `PROGRESS.md` current;
6. do not stop after planning or after one atomic task; continue until the M3.5 gate is fully green unless there is a true external blocker;
7. after M3.5 closeout, reconcile the M4 plan with the new Game Day participation rules and resume autonomous M4 development.

Do not mechanically imitate The Rookie or another commercial football game. The owner feedback identifies problems, while the attached directive defines the intended original solution direction.

Before implementation, summarize in the active exec plan which existing assumptions are being superseded and why. Do not ask for routine confirmation when the directive resolves the ambiguity.

Run the complete required verification at milestone closeout and record evidence in `PROGRESS.md`.
