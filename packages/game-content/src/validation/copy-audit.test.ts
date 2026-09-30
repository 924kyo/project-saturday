import { describe, expect, it } from 'vitest';

import { addedPrograms96VNext, addedProgramsVNext, lifeEventContent } from '../content/index.js';
import { localeMessages } from '../locales/index.js';

/**
 * M9 editorial gate over every shipped message: no placeholder or debug text, no real-world
 * league, bowl, award or brand names (originality rule), no untranslated Career VNext copy, one
 * Korean spelling for "conference", and titles short enough for cards and headers.
 */
const PLACEHOLDER = /TODO|TBD|lorem|XXX|\{\{|\bundefined\b|\bNaN\b/i;
const TRADEMARK =
  /\b(NCAA|NFL|ESPN|SEC|Big Ten|Big 12|ACC|Pac-12|Heisman|Rose Bowl|Sugar Bowl|Orange Bowl|Alabama|Ohio State|Notre Dame|Michigan|Texas A&M|Clemson|Nike|Adidas|Gatorade)\b/;

describe('copy audit', () => {
  const en = localeMessages['en-US'] as Record<string, string>;
  const ko = localeMessages['ko-KR'] as Record<string, string>;

  it('has no placeholders, trademarks, untranslated VNext copy or glossary drift', () => {
    const findings: string[] = [];
    for (const [key, value] of Object.entries(en)) {
      const korean = ko[key];
      if (PLACEHOLDER.test(value) || (korean !== undefined && PLACEHOLDER.test(korean)))
        findings.push(`placeholder: ${key}`);
      if (TRADEMARK.test(value) || (korean !== undefined && TRADEMARK.test(korean)))
        findings.push(`trademark: ${key}`);
      if (
        korean === value &&
        /[a-z]{4,}/.test(value.replace(/\{[^}]*\}/g, '')) &&
        /^(v2\.|m8|m9)/.test(key)
      )
        findings.push(`untranslated: ${key}`);
      if (korean !== undefined && korean.includes('컨퍼런스')) findings.push(`glossary: ${key}`);
    }
    expect(findings).toEqual([]);
  });

  it('keeps event, program and award titles short enough for cards and headers', () => {
    const keys = [
      ...lifeEventContent.map(({ nameKey }) => nameKey),
      ...[...addedProgramsVNext, ...addedPrograms96VNext].map(({ nameKey }) => nameKey),
      ...Object.keys(en).filter((key) => key.startsWith('v2.award.')),
    ];
    for (const key of keys) {
      expect(en[key]!.length, key).toBeLessThanOrEqual(40);
      expect(ko[key]!.length, key).toBeLessThanOrEqual(24);
    }
  });
});
