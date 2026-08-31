# Event System

## Problem being solved

Different careers must not receive essentially the same event sequence with only a name swap.

## Event eligibility

Events are data-driven and may require/avoid tags and state predicates.

Example conceptual schema:

```json
{
  "id": "evt_wr_room_tension_v1",
  "tags": ["team", "competition", "wr"],
  "requirements": {
    "allTags": ["position:wr"],
    "anyTags": ["depth:wr3", "depth:wr4", "depth:wr5"],
    "noneTags": ["role:captain"]
  },
  "cooldownWeeks": 8,
  "weight": 10,
  "textKey": "events.wr_room_tension.body",
  "choices": []
}
```

Exact schema belongs in engineering content architecture.

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

Vertical slice target:

- 50–70 total polished events;
- enough conditionality that one season naturally sees only a subset;
- at least 15 WR/depth/position-specific events;
- at least 10 background/personality-sensitive events;
- at least 10 program/game-context events.

## Choices

A good choice changes one or more meaningful systems and may express character identity. Avoid obvious `good / neutral / evil` answer sets.

## Event writing

Korean and English versions should convey the same intent and gameplay information but may be naturally localized rather than literal word-for-word copies.
