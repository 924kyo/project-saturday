# Backlog

This is the durable ordered task list. Codex may refine tasks but should preserve milestone order and acceptance intent.

## M0

Completed 2026-08-30. The full aggregate gate and independent review passed.

- [x] Initialize pnpm workspace and package boundaries.
- [x] Configure strict TypeScript base config.
- [x] Create React/Vite web shell.
- [x] Create game-core package with no browser deps.
- [x] Create game-content package and schema validation skeleton.
- [x] Create testkit package.
- [x] Configure Vitest.
- [x] Configure Playwright.
- [x] Configure lint/format/check scripts.
- [x] Implement seeded RNG and deterministic tests.
- [x] Install/configure i18n with ko-KR/en-US sample screen.
- [x] Add localization completeness validation.
- [x] Add PWA manifest/service worker baseline.
- [x] Add IndexedDB storage abstraction baseline.
- [x] Add CI/check workflow if repository environment supports it.

## M1

Completed 2026-08-31. The bilingual multi-week/reload gate and independent production review passed.

- [x] Author/validate bilingual 3-archetype, 5-background, and 8-trait creation catalogs.
- [x] Implement WR player identity/rating schema.
- [x] Implement body/temporary state bounds.
- [x] Implement career/week phase state machine.
- [x] Implement weekly action definitions/resolution.
- [x] Implement 3-action planning.
- [x] Implement basic training/proficiency.
- [x] Add persisted appearance/body creation catalogs and content-to-core creation helpers.
- [x] Add seeded multi-week testkit builders and a version-pinned M1 balance report.
- [x] Implement strict CareerRun v1 parsing, canonical save envelopes, snapshot retention, and recovery.
- [x] Implement player creation UI in both locales.
- [x] Implement weekly home/action flow in both locales.
- [x] Implement autosave/reload of current career.
- [x] Add M1 scenario/E2E tests.

## M2 — Complete (2026-08-31)

- [x] Add CareerRun v2 skill state and strict v1/save-envelope migration.
- [x] Define skill schemas/effect registry.
- [x] Implement equipped slots.
- [x] Implement deterministic eligible-pool filtering.
- [x] Implement weighted three-card breakthrough.
- [x] Implement recent-behavior tag weighting.
- [x] Integrate training/body modifiers.
- [x] Implement skill inventory/equip UI bilingual.
- [x] Author/validate first 18 cards.
- [x] Add skill distribution simulation report.
- [x] Add bilingual M2 skill-loop E2E and 320 px/offline coverage.

## M3

- [ ] Add CareerRun/save-envelope v3 program state and strict v2 migration.
- [ ] Define program schema/traits.
- [ ] Build original 12-program vertical-slice set.
- [ ] Implement recruiting/program choice.
- [ ] Implement WR room roster generation.
- [ ] Implement Coach Trust and Practice Form.
- [ ] Implement Scheme Fit.
- [ ] Implement stable depth evaluation.
- [ ] Implement projected snap-share model.
- [ ] Implement depth/program UI bilingual.
- [ ] Add depth simulation/scenario tests.
- [ ] Add bilingual M3 recruiting/depth E2E and 320 px/offline coverage.

## M4

- [ ] Define deterministic game state/drive abstraction.
- [ ] Implement basic opponent/team scoring simulation.
- [ ] Implement WR snap/target opportunities.
- [ ] Implement key-snap decision protocol.
- [ ] Implement first release/route decision patterns.
- [ ] Integrate Football IQ/Film information visibility.
- [ ] Implement player stat line and performance grade.
- [ ] Implement post-game growth/trust effects.
- [ ] Implement game UI bilingual.
- [ ] Add replayable seed scenarios.

## M5

- [ ] Implement fall camp.
- [ ] Implement season schedule and weekly calendar.
- [ ] Implement event requirement/tag engine.
- [ ] Author 50–70 validated bilingual events.
- [ ] Complete 36+ validated bilingual skills.
- [ ] Implement simple injury/recovery model.
- [ ] Implement postseason/season ending.
- [ ] Implement season review.
- [ ] Implement Alumni record persistence.
- [ ] Implement minimal next-career legacy visibility.
- [ ] Harden save snapshots/migrations.
- [ ] Complete ko-KR/en-US E2E season smoke tests.
- [ ] Run vertical-slice balance/performance report.

## M6–M10

Detailed tasks may be decomposed when the preceding milestone stabilizes. Use `MASTER_ROADMAP.md` as the acceptance source and add atomic backlog items before implementation.
