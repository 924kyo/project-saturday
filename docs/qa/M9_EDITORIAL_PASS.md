# M9 — Content QA and bilingual editorial pass

Date: 2026-09-30. It covers every message shipped in ko-KR and en-US, with a focus on the M8/M9 additions: LB/EDGE, the conference world, the Pro Draft, NIL, awards, legacy, and 136 campus-life events.

## Automated gates (run in every `pnpm check`)

- `localization.test.ts`: stable keys, paired keys, and ICU interpolation parity. Korean plural forms share the English argument contract, using `{n, plural, other {…}}`.
- `copy-audit.test.ts`:
  - no placeholder or debug text;
  - no real league, bowl, award, school or brand names (the originality rule);
  - no untranslated Career VNext copy (ko identical to en);
  - one Korean spelling for "conference" (콘퍼런스);
  - titles within 40 characters (en) and 24 (ko) for events, programs and awards.
- `library.test.ts`: 100–130 cards and 250–350 events with unique IDs; every life-event title is paired and distinct.
- `check-localized-copy`: no literal JSX copy.

## Editorial rules applied

- **Korean register.**
  - Scene narration and choice labels use the plain register (-다, for example 「조언을 새겨듣는다」).
  - System explanations, help text, confirmations and outcome notices use the polite register (-습니다, for example 「계약했습니다.」).
  - Nine M8/M9 help and notice strings that used the plain register were aligned.
- **Fictional framing.**
  - "Pro Draft" (never a real league).
  - Original award names (Golden Signal, Iron Rail, Silk Hands, Island, Heart of the Defense, Corner Hunter).
  - Original program, conference and NIL partner names.
- **Position truth.** Receiver-specific NIL deals are offered only to WRs, and a defender's plays use defender headlines and stats.
- **Numbers are facts.** Every number in the copy comes from saved state or tuning shown to the player: practice cost, draft band, stock factors, awards credit.

## Reviewed in the real app (both locales, desktop and mobile)

LB/EDGE Game Day and post-game; the conference Team screen; the season review with its draft projection and awards; the offseason declare panel; career completion; the NIL offer scene and the Profile NIL panel. See the screenshots listed in `M8_SIX_POSITION_PARITY.md` and the M9 gate.

## Open

- Legacy M5–M7 locale keys that no screen uses are still shipped (cleanup is tracked in PROGRESS).
- A native-speaker proofread of the full event library is recommended before 1.0 (M10's Korean/English full QA).
