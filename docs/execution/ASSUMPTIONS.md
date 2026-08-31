# Assumptions

These are reversible defaults made so autonomous development can proceed without unnecessary user interruptions.

## Initial assumptions

1. `Project Saturday` is a working name; branding can change without game-state IDs depending on the display name.
2. Vertical slice uses WR only.
3. Attribute ratings use 0–100 internally.
4. Normal week grants three action selections.
5. Skill system begins with four equipped slots and three-card choose-one breakthroughs.
6. No real-money monetization or backend is required for the first vertical slice.
7. The initial fictional academic system uses GPA 0.0–4.0 but intentionally simplifies real eligibility rules.
8. Internal player body values store metric units (`cm`, `kg`) and localize display units.
9. Codex may choose mainstream implementation libraries consistent with architecture when a specific package is not fixed, recording significant choices in ADR/decision log.
10. M1 models its pre-program weekly skeleton as development weeks with `programId: null`; recruiting/program choice remains M3 scope and will use an explicit save migration when it becomes required. No placeholder program/content ID is shipped.
11. Domain integrity accepts broad creation measurements of 150–215 cm and 55–150 kg; the M1 UI may offer a narrower practical WR range without changing persisted units or schema.
12. M1 displays a rounded equal-weight overall for orientation only. It has no direct progression path and does not pre-empt archetype/depth evaluation weights added by later milestones.
13. M1 exposes one active career. Reload selects the globally newest valid compatible save even when an interrupted explicit replacement left the old career in the current slot; a future multi-career picker may replace this policy without changing CareerRun schema v1.
14. The 30-snapshot limit applies to valid compatible autosaves. Future-version or content-incompatible snapshots remain protected outside the limit because deleting data created by a newer/different build would be an unsafe downgrade behavior.
15. Before games exist, M2 awards skill breakthroughs on a tuneable development cadence after completed weeks 1, 5, 9, 13, and so on, provided at least three eligible unowned cards remain. This yields an early introduction and roughly four cards in a 13-week development scaffold; M4/M5 may migrate the trigger to post-game/career context without changing offer rules.
16. M2 recent-behavior weighting maps the six most recent persisted weekly action IDs to content-owned behavior tags rather than storing permanent lifetime counters or denormalized tags, so changing behavior can reshape the pool and saves remain small.
17. A newly chosen card fills the first open equipped slot. When all four slots are occupied, it stays in inventory until the player changes the loadout during action planning; acquisition never silently replaces a build choice.
18. M2 behavior weighting treats the six-action history as one bounded sequence: duplicate occurrences beyond the first express repetition, three distinct actions express variety once, and adjacent Study Hall-to-training pairs may cross a week boundary. This is a tuneable, reversible interpretation until season calendar context in M5 can supply richer behavior windows.
19. M3 presents exactly five deterministic program offers and reveals all mechanically relevant facts. Program familiarity/uncertainty waits for a real persistent meta model rather than hiding arbitrary penalties.
20. The M3 WR room contains the player plus seven lightweight generated competitors. Competitor development is static during this milestone; player Practice Form, Coach Trust, attributes, and Scheme Fit drive the first explainable depth movements.
21. The initial M3 chart permits at most one rank move per weekly evaluation and requires a centralized 2,000 score-milli neighbor advantage. This conservative hysteresis baseline may be tuned through checked-in simulations without changing persisted evidence shapes.
22. M3 development weeks mechanically stand in for preseason/fall-camp competition. The explicit camp/calendar flow remains M5 scope.

Codex may append assumptions under the ambiguity policy. If an assumption becomes a major long-term architectural choice, promote it to an ADR.
