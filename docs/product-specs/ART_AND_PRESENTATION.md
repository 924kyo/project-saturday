# Art and Presentation Direction

## Goal

Build an original visual identity that feels like college football, campus culture, locker-room life, and sports broadcast presentation without imitating a specific existing game's UI.

## Character presentation

Start with composable 2D/layered athletes rather than full 3D customization.

Priorities:

- recognizable silhouette/body type;
- face/hair/skin variation;
- equipment/cosmetic progression;
- program uniform identity;
- saved alumni portrait continuity.

Creation must update the portrait live. The same deterministic layer composition and saved appearance IDs render on Home and Player; no screen may generate a visually unrelated avatar for the same athlete. Temporary vector/CSS shapes are acceptable if they are original, legible at mobile size, and preserve skin/hair/body/equipment distinctions.

## Program visual identity

Each fictional program needs an original design kit:

- primary/secondary/accent colors;
- original wordmark/logo direction;
- uniform pattern rules;
- region/culture imagery tags;
- broadcast abbreviations.

Do not mimic distinctive real marks or exact signature uniforms.

## UI mood

Blend:

- team facility/locker-room utility;
- recruiting media;
- broadcast scorebug/stat presentation;
- modern athlete phone/social/NIL cues where useful.

Avoid making the whole game look like an enterprise dashboard.

Functional screens should favor a compact sports hierarchy—role/score modules, stat bars, strong dividers, restrained surfaces, and readable athletic typography—over repeated rounded cards, giant generic marketing headlines, or low-value subtitles. The five primary destinations remain visually distinct while sharing one original system.

The M3.5 baseline applies that hierarchy as follows:

- each Home / Week / Team / Skills / Player destination owns a restrained accent within one shared visual system;
- destination headings are compact functional labels, while major modules use strong dividers, angular accents, and limited surface nesting;
- Home leads with the persistent athlete portrait and a role strip for projected snap share, role, Coach Trust, and Practice Form;
- Body, Preparation, Confidence, academics, and action capacity use distinct stat-bar accents without changing their semantic labels;
- condensed athletic heading typography may be used where the installed system font supports Korean and English fallback legibly.

M6 extends the same original system with compact status strips, consequence pairs, and an equal-footing four-option offseason grid. Academic, relationship, and NIL information uses restrained dividers and state labels rather than a management-dashboard visual language. Stay may receive an accent border for orientation, but color never replaces its explicit localized label. The saved athlete portrait remains the identity anchor throughout Season Review and is not regenerated for transfer or season two.

## Motion

Fast, short feedback for routine actions. Reserve stronger motion for:

- depth promotion;
- S card;
- rivalry/playoff win;
- major award;
- draft/endings.

Respect reduced-motion preference.

Pointer interaction must not leave a persistent high-saturation focus ring. Keyboard focus remains clearly visible using `:focus-visible` or an equivalent modality-aware implementation with sufficient contrast.

Programmatic focus after a phase transition must remain in the document for assistive technology. Its visual outline follows the triggering modality: keyboard-triggered transitions retain the high-contrast ring, while pointer-triggered transitions do not display a persistent ring.

## Temporary art

Codex may use simple generated shapes/placeholders/icons during implementation. Do not block mechanical milestones on final art unless visual layout is the acceptance goal.
