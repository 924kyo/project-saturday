This is an execution-efficiency and desktop-delivery correction inside the existing Project Saturday M10 goal.
Do not replace, clear, pause permanently, or weaken M10.

At the next safe green atomic checkpoint, read and reconcile:
1. AGENTS.md
2. docs/execution/PROGRESS.md
3. the current active exec plan
4. docs/execution/EXECUTION_EFFICIENCY_PROTOCOL.md
5. docs/execution/TEST_GATE_TIERS.md
6. docs/execution/PROGRESS_COMPACTION.md
7. docs/execution/DESKTOP_PACKAGING.md

Then do the following:

A. Compact progress context
- Preserve all existing historical evidence by moving old detailed entries under
  `docs/execution/progress-archive/`.
- Replace live PROGRESS.md with the compact resume structure in
  `docs/execution/PROGRESS_COMPACT_TEMPLATE.md`.
- Keep only current state plus at most five recent detailed checkpoints live.
- Confirm no script depends on the old prose layout.

B. Adopt tiered validation
- Use focused Tier 0/Tier 1 checks during edit loops.
- Use Tier 2 integration gates at meaningful phase boundaries.
- Reserve complete browser/native matrices for the explicit early triggers or Tier 3 milestone closeout.
- Never waive the final milestone quality gates.
- Do not rerun an unchanged green gate without a concrete reason.
- Avoid CPU-heavy verification overlap that causes resource-contention timeouts.

C. Build a Windows desktop executable snapshot
- Inspect the current monorepo/Vite/PWA architecture.
- Add Tauri 2 packaging unless a concrete toolchain blocker is demonstrated.
- Keep the same game-core/content/frontend and preserve the browser/PWA target.
- Bundle production assets; runtime must not require the Vite dev server or network.
- Add repository desktop dev/build commands.
- Produce a real Windows x64 application executable and NSIS installer if the environment supports it.
- Verify build, launch/storage/relaunch as far as the available environment actually permits.
- Record exact output paths in PROGRESS.md and a short desktop-build README.
- Never claim an .exe exists if the build did not produce one.

D. Continue current M7.5
- Packaging/compaction must not become a new long milestone.
- After the first green desktop snapshot and documentation, resume the active M7.5 tactical board/payoff plan.
- M8 remains blocked until M7.5 Phase C is complete.
- M10 remains unchanged.

Preserve all deterministic RNG, save migration, historical compatibility, localization,
accessibility, PWA/offline, stable-ID and current product requirements.

Do not stop for ordinary confirmation. Escalate only a true hard blocker.
