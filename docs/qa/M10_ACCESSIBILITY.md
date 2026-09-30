# M10 — Accessibility pass

Date: 2026-09-30.

## Automated gates (default e2e plan, every `pnpm check`)

- `e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1/2.2 A and AA, including target size) on:
  - creation;
  - This Week, Build, Team and Profile;
  - planning, the practice report and the weekly scenes;
  - pregame, a snap, a result, the final and the post-game.

  It runs in both locales on desktop and in ko-KR on a phone. Serious and critical violations fail the build.
- `e2e/keyboard.spec.ts`:
  - a keyboard-only journey (Tab and Enter/Space) from the landing screen through creation, recruiting, planning, the weekly scenes, kickoff and a resolved snap;
  - a reduced-motion check: with `prefers-reduced-motion`, the Tactical Board renders saved results with no SVG animation.
- `apps/web/src/app/theme.test.ts`: text on every program's primary color reaches AA contrast.
- `check-localized-copy` plus the typed message keys: no untranslated literal copy reaches the screen.

## Fixed in this pass

1. The tag text on the highlighted "you" depth row failed contrast; it now uses the brighter secondary ink.
2. Score-bug team abbreviations used white on every program color. Light palettes failed, so the ink is now chosen by WCAG contrast (`inkOn`).

## Reviewed by design (unchanged)

- State semantics:
  - tabs use `role=tab`/`tablist`;
  - multi-select focuses use `role=checkbox` with `aria-checked`;
  - result lower-thirds and save notices use `role=status`, and failures use `role=alert`;
  - confirmations use `role=alertdialog`;
  - the board has a text equivalent (`role=img` with a summary).
- Touch targets: WCAG 2.2 target-size passes on the phone project; primary actions are full-width bars.

## Open

- Screen-reader walkthroughs with NVDA/VoiceOver are recommended before a public 1.0 (manual QA).
