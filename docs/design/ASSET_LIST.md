# Night Game — art asset list

**Status (2026-09-30): all 14 files are delivered** and ship in `apps/web/public/art/`. Every slot still has a CSS fallback (floodlight gradients, grain, turf lines). To replace an image, drop the new file at the same path; no code change is needed.

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

# Round 2 (playtest round 1): mascots, uniforms and painted portraits

**Status (2026-10-01): all 112 files are delivered** and checked against this spec. Every slot keeps its fallback: a missing file changes nothing. Drop a finished file at its exact path and it shows up on the next load.

Shared rules:
- WebP with an alpha channel, and the same originality rules as above.
- **Tintable layers** (mascots, uniforms, jersey layers) are pure **white** shapes on transparency, with shading only in the alpha channel. The game paints them in each program's colors, so there must be no color in the file.
- Keep each file small, because they are all precached for offline play: mascots under 40 KB, uniform and portrait layers under 70 KB.

## A. Mascot emblems (24 files, tinted)

Path: `apps/web/public/art/mascots/<emblem>.webp`. Size: **512 × 512**, white silhouette centered with about 8% padding, readable at 40 px. The game shows it on a circular medallion in the program's primary color and tints the silhouette with the trim color. The 96 programs share these 24 emblems (see `packages/game-content/src/content/program-culture.generated.ts` for who uses which).

Style for every emblem: *bold, heraldic sports-logo silhouette, single flat white shape with a few negative-space cuts for detail, strong readable outline, facing left or front, no text, no letters, no real team logo resemblance, transparent background.*

| File | Subject (add to the style line) | Used by (examples) |
| --- | --- | --- |
| `bird_raptor.webp` | a hawk's head in profile with a hooked beak and swept-back feathers | Redtails, Windhawks, Condors |
| `bird_owl.webp` | a front-facing owl with large round eyes and ear tufts | Owls, Snow Owls, Scholars |
| `bird_sea.webp` | a long-necked heron or kingfisher mid-stride, beak forward | Herons, Kingfishers, Loons |
| `phoenix.webp` | a rising firebird with wings up and flame-tipped tail feathers | Firebirds, Sunrays, Solar Flares |
| `wolf.webp` | a wolf's head in three-quarter view, ears up, snarling | Gray Wolves, Sea Wolves, Fog Hounds |
| `fox.webp` | an alert fox or coyote head with a pointed snout and big ears | Coyotes, Gray Foxes, River Otters |
| `bear.webp` | a bear's head, front-on, heavy brow, mouth slightly open | Timber Bears |
| `big_cat.webp` | a mountain lion's head in profile, mid-roar | Bobcats, Lynx, Mountain Lions |
| `bison.webp` | a bison's head, front-on, curved horns and heavy mane | Ridge Bison |
| `stallion.webp` | a horse's head in profile with a flowing mane (also reads as a mule or an iron horse) | Mules, Ironhorses, Locomotives |
| `ram.webp` | a bighorn ram's head with fully curled horns | Bighorns |
| `stag.webp` | a stag or pronghorn head with antlers or horns, front three-quarter | Stags, Pronghorns, Antelope |
| `boar.webp` | a wild boar's head with tusks and a bristled ridge | Thornbacks, Peccaries |
| `serpent.webp` | a coiled snake raised to strike, fangs showing | Copperheads, Cottonmouths, Sidewinders |
| `reptile.webp` | a caiman or gila-monster head, low and wide, scaled | Caimans, Gila Monsters, Snapping Turtles |
| `scorpion.webp` | a scorpion seen from above, tail curled overhead | Scorpions |
| `sea_creature.webp` | a leaping fish (tarpon or barracuda) arcing out of a wave line | Tarpons, Barracudas, Stingrays, Sea Lions |
| `mariner.webp` | a ship's wheel crossed with an anchor | Navigators, Stevedores, Icebreakers |
| `smith.webp` | a hammer striking an anvil with sparks | Hammers, Anvils, Riveters, Masons |
| `miner.webp` | crossed pickaxes over a mountain peak with a lamp | Prospectors, Sourdoughs |
| `knight.webp` | a helmeted sentinel's head in profile (not any real school's knight) | Sentinels, Monarchs, Founders |
| `storm.webp` | a thundercloud with a lightning bolt and wind lines | Thunderheads, Dust Devils, Breakers |
| `lantern.webp` | an old lantern or lighthouse lamp throwing light rays | Lamplighters, Keepers, Lanterns |
| `grove.webp` | an oak tree with a broad crown and visible roots | Live Oaks, Harvesters, Haymakers |

