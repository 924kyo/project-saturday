# 1.0 Release Candidate Checklist

Completed 2026-09-30 for the M10 gate. The evidence for each item is in `docs/release/READINESS_REPORT.md`.

## Product

- [x] All six target positions complete and distinct.
- [x] 96 fictional programs / 8 fictional conferences validated.
- [x] Full career from creation to ending/draft works.
- [x] Skill builds materially alter decisions.
- [x] Depth/snap progression is clear and stable.
- [x] Events vary meaningfully by identity/tags/context.
- [x] NIL/off-field systems create tradeoffs without weekly chore overload.
- [x] Transfer flow works.
- [x] Alumni/legacy history persists and affects future possibilities.

## Localization

- [x] No missing ko-KR keys.
- [x] No missing en-US keys.
- [x] Full career smoke in ko-KR.
- [x] Full career smoke in en-US.
- [x] Unit/date/number/currency formatting reviewed.
- [x] Mobile layouts reviewed for both locales.

## Save/data

- [x] Fresh install/new profile works.
- [x] Autosave/reload works.
- [x] Snapshot recovery works.
- [x] Migration fixture suite passes.
- [x] Corrupt/old save failure is recoverable and communicated.

## Engineering

- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] `pnpm test:content` passes.
- [x] `pnpm test:sim` passes target thresholds.
- [x] `pnpm e2e` passes required matrix.
- [x] `pnpm build` passes.
- [x] No critical/high known defects.

## Performance/PWA

- [x] PWA installs where supported.
- [x] Offline/local save path behaves as designed.
- [x] Service-worker update behavior tested.
- [x] Main weekly transitions are responsive on target mobile devices/emulation.
- [x] Long world simulation does not freeze UX beyond accepted budget.

## Accessibility

- [x] Keyboard smoke on desktop.
- [x] Reduced motion.
- [x] Contrast/state semantics reviewed.
- [x] Touch targets reviewed.

## Legal/originality hygiene

- [x] No copied proprietary game code/assets/text.
- [x] Fictional program names/marks reviewed for originality.
- [x] No unlicensed real-player likeness/content included.

## Documentation

- [x] `PROGRESS.md` marks M10 complete.
- [x] ADRs/specs match implementation.
- [x] Known limitations documented.
- [x] Release/readiness report generated.
