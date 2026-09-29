# M7.5 bounded detour — Efficiency and Windows snapshot

Status: complete as a bounded first desktop snapshot, 2026-09-14. Parent: `m7-5-playtest-correction.md`. M10 unchanged. Installer-wizard testing and recorded B6 UX findings are explicitly not claimed complete.

## Scope

Apply the execution-efficiency correction at the verified B1b QB/RB/CB checkpoint, establish one playable Tauri 2 Windows snapshot, then immediately resume `m7-5-tactical-evidence.md`. This is not a new milestone and does not authorize M8 before M7.5 Phase C.

## Required specifications

`EXECUTION_EFFICIENCY_PROTOCOL.md`, `TEST_GATE_TIERS.md`, `PROGRESS_COMPACTION.md`, and `DESKTOP_PACKAGING.md` under `docs/execution/`; existing architecture, localization, save and PWA invariants remain authoritative.

## Atomic sequence

- [x] Preserve complete old progress evidence in a dated archive; replace live progress with the compact template and verify no source/script parser depends on its prose.
- [x] Add minimal Tauri 2 shell around the existing Vite production assets, workspace commands, original project icon and bilingual installer metadata. No Rust gameplay, network service or browser save import.
- [x] Build real x64 application and NSIS installer; record exact output paths and toolchain prerequisites in a short desktop README.
- [x] Launch bundled app without Vite, verify creation/continue, purpose navigation, a real Game Day, both locales, Career Hub, process-exit/relaunch exact storage and offline startup where automation permits.
- [x] Record measured results and manual verification limitations; return directly to B1b WR compatibility. Final focused lint, boundary/localized-copy, format and whitespace checks pass.

## Implementation decisions and risks

Use a separate workspace package without a generic recursive `build` script, avoiding root-build/Tauri hook recursion. Rust/MSVC/WebView2 are platform tooling only; the frontend and game packages remain identical to PWA. Install missing Rust locally under ignored workspace tooling directories if feasible. Visual Studio 2022 C++ components and WebView2 152 are present. Do not change normal browser storage, codecs, service-worker behavior or gameplay versions to accommodate packaging.

Use Tauri's minimal native capability surface: no file/shell/network plugins or arbitrary native commands. Production assets must resolve without a server. The first installer is a local unsigned development snapshot, not a public release or final M10 build. Document WebView2 prerequisites and any installer-only download separately from offline gameplay.

## Verification

Compaction: compare normalized complete archive against original and search code/config for prose dependencies. Packaging edit loops: focused configuration/script tests, lint/typecheck as affected, existing production build/PWA checks and `cargo fmt`/build. Serialize CPU-heavy commands. Reuse the unchanged 1,098-case green game checkpoint; do not rerun full browser careers merely for the native shell. Desktop runtime smoke is required and actual native GUI limitations must be explicit, never fabricated. Final M7.5 Tier 3 gate remains mandatory.

## Completion evidence

Real release executable (8,762,368 bytes) and NSIS installer (217,762,512 bytes) were built at 17:59 KST. Exact paths and hashes are in `apps/desktop/README.md`. Actual offline WebView2 smoke passed Korean RB creation, five destinations, a real key snap/post-game, exact whole-envelope persistence across process exit/relaunch, Hub Continue/cancel/New/Abandon and English CB creation, with zero page errors. Production/PWA output is byte-identical to the prior green snapshot; two new desktop configuration cases pass. Installer installation/uninstallation itself is unverified, not claimed as passed. The computer-use screenshot helper failed to capture the located native window; actual WebView2 screenshots were inspected. The existing portrait/header overlap and unlabeled Home meters are preserved as explicit B6 findings. B6 was integrated at this green checkpoint after B2–B5 and before Phase C/M8; B1 was not interrupted or rolled back.
