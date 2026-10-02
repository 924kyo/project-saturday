import { describe, expect, it } from 'vitest';

import { applyNameDisplay, createAppI18n } from '../i18n/i18n';
import { generatedName } from './content';

describe('suggested names (M12, playtest report: the same three names every time)', () => {
  it('never repeats a pair within a long run, and both names change each time', () => {
    for (const start of [0, 1, 4_321]) {
      const seen = new Set<string>();
      let previous = generatedName(start);
      seen.add(`${previous.givenNameId}|${previous.familyNameId}`);
      for (let index = start + 1; index < start + 60; index += 1) {
        const next = generatedName(index);
        const pair = `${next.givenNameId}|${next.familyNameId}`;
        expect(seen.has(pair), pair).toBe(false);
        seen.add(pair);
        expect(next.givenNameId).not.toBe(previous.givenNameId);
        expect(next.familyNameId).not.toBe(previous.familyNameId);
        previous = next;
      }
    }
  });
});

describe('name display setting (M12)', () => {
  it('shows generated names as originally spelled, and restores the localized form', async () => {
    const i18n = await createAppI18n('ko-KR');
    const key = 'programWorld.roster.given.kenji';
    expect(i18n.t(key)).toBe('켄지');
    applyNameDisplay(i18n, 'original');
    expect(i18n.t(key)).toBe('Kenji');
    applyNameDisplay(i18n, 'localized');
    expect(i18n.t(key)).toBe('켄지');
  });
});
