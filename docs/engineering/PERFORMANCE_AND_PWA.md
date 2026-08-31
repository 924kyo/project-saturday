# Performance and PWA

## Platform targets

Primary target is modern mobile Safari/Chrome-class browsers and installable PWA behavior.

## Performance principles

- Keep game-core simulation separate from rendering.
- Measure before moving work to Web Workers, but keep simulation APIs worker-friendly.
- Use tiered world simulation fidelity rather than simulating every unseen player at maximum detail.
- Avoid unnecessary rerenders of large league/roster lists.
- Lazy-load heavy secondary screens/content where appropriate.

## PWA

Bootstrap should provide:

- web app manifest;
- installable shell;
- service worker strategy appropriate to Vite/PWA tooling;
- offline-safe local career where feasible;
- clear update behavior to avoid old bundle/new save incompatibility.

## Storage

Request persistent browser storage when supported after user engagement. Failure must not block play.

## Budgets for vertical slice

Initial targets, to be measured rather than worshipped:

- usable first screen quickly on modern phone/network;
- no multi-second blocking simulation on normal weekly advance;
- game sim progress remains responsive;
- no visible layout clipping in ko-KR or en-US at supported phone widths.

If a simulation exceeds a comfortable main-thread budget, profile and move the expensive world work behind an async/worker boundary.
