import type { PlayerAppearance } from '@project-saturday/game-core';

import type { AppearanceCatalog, WrBodyMeasurementOptions } from '../schema/appearance.js';

const noneOption = { id: null, nameKey: 'creation.appearance.options.none' } as const;

export const appearanceCatalog = {
  armSleevesId: {
    labelKey: 'creation.appearance.fields.armSleeves',
    options: [
      noneOption,
      { id: 'arm_sleeves_left', nameKey: 'creation.appearance.armSleeves.left' },
      { id: 'arm_sleeves_right', nameKey: 'creation.appearance.armSleeves.right' },
      { id: 'arm_sleeves_both', nameKey: 'creation.appearance.armSleeves.both' },
    ],
  },
  bodyTypeId: {
    labelKey: 'creation.appearance.fields.bodyType',
    options: [
      { id: 'body_type_lean', nameKey: 'creation.appearance.bodyTypes.lean' },
      { id: 'body_type_balanced', nameKey: 'creation.appearance.bodyTypes.balanced' },
      { id: 'body_type_broad', nameKey: 'creation.appearance.bodyTypes.broad' },
    ],
  },
  eyeBlackId: {
    labelKey: 'creation.appearance.fields.eyeBlack',
    options: [
      noneOption,
      { id: 'eye_black_stripes', nameKey: 'creation.appearance.eyeBlack.stripes' },
      { id: 'eye_black_wide', nameKey: 'creation.appearance.eyeBlack.wide' },
    ],
  },
  faceId: {
    labelKey: 'creation.appearance.fields.face',
    options: [
      { id: 'face_oval', nameKey: 'creation.appearance.faces.oval' },
      { id: 'face_round', nameKey: 'creation.appearance.faces.round' },
      { id: 'face_square', nameKey: 'creation.appearance.faces.square' },
      { id: 'face_angular', nameKey: 'creation.appearance.faces.angular' },
    ],
  },
  footwearId: {
    labelKey: 'creation.appearance.fields.footwear',
    options: [
      { id: 'footwear_low', nameKey: 'creation.appearance.footwear.low' },
      { id: 'footwear_mid', nameKey: 'creation.appearance.footwear.mid' },
      { id: 'footwear_high', nameKey: 'creation.appearance.footwear.high' },
    ],
  },
  glovesId: {
    labelKey: 'creation.appearance.fields.gloves',
    options: [
      noneOption,
      { id: 'gloves_light', nameKey: 'creation.appearance.gloves.light' },
      { id: 'gloves_dark', nameKey: 'creation.appearance.gloves.dark' },
      { id: 'gloves_accent', nameKey: 'creation.appearance.gloves.accent' },
    ],
  },
  hairColorId: {
    labelKey: 'creation.appearance.fields.hairColor',
    options: [
      { id: 'hair_color_black', nameKey: 'creation.appearance.hairColors.black' },
      { id: 'hair_color_dark_brown', nameKey: 'creation.appearance.hairColors.darkBrown' },
      { id: 'hair_color_brown', nameKey: 'creation.appearance.hairColors.brown' },
      { id: 'hair_color_light_brown', nameKey: 'creation.appearance.hairColors.lightBrown' },
    ],
  },
  hairStyleId: {
    labelKey: 'creation.appearance.fields.hairStyle',
    options: [
      { id: 'hair_style_shaved', nameKey: 'creation.appearance.hairStyles.shaved' },
      { id: 'hair_style_close_crop', nameKey: 'creation.appearance.hairStyles.closeCrop' },
      { id: 'hair_style_short_curls', nameKey: 'creation.appearance.hairStyles.shortCurls' },
      { id: 'hair_style_medium_curls', nameKey: 'creation.appearance.hairStyles.mediumCurls' },
      { id: 'hair_style_braids', nameKey: 'creation.appearance.hairStyles.braids' },
      { id: 'hair_style_locs', nameKey: 'creation.appearance.hairStyles.locs' },
    ],
  },
  jerseyFitId: {
    labelKey: 'creation.appearance.fields.jerseyFit',
    options: [
      { id: 'jersey_fit_standard', nameKey: 'creation.appearance.jerseyFits.standard' },
      { id: 'jersey_fit_tight', nameKey: 'creation.appearance.jerseyFits.tight' },
      { id: 'jersey_fit_loose', nameKey: 'creation.appearance.jerseyFits.loose' },
    ],
  },
  skinToneId: {
    labelKey: 'creation.appearance.fields.skinTone',
    options: [
      { id: 'skin_tone_light', nameKey: 'creation.appearance.skinTones.light' },
      {
        id: 'skin_tone_light_medium',
        nameKey: 'creation.appearance.skinTones.lightMedium',
      },
      { id: 'skin_tone_medium', nameKey: 'creation.appearance.skinTones.medium' },
      {
        id: 'skin_tone_medium_deep',
        nameKey: 'creation.appearance.skinTones.mediumDeep',
      },
      { id: 'skin_tone_deep', nameKey: 'creation.appearance.skinTones.deep' },
      { id: 'skin_tone_dark', nameKey: 'creation.appearance.skinTones.dark' },
    ],
  },
  towelId: {
    labelKey: 'creation.appearance.fields.towel',
    options: [
      noneOption,
      { id: 'towel_center', nameKey: 'creation.appearance.towels.center' },
      { id: 'towel_left', nameKey: 'creation.appearance.towels.left' },
      { id: 'towel_right', nameKey: 'creation.appearance.towels.right' },
    ],
  },
  visorId: {
    labelKey: 'creation.appearance.fields.visor',
    options: [
      noneOption,
      { id: 'visor_clear', nameKey: 'creation.appearance.visors.clear' },
      { id: 'visor_smoke', nameKey: 'creation.appearance.visors.smoke' },
    ],
  },
  wristTapeId: {
    labelKey: 'creation.appearance.fields.wristTape',
    options: [
      noneOption,
      { id: 'wrist_tape_left', nameKey: 'creation.appearance.wristTape.left' },
      { id: 'wrist_tape_right', nameKey: 'creation.appearance.wristTape.right' },
      { id: 'wrist_tape_both', nameKey: 'creation.appearance.wristTape.both' },
    ],
  },
} as const satisfies AppearanceCatalog;

export const wrBodyMeasurementOptions = {
  heightCm: {
    defaultValue: 183,
    labelKey: 'creation.appearance.fields.heightCm',
    max: 200,
    min: 165,
    step: 1,
  },
  weightKg: {
    defaultValue: 86,
    labelKey: 'creation.appearance.fields.weightKg',
    max: 110,
    min: 68,
    step: 1,
  },
} as const satisfies WrBodyMeasurementOptions;

export const defaultWrAppearance = {
  armSleevesId: null,
  bodyTypeId: 'body_type_balanced',
  eyeBlackId: null,
  faceId: 'face_oval',
  footwearId: 'footwear_mid',
  glovesId: null,
  hairColorId: 'hair_color_black',
  hairStyleId: 'hair_style_close_crop',
  jerseyFitId: 'jersey_fit_standard',
  skinToneId: 'skin_tone_medium',
  towelId: null,
  visorId: null,
  wristTapeId: null,
} as const satisfies PlayerAppearance;
