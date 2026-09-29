# M8 — Six-position beta and 64-program world

Status: active 2026-09-30. It follows R, which closed with the Career VNext app as the only app. Target M10 is unchanged.

Authoritative inputs:
- `docs/execution/MASTER_ROADMAP.md` (the M8 deliverables and gate);
- `docs/product-specs/POSITION_DESIGN.md` (LB/EDGE attributes, decisions and archetypes);
- `PROGRAM_WORLD.md`, `LEAGUE_AND_POSTSEASON.md` and `DRAFT_AND_CAREER_ENDINGS.md`;
- `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md` (positions join through the VNext game seam).

## Gate

Full multi-season careers complete for all six positions (QB, RB, WR, CB, LB, EDGE) in both locales on phone and desktop:
- Game Day decisions in every role;
- a 64-program world with conferences and an expanded postseason;
- draft stock and a declaration decision.

All automated gates pass. The balance harness covers all six positions.

## Guardrails

- The R guardrails carry over:
  - deterministic named RNG streams;
  - stable IDs;
  - ko-KR/en-US in the same change;
  - presentation never invents football;
  - a11y/PWA/offline;
  - orthogonal tests, with Cartesian coverage only at the gate.
- LB and EDGE must create distinct football decisions, not renamed CB stats.
- The world grows by content and versioned VNext rules. v3 saves migrate: an existing 32-program world keeps its season and gains the new programs at the next season.

## Sequence

1. **Position foundation (LB, EDGE):** (done 2026-09-30)
   - IDs, six position attributes each, three archetypes each, and creation;
   - room/depth mechanics, three training actions and proficiencies each, and focus injury policies;
   - program position ratings and lifecycle exposure;
   - tactical position lists, plus content schemas and validation.
2. **Defender kernel and content:** (done 2026-09-30)
   - one data-driven defensive kernel whose families, decisions, clues, patterns and outcome tables are authored per position: LB run key / gap fit / zone drop / blitz; EDGE rush move / contain vs chase / option responsibility / finish;
   - 12 skills and 12 events each;
   - the VNext game seam, frames and sideline reps, board scenes, stat keys, reactions and copy.
3. **64-program world:** (done 2026-09-30)
   - 32 new fictional programs (names, identities, ratings, rivals);
   - eight conferences, conference standings and an expanded postseason (conference champions plus at-large);
   - VNext world migration.
4. **Draft stock and declaration:**
   - a draft stock projection each season from overall, production, program strength and class;
   - a declare/return offseason decision from year three;
   - a draft ending (round or undrafted) on the Alumni Wall.
5. **Deeper off-field:** VNext NIL offers and obligations through the off-field kernel, which makes the dormant NIL/relationship card lines live; more events.
6. **Library and balance at scale:** a larger skill/content library, a six-position balance harness, and multi-season simulations.
7. **Gate:** the six-position Cartesian journey matrix, the parity ledger, and a Tier 3 gate.
