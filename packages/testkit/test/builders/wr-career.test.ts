import { validateCareerRun } from '@project-saturday/game-core';
import { describe, expect, it } from 'vitest';

import { WrCareerFixtureError, createWrCareerFixture } from '../../src/index.js';

describe('WR career fixture builder', () => {
  it('builds a valid immutable career deterministically through production content', () => {
    const options = {
      careerSeed: 'fixture-reproduction-seed',
      displayName: 'Fixture Athlete',
    } as const;
    const first = createWrCareerFixture(options);
    const replay = createWrCareerFixture(options);

    expect(first).toEqual(replay);
    expect(validateCareerRun(first)).toEqual({ ok: true, issues: [] });
    expect(first.phase).toEqual({ type: 'PLAN_ACTIONS' });
    expect(first.revision).toBe(0);
    expect(first.rng.drawCount).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.player)).toBe(true);
  });

  it('keeps seed-derived identity stable while allowing explicit valid fixture variants', () => {
    const first = createWrCareerFixture({
      careerSeed: 'variant-a',
      archetypeId: 'archetype_wr_route_technician',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_quiet', 'personality_disciplined'],
      baseStateOverrides: { state_body: 20, state_gpa: 3.4 },
      baseAttributeRatingOverrides: { attribute_wr_route_running: 70 },
    });
    const second = createWrCareerFixture({
      careerSeed: 'variant-b',
      archetypeId: 'archetype_wr_route_technician',
      recruitingBackgroundId: 'background_late_bloomer',
      personalityTraitIds: ['personality_quiet', 'personality_disciplined'],
      baseStateOverrides: { state_body: 20, state_gpa: 3.4 },
      baseAttributeRatingOverrides: { attribute_wr_route_running: 70 },
    });

    expect(first.player.state.body).toBe(20);
    expect(first.player.state.gpa).toBe(3.4);
    expect(first.player.attributes.wr.attribute_wr_route_running.rating).toBe(73);
    expect(first.player.id).not.toBe(second.player.id);
    expect(first.id).not.toBe(second.id);
    expect(first.player.attributes).toEqual(second.player.attributes);
    expect(first.player.state).toEqual(second.player.state);
  });

  it('surfaces deterministic structured content failures instead of creating invalid fixtures', () => {
    const createInvalid = () =>
      createWrCareerFixture({
        careerSeed: 'invalid-personality-fixture',
        personalityTraitIds: ['personality_quiet', 'personality_social'],
      });

    expect(createInvalid).toThrow(WrCareerFixtureError);
    try {
      createInvalid();
    } catch (error) {
      expect(error).toMatchObject({
        stage: 'content_mechanics',
        issues: [
          {
            code: 'creation-content.incompatible-personality',
            path: 'personalityTraitIds',
          },
        ],
      });
    }
  });
});
