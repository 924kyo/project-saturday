# Meta Progression and Alumni Legacy

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Design goal

One career is one player's story. All careers together become the player's personal college-football history.

## Alumni record

On career completion, persist an Alumni record containing at least:

- player identity/appearance snapshot;
- program(s);
- position/archetype/background/personality;
- seasons played;
- career stats;
- awards/championships;
- draft/ending result;
- signature/equipped skills;
- notable history tags;
- career seed/content version.

## Persistent history

Future careers can encounter previous alumni through:

- program record books;
- hall-of-fame/legends UI;
- record-chasing messages;
- alumni mentor selection;
- occasional alumni event cameos;
- program-history flavor.

These interactions should respect content/identity stability even as saves migrate.

## M5 vertical-slice implementation

`MetaProfileV1` stores canonical immutable `AlumniRecordV1` entries plus program familiarity and unlocked option IDs. The first complete career records the saved player identity and appearance, WR archetype/background/personality, one program, one season, complete player stat line, average grade and best game, starting/final role and full role trajectory, acquired/equipped skills, injury count and weeks missed, program record, season outcome/rank/seed, championship count, one-season ending ID, career seed, and career/content schema versions.

The first legacy projection is deliberately history-first. A completed alumnus increments familiarity for their program and unlocks `legacy_option_alumni_history`; a subsequent career can see matching alumni and familiarity through a pure projection. It grants no automatic attributes, starter role, Coach Trust, skill ownership, or guaranteed offer. Completing the same career twice or loading an alumnus with incompatible schema/content identity is rejected.

The M5 shipping UI exposes this record twice: immediately after the atomic career-completion save as an alumni-history surface, and on the next Creation screen as a returning-history notice containing the latest alumnus and completed-career count. Neither surface mutates or summarizes power into the new athlete. Creating the next player replaces the completed current session but preserves the separately saved `MetaProfileV1`.

Browser persistence publishes the completed session, final recovery snapshot, and updated meta profile in one cross-store transaction. A storage failure leaves the prior current session, snapshots, and profile unchanged, so the UI cannot announce an alumnus that was only partially saved.

## Reward distribution philosophy

Approximate emphasis:

- 70% history/discovery/unlocks;
- 20% build-option shaping;
- 10% bounded direct convenience/power.

This is a philosophy, not a literal point calculation.

## Good meta rewards

- unlock a new background;
- unlock a skill into future pools;
- reveal more program information;
- cosmetic item;
- alumni mentor option;
- one additional information clue in a narrow context;
- small starting Coach Trust bonus at that alumnus's program.

## Bad meta rewards

- permanent +20 all attributes after enough runs;
- guaranteed S-card start;
- automatic starter status;
- compounding bonuses that make later careers trivial.

## Failed careers

A backup/transfer/injury/undrafted career still grants:

- career history;
- program familiarity;
- position knowledge/collection progress;
- some unlock/discovery opportunity.

## Meta goals

Collection screens may show:

- careers completed;
- positions completed;
- schools experienced;
- champions;
- All-Americans;
- first-rounders;
- top awards;
- records;
- skill collection.

These should naturally motivate varied future careers without forcing checklist play.

## M7 position-meta compatibility

M7.5 WR two-season completion must not be squeezed into the historical one-season alumni shape. Its versioned record retains exact reviewed evidence through the existing bounded lossless archive, source schema 8, two actual seasons, both experienced programs, cumulative production and original athlete identity/build. First-season legacy summaries retain injury counts/weeks even when incident IDs were not recorded; represent those IDs as unavailable, not an empty known injury history. Existing one-season alumni remain literal. A new profile/writer boundary and atomic session/meta publication are required before activation; archive/whole-envelope and repeated-career budgets remain enforced.

The direct two-season alpha ends through an explicit zero-draw command after the second current season review. It publishes shared position-meta from the actual two season summaries, retains the last active season/program and every player/skill/off-field/history field, and clears only the no-longer-actionable offseason projection. It must not create a third program stint or apply offseason trust/Preparation resets to a retiring athlete. The retained review evidence allows the strict reader to reconstruct the prior review and re-derive alumni totals, rejecting edits or repeated completion. Historical v1 terminal lifecycle indices and completion records remain literal.

Current direct-play season summaries must retain actual owned/equipped skills, including slot four, alongside bracket outcome and recorded injury facts. Current alumni may not inherit the historical added-position resolver's empty build placeholders. Historical summaries with no injury ledger remain literal and acquire no invented incidents. Final current alumni/season-two publication remains gated by the current carryover implementation.

The staged `PositionMetaProfileV2` broadens alumni to QB, RB, WR, and CB, multiple seasons, multiple program stints, canonical position-stat entries, and per-season summaries. Completing a lifecycle aggregates only the selected position's stable stat IDs, increments familiarity once for each distinct program experienced, and preserves the complete season evidence. Legacy projection filters by position and program, reports completed-position count and familiarity, and explicitly grants zero starting-power bonus.

The production browser continues writing strict `MetaProfileV1` until step 11 activates the complete public aggregate. An already strictly parsed v1 WR profile has a lossless typed conversion path: identity/appearance, career/program IDs, one-season results, every WR total, role and injury facts, skills, career/content versions, unlocks, and familiarity survive. This does not reopen the completed career or reinterpret its old session.
