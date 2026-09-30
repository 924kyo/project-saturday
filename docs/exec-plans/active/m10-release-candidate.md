# M10 — 1.0 release candidate

Status: active 2026-09-30. It follows M9, which closed on its Tier 3 gate. This is the durable target (`TARGET.md`).

Authoritative inputs:
- `docs/execution/MASTER_ROADMAP.md` (the M10 deliverables);
- `docs/execution/RELEASE_CHECKLIST.md` (the gate);
- `docs/qa/BALANCE_TARGETS.md`.

## Gate

Every item in `RELEASE_CHECKLIST.md` is checked with evidence, there are no critical or high blockers, a release readiness report exists, and a clean production build passes.

## Sequence

1. **Balance at scale:** (done 2026-09-30; `packages/testkit/reports/m10-balance.jsonl`)
   - a checked, reproducible multi-season batch report (six positions, several strategies and seeds) covering distributions for role, overall, injuries, bracket rate, awards, NIL, draft and endings;
   - fix the open balance notes: confidence saturation, rest credit on short injuries, brand ceiling.
2. **Save and migration hardening:**
   - a migration fixture suite from `career_vnext` v1 to the current version, including M8/M9 optional fields;
   - corrupt and old saves recover and are communicated;
   - snapshot and backup recovery;
   - the alumni store survives malformed entries.
3. **Performance:**
   - command latency budgets for week planning, kickoff, snaps and settlement (96-program world), measured in tests;
   - save size across a four-year career;
   - weekly transitions responsive on mobile emulation.
4. **Accessibility:**
   - an automated check of accessible names, labels and roles on every screen;
   - a keyboard-only journey, reduced motion, and a review of contrast, state semantics and touch targets.
5. **Browser and PWA matrix:**
   - mobile Safari (WebKit) and Chrome smoke where the engines are available, plus desktop;
   - PWA install/update behavior (a service worker update is picked up without data loss);
   - offline.
6. **Localization QA:** full career smoke in both locales, number/unit/currency formatting, and a mobile layout review in both locales.
7. **Hygiene and documentation:**
   - originality and legal review;
   - known limitations;
   - specs and ADRs match the implementation;
   - release notes and the readiness report.
8. **Gate:** checklist complete, Tier 3, `PROGRESS.md` marks M10 complete.
