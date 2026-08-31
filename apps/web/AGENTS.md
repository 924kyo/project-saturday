# AGENTS.md — apps/web

This directory is presentation, accessibility, input, routing, persistence adapters, audio, and PWA behavior.

## Rules

- Do not implement gameplay formulas here.
- Never mutate domain state directly.
- All shipping user-visible text must use localization keys.
- Support `ko-KR` and `en-US` for every new screen in the same change.
- Mobile portrait is the primary layout; desktop is supported, not primary.
- Minimum interactive target: 44 CSS px when practical.
- Prefer one meaningful decision surface at a time over dashboard density.
- Respect reduced-motion preferences.
- Persist only through the storage abstraction defined by the save system.
- No network/backend dependency for the initial playable target unless the target/spec explicitly changes.
