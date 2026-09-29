# Test Strategy

## Layers

The workspace Vitest gate caps concurrent workers at four. Full twelve-week current-position tests still reload every saved boundary under the unchanged five-second per-case default. On the 16-logical-CPU development host, default concurrency exceeded that timeout in four long scenarios; the same 820-case suite passed with four workers. This bounds harness contention without reducing coverage or replacing the separate built-package performance gate. Run production browser checks separately from CPU-heavy simulation gates.

### Unit tests

Examples:

- training progress and Body cost;
- skill modifiers;
- event requirement evaluation;
- depth evaluation;
- snap-share distribution;
- key-snap resolution;
- save migrations;
- localization helpers.

### Invariant/property-style tests

Always protect bounds/contracts such as:

- Body 0–100;
- Coach Trust 0–100;
- attributes 0–100;
- GPA within configured range;
- valid depth ranks;
- no invalid owned/equipped skill references;
- no missing program/player references;
- same input + same seed = same result.

### Scenario tests

Named deterministic stories:

- highly rated freshman at powerhouse starts low on depth chart;
- strong practice + trust can cause promotion;
- low Body changes training/game risk;
- Film Study changes available key-snap information;
- skill draft respects tags and seed;
- alumni save/load and mentor eligibility.

M4 key-snap unit coverage holds hidden context and the six resolution draws fixed while changing only IQ-driven clue visibility, replays every saved decision boundary through JSON and reversed catalog order, and checks that post-game stats equal the retained key-play log. Literal seeded full games must reach all four WR decision families and all eight existing game hooks, preserving equipped-slot/effect-index order and rejected-command zero-draw identity.

Post-game tests independently recompute the authored opportunity-normalized grade, prove canonical family-weighted XP and bounded state evidence match the published player, cover truthful zero-offense consequences, and require committed current careers to reject direct `WEEK_END` advance. Successful `POST_GAME` close must retain cumulative history and persist a bounded canonical Game Day gauge source; historical checked-report commands remain isolated from shipping adapters.

The checked M4 report uses only public creation/recruiting/commitment/practice/shipped-game/skill/week commands. Twenty literal-seed careers produce 120 full games across every depth role, all three archetypes, all three program bands, Body/IQ and Film/no-Film segments, three decision policies, empty and acquired-card builds, all four snap families, every grade band, live hook evidence, zero-opportunity participation, exact game draw ranges, and save/reload equivalence after every requested boundary. The report CLI builds game-core before content/testkit and regeneration must keep every earlier checked report byte-stable.

M5 injury unit/scenario coverage recomputes visible risk from Body, Durability, projected workload, recent authored training load, WR exposure, and equipped passive-recovery effects. It proves canonical catalog-order replay, one draw for a miss, two draws for a new injury, zero draws for ongoing assessment and player choices, strict LIMITED/OUT restrictions, recovery-credit rollover, scheduled opportunity caps, exact JSON reload, and tamper rejection. Risk-band tests must show directional separation before the full-season report adds population rates.

M5 skill coverage validates the exact 40-card stable catalog, target six-family split, 13 tradeoffs, bilingual keys, behavior affinities, and seeded reachability of every card. Focused scenarios prove distinct Development, Game Day, and Body mechanics; the injury-risk collector records equipped slot/effect order and clamps additive fixed-point adjustments; and the Campus Bridge life hook is required for its exclusive event. Locked M3.5/M4 reports receive explicit historical 27-card definitions, including the historical effect registry, so live catalog additions cannot silently rewrite completed milestone bytes.

M5 season-closure scenarios pin both a qualifier and non-qualifier. They replay the compact bracket through shipping adapters, verify that player fixtures use career RNG while aggregate fixtures use only world RNG, persist higher-seed regulation-tie evidence, reject unavailable player postseason preparation, and round-trip the exact review/completed session. Cross-object validators recompute the completed summary and alumnus identity from saved season/game/role/injury/world evidence, reject duplicates and content tampering, and require the bounded legacy projection to grant history without power. Browser persistence tests inject final-transaction failure and prove the prior current session, snapshots, and profile remain byte-equivalent.

