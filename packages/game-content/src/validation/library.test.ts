import { describe, expect, it } from 'vitest';

import {
  cbAlphaEvents,
  cbAlphaSkills,
  edgeContent,
  eventContent,
  lbContent,
  legacyMentorContent,
  lifeEventContent,
  qbAlphaEvents,
  qbAlphaSkills,
  rbAlphaEvents,
  rbAlphaSkills,
  skillMechanicsDefinitions,
} from '../content/index.js';
import { localeMessages } from '../locales/index.js';

/** M9 content scale: the roadmap asks for ~100–130 cards and ~250–350 events, all bilingual. */
describe('M9 content library scale', () => {
  it('ships 100–130 skill cards and 250–350 weekly events', () => {
    const cards =
      skillMechanicsDefinitions.length +
      qbAlphaSkills.length +
      rbAlphaSkills.length +
      cbAlphaSkills.length +
      lbContent.skills.length +
      edgeContent.skills.length;
    const events = [
      ...eventContent.events,
      ...qbAlphaEvents,
      ...rbAlphaEvents,
      ...cbAlphaEvents,
      ...lbContent.events,
      ...edgeContent.events,
      ...lifeEventContent,
      legacyMentorContent,
    ];
    expect(cards).toBeGreaterThanOrEqual(100);
    expect(cards).toBeLessThanOrEqual(130);
    expect(events.length).toBeGreaterThanOrEqual(250);
    expect(events.length).toBeLessThanOrEqual(350);
    expect(new Set(events.map(({ id }) => id)).size).toBe(events.length);
  });

  it('pairs every life-event line in both locales with distinct titles', () => {
    const titles = new Set<string>();
    for (const event of lifeEventContent) {
      const en = localeMessages['en-US'][event.nameKey as never] as string;
      const ko = localeMessages['ko-KR'][event.nameKey as never] as string;
      expect(en, event.id).toBeTruthy();
      expect(ko, event.id).toBeTruthy();
      expect(titles.has(en), en).toBe(false);
      titles.add(en);
    }
  });
});
