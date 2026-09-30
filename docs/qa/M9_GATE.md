# M9 gate — Repeated careers vary; history persists

Date: 2026-09-30. Tier 3.

## Evidence

| Gate requirement | Evidence |
|---|---|
| Content scale: 96 programs / 8 conferences | `world-vnext.test.ts`: 96 unique programs, 8×12, 9 conference games each, 5–7 home games |
| 100–130 cards, 250–350 events | `library.test.ts`: 100 cards and 254 events with unique IDs |
| Bilingual editorial pass | `copy-audit.test.ts` and `localization.test.ts` in every check; `M9_EDITORIAL_PASS.md` |
| Repeated careers vary | `career-vnext-careers.test.ts` (12 four-year careers, 6 positions): ≥8 distinct starting programs, 12 distinct record histories, ≥40 distinct events, ≥3 distinct draft outcomes; awards in some seasons (<40%) |
| Persistent history in the real app | `e2e/career.spec.ts` "a second career sees the first career…": the first plaque and the record book appear on landing, and both plaques survive reload |
| Legacy is deterministic and information-only | `legacy.test.ts`: the snapshot changes neither the athlete nor the offers; mentors appear from saved alumni; save round-trip |
| Awards and titles | `vnext-awards.test.ts` and the harness bands; review, plaque and completion surfaces reviewed in ko-KR |

## Tier 3 run

- `pnpm check`: vitest 857/107 files, content 414, sim 394, node scripts 10, e2e 10, and a verified build/PWA (chunks split under the 500 kB budget).
- `E2E_FULL=1`: 42 passed (six positions × two locales × phone/desktop/320, the Pro Draft declaration journey, and the two-career legacy journey).
- Desktop: `desktop:build` (NSIS) and `desktop:smoke` passed.

## Findings fixed at the gate

- The record book listed negative stats (fumbles, sacks taken, a QB's interceptions thrown) as "records". It now celebrates only good marks.
