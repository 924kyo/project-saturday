import { describe, expect, it } from 'vitest';

import { formatNumber, imperialMeasure } from './content';

describe('locale formatting (M10)', () => {
  it('formats numbers in the app language, not the device default', () => {
    expect(formatNumber('en-US', 11250)).toBe('11,250');
    expect(formatNumber('ko-KR', 11250)).toBe('11,250');
    expect(formatNumber(undefined, 0)).toBe('0');
  });

  it('converts creation measurements to feet, inches and pounds for en-US', () => {
    expect(imperialMeasure(188, 92)).toEqual({ feet: 6, inches: 2, pounds: 203 });
    expect(imperialMeasure(183, 86)).toEqual({ feet: 6, inches: 0, pounds: 190 });
    // Every whole-inch height entered at creation reads back as entered (never 4′12″).
    for (let total = 48; total <= 90; total += 1) {
      const { feet, inches } = imperialMeasure(Math.round(total * 2.54), 90);
      expect(feet * 12 + inches).toBe(total);
      expect(inches).toBeLessThan(12);
    }
  });
});
