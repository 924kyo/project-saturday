# Event System

## Problem being solved

Different careers must not receive essentially the same event sequence with only a name swap.

## Event eligibility

Events are data-driven and may require/avoid tags and state predicates.

The M5 vertical-slice schema uses stable IDs and separates localized presentation from mechanics-only core input:

```json
{
  "id": "event_receiver_room_response",
  "categoryIds": ["event_category_team"],
  "requirements": {
    "allTagIds": ["tag_season_regular"],
    "anyTagIds": ["tag_event_team_voice"],
    "excludedTagIds": [],
    "statePredicates": []
  },
  "cooldownWeeks": 3,
  "weight": 80,
  "nameKey": "events.receiverRoom.name",
  "descriptionKey": "events.receiverRoom.description",
  "choices": []
}
```

`allTagIds`, `anyTagIds`, and `excludedTagIds` are evaluated against canonical player and runtime context tags. Predicates may compare Body, Preparation, Confidence, Coach Trust, Brand, GPA in milli-units, depth rank, or week index using exact/equal-or-above/equal-or-below operators. Requirement, category, event, and choice IDs are unique and validated before mechanics enter game-core.

## Character tags

Possible tags include:

- position/archetype;
- recruiting background;
- personality;
- starter/backup/depth band;
- high/low brand;
- GPA risk;
- coach favorite/conflict;
- injury history;
- hometown/regional;
- rivalry/week context;
- award/draft status;
- transfer history;
- alumni/legacy context.

## Event density

Do not fire a major event every week. Events should feel contextual and consequential.

Selection happens once after the completed weekly practice/depth evidence and before camp rollover or Game Day. No eligible event is an explicit zero-draw result. Otherwise one density roll decides whether an event occurs; a hit uses one weighted draw over eligible events sorted by stable ID. The attempt and exact RNG range persist even when no event occurs, preventing reload rerolls.

Vertical slice target:

- 50–70 total polished events (M5 ships 57);
- enough conditionality that one season naturally sees only a subset;
- at least 15 WR/depth/position-specific events (M5 ships 20 by category union);
- at least 10 background/personality-sensitive events (M5 ships 16 when identity is included);
- at least 10 program/game-context events (M5 ships 22 by category union).

The shipped validator treats these as release constraints, not documentation-only targets. It also rejects unavailable requirement tags, contradictory state bounds, mutually exclusive required season/venue tags, duplicate global IDs, choices with identical mechanical payloads, and absent localized event or choice copy. Program trait IDs become canonical runtime tags only through the content adapter; game-core remains unaware of presentation catalogs.

Equipped life-hook effects may add validated context tags through the content adapter without mutating the career schema or consuming RNG. The first live case is Campus Bridge: only an equipped event-access hook makes the original campus roundtable event eligible, and its two choices trade Brand/Confidence against GPA/Preparation.

Active M6 relationship state also contributes canonical high/low tags for the position coach, teammate leader, and direct competitor. These tags are derived from saved 0–100 thresholds with zero RNG and may affect event eligibility; they never expose localized display text or mutate the relationship state during selection.

## Current added-position event boundary

Staged QB/RB/CB v2 commands reuse their existing position event selectors and choice resolvers, including the authored 450-permille density and stable-ID ordering. Selection uses completed-focus state, current relationship tags, identity tags, and the prior completed game's position stats (the previous completed season's stats when no current-season game exists, otherwise a canonical zero line). It never depends on the upcoming game's result. This prior-evidence fallback is explicit and replayable, not a simulated game or extra RNG draw.

Save the complete context, canonical eligible pool and selection evidence, available choice IDs, exact career RNG, chosen ID, applied-skill/effect evidence, and after-state/event history. All four equipped slots participate in choice unlocks and positive-effect hooks. A selected event cannot be skipped; choice resolution and consequence acknowledgement consume zero RNG. Empty-pool selection consumes zero draws, a density miss one, and a hit two. Injury assessment starts from the saved event RNG and after-state; real football inputs receive the resolved next-game modifiers. Settlement commits the event history once and clears those modifiers for the following game.

Historical v1 events retain their literal post-game timing, indices, effects, and saved pending choices. Neutral migration neither selects an event nor rewrites history. Current history binds each event source/cooldown/history to the preceding current result and binds prior football stats to completed evidence. This is an engine/persistence checkpoint; browser v2 activation still waits for the complete weekly and season flow. Both locales reuse the existing authored event/choice resources.

## Choices

A good choice changes one or more meaningful systems and may express character identity. Avoid obvious `good / neutral / evil` answer sets.

The initial allowlist supports bounded integer changes to Body, Preparation, Confidence, Coach Trust, and Brand; GPA changes in milli-units; and Breakthrough Gauge progress. Resolution consumes no RNG and persists before/requested/actual/after evidence plus the event cooldown. Unsupported effects fail content validation rather than being improvised in UI code.

## Event writing

Korean and English versions should convey the same intent and gameplay information but may be naturally localized rather than literal word-for-word copies.

## M7 staged QB events

The QB alpha adds twelve original position-sensitive events with bounded Body, Preparation, Confidence, Coach Trust, GPA, Brand, and next-game modifier consequences. Eligibility is evaluated from current state, context tags, and cooldown history before IDs are sorted canonically. No eligible event or a zero chance consumes no RNG; a failed density check consumes one draw; a selected weighted event consumes two. Resolution consumes no RNG. Selected events normally expose two choices, while an equipped Life build may unlock a third cooperative choice; a separate Life effect multiplies only positive consequences and never softens a cost.

The RB alpha adds twelve separate position-sensitive events around ball security, protection, routes, short yardage, recovery, room repetitions, academics, campus attention, film, equipment, leadership, and community time. They use RB-owned stable IDs and next-game contact/decision modifiers; cooperative choices and positive-only amplification require the corresponding equipped RB Life skills.

The CB alpha adds twelve position-sensitive events around release study, receiver competition, tackling, ball work, recovery, secondary rotation, academics, campus attention, opponent film, weather, leadership, and community time. CB-owned event choices may affect next-game clue, decision, or target context, and their cooperative/amplified paths require the corresponding equipped CB Life skills.
