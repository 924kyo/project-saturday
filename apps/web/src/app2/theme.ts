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
