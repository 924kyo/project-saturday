import type { ProgramIdentityVNext } from '@project-saturday/game-content/content';
import type { CSSProperties } from 'react';

export function teamStyle(identity: ProgramIdentityVNext): CSSProperties {
  return {
    '--team': identity.primary,
    '--team-2': identity.secondary,
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