The checked M5 report uses only exported creation, recruiting, weekly, event, injury, scheduled-game, skill, postseason, review, completion, and legacy commands. Six literal careers cross all three recruit tiers, program bands, and WR archetypes; five weekly strategies; six skill-build policies; all event-choice policies; both injury choices; all four roles; all six skill families; and qualifier/non-qualifier endings. Every requested transition round-trips the exact `CareerSessionV5` or `MetaProfileV1`, every sample prints a reproduction string, and a replay must finish under a conservative 20-second test bound. Regeneration checks the fixed SHA-256 of every M1–M4 and M3.5 report before the new M5 artifact is accepted.

The checked M6 report uses the exported public-command off-field career builder. Six literal careers cross every recruit tier, WR archetype, and program band; safe/ineligible academic inputs and all three checkpoint outcomes; coach, room-leader, and competitor relationship strategies with up/flat/down evidence; accept+fulfill, accept+default, and decline NIL policies; Stay and transfer; continuity, position-staff, and scheme-shift world outcomes; and developmental/reserve/starter season-two roles. Each performs 295–399 exact round trips through the selected-program opening game. Replay is bounded at 30 seconds and regeneration verifies the exact SHA-256 of every M1–M5 report before accepting the M6 artifact.

M6 component/storage-shell coverage renders every new saved surface in ko-KR and en-US. It asserts fictional academic thresholds, relationship football modifiers, Brand/funds, offer rewards and obligation/default effects, mandatory obligation lockout, the full Stay-plus-three projection, one exact persisted commitment, and season-two bootstrap. A failed NIL write must leave the pending offer visible and disabled until exact retry; successful nested transitions update focus evidence without creating a new gameplay rule in React.

M6 production-browser coverage uses only shipping UI commands and raw read-only IndexedDB inspection. A deterministic social-athlete seed earns offer eligibility through an ordinary event rather than a test-only state override. Korean low-risk and English higher-risk careers run on native Pixel 7 and desktop Chromium, while a complete Korean transfer path runs at 320×760. Together they cover Study Hall versus no-academic-focus GPA trajectories, both checkpoints, changed relationship tracks and Team consequences, NIL accept/decline/fulfillment, transaction failure with byte-equivalent authoritative envelope followed by exact retry, offline review reload, Stay and transfer, four saved options, commitment reload, distinct destination room, unchanged meta storage, and the selected program's season-two opening game. The aggregate browser gate keeps historical M1–M4 paths green and carries the M5 full-season paths to the new v6 offseason handoff; exact completed-v5 terminal/alumni compatibility remains migration/storage tested.

M6 performance coverage uses a testkit-only observer around public-command weekly, aggregate-world, offseason-projection, offseason-decision, and next-season-bootstrap boundaries. `profile:m6` runs built-package Stay and transfer careers three times without serialization cost, prints mean/p95/max values, and fails any observed operation at 1,000 ms. Timings never enter gameplay state or checked report bytes. Production build verification also requires the explicit game-core, game-content, vendor, entry, and dynamically imported Career-screen chunks plus complete PWA precache.

M7 persistence coverage begins with literal exact v6→v7 career migration across every persisted weekly phase and exact session migration across weekly, event, injury, season-review, and completed paths. Tests require schema-marker-only semantic change, identical revision and career/world RNG evidence, strict v6/v7 reader isolation, deep freezing, exact v1–v7 convergence, and malformed/future rejection. Browser coverage signs raw version-6 envelopes, verifies the original checksum first, migrates without eager rewriting, writes version 7 only after a successful command, and protects version 8. Reserved QB/RB/CB IDs are validated while a non-WR v7 player remains invalid until the later position-aware contract activates.

