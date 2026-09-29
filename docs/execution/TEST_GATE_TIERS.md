# Test Gate Tiers

Use the lowest tier that gives confidence for the current change.
Higher tiers subsume lower-tier intent but should not be rerun without changes.

## Tier 0 — edit loop

Run after small local edits.

Typical scope:
- affected package typecheck
- affected lint target
- directly relevant unit tests
- formatting on changed files

Target: seconds to a few minutes.

Do not run Playwright here.

## Tier 1 — atomic-step gate

Run after one coherent atomic task.

Required:
- affected package tests
- focused deterministic simulation if game logic changed
- affected content validation if content changed
- repository typecheck/boundary/localized-copy checks when interfaces cross packages
- affected package build when exports changed

Browser:
- only a focused scenario if the change is specifically browser/persistence/UI behavior.

## Tier 2 — phase/integration gate

Run after a meaningful phase such as M7.5 B1 or B2–B5 integration.

Required:
- full workspace tests
- focused content/simulation suites
- repository static checks
- production build/export/PWA verification

Browser smoke set:
- ko-KR mobile
- en-US desktop
- true 320 px mobile
- add one targeted offline/retry/transfer scenario if touched

Do not run the entire native matrix unless a trigger below applies.

## Tier 3 — milestone closeout gate

Mandatory before marking a milestone complete.

Required:
- complete workspace/static/format gates
- complete focused content/simulation gates
- required checked reports/hashes
- production build/export/PWA checks
- full defined Playwright/native matrix
- focused high/medium severity review
- progress/roadmap/backlog synchronization

## Full-browser-matrix early triggers

Run Tier 3 browser coverage before milestone close only when:
- browser save/writer version changes,
- persistence codec/envelope changes,
- service worker/offline storage changes,
- navigation shell changes across all screens,
- a regression was only reproducible in production browser,
- the active plan explicitly marks it as a release boundary.

Otherwise use Tier 2 smoke coverage.

## Historical regression strategy

Historical contracts should use fast deterministic fixtures/reports in routine gates.
Do not rerun old full browser journeys merely because unrelated UI/content changed.

## Repeat rule

If:
- inputs have not changed,
- the relevant gate is already green,
- no new dependency/toolchain changed,

then reuse the recorded green evidence rather than rerunning it.
