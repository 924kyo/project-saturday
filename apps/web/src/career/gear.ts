import { createContext } from 'react';

/**
 * Worn gear cosmetics (M12 NIL-01/02): recolors of the owner's tinted layers, never new art. The
 * app provides the athlete's equipped gear; the portrait and the full-body figure read it.
 */
export const GearContext = createContext<readonly string[]>([]);

const GOLD = '#d4af37';
const BLACKOUT = '#15171c';
const VOLT = '#c8ff2e';

export interface GearTints {
  readonly jersey: string;
  readonly trim: string;
  readonly helmet: string;
  readonly gloves: string;
  /** Volt gloves are worn as the accent glove whatever the creation choice was. */
  readonly forceAccentGloves: boolean;
}

export function gearTints(gear: readonly string[]): GearTints {
  const alternate = gear.includes('gear_alternate_jersey');
  const primary = 'var(--team, #28344a)';
  const secondary = 'var(--team-2, #c8ff2e)';
  return {
    jersey: alternate ? secondary : primary,
    trim: gear.includes('gear_gold_trim') ? GOLD : alternate ? primary : secondary,
    helmet: gear.includes('gear_blackout_helmet') ? BLACKOUT : primary,
    gloves: gear.includes('gear_volt_gloves') ? VOLT : secondary,
    forceAccentGloves: gear.includes('gear_volt_gloves'),
  };
}
