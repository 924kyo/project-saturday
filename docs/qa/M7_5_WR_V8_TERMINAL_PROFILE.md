# M7.5 WR v8 terminal domain verification

Date: 2026-09-14, approximately 20:15 KST. Staged domain APIs only; browser writers still use WR v7/MetaProfileV1. M10 and B6 acceptance are unchanged.

Command: `pnpm --filter @project-saturday/testkit profile:wr-v8`.

The driver invokes existing owning career/season commands through explicit v8 adapters, including every current pending/resolved snap, followed by versioned two-season review, retirement and WR meta registration. It creates a fresh career after each completion while preserving one accumulating profile. All four paths exit successfully. This is not a browser UI, IndexedDB transaction or installer test.

| Locale/name | Policy | Games | Exact session reloads | Snap choices | Event/injury choices | Peak estimated envelope bytes | Accumulated meta bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ko-KR | Stay | 24 | 595 | 103 | 19 / 0 | 326,122 | 78,351 |
| ko-KR | Transfer | 26 | 593 | 86 | 24 / 1 | 339,307 | 157,784 |
| en-US | Stay | 25 | 574 | 84 | 22 / 3 | 328,866 | 236,250 |
| en-US | Transfer | 25 | 632 | 116 | 17 / 1 | 333,174 | 313,774 |

Totals: 100 games, 2,394 session reloads, 389 current snap choices, 82 events, five injury choices and four accumulated alumni. Additional exact meta/review/alumni reloads are asserted but not included in that session count. Peak raw session 339,150 bytes. Maximum timed operation/assertion batch 543.705 ms; maximum session parse 45.623 ms. Timed assertion batches include multiple validation/rejection operations, so the command figure is a conservative upper bound, not a single gameplay-command benchmark. Every bound remains below 1,000 ms and one million bytes.

The envelope uses fixed-length checksum overhead for size estimation only. Actual checksum/wire/atomic storage verification remains required. Signed zero is JSON-equivalent; absent/extra fields, undefined values, sparse members, added array properties and other numeric differences are not ignored.

## Correctness evidence

- First-season summary and archived world remain literal. Second-season statistics are derived from its own game ledger; both seasons sum to career totals.
- Review and retirement each advance career revision once; career/world RNG and played/off-field history remain unchanged.
- Retained-source replay rejects forged summaries, totals, phase/record pairs, world/revision, completion identity/content version, ancestry and alumni archive evidence.
- First-season injury incident IDs remain explicitly unavailable while known counts/weeks survive; second-season IDs come from its actual ledger.
- Existing one-season alumni survive marker-only WR meta migration. A genuine alternate one-season fixture verifies mixed legacy/current registration and duplicate-career rejection.
- Each distinct experienced program receives one familiarity credit; earlier alumni remain exact across four completed runs. Exhausted meta revision rejects the combined result while preserving both original inputs.
- No third program/season is invented on retirement. Fresh creation leaves the completed profile untouched.

## Gate and remaining work

Registry follow-up (approximately 20:41 KST): all four updated profiles exit 0 and preserve the same gameplay/reload/alumni evidence. Their accumulating lightweight index sizes are 354/581/727/956 bytes, with literal full details unchanged. Each profile also completes its real retirement against 1,000 synthetic historical references: resulting index sizes 140,360/140,587/140,733/140,962 bytes; retirement/registration 100.501/106.630/97.716/89.914 ms. This probes index capacity without fabricating historical details or claiming 1,000 played careers. Maximum overall assertion batch 600.910 ms and session parse 50.258 ms. Combined registry session/alumnus equals the full-profile result exactly; exhausted-revision failures preserve original inputs. Core/testkit 390 and ten season-content cases plus repository static/affected exports/format/whitespace pass. Actual wire/detail/transaction verification is next.

Full workspace: 1,126 cases/117 files plus ten script cases pass (94.33 seconds). Repo typecheck/lint/boundary/localized-copy pass; final focused comparator/lint/format/whitespace pass. Production/export/PWA: 355 modules, 21 precache entries / 1828.15 KiB, football chunk 419.82 kB, every JS chunk below 500 kB and both career screens lazy.

Remaining B1c: versioned WR session/meta codecs, original-envelope proof preservation, atomic storage/retry/recovery, repeated-career profile capacity/paging, Hub/frontend routing and coordinated current activation with QB/RB/CB. Current four-alumni meta is 313,774 bytes; do not assume unlimited repeated careers fit one envelope. B1d, B2–B5, mandatory actual-UI B6 and Phase C still precede M8. The desktop executable remains the earlier verified snapshot, not rebuilt for these unselected APIs.
