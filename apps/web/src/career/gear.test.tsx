import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultWrAppearance } from '@project-saturday/game-content';

import { AthletePortrait } from './AthletePortrait';
import { GearContext, gearTints } from './gear';
import { resetPortraitOverlays } from './portrait-overlays';

const supplied = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../public/art/portrait/portrait-overlays.json'), 'utf8'),
) as unknown;

const GOLD_TRIM = ['gear_gold_trim'] as const;
const ALTERNATE = ['gear_alternate_jersey'] as const;

describe('gear cosmetics (NIL-02)', () => {
  const pending: { onload: (() => void) | null }[] = [];
  class ControlledImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    constructor() {
      pending.push(this);
    }
  }
  beforeEach(() => {
    resetPortraitOverlays();
    vi.stubGlobal('Image', ControlledImage);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => supplied })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    pending.length = 0;
    resetPortraitOverlays();
  });

  const tintsOf = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('.athlete-portrait__layer--tint')].map(
      (element) => element.style.background,
    );

  it('worn gear recolors the tinted layers it covers', async () => {
    const { container } = render(
      <GearContext.Provider value={GOLD_TRIM}>
        <AthletePortrait appearance={defaultWrAppearance} label="A" />
      </GearContext.Provider>,
    );
    await act(async () => {});
    act(() => {
      for (const image of pending.splice(0)) image.onload?.();
    });
    // Jersey, then trim: the trim is gold.
    expect(tintsOf(container)[1]).toBe('rgb(212, 175, 55)');
  });

  it('maps each piece of gear to the layer it recolors', () => {
    expect(gearTints([]).trim).toBe('var(--team-2, #c8ff2e)');
    expect(gearTints(ALTERNATE)).toMatchObject({
      jersey: 'var(--team-2, #c8ff2e)',
      trim: 'var(--team, #28344a)',
    });
    expect(gearTints(['gear_blackout_helmet']).helmet).toBe('#15171c');
    expect(gearTints(['gear_volt_gloves'])).toMatchObject({
      gloves: '#c8ff2e',
      forceAccentGloves: true,
    });
  });
});
