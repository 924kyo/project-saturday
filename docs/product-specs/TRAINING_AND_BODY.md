# Training and Body

> **1.0 RC:** what ships is summarized in `docs/release/SPEC_CONFORMANCE.md` and specified by `docs/product-reconciliation/CAREER_VNEXT_CONTRACT.md`. Milestone-numbered sections (M3–M7.5) describe the pre-R aggregates, which are kept only for historical saves, replays and reports.

## Goal

Weekly focus should be easy to choose but strategically altered by skills, Body, Preparation, Confidence, upcoming matchup, role, life obligations, and long-term build.

## Weekly actions

The player receives three discretionary focus blocks over an implicit mandatory team schedule. A focus commonly alters:

- attribute XP/progress;
- Body;
- Preparation;
- Confidence;
- injury risk/readiness;
- practice grade or coach trust;
- proficiency;
- tags that influence skill/event pools.

Preview the main direction and cost before commitment. Resolution remains authoritative and may include deterministic contextual effects.

## WR vertical-slice action families

Minimum set:

- Route Drills
- Release Drills
- Hands/Catch Work
- Weight Room
- Speed Work
- Film Study
- Extra Practice
- Recovery
- Study Hall

The vertical slice need not expose every future action family.

### Practice Grade and historical M3 compatibility

The shipped M3 formula is retained for strict v3 saves and migration evidence: every action carries a mechanics-only Practice Form impact—Route Drills `+7`, Release Drills `+7`, Hands/Catch Work `+7`, Weight Room `+3`, Speed Work `+4`, Film Study `+5`, Extra Practice `+11`, Recovery `+2`, and Study Hall `-2`.

For that historical path, the third action calculates `weekly score = clamp(50 + sum(action impacts) + round((final Body - 60) / 5), 0, 100)`. New Practice Form is `round(40% previous form + 60% weekly score)`. Coach Trust changes by `-4/-2/-1/0/+1/+2/+4` for weekly scores ending at `30/40/48/54/64/74/100`, respectively, and remains bounded.

M3.5 replaces Body-dominant current-week evaluation with the versioned `experience_v1` Practice Grade model:

```text
Practice Grade = clamp(
  50
  + sum(focus impacts)
  + round((final Body - 60) / 5)
  + round((final Preparation - role target) / 5)
  + round((final Confidence - 50) / 10),
  0,
  100
)
```

Preparation targets are Starter `65`, Rotation `60`, Reserve `55`, and Developmental `50`. The existing 40/60 Practice Form blend and Coach Trust score bands then apply. The persisted `practiceGrade` evidence records the base, each contribution, final state inputs, role target, and model ID. Validation reproduces the score, form, and trust transitions; React only formats the evidence.

Current action deltas are deliberately asymmetric so Body cannot solve the week alone:

| Focus | Grade impact | Preparation | Confidence |
| --- | ---: | ---: | ---: |
| Route Drills | +7 | +4 | +2 |
| Release Drills | +7 | +4 | +2 |
| Hands/Catch Work | +7 | +3 | +2 |
| Weight Room | +3 | 0 | +1 |
| Speed Work | +4 | 0 | +2 |
| Film Study | +5 | +12 | +1 |
| Extra Practice | +11 | +7 | +4 |
| Recovery | +2 | -2 | +2 |
| Study Hall | -2 | -2 | 0 |

The v4 `weeklyExperienceVersion` discriminator keeps migrated `RESOLVE_ACTIONS` and `WEEK_END` phases on the literal M3 result/grade shape until that week advances. Fresh weeks use `experience_v1`. This discriminator consumes no RNG and does not change the migrated phase or revision.

## Body

`Body` is 0–100 short-term physical readiness.

Guideline states:

- 80–100 Fresh
- 60–79 Normal
- 40–59 Tired
- 20–39 Depleted
- 0–19 Critical

Exact labels are localizable presentation, not mechanical identifiers.

Body should influence performance/readiness smoothly rather than create arbitrary cliffs except where explicitly designed.

## Preparation

`Preparation` is 0–100 opponent- and assignment-specific readiness. Film Study and relevant role/coach skills are primary ways to build it, but other focused work may trade physical load for assignment confidence. It influences practice reliability, Coach Trust evidence, key-snap clue quality/assignment fit, and role usage. At the current development-week rollover, half the deviation from neutral 50 is retained: `next = 50 + round((current - 50) × 0.5)`. The deterministic partial carryover makes Preparation valuable without turning it into a permanent second attribute or a full-reset maintenance chore.

## Confidence

`Confidence` is 0–100 short-term mental momentum. Good execution, constructive events, and certain mindset choices can raise it; errors, role setbacks, and pressure can lower it. It affects pressure response and appropriate risk/recovery behavior, but never makes a choice automatically correct. Confidence movement must be explained and bounded.

