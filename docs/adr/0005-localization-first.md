# ADR-0005 — Localization First

**Status:** Accepted

## Decision

`ko-KR` and `en-US` are both mandatory from the first user-facing implementation.

## Why

- prevents localization debt;
- catches layout/content assumptions early;
- supports the intended Korean version without maintaining a separate fork.

## Consequence

Missing locale keys fail validation/CI and user-visible strings use message keys.
