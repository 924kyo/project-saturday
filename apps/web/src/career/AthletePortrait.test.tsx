import type { PlayerAppearance } from '@project-saturday/game-core';
import { defaultWrAppearance } from '@project-saturday/game-content/content';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AthletePortrait } from './AthletePortrait';

const ALTERNATE_APPEARANCE = {
  armSleevesId: 'arm_sleeves_both',
  bodyTypeId: 'body_type_broad',
  eyeBlackId: 'eye_black_wide',
  faceId: 'face_angular',
  footwearId: 'footwear_high',
  glovesId: 'gloves_accent',
  hairColorId: 'hair_color_light_brown',
  hairStyleId: 'hair_style_locs',
  jerseyFitId: 'jersey_fit_loose',
  skinToneId: 'skin_tone_dark',
  towelId: 'towel_right',
  visorId: 'visor_smoke',
  wristTapeId: 'wrist_tape_both',
} as const satisfies PlayerAppearance;
const PORTRAIT_LABEL = 'Saved athlete appearance';
const PROFILE_SIZE = 'profile' as const;

describe('AthletePortrait', () => {
  it('renders every saved appearance choice as deterministic layered identity', () => {
    const { container, rerender } = render(
      <AthletePortrait appearance={defaultWrAppearance} label={PORTRAIT_LABEL} />,
    );
    const portrait = screen.getByRole('img');
    expect(portrait).toHaveAccessibleName('Saved athlete appearance');
    expect(portrait).toHaveAttribute('data-arm-sleeves', 'none');
    expect(portrait).toHaveAttribute('data-body-type', defaultWrAppearance.bodyTypeId);
    expect(portrait).toHaveAttribute('data-face', defaultWrAppearance.faceId);
    expect(portrait).toHaveAttribute('data-hair-style', defaultWrAppearance.hairStyleId);
    expect(portrait.querySelectorAll('.athlete-portrait__arm')).toHaveLength(2);
    expect(portrait.querySelectorAll('.athlete-portrait__leg')).toHaveLength(2);

    const initialMarkup = container.innerHTML;
    rerender(<AthletePortrait appearance={{ ...defaultWrAppearance }} label={PORTRAIT_LABEL} />);
    expect(container.innerHTML).toBe(initialMarkup);

    rerender(
      <AthletePortrait
        appearance={ALTERNATE_APPEARANCE}
        label={PORTRAIT_LABEL}
        size={PROFILE_SIZE}
      />,
    );
    for (const [field, value] of [
      ['data-arm-sleeves', ALTERNATE_APPEARANCE.armSleevesId],
      ['data-body-type', ALTERNATE_APPEARANCE.bodyTypeId],
      ['data-eye-black', ALTERNATE_APPEARANCE.eyeBlackId],
      ['data-face', ALTERNATE_APPEARANCE.faceId],
      ['data-footwear', ALTERNATE_APPEARANCE.footwearId],
      ['data-gloves', ALTERNATE_APPEARANCE.glovesId],
      ['data-hair-color', ALTERNATE_APPEARANCE.hairColorId],
      ['data-hair-style', ALTERNATE_APPEARANCE.hairStyleId],
      ['data-jersey-fit', ALTERNATE_APPEARANCE.jerseyFitId],
      ['data-skin-tone', ALTERNATE_APPEARANCE.skinToneId],
      ['data-towel', ALTERNATE_APPEARANCE.towelId],
      ['data-visor', ALTERNATE_APPEARANCE.visorId],
      ['data-wrist-tape', ALTERNATE_APPEARANCE.wristTapeId],
    ] as const) {
      expect(portrait).toHaveAttribute(field, value);
    }
    expect(container.innerHTML).not.toBe(initialMarkup);
  });
});
