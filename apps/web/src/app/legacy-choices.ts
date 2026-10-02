import type { GearIdVNext, ProgramId } from '@project-saturday/game-core';

/** How a new career uses unlocked legacy perks (M12 Phase 8). */
export interface LegacyChoices {
  readonly bonusBudget: number;
  readonly mentorCareerId: string | null;
  readonly legacyOfferProgramId: ProgramId | null;
  readonly startGearIds: readonly GearIdVNext[];
}

export const NO_LEGACY_CHOICES: LegacyChoices = {
  bonusBudget: 0,
  mentorCareerId: null,
  legacyOfferProgramId: null,
  startGearIds: [],
};
