# Project Saturday 1.0 release candidate — release notes

Date: 2026-09-30. Platforms: an installable offline web app (PWA) for phones and desktops, and a Windows desktop build (unsigned).

## The game

A college football career told one Saturday at a time. You create an athlete, choose a program, fight up the depth chart, and play the snaps that matter. Four seasons later you leave a mark on the Alumni Wall.

- **Six positions**, each with its own decisions: quarterback, running back, wide receiver, cornerback, linebacker and edge rusher. Each has three archetypes, authored reads and outcome tables, and its own card library.
- **The week:**
  - plan three focuses;
  - read the practice report and your depth movement;
  - face what comes up midweek (254 authored events, NIL offers, the medical check, breakthrough cards);
  - play Saturday on the Tactical Board.
  Every role plays: backups take sideline reps that grade the read and feed next week's practice.
- **The world:** 96 original programs in 8 conferences. Three non-conference rounds are followed by nine conference games, then a 12-team bracket. Games don't end tied (overtime).
- **The build:** 100 skill cards, four slots, and a breakthrough gauge that turns practice into a three-card choice.
- **Off the field:**
  - NIL deals trade practice time for money and brand;
  - academics can cost you a Saturday;
  - injuries come with honest rest-or-play choices.
- **The arc:**
  - season reviews with original awards and conference titles;
  - each offseason: stay, transfer (a reach, a fit, a role) or, after your junior year, declare for the Pro Draft;
  - a draft band built from what you actually did.
- **Legacy:**
  - the Alumni Wall and a record book;
  - later careers meet familiar names, mentors from your program's alumni, and cameos;
  - history informs but never boosts.

## Quality

- **Languages:** Korean and English are complete and switchable at any time. Numbers follow the app language, and English shows feet, inches and pounds.
- **Accessibility:**
  - WCAG 2.2 AA automated scans on every screen in both languages;
  - fully keyboard playable;
  - reduced motion is respected;
  - contrast-safe team colors.
- **Offline first:**
  - plays with no network after the first load;
  - autosaves after every decision, with a last-good backup that restores automatically;
  - asks the browser to keep saves through storage pressure;
  - updates apply only when you choose.
- **Performance:** every command runs in under 100 ms (measured 2–13 ms), and weekly transitions stay responsive on a throttled phone.
- **Determinism:** seeded randomness per purpose, so every career is reproducible for testing.

## Compatibility

- Every Career VNext save from earlier builds loads and keeps playing, which checked fixtures prove:
  - a first-version recruiting save;
  - a season on the original 32-program world;
  - a Game Day save with NIL and legacy.
- A season in progress finishes on the world it started on.
- Data from the pre-rebuild prototype is detected and can be exported, and its alumni appear on the wall.

## Known limitations

See `docs/release/KNOWN_LIMITATIONS.md`. In short:
- NIL, injury, pattern and award variety is thinner than the long-range target;
- screen-reader and native-speaker reviews are still manual to-dos;
- the desktop build is unsigned.
