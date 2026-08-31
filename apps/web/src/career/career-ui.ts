import {
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  advanceDevelopmentWeek,
  commitWeeklyActionPlan,
  createWrCareer,
  deriveWrOverall,
  resolveNextWeeklyAction,
  type AttributeProgress,
  type CareerRun,
  type PersonalityTraitId,
  type PlayerAppearance,
  type PlayerAttributeId,
  type RecruitingBackgroundId,
  type RngSeed,
  type WeeklyActionId,
  type WeeklyActionResult,
  type WeeklyCommandResult,
  type WrArchetypeId,
  type WrAttributeId,
} from '@project-saturday/game-core';
import {
  appearanceCatalog,
  buildWrCreationMechanics,
  defaultWrAppearance,
  defaultWrCreationIdentity,
  developmentWeekConfig,
  getAvailableWeeklyActionEntries,
  isCompatiblePersonalitySelection,
  skillMechanicsDefinitions,
  weeklyActionDefinitions,
  wrBodyMeasurementOptions,
  type AvailableWeeklyActionEntry,
} from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';

export const APPEARANCE_FIELD_ORDER = [
  'skinToneId',
  'faceId',
  'hairStyleId',
  'hairColorId',
  'bodyTypeId',
  'eyeBlackId',
  'armSleevesId',
  'glovesId',
  'visorId',
  'wristTapeId',
  'towelId',
  'jerseyFitId',
  'footwearId',
] as const satisfies readonly (keyof PlayerAppearance)[];

export const ATTRIBUTE_LABEL_KEYS = {
  attribute_agility: 'career.attributes.agility',
  attribute_burst: 'career.attributes.burst',
  attribute_composure: 'career.attributes.composure',
  attribute_conditioning: 'career.attributes.conditioning',
  attribute_discipline: 'career.attributes.discipline',
  attribute_durability: 'career.attributes.durability',
  attribute_football_iq: 'career.attributes.footballIq',
  attribute_speed: 'career.attributes.speed',
  attribute_strength: 'career.attributes.strength',
  attribute_work_ethic: 'career.attributes.workEthic',
  attribute_wr_blocking: 'career.attributes.blocking',
  attribute_wr_catch_in_traffic: 'career.attributes.catchInTraffic',
  attribute_wr_hands: 'career.attributes.hands',
  attribute_wr_release: 'career.attributes.release',
  attribute_wr_route_running: 'career.attributes.routeRunning',
  attribute_wr_yac: 'career.attributes.yac',
} as const satisfies Readonly<Record<PlayerAttributeId, MessageKey>>;

export interface CreationDraft {
  readonly appearance: PlayerAppearance;
  readonly archetypeId: WrArchetypeId;
  readonly displayName: string;
  readonly heightCm: number;
  readonly personalityTraitIds: readonly PersonalityTraitId[];
  readonly recruitingBackgroundId: RecruitingBackgroundId;
  readonly weightKg: number;
}

export type CreationUiIssueCode =
  | 'creation-ui.invalid-body'
  | 'creation-ui.invalid-name'
  | 'creation-ui.invalid-personalities'
  | 'creation-ui.mechanics-failed'
  | 'creation-ui.player-failed';

export type CreateCareerFromDraftResult =
  | { readonly career: CareerRun; readonly issues: readonly []; readonly ok: true }
  | { readonly issues: readonly CreationUiIssueCode[]; readonly ok: false };

export interface AttributeSummaryRow {
  readonly attributeId: PlayerAttributeId;
  readonly progress: AttributeProgress;
}

export interface AppearanceSummaryRow {
  readonly field: keyof PlayerAppearance;
  readonly labelKey: string;
  readonly nameKey: string;
}

