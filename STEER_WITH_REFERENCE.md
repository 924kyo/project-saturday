# Steering prompt for the currently active Project Saturday Goal

Send the following as a **normal steering message**, not as `/goal edit`.

```text
This is a product-direction correction inside the existing Project Saturday goal. Do not clear or replace the current M10 goal.

At the next safe atomic checkpoint, inspect the repository and then read, in this order:

1. AGENTS.md
2. docs/execution/PROGRESS.md
3. docs/execution/TARGET.md
4. the active M4 exec plan
5. docs/product-reviews/2026-08-31-m3-playtest-redesign.md
6. docs/exec-plans/active/m3-5-experience-foundation.md
7. docs/references/THE_ROOKIE_BEHAVIORAL_REFERENCE.md
8. docs/references/REFERENCE_USE_POLICY.md
9. docs/00-project/PROJECT_CONTEXT.md

The new reference document exists because the previous PROJECT_CONTEXT only captured high-level lessons from The Rookie. Do not assume prior chat knowledge of that game. Use the behavioral reference only to understand the designer's comparison and desired product qualities. Do not copy its code, assets, data, exact rules, text, events, or UI.

Treat the August 31 playtest review as a deliberate product correction, not as a cosmetic polish request. Reconcile it with the existing specs and update the authoritative Project Saturday specs where needed instead of adding isolated UI patches.

Preserve the current durable M10 target. Preserve M0-M3 deterministic RNG, save migration, localization, accessibility, content validation, PWA and test invariants.

If the currently active M4 v4 persistence/schema atomic task is already partially implemented, finish only the smallest safe compatibility checkpoint needed to leave the repository green. Before activating or expanding live M4 game commands, insert and execute M3.5 Experience Foundation as specified. M3.5 must address the underlying player-experience issues, including state legibility, multiple meaningful weekly tensions, attribute/proficiency progression visibility, navigation/information architecture, graphical character-preview requirements, skill acquisition/build diversity, contextual onboarding, focus-visible behavior, and meaningful football participation across depth roles.

After M3.5 is implemented and the full required gate is green, update PROGRESS.md, MASTER_ROADMAP.md, BACKLOG.md, relevant product specs, decisions and active exec plans, then resume M4 autonomously toward the unchanged M10 target.

Do not stop to ask for ordinary confirmation. Escalate only a true hard blocker under AUTONOMOUS_EXECUTION_PROTOCOL.md.
```

## If the current Goal is actively running and the UI will not accept a steering message

Use a safe checkpoint rather than editing the goal:

1. allow the current atomic task to finish, or use `/goal pause` if you intentionally need to stop the run;
2. add the reference/review files to the repository;
3. send the steering message above;
4. use `/goal resume` to continue the same persistent goal.

The persistent objective remains the same; only the repository's authoritative product context and execution order are being updated.
