# Test Strategy

## Layers

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

At minimum:

- new career creation;
- program choice;
- action planning;
- weekly advance;
- key-snap interaction when available;
- save/reload;
- locale switch/persistence;
- career completion/legacy once implemented.

## Reproducibility

Every simulation failure/report must print the seed and enough scenario identifiers to reproduce it.
