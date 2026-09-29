# Windows Desktop Packaging

## Objective

Ship the current playable Project Saturday web build as a normal Windows desktop application
without forking gameplay logic from the PWA.

The web/PWA remains a first-class target.

## Default technology

Use **Tauri 2** unless repository/toolchain inspection identifies a concrete blocker.

Why:
- keeps the existing React/Vite UI,
- substantially smaller than bundling a full Chromium runtime,
- can bundle the production web assets,
- supports a Windows `.exe`/installer path,
- gameplay remains in the same TypeScript packages.

If Tauri cannot be built in the current Windows environment because the required Rust/MSVC
toolchain cannot be installed, document the blocker before considering Electron as fallback.

## Target outputs

For Windows x64, produce when supported by the toolchain:

1. normal desktop application executable (`Project Saturday.exe` or product-final naming)
2. NSIS `.exe` installer
3. optional MSI if it adds negligible maintenance burden

Do not claim an installer/output exists unless the real artifact was built and launch-tested.

## Architecture rules

- `game-core`, game content and deterministic RNG remain unchanged.
- Desktop is a shell around the same production frontend.
- No dev server is required at runtime.
- Do not add network dependency for basic play.
- Existing PWA/browser target must continue to build.
- No gameplay rules in Rust/native wrapper.

## Storage

The desktop WebView has app-local storage separate from a normal browser profile.

Requirements:
- existing save/migration rules work unchanged inside desktop storage,
- Career Hub works,
- save/reload works after process exit,
- offline launch works,
- failed-write/recovery behavior remains deterministic where testable.

Nice-to-have after first executable:
- explicit save export/import file for moving a career between browser and desktop.

Do not attempt to scrape another browser's IndexedDB profile automatically.

## SPA/build integration

Codex must inspect the actual Vite output/router configuration rather than assuming paths.

Acceptance:
- packaged app launches directly into the production shell,
- lazy career chunks resolve correctly,
- locale assets load,
- no localhost/dev-server dependency,
- no blank page on direct launch/relaunch.

## Desktop-specific UX

Minimum:
- sensible default window size
- minimum window size compatible with tested mobile/desktop layout
- application title
- temporary project icon is acceptable until final art pass
- external links, if any, open safely outside the app
- close/relaunch preserves save

## Build scripts

Add repository-level commands with discoverable names, e.g.:
- `pnpm desktop:dev`
- `pnpm desktop:build`

Exact names may differ to fit current conventions.

## Verification gate for first desktop artifact

Before publishing the executable path:

- production web build green
- desktop package build green
- app launch smoke test
- create/continue career
- navigate Home/Week/Team/Skills/Player
- play at least one real Game Day path available in the current shipping build
- close application
- relaunch
- verify exact saved career resumes
- verify Career Hub New Career/Abandon path
- verify ko-KR and en-US
- verify offline launch

If automated Windows GUI control is unavailable, run every automatable build/storage check and clearly
record the remaining manual-launch check instead of claiming it passed.

## Timing

Create the desktop wrapper at the next safe green checkpoint during M7.5.
Do not wait for M10 to establish packaging.

After it works, do not rebuild/retest the desktop installer after every atomic edit.
Rebuild at:
- meaningful Game Day/UI phase gates,
- save/writer changes,
- milestone closeout,
- explicit user-requested playable snapshots.