export function createDefaultCreationDraft(): CreationDraft {
  return {
    appearance: { ...defaultWrAppearance },
    archetypeId: defaultWrCreationIdentity.archetypeId,
    displayName: '',
    heightCm: wrBodyMeasurementOptions.heightCm.defaultValue,
    personalityTraitIds: [],
    recruitingBackgroundId: defaultWrCreationIdentity.recruitingBackgroundId,
    weightKg: wrBodyMeasurementOptions.weightKg.defaultValue,
  };
}

export function canAddPersonalityTrait(
  selectedIds: readonly PersonalityTraitId[],
  candidateId: PersonalityTraitId,
): boolean {
  if (selectedIds.includes(candidateId)) {
    return true;
  }
  if (selectedIds.length >= 2) {
    return false;
  }
  return selectedIds.every((selectedId) =>
    isCompatiblePersonalitySelection([selectedId, candidateId]),
  );
}

export function togglePersonalityTrait(
  selectedIds: readonly PersonalityTraitId[],
  traitId: PersonalityTraitId,
): readonly PersonalityTraitId[] {
  if (selectedIds.includes(traitId)) {
    return selectedIds.filter((selectedId) => selectedId !== traitId);
  }
  return canAddPersonalityTrait(selectedIds, traitId) ? [...selectedIds, traitId] : selectedIds;
}

