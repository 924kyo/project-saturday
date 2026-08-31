# 1.0 Release Candidate Checklist

## Product

- [ ] All six target positions complete and distinct.
- [ ] 96 fictional programs / 8 fictional conferences validated.
- [ ] Full career from creation to ending/draft works.
- [ ] Skill builds materially alter decisions.
- [ ] Depth/snap progression is clear and stable.
- [ ] Events vary meaningfully by identity/tags/context.
- [ ] NIL/off-field systems create tradeoffs without weekly chore overload.
- [ ] Transfer flow works.
- [ ] Alumni/legacy history persists and affects future possibilities.

## Localization

- [ ] No missing ko-KR keys.
- [ ] No missing en-US keys.
- [ ] Full career smoke in ko-KR.
- [ ] Full career smoke in en-US.
- [ ] Unit/date/number/currency formatting reviewed.
- [ ] Mobile layouts reviewed for both locales.

## Save/data

- [ ] Fresh install/new profile works.
- [ ] Autosave/reload works.
- [ ] Snapshot recovery works.
- [ ] Migration fixture suite passes.
- [ ] Corrupt/old save failure is recoverable and communicated.

## Engineering

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm test:content` passes.
- [ ] `pnpm test:sim` passes target thresholds.
- [ ] `pnpm e2e` passes required matrix.
- [ ] `pnpm build` passes.
- [ ] No critical/high known defects.

## Performance/PWA

- [ ] PWA installs where supported.
- [ ] Offline/local save path behaves as designed.
- [ ] Service-worker update behavior tested.
- [ ] Main weekly transitions are responsive on target mobile devices/emulation.
- [ ] Long world simulation does not freeze UX beyond accepted budget.

## Accessibility

- [ ] Keyboard smoke on desktop.
- [ ] Reduced motion.
- [ ] Contrast/state semantics reviewed.
- [ ] Touch targets reviewed.

## Legal/originality hygiene

- [ ] No copied proprietary game code/assets/text.
- [ ] Fictional program names/marks reviewed for originality.
- [ ] No unlicensed real-player likeness/content included.

## Documentation

- [ ] `PROGRESS.md` marks M10 complete.
- [ ] ADRs/specs match implementation.
- [ ] Known limitations documented.
- [ ] Release/readiness report generated.