M7 staged-world coverage runs the real 32-program catalog through all 192 regular-season fixtures, group standings, evidence-based national rankings, a four-team postseason, all-program offseason projection, and repeated archive rollover. It requires exact zero-world-draw player fixtures, two draws per aggregate fixture, three offseason draws per program, Tier 2/3 reachability, four-position matchup evidence, catalog-order equivalence, higher-seed aggregate tie continuity, and rejection of altered results/tables/draw chains/qualifiers/champion evidence. A separate browser-independent core fixture keeps this engine inside the deterministic simulation gate before the staged state becomes a live save.

The checked M7 report uses the exported browser-independent position-career builder. Six literal careers cover QB/RB/CB, every added archetype, both decision policies, Stay and transfer, exact room/world draw ownership, two full seasons, strict lifecycle serialization after every boundary, postseason, position-stat summaries, and position-meta alumni completion. Regeneration verifies every exact M1–M6 artifact hash before accepting the M7 artifact; `profile:m7` executes the built package and fails any full scenario above a conservative 10-second bound. WR coverage remains the exact frozen M6 public-command artifact until the production multi-position session replaces the staged boundary without rewriting history.

### Simulation tests

Run hundreds/thousands of automated careers to report distributions.

Required reporting fields eventually include:

- starter timing by recruit tier/program tier;
- transfer frequency;
- injury count/time missed;
- draft frequency/round;
- award frequency;
- skill offer/pick rate;
- action usage;
- average Body/recovery behavior;
- career length/end reason.

### E2E

Playwright covers core happy paths in **both locales**.

M4 production-browser coverage runs Korean and English saved game journeys under the native mobile and desktop projects plus a true 320 px route. It reads exact IndexedDB preview/key-snap/post-game revisions, injects and retries one failed decision save while the prior snap remains locked, checks three 72 px semantic choices, post-game stats/participation/history and reload equality, and advances only from saved post-game. Preserved M1/M2 journeys traverse games, and their literal seeds are pinned against game RNG before asserting later skill offers.

At minimum:

- new career creation;
- program choice;
- action planning;
- weekly advance;
- key-snap interaction when available;
- save/reload;
- locale switch/persistence;
- career completion/legacy once implemented.

The M3 production gate runs 26 executions across Pixel 7 and desktop Chromium. Its fixed-seed Korean/English journeys inspect native IndexedDB for exact recruiting, generated-room, order, RNG, depth, and projection state; inject and retry a failed authoritative program save; reload online and offline; and reproduce acceptance scenario D. A separate 320 px route checks keyboard use, 44 px controls, containment, and overflow through program choice and promotion.

## Reproducibility

M7 long-career transport coverage must include the actual browser-life policy (Film/Recovery/Study, first skill/event/snap, first available NIL action, rest/rehab), not only the historical drill/decline strategy. `profile-m7-current-cli.js --wire-v3` supports that policy through `--browser-life` and the pinned second locale seed set through `--seed-offset=3`; every position runs Stay and transfer through actual two-season retirement. Each command checks exact whole-domain reload, both RNG streams through domain equality, unchanged 1,000 ms gameplay-command and 1,000,000-byte whole-envelope bounds, and canonical page safety. Telemetry distinguishes wire/envelope bytes and maximum compressed/expanded page size. The literal default wire-v2 mode remains available for reproducing the original UUID-suffix-4 overflow.

Native current-career journeys pin explicit seeds and retain the last observed checksummed envelope as a failure artifact. Current App tests intentionally start selected boundaries from literal v2 envelopes, require zero writes on load, then assert v3 publication only after a successful explicit command. Codec tests cover v1/v2/v3 mixed current/recovery/alumni data, original proof preservation, older-writer rejection even on replacement, native snapshot-pruning rollback and exact retry. Passing a prior build or one strategy does not replace the final full-browser gate.

Every simulation failure/report must print the seed and enough scenario identifiers to reproduce it.

M7 position vertical tests must additionally prove exact per-snap draw budgets, zero-draw truthful no-opportunity handling, all authored pattern/family reachability, canonical replay under content reordering, rejection immutability, mechanically observable position-skill and event-choice effects, postgame stats/grade/growth, and a detailed score handoff that consumes no world RNG for the player's fixture.
