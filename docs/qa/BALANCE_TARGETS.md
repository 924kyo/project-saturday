# Balance Targets

These are directional metrics for simulation, not hard promises. Codex may refine ranges only with documented reasoning and reports.

## Vertical-slice expectations

- A high-rated recruit at a powerhouse should not automatically start Week 1.
- A mid-tier recruit at a less stacked program should have a plausible early-rotation/starter path.
- Multiple weekly action patterns should appear in simulated successful careers.
- No skill should be chosen nearly universally across unrelated build contexts.
- Recovery should matter, but the dominant simulated strategy should not be `recover every fixed N weeks`.
- Promotions/demotions should not oscillate every week without meaningful cause.

## Report segments

At minimum segment simulations by:

- recruiting tier/background;
- program prestige/depth strength;
- WR archetype;
- major skill family/build;
- injury/durability band.

## Long-term 1.0 distribution goals

The game should produce a broad career distribution: stars, starters, role players, transfers, injured/derailed careers, and depth careers. Exact percentages are tuned through player testing and simulation rather than hardcoded here.

## Current M2 skill baseline

The checked-in `packages/testkit/reports/m2-skill-build-baseline.jsonl` is the initial skill-loop evidence, not a final tuning target. Across 64 paired seeds per strategy, three repeated matching actions raise the associated B-grade card weight from 70 to 112. Coverage Ledger appears at 78‰ of film-repeat offer slots versus 42‰ for weight-repeat; Late Set Engine appears at 115‰ for weight-repeat versus 83‰ for film-repeat. A controlled shared-career comparison also confirms that equipped builds change decisions: Coverage Ledger raises low-Body Film Study XP from 15 to 16, while Recovery Window raises Recovery from 32 to 40 Body. Future larger samples may tune magnitudes, but must retain reproducible seeds, paired strategy comparisons, and non-universal outcomes.
