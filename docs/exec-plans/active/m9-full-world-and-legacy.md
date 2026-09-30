# M9 — Full world, content and legacy history

Status: active 2026-09-30. It follows M8, which closed on its Tier 3 gate. Target M10 is unchanged.

Authoritative inputs:
- `docs/execution/MASTER_ROADMAP.md` (the M9 deliverables and gate);
- `docs/product-specs/PROGRAM_WORLD.md` and `LEAGUE_AND_POSTSEASON.md` (96 programs, 8 conferences of 12);
- `docs/product-specs/DRAFT_AND_CAREER_ENDINGS.md` (awards and final presentation);
- `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`.

## Gate

Repeated careers show strong variation and persistent history:
- a batch of careers across the six positions differs in programs, records, awards, NIL, draft outcomes and endings (in the career harness);
- in the real app, a second career sees the first career's history: the Alumni Wall, the record book, mentors and cameos, and program familiarity;
- content scale meets the roadmap: 96 programs, 100–130 cards, and 250–350 events, with a bilingual editorial pass;
- all automated gates pass, plus a Tier 3 gate.

## Guardrails

- The M8 guardrails carry over:
  - deterministic named streams;
  - stable IDs;
  - ko-KR/en-US in the same change;
  - presentation never invents football;
  - orthogonal tests, with Cartesian coverage only at the gate.
- Legacy grants information and story, never starting power (M7 rule). Mentors and cameos may shape a week's scene choices; they never add ratings.
- A career is deterministic from its own save. Legacy facts are snapshotted into the career when it is created, never read live from the alumni store during play.
- No save migration without a version and a test. New save fields are optional. A world season in progress finishes on the world it started on.

## Sequence

1. **96-program world:** (done 2026-09-30)
   - 32 new original programs, 4 per conference, giving 8 conferences of 12;
   - a 12-game schedule: 9 conference games from a 12-team round robin, plus 3 non-conference games over distinct conference matchings;
   - the same 12-team bracket and the same 16-week stride;
   - `world_vnext_96_program`; a 64-program season in progress finishes there.
2. **Awards and championships:** (done 2026-09-30)
   - deterministic fictional season awards from saved facts, including all-conference, a position award, player of the year and a freshman award;
   - conference and national titles in the review and on the Alumni Wall;
   - awards feed draft stock (the spec's "awards" dimension).
3. **Legacy history:** (done 2026-09-30)
   - an alumni snapshot is saved into each new career;
   - record book: career records across alumni;
   - program familiarity: past alumni at a program shown in recruiting, transfers and Team;
   - mentors: an alumnus from the current program can appear in a weekly scene;
   - cameos: authored reactions that mention alumni when their facts apply.
4. **Event library to 250+:** (done 2026-09-30; 254 events, 100 cards) themed position-neutral packs (campus, locker room, media, body, family, program, big games), each with paired copy through the shared event kernel.
5. **Content QA and bilingual editorial pass:** an automated copy audit (placeholders, lengths, ICU parity, glossary) and a reviewed pass over new surfaces.
6. **Gate:** a repeated-career variation harness, a two-career browser journey (history persists), a parity ledger update, and a Tier 3 gate.
