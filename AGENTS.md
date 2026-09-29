# AGENTS.md — Project Saturday

## Mission

Build an original, deterministic, mobile-first college-football **player career RPG**. The player controls one athlete, not a coach or entire program.

The product must feel deep behind the scenes but fast in hand: normally the player chooses a few meaningful actions, resolves a contextual event when one exists, plays important key snaps, sees consequences, and advances.

## Read before work

For routine autonomous continuation, follow `docs/execution/EXECUTION_EFFICIENCY_PROTOCOL.md`: read this file, compact progress, the active plan, and that plan's relevant specs. The full orientation list below applies on initial onboarding or when changed scope requires it; do not repeatedly ingest historical archives. Use `TEST_GATE_TIERS.md` for validation scope, without waiving final milestone gates.

Always read:

- `docs/INDEX.md`
- `docs/00-project/PROJECT_CONTEXT.md`
- `docs/product-specs/CORE_BELIEFS.md`
- `docs/execution/PROGRESS.md`
- the relevant feature spec
- the active exec plan, if any

For autonomous multi-step work also read:

- `docs/execution/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `docs/execution/TARGET.md`
- `docs/execution/MASTER_ROADMAP.md`

## Non-negotiable product invariants

1. **Flow first.** Complexity may exist internally; avoid repetitive micromanagement.
2. **Skill build matters.** Skill cards must change decisions, efficiency, risk, or system behavior—not merely add flat stats.
3. **Depth-chart progression matters.** Attribute growth is a means; playing time, role, reputation, and career trajectory are the emotional rewards.
4. **Character identity matters.** Appearance, body, background, personality, program, skills, relationships, and event eligibility must create materially different careers.
5. **Legacy expands possibility more than raw power.** Completed careers become alumni and persistent history.
6. **Korean and English ship together.** `ko-KR` and `en-US` are first-class from the beginning.
7. **Original implementation only.** Never copy proprietary code, assets, text, UI, event writing, data, logos, team identities, or exact content from The Rookie, EA College Football, or other games.

## Architecture invariants

1. Gameplay rules do not live in React components.
2. `packages/game-core` has no browser or React dependency.
3. All randomness in gameplay is supplied through deterministic seeded RNG.
4. `Math.random()` is forbidden in `packages/game-core` and content resolution.
5. Content references stable IDs, never display text.
6. Once a shipped content ID exists, do not rename it without migration/alias handling.
7. Save-schema changes require explicit versioning and migration tests.
8. UI never directly mutates `CareerRun`, `WorldState`, or `MetaProfile`.
9. User-visible text must come from localization resources; no hardcoded shipping copy in components.
10. Simulation logic must be executable and testable without a browser.

## Localization invariants

Supported locales:

- `ko-KR` — primary authoring/review locale
- `en-US` — simultaneous release locale

Every feature that adds user-visible copy must add both locales in the same change. CI/content validation must fail on missing keys. See `docs/product-specs/LOCALIZATION.md`.

## Autonomous behavior

When the user asks for project delivery or the startup prompt activates autonomous mode:

- do not stop after a plan;
- do not stop after an atomic task;
- do not stop after a milestone if the target is later;
- choose conservative reversible defaults for ordinary ambiguity and record them;
- update durable project state after every verified task;
- ask the user only for a hard blocker as defined in the execution protocol.

## Expected commands

Codex should create these scripts during bootstrap and keep them working:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm test:content
pnpm test:sim
pnpm e2e
pnpm build
```

Run the narrowest relevant checks during iteration and the full required gate before completing a milestone.

## Coding style

- TypeScript `strict: true`.
- Prefer pure functions and immutable domain transitions.
- Avoid `any`; if unavoidable, document why.
- Prefer discriminated unions for game phases and result types.
- Prefer explicit units in names (`heightCm`, `bodyCost`, `weekIndex`).
- Avoid hidden global state.
- No silent gameplay-rule invention in UI code.
- Keep mechanical constants centralized and data-driven when designers are expected to tune them.

## Completion of a task

A task is not complete until:

1. implementation is present;
2. relevant deterministic tests exist;
3. localization is complete if copy changed;
4. affected content validates;
5. typecheck/lint/tests required by scope pass;
6. docs/specs are synchronized;
7. `PROGRESS.md` and backlog are updated;
8. deviations or assumptions are recorded.

## Git behavior

- Work on the current branch/worktree unless a task explicitly uses another worktree.
- Prefer small coherent commits when git is available.
- Never push, publish, deploy publicly, purchase services, or modify remote production resources without explicit authorization.
- Never commit secrets.