## B. Uniform templates (8 files, tinted)

Path: `apps/web/public/art/uniforms/<style>-base.webp` and `<style>-trim.webp`. Size: **600 × 660**, a front view of a football home jersey, flat-lay, centered, with shoulder pads implied.
- The **base** layer is the whole jersey body in white; the game applies the primary color.
- The **trim** layer is only the collar, sleeve stripes and side panels in white; the game applies the trim color. It must align exactly with the base.
- Leave the chest center plain, because the game prints the number there.

| Style | Look | Programs |
| --- | --- | --- |
| `classic` | traditional cut, two sleeve stripes, plain collar | shield crests |
| `modern` | tapered athletic cut, angled side panels, no sleeve stripes | circle crests |
| `stripe` | classic cut with one wide stripe across the lower chest | diamond crests |
| `retro` | loose vintage cut, thick yoke across the shoulders | pennant crests |

Prompt suffix: *flat-lay product render of a sports jersey, front view, perfectly symmetrical, even studio lighting, white material only, no logos, no numbers, no text, transparent background.*

## C. Painted portrait layers (80 files)

Path: `apps/web/public/art/portrait/...`. Canvas: **512 × 640 for every layer**.
- The layers stack exactly, so the head, neck and shoulders must sit at the same coordinates in every file. Use one master template.
- Framing is a **helmet-off bust**: head and shoulders with the chest cut at the bottom edge, facing front with a slight three-quarter turn, looking at the viewer, with a calm, confident expression.
- The game keeps the drawn figure until the head layer for the chosen options exists.

Style for every layer: *semi-realistic painted sports-card portrait, soft studio rim light in cool white, subtle cyan edge light, clean edges, fictional person, transparent background, no text, no logos, no numbers.*

| Layer | Files | What is in it |
| --- | --- | --- |
| Skin (neck, shoulders, arms) | `skin/<build>-<tone>.webp`: 3 builds × 6 tones = 18 | Bare neck and upper arms for the build. Builds: `lean`, `balanced`, `broad`. Tones: `light`, `light_medium`, `medium`, `medium_deep`, `dark`, `deep` |
| Jersey (tinted) | `jersey/<build>.webp` and `jersey/<build>-trim.webp`: 6 | A white jersey with shoulder pads over the bust (primary color). The trim file holds only the collar and shoulder stripes (trim color) |
| Head | `head/<face>-<tone>.webp`: 4 faces × 6 tones = 24 | Face and head with no hair, or very close stubble. Faces: `oval`, `round`, `square`, `angular` |
| Hair | `hair/<style>-<color>.webp`: 6 styles × 4 colors = 24 | Styles: `shaved` (a stubble shadow only), `close_crop`, `short_curls`, `medium_curls`, `braids`, `locs`. Colors: `black`, `dark_brown`, `brown`, `light_brown` |
| Eye black | `eye-black/stripes.webp` and `eye-black/wide.webp`: 2 | Only the paint under the eyes |
| Arm sleeves | `sleeves/left.webp`, `sleeves/right.webp` and `sleeves/both.webp`: 3 | Dark compression sleeves on the visible upper arms |
| Towel | `towel/left.webp`, `towel/center.webp` and `towel/right.webp`: 3 | A white towel tucked at the waistline, where visible at the bottom edge |

Draw order, bottom to top: skin, sleeves, jersey, jersey trim, head, hair, eye black, towel. Gloves, visor, wrist tape, footwear and jersey fit don't show in a bust, so they stay on the drawn figure only.

## Optional polish (not wired yet; say if you want them)

- **Program crest art:** the 96 crests are generated SVG shapes with monograms. Painted crests would need a 96-image set at 512 × 512.
- **Title logo lockup:** the in-app mark is an SVG, `LogoMark` in `ui.tsx`. A bespoke wordmark would be an SVG at 1200 × 300.
