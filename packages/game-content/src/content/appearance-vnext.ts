import { appearanceCatalog } from './appearance.js';

/**
 * M12 appearance for Career VNext (playtest report: broader hair and faces). The M1 catalog stays
 * the historical manifest; VNext adds hair colors and an optional facial-hair field. Every option
 * is cosmetic only: no appearance value reaches a rating, an offer or a story weight.
 *
 * Painted art for the added options is listed in docs/design/ASSET_LIST.md (round 3). A layer
 * that is not delivered yet simply does not show.
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
