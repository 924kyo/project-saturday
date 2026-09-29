import type { PositionOpportunityBand } from '../programs/position-room.js';

/** Current-only tuneable planning; historical adapters retain their own budget. */
export const POSITION_ALPHA_OPPORTUNITY_TUNING = Object.freeze({
  maximumOpportunities: 5,
  relationshipShiftThresholdPermille: 50,
  maximumRelationshipBonusPermille: 100,
});

export interface PositionAlphaOpportunityEvidenceV2 {
  readonly model: 'position_alpha_opportunity_v2';
  readonly roleMinimum: number;
  readonly roleMaximum: number;
  readonly baseline: number;
  readonly relationshipBonusPermille: number;
  readonly requestedShift: number;
  readonly projectedOpportunities: number;
}

/** No RNG, rank changes, or availability rules; restrictions cap this result later. */
export function projectPositionAlphaOpportunityV2(
  band: Pick<PositionOpportunityBand, 'interactiveSnapMinimum' | 'interactiveSnapMaximum'>,
  relationshipBonusPermille: number,
): PositionAlphaOpportunityEvidenceV2 | null {
  const minimum = band.interactiveSnapMinimum;
  const maximum = band.interactiveSnapMaximum;
  if (
    !Number.isSafeInteger(minimum) ||
    !Number.isSafeInteger(maximum) ||
    minimum < 0 ||
    maximum > 8 ||
    minimum > maximum ||
    !Number.isSafeInteger(relationshipBonusPermille) ||
    Math.abs(relationshipBonusPermille) >
      POSITION_ALPHA_OPPORTUNITY_TUNING.maximumRelationshipBonusPermille
  )
    return null;
  const baseline = Math.floor((minimum + maximum) / 2);
  const requestedShift =
    Math.abs(relationshipBonusPermille) >=
    POSITION_ALPHA_OPPORTUNITY_TUNING.relationshipShiftThresholdPermille
      ? Math.sign(relationshipBonusPermille)
      : 0;
  return Object.freeze({
    model: 'position_alpha_opportunity_v2',
    roleMinimum: minimum,
    roleMaximum: maximum,
    baseline,
    relationshipBonusPermille: relationshipBonusPermille || 0,
    requestedShift,
    projectedOpportunities: Math.min(
      POSITION_ALPHA_OPPORTUNITY_TUNING.maximumOpportunities,
      maximum,
      Math.max(minimum, baseline + requestedShift),
    ),
  });
}
