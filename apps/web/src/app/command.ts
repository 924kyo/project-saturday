import type {
  CareerVNext,
  CareerVNextMechanics,
  CareerVNextResult,
} from '@project-saturday/game-core';

/** A pure career command the app runs against the current save (it publishes the result). */
export type CareerCommand = (
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
) => CareerVNextResult;
