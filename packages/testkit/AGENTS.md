# AGENTS.md — packages/testkit

This package provides deterministic fixtures, scenario builders, simulation runners, and test helpers.

- Never hide nondeterminism inside helpers.
- Fixtures should be small, readable, and named after behavioral intent.
- Prefer reusable builders over gigantic serialized snapshots.
- Simulation reports must expose seeds for reproducibility.
