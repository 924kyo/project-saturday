# M7.5 B6 — Four-position UX Parity Pass

Status: required, queued after B2–B5; 2026-09-14. B1 remains active. M10 unchanged.

## Purpose and ordering

Deliver equivalent completeness and comprehensibility across QB/RB/WR/CB, not a common set of passing test selectors. Finish B1 authoritative evidence, B2 Tactical Board, B3 choice visualization, B4 snap animation and B5 post-game payoff first. Then execute B6 before the complete Phase C gate and before M8. Preserve saves, career/world RNG separation, stable IDs, historical contracts, Korean/English, accessibility and PWA/offline behavior.

## Required specs

Read `POSITION_DESIGN.md`, `GAME_DAY_PRESENTATION.md`, `UX_AND_FLOW.md`, `CAREER_MANAGEMENT.md`, `ROSTER_IDENTITY.md` and the affected lifecycle specs under `docs/product-specs/`. Reconcile product evidence into those authoritative specs before implementation; avoid disconnected cosmetic fixes.

## Actual UI acceptance ledger

For each QB/RB/WR/CB, record and visually inspect Creation → Recruiting → Home → Week → Team → Skills → Player → Game Day → Post-game → Injury/Event → Postseason → Transfer/Stay → Season 2 → Retirement/New Career. Cover both locales and real mobile/desktop/320 px layouts, with keyboard and reduced-motion alternatives where relevant. Include actual saved transfer/reload/offline/retry boundaries and current-program routing. Record screenshots and exact saved phases/seed identifiers, not just test counts. Do not replace normal player journeys with injected advanced saves; fixtures may supplement rare-case coverage only.

At every surface check: no blank body or stale state; all necessary controls discoverable/usable; identity and current program correct; position-correct stats and explanations; consistent information hierarchy; clear next action and consequence; readable focus/help; no clipped, overlaid or unlabeled information; no horizontal overflow. Explicitly compare the experience to the same WR surface without copying WR football semantics into another position.

## Position-specific emphasis within the shared shell

- QB: reads, targets and pressure.
- RB: gaps, cuts and protection.
- WR: release, routes and coverage.
- CB: leverage, coverage, ball and tackle.

Shared career operations must remain familiar while football choices and evidence use each owning engine's actual meaning. Beginner intent and consequences lead; advanced terminology remains available. A developmental/reserve career must receive meaningful truthful feedback and legible routes toward participation, not invented plays.

## Initial observed evidence to revisit after B2–B5

The B1c current WR life profiler reproduced a deeper WR parity defect: all four complete Stay/transfer paths finish 24–26 games across two seasons but cannot enter the second season review (`season.internal_invariant_failure`, academic-term and offseason linkage). Existing WR completion is explicitly one-season-only, including alumni/meta fields. The prior M7 WR profile covered the second-season opening, not retirement. Add versioned second-season review/completion and truthful two-season alumni before closing B1c current-life verification/B6; never reinterpret historical one-season alumni, discard the first season, or count this expected failure as acceptance. The profiler intentionally exits nonzero until resolved.

Follow-up at 20:15 KST: the new unselected WR v8 domain now completes review/retirement and lossless mixed alumni/meta on all four full profiles, with fresh creation preserving history. This resolves the domain defect only; shipping v7 UI/storage has not activated it. B6 must still perform actual review/retirement/Hub/New Career journeys after the codec/frontend integration, and may not substitute these 2,394 domain reloads for UI evidence.

The 2026-09-14 desktop functional smoke passed an actual RB key snap/post-game, exact offline process relaunch and bilingual Hub workflows. Visual inspection of `test-results/desktop-snapshot/ko-game-day.png` and `en-second-career.png` nevertheless found the large athlete portrait overlapping the name/program header in QB/RB/CB's shared current shell, and the EN CB Home meters displaying bars without visible labels/values. These are unresolved UX findings, not desktop build failures and not proof of parity. Investigate shared markup/CSS and compare WR before fixing at the intended integration stage. Initial film/recovery/study-heavy test careers stayed developmental with no key snaps; development-focused RB play reached a real key snap in season 1 week 10. Review whether the explanation and anticipation of that path are sufficient; do not treat the observation alone as authority to change historical rules.

## Completion

- [ ] Build the four-position × full-journey visual/interaction ledger.
- [ ] Inspect and reconcile findings into relevant specs.
- [ ] Fix grouped correctness, terminology, controls, hierarchy and layout issues.
- [ ] Recheck actual affected flows in both locales, mobile and desktop.
- [ ] Compare beginner usability and football-specific usefulness against WR.
- [ ] Complete the parent Phase C/Tier 3 quality gate with no material parity defect open.

An obviously broken or inferior required experience in even one position blocks M7.5 completion and M8. Automated passes alone never satisfy this gate. Use focused Tier 0/1 loops and Tier 2 integration smoke; reserve the full matrix for required triggers/final closeout.
