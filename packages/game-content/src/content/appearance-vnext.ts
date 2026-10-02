import { appearanceCatalog } from './appearance.js';

/**
 * M12 appearance for Career VNext (playtest report: broader hair and faces). The M1 catalog stays
 * the historical manifest; VNext adds faces, hairstyles, hair colors and an optional facial-hair
 * field. Every option is cosmetic only: no appearance value reaches a rating, an offer or a story
 * weight, and no option is restricted by any other choice.
 *
 * The painted art is the owner's Round 3 v3 pack (docs/design/ASSET_LIST.md, round 3), placed by
 * the per-face matrices in art/portrait/portrait-overlays.json.
 */
const noneOption = { id: null, nameKey: 'creation.appearance.options.none' } as const;

export const appearanceCatalogVNext = {
  ...appearanceCatalog,
  hairColorId: {
    labelKey: appearanceCatalog.hairColorId.labelKey,
    options: [
      ...appearanceCatalog.hairColorId.options,
      { id: 'hair_color_blond', nameKey: 'creation.appearance.hairColors.blond' },
      { id: 'hair_color_auburn', nameKey: 'creation.appearance.hairColors.auburn' },
      { id: 'hair_color_gray', nameKey: 'creation.appearance.hairColors.gray' },
      { id: 'hair_color_platinum', nameKey: 'creation.appearance.hairColors.platinum' },
    ],
  },
  // Round 3 v3 portraits: twelve more faces (alternatives, not a shape × identity grid) and eight
  // more hairstyles. Each one works with every tone, build, color and facial hair.
  faceId: {
    labelKey: appearanceCatalog.faceId.labelKey,
    options: [
      ...appearanceCatalog.faceId.options,
      { id: 'face_identity_01', nameKey: 'creation.appearance.faces.face01' },
      { id: 'face_identity_02', nameKey: 'creation.appearance.faces.face02' },
      { id: 'face_identity_03', nameKey: 'creation.appearance.faces.face03' },
      { id: 'face_identity_04', nameKey: 'creation.appearance.faces.face04' },
      { id: 'face_identity_05', nameKey: 'creation.appearance.faces.face05' },
      { id: 'face_identity_06', nameKey: 'creation.appearance.faces.face06' },
      { id: 'face_identity_07', nameKey: 'creation.appearance.faces.face07' },
      { id: 'face_identity_08', nameKey: 'creation.appearance.faces.face08' },
      { id: 'face_identity_09', nameKey: 'creation.appearance.faces.face09' },
      { id: 'face_identity_10', nameKey: 'creation.appearance.faces.face10' },
      { id: 'face_identity_11', nameKey: 'creation.appearance.faces.face11' },
      { id: 'face_identity_12', nameKey: 'creation.appearance.faces.face12' },
    ],
  },
  hairStyleId: {
    labelKey: appearanceCatalog.hairStyleId.labelKey,
    options: [
      ...appearanceCatalog.hairStyleId.options,
      { id: 'hair_style_straight_crop', nameKey: 'creation.appearance.hairStyles.straightCrop' },
      { id: 'hair_style_side_part', nameKey: 'creation.appearance.hairStyles.sidePart' },
      { id: 'hair_style_middle_part', nameKey: 'creation.appearance.hairStyles.middlePart' },
      { id: 'hair_style_curtain_fringe', nameKey: 'creation.appearance.hairStyles.curtainFringe' },
      { id: 'hair_style_two_block', nameKey: 'creation.appearance.hairStyles.twoBlock' },
      { id: 'hair_style_comma_fringe', nameKey: 'creation.appearance.hairStyles.commaFringe' },
      { id: 'hair_style_textured_quiff', nameKey: 'creation.appearance.hairStyles.texturedQuiff' },
      { id: 'hair_style_swept_back', nameKey: 'creation.appearance.hairStyles.sweptBack' },
    ],
  },
  facialHairId: {
    labelKey: 'creation.appearance.fields.facialHair',
    options: [
      noneOption,
      { id: 'facial_hair_stubble', nameKey: 'creation.appearance.facialHair.stubble' },
      { id: 'facial_hair_mustache', nameKey: 'creation.appearance.facialHair.mustache' },
      { id: 'facial_hair_goatee', nameKey: 'creation.appearance.facialHair.goatee' },
      { id: 'facial_hair_beard', nameKey: 'creation.appearance.facialHair.beard' },
    ],
  },
} as const;
