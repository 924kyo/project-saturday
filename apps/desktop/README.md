# Project Saturday — Windows desktop build

The Tauri 2 shell embeds the same production React/Vite game as the browser/PWA. There is no native gameplay implementation and no Vite server or network requirement for basic play. Version `1.0.0-rc.2` is the **unsigned 1.0 release candidate** build (M11; rc.1 was the M10 gate).

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

## Produced artifacts — 2026-09-30 21:41 KST (rc.2 gate)

- Application: `apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/project-saturday.exe` — 8,996,352 bytes, SHA-256 `3E8DBA7FDC13FD3F28DE59E26907B00360F29DDEEA585D96CB1EDBA167626543`.
- NSIS installer: `apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Project Saturday_1.0.0-rc.2_x64-setup.exe` — 217,618,422 bytes, SHA-256 `ABA848BB06EB385C1E1CC5794627FB5E00BCC1F26A79870A4028B7206AD500C8`.

The application executable is launch-tested. The installer was generated, but its install and uninstall wizard has **not** been exercised, and this README makes no claim about it. Outputs are ignored build artifacts and must be rebuilt on another checkout. No signing, publishing or deployment occurred.

## Verified checks

`scripts/desktop-smoke.mjs` drives the actual release WebView2 app (Career VNext UI) in an isolated profile with the network blocked (an unavailable proxy plus CDP offline mode). Bundled assets load from `http://tauri.localhost`, not a dev server. It checks:
- packaged offline launch and reload;
- ko-KR creation through the production UI;
- the This week, Build, Team and Profile tabs;
- a full Saturday;
- exact save-envelope equality across process exit and an offline relaunch;
- en-US creation;
- New Career cancel and confirm, then an en-US CB creation.

The profile, report and screenshots are kept under `test-results/desktop-snapshot/`. The debug connection exists only in the test process's environment, never in shipping configuration.

Default desktop storage belongs to the stable app identity `com.projectsaturday.game`, separate from normal browser profiles. Saves use the same Career VNext codec, backup and Alumni Wall as the browser. Use New Career to start another career; don't delete storage. Cross-browser save import and export is not included (`docs/release/KNOWN_LIMITATIONS.md`).

Rebuild at milestone gates, after save changes, or when a playable snapshot is requested, not after every atomic edit.
