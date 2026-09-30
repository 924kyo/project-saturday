# Night Game — art asset list

The redesigned UI ships complete without these files: every slot has a CSS fallback (floodlight gradients, grain, turf lines). Drop each finished file at the exact path below and it appears on the next load. No code change is needed.

## Rules for every asset

- **Originality:** fictional college football only. No real schools, leagues, sponsors, logos, jersey numbers of real players, or recognizable real people. No readable text or numbers in the image.
- **Format:** WebP, sRGB, quality 75–82. Keep every file **under 400 KB** so the offline precache stays small. `webp` files in `apps/web/public/art/` are precached automatically.
- **Palette:** near-black night (#05070A) with floodlight white, cool cyan haze (#45C8FF) and an occasional volt-lime (#C8FF2E) accent. No warm daylight. Crush the shadows, because the UI fades each image into black.
- **Composition:** backdrops are covered by UI in the lower two-thirds and faded to black at the bottom. Put the interest in the **top third** and keep the center calm. Scene art sits on the **right half**, and its left side fades under text.
- **Style (all prompts):** cinematic, photographic realism with slight illustration grading, anamorphic flare, volumetric light, shallow haze, high contrast, 35 mm.

## Backdrops (full screen, top of page)

| # | Path | Size | Used on |
| --- | --- | --- | --- |
| 1 | `apps/web/public/art/stadium-night.webp` | 2400 × 1350 | Landing / creation and Game Day |
| 2 | `apps/web/public/art/locker-room.webp` | 2400 × 1350 | The week hub (This week, Build, Team, Profile), weekly scenes |
| 3 | `apps/web/public/art/campus-dusk.webp` | 2400 × 1350 | Recruiting |
| 4 | `apps/web/public/art/tunnel-lights.webp` | 2400 × 1350 | Post-game, season review, career complete |

**1. Stadium night**, `stadium-night.webp`:
> Wide shot from the upper deck of an empty fictional college football stadium at night, four towering floodlight banks blazing at the top of frame with long volumetric light beams cutting through thin haze, turf far below barely visible, stands dissolving into darkness, cool cyan and white light, a faint volt-lime rim glow on the stadium edge, cinematic, anamorphic lens flare, deep black lower half, no people, no text, no logos, 16:9.

**2. Locker room**, `locker-room.webp`:
> Moody college football locker room after dark, row of open wooden lockers with hanging practice jerseys (plain, no numbers, no names), helmets on the top shelves catching a single cool overhead light, polished concrete floor fading into black, faint cyan practice-board glow on the back wall with abstract X and O marks (no readable text), cinematic, shallow haze, top-third focus, deep shadows, no people, no logos, 16:9.

**3. Campus at dusk**, `campus-dusk.webp`:
> Fictional university campus at blue hour seen from a hill, gothic-modern brick buildings and a clock tower silhouette against a deep indigo sky, a lit football stadium glowing on the horizon, streetlights beginning to glow, cool cyan and violet palette with a small volt-lime light in one stadium bank, cinematic, calm center, dark foreground, no text, no signage, no logos, 16:9.

**4. Tunnel lights**, `tunnel-lights.webp`:
> View from inside a concrete stadium tunnel looking out toward a blinding floodlit field, silhouettes of a few anonymous players walking out (backs only, no faces, plain dark uniforms, no numbers), smoke and light spilling into the tunnel, strong backlight, cool white and cyan, dramatic contrast, top-center light source, dark edges, no text, no logos, 16:9.

## Weekly scene art (right half of the scene card)

| # | Path | Size | Used on |
| --- | --- | --- | --- |
| 5 | `apps/web/public/art/scene-event.webp` | 1600 × 900 | Midweek events (campus, locker room, media, family, program) |
| 6 | `apps/web/public/art/scene-nil.webp` | 1600 × 900 | NIL deal offers |
| 7 | `apps/web/public/art/scene-injury.webp` | 1600 × 900 | The medical check |
| 8 | `apps/web/public/art/scene-breakthrough.webp` | 1600 × 900 | Breakthrough card picks |

The subject sits in the right 45%, and the left 55% is dark, empty and low-detail (text sits there).

**5. Midweek event**, `scene-event.webp`:
> Night-time college campus walkway after practice, a lone student-athlete in a hoodie and team backpack seen from behind at the right of frame, glowing phone screen in hand (screen content not visible), lamplight pools and a distant lit stadium, cool cyan tones, cinematic, left half empty dark negative space, no faces, no text, no logos, 16:9.

**6. NIL offer**, `scene-nil.webp`:
> Stylish product-shoot studio at night, a single spotlight on an empty director's chair and a camera on a tripod at the right of frame, gold rim light (#FFCC3D) and deep black background, subtle bokeh, feeling of a sponsorship deal, cinematic, left half dark and empty, no people, no brand marks, no text, 16:9.

**7. Medical check**, `scene-injury.webp`:
> Athletic training room at night, taped ankle resting on a treatment table under a cold overhead lamp at the right of frame, ice bags, rolls of tape and a blurred recovery bike in the background, cool clinical cyan light with a faint red accent, calm and serious mood, cinematic, left half dark negative space, no faces, no text, no logos, 16:9.

**8. Breakthrough**, `scene-breakthrough.webp`:
> Abstract energy burst on a football practice field at night, a football frozen mid-spiral at the right of frame trailing volt-lime (#C8FF2E) light streaks and particles, chalk yard lines glowing underneath, dark sky, dynamic and triumphant, cinematic, left half dark and empty, no people, no text, no logos, 16:9.

## Position art (creation screen cards)

| # | Path | Size |
| --- | --- | --- |
| 9 | `apps/web/public/art/position-qb.webp` | 800 × 800, transparent background |
| 10 | `apps/web/public/art/position-rb.webp` | 800 × 800, transparent background |
| 11 | `apps/web/public/art/position-wr.webp` | 800 × 800, transparent background |
| 12 | `apps/web/public/art/position-cb.webp` | 800 × 800, transparent background |
| 13 | `apps/web/public/art/position-lb.webp` | 800 × 800, transparent background |
| 14 | `apps/web/public/art/position-edge.webp` | 800 × 800, transparent background |

These show at the bottom-right of each position card at 30–60% opacity, fading toward the left. They read best as bold, high-contrast figures anchored to the **bottom-right corner**.

Shared prompt suffix: *dramatic rim-lit athlete figure in a plain dark uniform and helmet with a dark visor (no face visible, no numbers, no logos), strong cyan-white back light, subject anchored bottom-right and cropped at the waist or knees, transparent background, cinematic, 1:1.*

- **9. QB:** quarterback in a throwing motion, arm cocked back, ball raised behind the helmet, looking downfield.
- **10. RB:** running back exploding through a hole, ball tucked high and tight, low center of gravity, one arm stiff-arming forward.
- **11. WR:** wide receiver leaping for a high catch, both hands up, ball arriving above the helmet, body stretched.
- **12. CB:** cornerback in a low backpedal, eyes up, hands ready to jam, mirroring an unseen receiver.
- **13. LB:** linebacker in a two-point stance reading the play, weight forward, hands up, ready to trigger.
- **14. EDGE:** edge rusher bending around a corner, dipping low, one hand swiping, turned toward the viewer's left.

## Optional polish (not wired yet; say if you want them)

- **Program crest art:** the 96 crests are generated SVG shapes with monograms. Painted crests would need a 96-image set at 512 × 512.
- **Athlete portrait:** the portrait is layered CSS art driven by the creation appearance options (skin, face, hair and more). Painted portraits would need a layered sprite set (heads, hair, skin tones) rather than single images.
- **Title logo lockup:** the in-app mark is an SVG, `LogoMark` in `ui.tsx`. A bespoke wordmark would be an SVG at 1200 × 300.