function validCatalogBodyValue(
  value: number,
  range: { readonly min: number; readonly max: number },
) {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

export function createCareerFromDraft(
  draft: CreationDraft,
  careerSeed: RngSeed,
): CreateCareerFromDraftResult {
  const issues: CreationUiIssueCode[] = [];
  const displayNameLength = [...draft.displayName].length;
  if (
    draft.displayName.trim() !== draft.displayName ||
    displayNameLength < 1 ||
    displayNameLength > 40 ||
    containsControlCharacter(draft.displayName)
  ) {
    issues.push('creation-ui.invalid-name');
  }
  if (!isCompatiblePersonalitySelection(draft.personalityTraitIds)) {
    issues.push('creation-ui.invalid-personalities');
  }
  if (
    !validCatalogBodyValue(draft.heightCm, wrBodyMeasurementOptions.heightCm) ||
    !validCatalogBodyValue(draft.weightKg, wrBodyMeasurementOptions.weightKg)
  ) {
    issues.push('creation-ui.invalid-body');
  }
  if (issues.length > 0 || !isCompatiblePersonalitySelection(draft.personalityTraitIds)) {
    return { issues, ok: false };
  }

  const mechanics = buildWrCreationMechanics({
    archetypeId: draft.archetypeId,
    personalityTraitIds: draft.personalityTraitIds,
    recruitingBackgroundId: draft.recruitingBackgroundId,
  });
  if (!mechanics.ok) {
    return { issues: ['creation-ui.mechanics-failed'], ok: false };
  }

  const created = createWrCareer({
    careerSeed,
    identity: {
      appearance: draft.appearance,
      archetypeId: draft.archetypeId,
      displayName: draft.displayName,
      heightCm: draft.heightCm,
      personalityTraitIds: draft.personalityTraitIds,
      recruitingBackgroundId: draft.recruitingBackgroundId,
      weightKg: draft.weightKg,
    },
    mechanics: mechanics.mechanics,
  });
  return created.ok
    ? { career: created.career, issues: [], ok: true }
    : { issues: ['creation-ui.player-failed'], ok: false };
}

export function addDraftAction(
  draft: readonly WeeklyActionId[],
  actionId: WeeklyActionId,
): readonly WeeklyActionId[] {
  return draft.length >= 3 ? draft : [...draft, actionId];
}

export function removeDraftAction(
  draft: readonly WeeklyActionId[],
  index: number,
): readonly WeeklyActionId[] {
  return draft.filter((_, actionIndex) => actionIndex !== index);
}

export function moveDraftAction(
  draft: readonly WeeklyActionId[],
  fromIndex: number,
  toIndex: number,
): readonly WeeklyActionId[] {
  if (
    fromIndex < 0 ||
    fromIndex >= draft.length ||
    toIndex < 0 ||
    toIndex >= draft.length ||
    fromIndex === toIndex
  ) {
    return draft;
  }
  const moved = [...draft];
  const [actionId] = moved.splice(fromIndex, 1);
  if (actionId === undefined) {
    return draft;
  }
  moved.splice(toIndex, 0, actionId);
  return moved;
}

export function getCareerWeeklyEntries(career: CareerRun): readonly AvailableWeeklyActionEntry[] {
  return getAvailableWeeklyActionEntries(career.player.positionId);
}

export function commitCareerActionDraft(
  career: CareerRun,
  draft: readonly WeeklyActionId[],
): WeeklyCommandResult {
  const availableIds = getCareerWeeklyEntries(career).map(({ definition }) => definition.id);
  return commitWeeklyActionPlan(career, draft, availableIds);
}

export function resolveCareerNextAction(career: CareerRun): WeeklyCommandResult {
  if (career.phase.type !== 'RESOLVE_ACTIONS') {
    return { career, ok: false, reason: 'weekly.invalid_phase' };
  }
  const actionId = career.phase.actionIds[career.phase.nextActionIndex];
  const definition = getCareerWeeklyEntries(career).find(
    (entry) => entry.definition.id === actionId,
  )?.definition;
  return definition === undefined
    ? { career, ok: false, reason: 'weekly.action_definition_mismatch' }
    : resolveNextWeeklyAction(career, definition, developmentWeekConfig, skillMechanicsDefinitions);
}

export function advanceCareerWeek(career: CareerRun): WeeklyCommandResult {
  return advanceDevelopmentWeek(
    career,
    developmentWeekConfig,
    skillMechanicsDefinitions,
    weeklyActionDefinitions,
  );
}

export function latestWeeklyResult(career: CareerRun): WeeklyActionResult | undefined {
  return career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END'
    ? career.phase.results.at(-1)
    : undefined;
}

function readAttributeProgress(
  career: CareerRun,
  attributeId: PlayerAttributeId,
): AttributeProgress {
  if (PHYSICAL_ATTRIBUTE_IDS.some((id) => id === attributeId)) {
    return career.player.attributes.physical[
      attributeId as (typeof PHYSICAL_ATTRIBUTE_IDS)[number]
    ];
  }
  if (MENTAL_ATTRIBUTE_IDS.some((id) => id === attributeId)) {
    return career.player.attributes.mental[attributeId as (typeof MENTAL_ATTRIBUTE_IDS)[number]];
  }
  return career.player.attributes.wr[attributeId as WrAttributeId];
}

export function getAttributeSummary(career: CareerRun): readonly AttributeSummaryRow[] {
  return PLAYER_ATTRIBUTE_IDS.map((attributeId) => ({
    attributeId,
    progress: readAttributeProgress(career, attributeId),
  }));
}

export function getAppearanceSummary(
  appearance: PlayerAppearance,
): readonly AppearanceSummaryRow[] {
  return APPEARANCE_FIELD_ORDER.map((field) => {
    const category = appearanceCatalog[field];
    const selectedId = appearance[field];
    const selected = category.options.find(({ id }) => id === selectedId);
    if (selected === undefined) {
      throw new Error(`Appearance ID ${String(selectedId)} is missing from ${field}.`);
    }
    return { field, labelKey: category.labelKey, nameKey: selected.nameKey };
  });
}

export function getActionPresentation(
  actionId: WeeklyActionId,
): AvailableWeeklyActionEntry['presentation'] {
  const presentation = getAvailableWeeklyActionEntries('position_wr').find(
    ({ presentation }) => presentation.id === actionId,
  )?.presentation;
  if (presentation === undefined) {
    throw new Error(`Missing weekly action presentation for ${actionId}.`);
  }
  return presentation;
}

export function getCareerOverall(career: CareerRun): number {
  return deriveWrOverall(career);
}
