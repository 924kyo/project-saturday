# UX and Flow

## Primary platform

Mobile portrait PWA first. Desktop browser is supported.

## Home/week screen

The player should quickly understand:

- current week/opponent;
- depth rank and projected role/snaps;
- Body;
- Coach Trust;
- GPA risk/status;
- Brand when relevant;
- remaining weekly actions;
- the next meaningful action.

Avoid showing every backend statistic at once.

## Interaction rules

- One primary decision per screen/modal.
- Avoid confirmation prompts for reversible routine actions.
- After an action, show concise consequence summary and return to the main flow quickly.
- Important changes (depth promotion, starter role, injury, major award, S card) deserve stronger presentation.
- Detail views are optional; the main flow stays clean.

### M2 skill flow

- A persisted Breakthrough is its own choose-one phase; weekly planning is not shown until the selection has been saved.
- The four-slot loadout and owned inventory live in a collapsed detail surface. Loadout changes are available only during action planning and autosave as one authoritative command each.
- Weekly action cards label catalog Body/GPA figures as base changes before equipped skills. Resolved consequences show authoritative applied skill traces; the UI must not imply that a base value is a fully contextual forecast.
- Week advance previews core-derived passive Body recovery and the following phase retains the exact applied recovery evidence across save/reload.

## Information hierarchy

Internal values can be precise decimals. Primary UI can use readable labels/bars and rounded numbers. Exact detail may be available via info panels.

## Navigation concept

Potential stable destinations:

- Home
- Player
- Depth Chart
- Team/Program
- League
- Career/Legacy

Weekly decisions should originate from Home rather than requiring navigation hunting.

## Accessibility

- touch targets around 44 px minimum when practical;
- reduced motion support;
- high readable contrast;
- semantic controls;
- keyboard usability on desktop;
- avoid color-only state communication;
- localized text must not be clipped at supported viewport sizes.

## Visual identity

Avoid cloning another game's card layout or navigation. Build an original broadcast/campus/locker-room visual language suited to American college football.
