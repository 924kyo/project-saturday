# M10 — Originality and legal hygiene review

Date: 2026-09-30. Scope: everything a 1.0 build ships (web PWA and desktop shell).

## Method

1. **Code and text:**
   - The Rookie is used as a behavioral reference only (`docs/references/REFERENCE_USE_POLICY.md`). No code, text, assets or UI were taken from it.
   - The repository holds no third-party game sources.
   - "Rookie" appears only as the ordinary English word, e.g. the life event "Rookie Questions".
2. **Copy:** `copy-audit.test.ts` runs in every `pnpm check`. It rejects real leagues, conferences, bowls, trophies, schools and sponsor brands in both locales (NCAA, NFL, ESPN, SEC, Big Ten, Heisman, Rose Bowl, Nike and more). The draft is the fictional "Pro Draft", and awards are original honors (All-Conference, Freshman All-American, the position awards, Conference Player of the Year, Title Game MVP).
3. **Programs and marks:**
   - All 96 programs, 8 conferences, palettes and crests are original.
   - Crests are generated shapes (shield, circle, diamond, pennant) with a language-neutral monogram. They are not logos.
   - The names are composites of generic geography (Amber Coast, Badlands, Bayou Crest, Cedar Mesa, Tidewater, …). A review of the full list found no real FBS/FCS program name. A few share generic place words with unrelated non-football institutions (e.g. "Blue Ridge", "Tidewater"). None copies a real school's name, nickname, colors, mascot or traditions (ADR-0004).
4. **People:**
   - The player names their own athlete.
   - Teammates and opponents are built from 32 × 32 generic name tokens. The catalogs could form a few combinations that read as well-known real players or a real coach, such as Bryce Young or Marcus Freeman.
   - Fixed in this pass: `reservedRosterNamePairs` (12 pairs) is never shown by Career VNext. A reserved pair keeps its given name and moves to the next free family name, with no RNG, rating or depth change. This is tested in `originality.test.ts`.
   - Historical pre-R sessions keep their literal replayed rooms.
   - No generated player carries a real person's likeness, photo, school or statistics.
5. **Assets:**
   - PWA icons are generated from the project's own `icon.svg` (`pnpm --filter web assets:pwa`). The desktop icons are the same mark (a temporary icon, per `DESKTOP_PACKAGING.md`).
   - The UI and the Tactical Board are drawn in CSS/SVG.
   - The only third-party asset is the Barlow Condensed font (`@fontsource/barlow-condensed`, SIL Open Font License 1.1), which is self-hosted and precached. Hangul uses the platform fonts.
6. **Dependencies:** the web runtime dependencies are MIT (React, react-dom, i18next, react-i18next, i18next-icu, workbox-window), ISC (idb) and OFL-1.1 (the font), checked from each package's `license` field. Build tooling (Vite, Tauri) is MIT/Apache-2.0.

## Result

No blocking finding. One fix landed (reserved roster names). Recommended before any commercial distribution:
- a trademark clearance search on the product name and the 96 program names;
- the OFL notice for the font in the store listing or about text.

Both are recorded in `docs/release/KNOWN_LIMITATIONS.md`.
