import { describe, expect, it } from 'vitest';
import { positionSkillBuilds, positionSkillActionTags } from '../content/position-skill-builds.js';
import { localeMessages } from '../locales/index.js';
import { validatePositionSkillBuilds } from './position-skill-builds.js';

describe('current position skill supplements', () => {
  it('validates seven authored build supplements per added position with both descriptions and all focus references', () => {
    expect(positionSkillBuilds).toHaveLength(21);
    for (const positionId of ['position_qb', 'position_rb', 'position_cb'])
      expect(
        positionSkillBuilds
          .filter((entry) => entry.positionId === positionId)
          .map(({ buildId }) => buildId)
          .sort(),
      ).toEqual(['body', 'campus', 'film', 'mindset', 'nil', 'repetition', 'role']);
    expect(validatePositionSkillBuilds(localeMessages)).toEqual({ ok: true, issues: [] });
  });
  it('rejects missing locale text, duplicate IDs, wrong position, invalid effects, and missing action tags', () => {
    for (const locale of ['ko-KR', 'en-US'] as const) {
      const messages = {
        ...localeMessages,
        [locale]: { ...localeMessages[locale], [positionSkillBuilds[0]!.descriptionKey]: '' },
      };
      expect(validatePositionSkillBuilds(messages).ok).toBe(false);
    }
    const first = positionSkillBuilds[0]!;
    expect(validatePositionSkillBuilds(localeMessages, [first, first]).ok).toBe(false);
    expect(
      validatePositionSkillBuilds(localeMessages, [{ ...first, positionId: 'position_wr' }]).ok,
    ).toBe(false);
    expect(
      validatePositionSkillBuilds(localeMessages, [
        { ...first, mechanics: { ...first.mechanics, effects: [] } },
      ]).ok,
    ).toBe(false);
    expect(
      validatePositionSkillBuilds(localeMessages, positionSkillBuilds, {
        ...positionSkillActionTags,
        action_recovery: [],
      }).ok,
    ).toBe(false);
  });
});
