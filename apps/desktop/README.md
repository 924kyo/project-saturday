# Project Saturday — Windows snapshot

The Tauri 2 shell embeds the same production React/Vite game as the browser/PWA. There is no native gameplay implementation and no Vite server or network requirement for basic play. This is an **unsigned M7.5 development snapshot**, not M10 release approval.

## Commands

From the repository root, after `pnpm install`:

```sh
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:smoke
```

`desktop:dev` starts the existing frontend at port 5173 (strict port) and the native shell. `desktop:build` first runs the production workspace/PWA build, then builds Windows x64 and NSIS. The desktop workspace deliberately has no generic `build` script, preventing recursive builds. `desktop:smoke` tests the built release executable in a fresh isolated profile under `test-results/desktop-snapshot/`; it never imports or clears a personal browser/desktop save.

Prerequisites: Node/Corepack/pnpm from the root package, Rust MSVC toolchain, Visual Studio C++ Build Tools/Windows SDK, and WebView2. Verified host: Rust 1.98.1, Visual Studio 2022 17.13, WebView2 152.0.4191.66; Tauri CLI 2.11.4 / Rust Tauri 2.11.5, with Cargo.lock retained. Workspace-local Rust at `.desktop-tools/cargo` and `.desktop-tools/rustup` is detected without changing system PATH. Otherwise an installed Rust toolchain on PATH is used. The sandbox's Windows Schannel credentials failed; the permitted unsandboxed build succeeded without disabling TLS verification.

The NSIS installer contains Korean and English, installs per user, and embeds the offline WebView2 installer. The larger installer size is intentional; it avoids a runtime download during offline installation. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and [Windows installer options](https://v2.tauri.app/distribute/windows-installer/).

## Produced artifacts — 2026-09-14 17:59 KST

- Application: `C:\project-saturday\apps\desktop\src-tauri\target\x86_64-pc-windows-msvc\release\project-saturday.exe` — 8,762,368 bytes.
- NSIS installer: `C:\project-saturday\apps\desktop\src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Project Saturday_0.7.5_x64-setup.exe` — 217,762,512 bytes.
- Application SHA-256: `C1315A3D5D43B9C33B793715B851BD3125323C4FFBFD000E256EC669ACD801A2`.
- Installer SHA-256: `4A2BC3FE3D4813429D09BC58E369AF611B47F03EBDEBCB4A15D636F89A8F09E8`.

The application executable is launch-tested. The installer was generated successfully but its installation/uninstallation wizard has **not** been exercised; no claim of that validation is made. Outputs are ignored build artifacts and must be rebuilt on another checkout. No signing, public publishing or remote deployment occurred.

## Verified and remaining checks

Production build/export/PWA checks and focused desktop configuration tests pass. The actual release WebView2 app passes offline cold launch and reload, Korean RB creation, all five destinations, a real RB key snap and post-game, process exit and offline relaunch with exact complete save-envelope equality, Career Hub Continue/cancel/New/Abandon, and English CB creation. The test blocks network through a deliberately unavailable proxy and CDP offline mode; bundled assets still load at `http://tauri.localhost`, not a dev server. It retains the isolated profile, full pre-relaunch envelope, report and screenshots under `test-results/desktop-snapshot/`. The debug connection exists only in the test process's environment, not shipping configuration. See [Playwright WebView2 testing](https://playwright.dev/docs/next/webview2).

The computer-use helper located the native window but screenshot capture failed with `foreground window did not report a process id`; actual WebView2 screenshots were captured and visually inspected instead. Visual review found existing added-position portrait/header overlap and unlabeled visible Home meters. These are recorded in the mandatory M7.5 B6 parity plan, not hidden by the functional test pass. This snapshot is playable, not a claim that M7.5 presentation or four-position UX parity is complete.

Default desktop storage belongs to the stable app identity `com.projectsaturday.game`, separate from normal browser profiles. Existing save codecs, migrations, locks and Hub operations are unchanged. Do not delete browser storage to start another career. Cross-browser save import/export is not added in this snapshot.

Rebuild at meaningful UI/Game Day phase gates, save/writer changes, milestone closeout or requested playable snapshots—not after every atomic edit. Resume B1 after this bounded packaging checkpoint; B6 and full Phase C still block M8.
