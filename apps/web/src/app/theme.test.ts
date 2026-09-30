import { describe, expect, it } from 'vitest';
import { programIdentitiesVNext } from '@project-saturday/game-content/content';

import { inkOn, readableOn } from './theme';

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
const ratio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

describe('program colors stay readable (M10 accessibility)', () => {
  it('gives AA contrast for text on every program primary color', () => {
    for (const identity of programIdentitiesVNext) {
      const ink = inkOn(identity.primary);
      expect(
        ratio(identity.primary, ink.length === 4 ? '#ffffff' : ink),
        identity.id,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lifts program colors until board markers read on the turf', () => {
    for (const color of ['#0e3d25', '#1f5f3a', '#000000', '#ffcc00']) {
      const lifted = readableOn(color, '#0d3923');
      expect(lifted).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(readableOn('#ffcc00', '#0d3923')).toBe('#ffcc00');
    expect(readableOn('#0e3d25', '#0d3923')).not.toBe('#0e3d25');
  });
});
