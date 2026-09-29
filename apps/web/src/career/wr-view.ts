import type {
  CareerRun,
  CareerRunV8,
  CareerSession,
  CareerSessionV8,
} from '@project-saturday/game-core';

/** Presentation accepts both saved versions; commands and historical parsers stay versioned. */
export type WrCareerSurface = CareerRun | CareerRunV8;
export type WrSessionSurface = CareerSession | CareerSessionV8;
