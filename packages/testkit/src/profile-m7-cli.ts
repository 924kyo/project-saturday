import { executePositionAlphaCareer } from './builders/position-alpha-career.js';
import { M7_POSITION_SCENARIOS } from './simulations/m7-four-position.js';

const MAX_CAREER_MS = 10_000;
const samples = M7_POSITION_SCENARIOS.map((scenario) => {
  const startedAt = performance.now();
  const result = executePositionAlphaCareer(scenario);
  const elapsedMs = performance.now() - startedAt;
  if (elapsedMs >= MAX_CAREER_MS) {
    throw new Error(`${scenario.scenarioId} exceeded the ${MAX_CAREER_MS} ms career bound.`);
  }
  return {
    scenarioId: scenario.scenarioId,
    positionId: scenario.positionId,
    elapsedMs: Math.round(elapsedMs * 1_000) / 1_000,
    games: result.gameCount,
    lifecycleRoundTrips: result.lifecycleRoundTripCount,
    careerRngDrawCount: result.careerRngDrawCount,
    worldRngDrawCount: result.worldRngDrawCount,
  };
});

process.stdout.write(
  `${JSON.stringify({
    profileId: 'm7_four_position_public_builder_v1',
    maxCareerBoundMs: MAX_CAREER_MS,
    scenarioCount: samples.length,
    samples,
  })}\n`,
);