## Injury

Vertical slice injury model should be simple:

- workload and low Body raise risk;
- Durability and recovery lower risk;
- injuries have severity and expected absence/restriction;
- never hide injury probability behind fake precision in UI.

## Training proficiency

Repeated use of a training category may increase proficiency modestly. Proficiency should reward a build without making experimentation impossible. The UI shows current uses, the next threshold, remaining uses, and the next mechanical benefit.

Recommended v1 cap: 5 levels with diminishing benefits. Exact numbers belong in tuneable content/config and simulation tests.

## Planning tension

A good week asks questions such as:

- train again for a depth push or preserve Body for a rivalry game?
- use Film Study to build Preparation and reveal assignments, or Weight Room because a skill makes it unusually efficient?
- protect Confidence after a setback, or take a high-upside role challenge that could accelerate Coach Trust?
- spend one action on GPA before eligibility risk becomes a problem?

Avoid compulsory maintenance every week. Every normal focus set should support multiple defensible strategies, and simulation evidence must include strategies that value Preparation, Confidence/role, and development—not only Body economics.

## Breakthrough progress from weekly strategy

The completed-week Breakthrough Gauge reads authoritative outcomes rather than awarding a card for repetition alone. Rating/proficiency gains can produce Development progress; positive Coach Trust, strong Practice Grade, promotion, and material Preparation gains can produce Role/Coach progress; positive Confidence movement can produce Mindset progress; demanding work completed with sufficient Body or timely recovery can produce Body-management progress; and positive GPA movement can produce Life progress. Sources are bounded, persisted, shown to the player, and may subtly influence the saved offer. Weekly actions and skill effects never roll separate RNG for gauge progress.

## M7 position-owned training foundation

The multi-position alpha stages three focused football actions and three proficiency tracks for each added position. Each position's action set covers its six owned attributes exactly once, while authored Body and Preparation deltas create at least two materially different weekly tensions. The staged resolver is browser-independent, consumes no RNG, and validates that the selected action, proficiency, development family, and attribute targets all belong to the athlete's position.

Proficiency advances from the pre-action use count and applies the existing fixed-point XP multiplier only after a threshold is reached. Evidence exposes uses before and after, level, next threshold, remaining uses, multiplier, requested and applied XP, state deltas, Practice Grade impact, and Breakthrough Gauge contribution. Practice Grade retains the established model—base, focus impact, Body, role-targeted Preparation, and Confidence—so a new position does not receive a renamed but mechanically hidden score. The current WR action IDs and saved proficiency records remain unchanged until the complete position-aware command path activates.

### M7 current weekly agency

The three position drills are a football foundation, not the complete weekly menu. Current added-position careers also use the five authored common actions under their existing IDs: Weight Room, Speed Work, Film Study, Recovery, and Study Hall. These retain their original bilingual presentation and numerical tradeoffs. Three chosen focuses may mix either group or intentionally repeat. Recovery and Study Hall grant no fabricated attribute XP or proficiency; Study Hall's bounded GPA movement must reach academics and Life progress. Shared training tracks start only when the current flow activates, without altering historical counters or neutral migration bytes.

Current rollover includes the existing configured passive Body recovery and half-deviation Preparation carryover, once per completed week. Injury restrictions must retain viable safe choices: an out athlete can use Recovery, Film Study, or Study Hall; limited athletes cannot select heavy strength/speed/contact work. Position-owned drills declare their restriction class in content instead of relying on UI labels. The exact historical three-drill commands/results remain compatibility evidence only, not a justification for shipping a Body-draining weekly menu.

Current skill-aware focus resolution keeps base action/proficiency validation and recomputes final XP, Body, Preparation, Confidence, GPA, and practice impact from the original pre-action state plus shared effect aggregates. XP uses one final fixed-point floor with Body efficiency, proficiency, and skill multipliers; it must not multiply already-rounded awards. Ordered plan context controls repeat/diversity/previous-action conditions. Saved evidence retains authored base values, actual bounded outcomes, and equipped-slot/effect order. Passive recovery uses the same shared collector at once-only settlement and retains full base/requested/actual evidence. Content-owned action tags determine scope; React owns none of this arithmetic.

The current planning projection shares the commitment command's exact zero-draw source normalization, including season-clock activation and expired-offer handling. It returns injury-aware availability, config-derived proficiency level/current multiplier/next threshold/remaining uses/next multiplier, and the complete selected-plan preparation evidence. Incomplete or invalid choices have no preparation forecast; pending required choices or a non-player postseason round cannot masquerade as an actionable plan. Projection never publishes clock, expiry, revision, rewards or RNG changes. UI formats this evidence rather than hardcoding thresholds, multiplying one focus by three, or repeating injury-recovery arithmetic.
