import type { ProgramIdentityVNext } from '@project-saturday/game-content/content';
import type { CSSProperties } from 'react';

export function teamStyle(identity: ProgramIdentityVNext): CSSProperties {
  return {
    '--team': identity.primary,
    '--team-2': identity.secondary,
    // Text drawn on the program color (the nameplate) picks the ink that reads on it.
    '--team-ink': inkOn(identity.primary),
  } as CSSProperties;
}

export const METER_COLORS = {
  body: '#3ecf8e',
  preparation: '#5aa9ff',
  confidence: '#c792ff',
  trust: '#f5c542',
} as const;

export const PORTRAIT = { compact: 'compact', card: 'card', profile: 'profile' } as const;

const DARK_INK = '#10141b';

function luminance(hex: string): number {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (value === undefined) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** White or near-black text, whichever reads better on a program color (WCAG contrast ratio). */
export function inkOn(background: string): string {
  const light = luminance(background);
  const withWhite = 1.05 / (light + 0.05);
  const withDark = (light + 0.05) / (luminance(DARK_INK) + 0.05);
  return withWhite >= withDark ? '#fff' : DARK_INK;
}

function ratio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

/** The Tactical Board's turf, the background board markers must read on. */
export const BOARD_TURF = '#0d3923';

/** A program color lifted toward white until it reads against a background (board markers). */
export function readableOn(color: string, background: string, minimum = 3): string {
  const value = /^#?([0-9a-f]{6})$/i.exec(color)?.[1];
  if (value === undefined) return color;
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  for (let step = 0; step <= 10; step += 1) {
    const mixed = `#${channels
      .map((channel) => Math.round(channel + ((255 - channel) * step) / 10))
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`;
    if (ratio(mixed, background) >= minimum) return mixed;
  }
  return '#ffffff';
}
