# M0 Bootstrap Execution Plan

## Goal

Create the complete M0 repository harness: a deterministic TypeScript game engine workspace, validated bilingual content, a mobile-first React PWA shell, browser persistence boundary, and reliable local/CI verification commands.

## Scope

- Initialize the pnpm workspace and package boundaries described in `ARCHITECTURE.md`.
- Configure strict TypeScript, linting, formatting, Vitest, Playwright, and an aggregate check command.
- Create `@project-saturday/game-core`, `@project-saturday/game-content`, and `@project-saturday/testkit` with explicit dependency direction.
- Implement and test an explicit seeded RNG in `game-core`.
- Add a schema-validation skeleton and bilingual locale completeness/interpolation validation in `game-content`.
- Build the first localized `ko-KR` / `en-US` React screen without shipping hardcoded copy.
- Add the baseline manifest/service-worker behavior and typed IndexedDB storage adapter.
- Add an automated workflow that runs the local M0 quality gate.

## Non-goals

- Player creation or weekly gameplay rules (M1).
- Skill, program, depth-chart, or game-simulation content (M2+).
- Backend/cloud sync, accounts, analytics, or public deployment.
- Production branding or licensed college-football assets.

## Relevant specs

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/product-specs/LOCALIZATION.md`
- `docs/product-specs/SAVE_SYSTEM.md`
- `docs/product-specs/UX_AND_FLOW.md`
- `docs/engineering/CODING_STANDARDS.md`
- `docs/engineering/CONTENT_ARCHITECTURE.md`
- `docs/engineering/PERFORMANCE_AND_PWA.md`
- `docs/engineering/TEST_STRATEGY.md`
- `docs/execution/DEFINITION_OF_DONE.md`

## Proposed steps

1. Establish root workspace/package metadata, strict TypeScript project references, shared lint/format configuration, and canonical scripts.
2. Scaffold package public APIs and dependency boundaries.
3. Implement a serializable seeded RNG plus deterministic/range invariant tests.
4. Implement typed initial content schemas, bilingual locale resources, completeness/interpolation checks, and content tests.
5. Build the localized responsive web shell and locale switch/persistence behavior.
6. Add the typed IndexedDB adapter and storage contract tests.
7. Add PWA manifest/service worker configuration and verify generated production assets.
8. Add Playwright smoke tests for both locales and persistence, plus CI configuration.
9. Run every expected M0 command, inspect the diff/tree for invariant violations, and resolve failures.
10. Update execution documentation and move this plan to completed before selecting M1.

## Acceptance criteria

- `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:content`, `pnpm test:sim`, `pnpm e2e`, and `pnpm build` exist and pass.
- The web app renders useful localized copy in both required locales and persists locale selection.
- Content validation fails for locale key or interpolation-contract mismatch.
- The production build contains installable PWA manifest/service-worker assets.
- The storage abstraction can round-trip, list, and delete versioned envelopes without leaking browser APIs into `game-core`.
- Identical RNG seeds produce identical sequences and sampled values remain within defined bounds.
- `game-core` has no React/browser dependency and contains no `Math.random()`.
- M0 documentation and execution ledgers match verified repository state.

## Test / verification plan

- Focused Vitest suites per package during implementation.
- Static dependency/nondeterminism/localization checks through lint/content scripts.
- Playwright smoke paths at mobile and desktop widths for `ko-KR` and `en-US`.
- Production build inspection for PWA output.
- Final full M0 command suite in the order documented by `AGENTS.md`.

## Risks / assumptions

- The workspace starts without git metadata; local commits are unavailable unless the user later initializes git. This does not block implementation or verification.
- `pnpm` is not currently activated. Bootstrap will use Corepack and a pinned package-manager version, requesting network permission only if the sandbox blocks package retrieval.
- Browser PWA installability cannot be exhaustively proven without platform-specific manual testing; M0 verifies generated assets and automated browser behavior, with the full device matrix reserved for M10.
- M0 storage uses a deliberately small generic adapter/envelope contract; domain save migrations begin when M1 introduces real career state.

## Progress notes

- 2026-08-30: Read repository instructions, target, roadmap, current ledgers, and all M0-relevant specs. Confirmed a documentation-only initial state, Node 22 availability, absent pnpm activation, and absent git metadata.
- 2026-08-30: Added the pinned workspace manifest, strict TypeScript base, ESLint/Prettier setup, root Vitest/Playwright configuration, architecture/localized-copy static checks, and CI workflow. Corepack successfully resolved pnpm 11.24.0 from a workspace-local cache; dependency installation awaits the package manifests being implemented in parallel.
- 2026-08-30: Integrated and independently re-verified `game-core`, `game-content`, and `testkit`. The immutable xoshiro128** RNG has 13 passing tests, deterministic scenario helpers have 4, and bilingual ICU/content validation has 22. Shared dependency installation is healthy after explicitly allowing the exact `sharp` build needed to generate PWA icon assets.
- 2026-08-30: Completed the bilingual React/PWA shell, typed five-store IndexedDB boundary with visible memory-fallback warning, locale persistence, update prompt, and generated install assets. Added mobile/desktop browser checks including keyboard navigation, 320 px overflow, persisted locale, manifest icons, service-worker activation, and offline reload.
- 2026-08-30: Independent review found no critical/high issues after hardening built-package exports, browser-only TypeScript isolation, RNG edge cases, seeded failure context, ICU ordinal/offset contracts, AST-based localized-copy enforcement, and duplicate PWA precache detection.
- 2026-08-30: Final `corepack pnpm check` passed: typecheck, lint/boundary/localization checks, formatting, 4 localization-guard fixtures, 62 Vitest tests, 23 focused content tests, 20 focused simulation tests, 8 Playwright scenarios, and the verified production build. M0 is complete.
