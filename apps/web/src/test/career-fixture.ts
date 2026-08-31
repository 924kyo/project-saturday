import { createWrCareer, type CareerRun, type RngSeed } from '@project-saturday/game-core';
import {
  buildWrCreationMechanics,
  defaultWrCreationIdentity,
} from '@project-saturday/game-content/content';

export function createTestCareer(careerSeed: RngSeed = 'web-career-fixture'): CareerRun {
  const mechanics = buildWrCreationMechanics({
    archetypeId: defaultWrCreationIdentity.archetypeId,
    personalityTraitIds: defaultWrCreationIdentity.personalityTraitIds,
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
  });
  if (!mechanics.ok) {
    throw new Error(`Creation mechanics fixture failed: ${JSON.stringify(mechanics.issues)}`);
  }

  const created = createWrCareer({
    careerSeed,
    identity: {
      ...defaultWrCreationIdentity,
      displayName: '테스트 Player',
    },
    mechanics: mechanics.mechanics,
  });
  if (!created.ok) {
    throw new Error(`Career fixture failed: ${JSON.stringify(created.issues)}`);
  }
  return created.career;
}
