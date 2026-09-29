import { cbAlphaContent, qbAlphaContent, rbAlphaContent } from '@project-saturday/game-content';
import { eventContent, injuryContent } from '@project-saturday/game-content/content';
import { enUSMessages, koKRMessages } from '@project-saturday/game-content/locales';
import { describe, expect, it } from 'vitest';

import { eventChoiceKey, eventText, injuryText, riskBand } from './content';

const catalogs = [
  qbAlphaContent.events,
  rbAlphaContent.events,
  cbAlphaContent.events,
  eventContent.events,
];

function inBothLocales(messageKey: string): void {
  expect(koKRMessages, messageKey).toHaveProperty([messageKey]);
  expect(enUSMessages, messageKey).toHaveProperty([messageKey]);
}

describe('weekly scene copy', () => {
  it('names every event and every choice in both locales', () => {
    const labels = new Map<string, Set<string>>();
    for (const catalog of catalogs)
      for (const event of catalog) {
        const text = eventText(event.id);
        inBothLocales(text.nameKey);
        inBothLocales(text.descriptionKey);
        const names = new Set<string>();
        for (const choice of event.choices) {
          const choiceKey = eventChoiceKey(event.id, choice.id);
          inBothLocales(choiceKey);
          names.add(enUSMessages[choiceKey]);
        }
        // Choices inside one event read as distinct options, never the same label twice.
        expect(names.size, event.id).toBe(event.choices.length);
        labels.set(event.id, names);
      }
    expect(labels.size).toBe(catalogs.reduce((sum, catalog) => sum + catalog.length, 0));
  });

  it('names every injury outcome and choice', () => {
    for (const entry of [...injuryContent.outcomes, ...injuryContent.choices]) {
      const text = injuryText(entry.id);
      inBothLocales(text.nameKey);
      inBothLocales(text.descriptionKey);
    }
  });

  it('bands pregame risk without inventing a separate rule', () => {
    expect(riskBand(20)).toBe('low');
    expect(riskBand(90)).toBe('elevated');
    expect(riskBand(200)).toBe('high');
  });
});
