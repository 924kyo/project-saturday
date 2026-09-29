import { describe, expect, it } from 'vitest';

import { createSecondSeasonFixture } from '../test/season-fixture';
import {
  commitCareerProgramChoice,
  createCareerFromDraft,
  createDefaultCreationDraft,
} from './career-ui';
import {
  PROGRAM_UI_CATALOG_FAILURE_REASON,
  getProgramDepthPresentation,
  getProgramOfferPresentations,
} from './program-ui';

function choosingCareer() {
  const result = createCareerFromDraft(
    {
      ...createDefaultCreationDraft(),
      displayName: 'Program Projection Test',
      personalityTraitIds: ['personality_competitive', 'personality_leader'],
    },
    'program-ui-projection',
  );
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.career;
}

describe('pure program presentation projections', () => {
  it('maps all five persisted offers to complete content facts without changing order', () => {
    const career = choosingCareer();
    if (career.recruitingState.type !== 'CHOOSING') {
      throw new Error('Expected a choosing career.');
    }
    const offers = getProgramOfferPresentations(career);

    expect(offers).toHaveLength(5);
    expect(offers.map(({ id }) => id)).toEqual(
      career.recruitingState.offers.map(({ programId }) => programId),
    );
    expect(offers[0]).toMatchObject({
      id: career.recruitingState.offers[0].programId,
      interest: career.recruitingState.offers[0].interest,
      priority: career.recruitingState.offers[0].priority,
      projectedDepthBandId: career.recruitingState.offers[0].projectedDepthBandId,
      schemeFit: career.recruitingState.offers[0].schemeFit,
    });
    expect(offers.every(({ traits }) => traits.length >= 2)).toBe(true);
    expect(offers.every(({ ratings }) => ratings.prestige >= 0)).toBe(true);
    expect(Object.isFrozen(offers)).toBe(true);
    expect(Object.isFrozen(offers[0]?.traits)).toBe(true);
  });

  it('projects the committed eight-player room and fails closed in the wrong state', () => {
    const choosing = choosingCareer();
    expect(() => getProgramDepthPresentation(choosing)).toThrow(PROGRAM_UI_CATALOG_FAILURE_REASON);
    if (choosing.recruitingState.type !== 'CHOOSING') {
      throw new Error('Expected a choosing career.');
    }
    const selectedProgramId = choosing.recruitingState.offers[0].programId;
    const committed = commitCareerProgramChoice(choosing, selectedProgramId);
    if (!committed.ok) {
      throw new Error(committed.reason);
    }
    const depth = getProgramDepthPresentation(committed.career);

    expect(depth.program.id).toBe(selectedProgramId);
    expect(depth.participants).toHaveLength(8);
    expect(depth.participants.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(depth.participants.filter(({ isPlayer }) => isPlayer)).toHaveLength(1);
    expect(depth.projection.rank).toBe(depth.participants.find(({ isPlayer }) => isPlayer)?.rank);
    expect(depth.playerCoachTrust).toBe(committed.career.player.state.coachTrust);
    expect(depth.latestMovement).toBeNull();
    expect(depth.latestPracticeReview).toBeNull();
    const player = depth.participants.find(({ isPlayer }) => isPlayer);
    if (player === undefined) {
      throw new Error('Expected the player in the depth presentation.');
    }
    expect(depth.opportunity.competitorContext).toBe(
      player.rank === 1 ? 'ROLE_SECURITY' : 'ADVANCEMENT',
    );
    expect(depth.opportunity.competitor.rank).toBe(player.rank === 1 ? 2 : player.rank - 1);
    expect(depth.opportunity.factors.map(({ factorId }) => factorId)).toEqual([
      'talentFit',
      'coachTrust',
      'practiceForm',
      'schemeFit',
      'experienceReadiness',
    ]);
    for (const factor of depth.opportunity.factors) {
      expect(factor.playerValue).toBe(player.components[factor.factorId]);
      expect(factor.competitorValue).toBe(depth.opportunity.competitor.components[factor.factorId]);
    }
    expect(depth.opportunity.suggestionIds).toEqual(['talentFit', 'experienceReadiness']);
    expect(Object.isFrozen(depth)).toBe(true);
    expect(Object.isFrozen(depth.participants)).toBe(true);
    expect(Object.isFrozen(depth.opportunity)).toBe(true);
    expect(Object.isFrozen(depth.opportunity.factors)).toBe(true);
    expect(Object.isFrozen(depth.opportunity.suggestionIds)).toBe(true);
  });

  it('projects the transferred room from current membership while preserving recruiting origin', () => {
    const transferred = createSecondSeasonFixture('program-ui-transfer', 'TRANSFER')
      .nextSeasonSession.career;
    if (transferred.recruitingState.type !== 'COMMITTED' || transferred.programId === null) {
      throw new Error('Expected a transferred committed career.');
    }
    expect(transferred.recruitingState.selectedProgramId).not.toBe(transferred.programId);

    const depth = getProgramDepthPresentation(transferred);

    expect(depth.program.id).toBe(transferred.programId);
    expect(depth.program.id).toBe(transferred.programContext?.programId);
    expect(depth.participants).toHaveLength(8);
  });
});
