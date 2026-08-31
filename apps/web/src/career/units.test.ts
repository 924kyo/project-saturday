import { describe, expect, it } from 'vitest';

import {
  feetInchesToHeightCm,
  formatHeight,
  formatSignedNumber,
  formatWeight,
  heightCmToFeetInches,
  poundsToWeightKg,
  weightKgToPounds,
} from './units';

describe('localized canonical unit conversions', () => {
  it('converts metric height to a normalized ft-in pair and back', () => {
    expect(heightCmToFeetInches(183)).toEqual({ feet: 6, inches: 0 });
    expect(feetInchesToHeightCm(6, 0)).toBe(183);
    expect(feetInchesToHeightCm(5, 11)).toBe(180);
    expect(feetInchesToHeightCm(6, 12)).toBeNaN();
  });

  it('converts persisted kilograms to displayed pounds and back', () => {
    expect(weightKgToPounds(86)).toBe(190);
    expect(poundsToWeightKg(190)).toBe(86);
  });

  it('keeps round trips within one canonical unit across the shipped ranges', () => {
    for (let heightCm = 165; heightCm <= 200; heightCm += 1) {
      const imperial = heightCmToFeetInches(heightCm);
      expect(
        Math.abs(feetInchesToHeightCm(imperial.feet, imperial.inches) - heightCm),
      ).toBeLessThanOrEqual(1);
    }
    for (let weightKg = 68; weightKg <= 110; weightKg += 1) {
      expect(Math.abs(poundsToWeightKg(weightKgToPounds(weightKg)) - weightKg)).toBeLessThanOrEqual(
        1,
      );
    }
  });

  it('formats only display units while preserving canonical input', () => {
    expect(formatHeight('ko-KR', 183)).toBe('183 cm');
    expect(formatHeight('en-US', 183)).toBe('6′ 0″');
    expect(formatWeight('ko-KR', 86)).toBe('86 kg');
    expect(formatWeight('en-US', 86)).toBe('190 lb');
    expect(formatSignedNumber('en-US', -8, 0)).toBe('-8');
    expect(formatSignedNumber('ko-KR', 0.15)).toContain('0.15');
  });
});
