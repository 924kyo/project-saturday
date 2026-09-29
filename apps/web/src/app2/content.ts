import {
  cbAlphaContent,
  creationContent,
  positionAlphaContent,
  programContent,
  qbAlphaContent,
  rbAlphaContent,
  weeklyActions,
} from '@project-saturday/game-content';
import {
  programIdentityVNext,
  type ProgramIdentityVNext,
} from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import {
  derivePositionOverall,
  type CareerVNext,
  type PositionRoomContext,
  type ProgramId,
  type VNextPositionId,
} from '@project-saturday/game-core';

import type { AppTranslate } from '../i18n/i18n';

export const VNEXT_POSITIONS: readonly VNextPositionId[] = [
  'position_qb',
  'position_rb',
  'position_cb',
];

export const POSITION_ABBR_KEYS = {
  position_qb: 'v2.position.qb.abbr',
  position_rb: 'v2.position.rb.abbr',
  position_cb: 'v2.position.cb.abbr',
} as const satisfies Record<VNextPositionId, MessageKey>;
export const POSITION_NAME_KEYS = {
  position_qb: 'v2.position.qb.name',
  position_rb: 'v2.position.rb.name',
  position_cb: 'v2.position.cb.name',
} as const satisfies Record<VNextPositionId, MessageKey>;

interface Named {
  readonly id: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
}
interface GameCatalog {
  readonly patterns: readonly Named[];
  readonly decisions: readonly Named[];
  readonly clues: readonly Named[];
}

const CATALOGS: Readonly<Record<VNextPositionId, GameCatalog>> = {
  position_qb: qbAlphaContent as unknown as GameCatalog,
  position_rb: rbAlphaContent as unknown as GameCatalog,
  position_cb: cbAlphaContent as unknown as GameCatalog,
};

function named(list: readonly Named[], id: string): Named {
  const found = list.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`Missing presentation for ${id}.`);
  return found;
}

export const gameText = {
  pattern: (positionId: VNextPositionId, id: string) => named(CATALOGS[positionId].patterns, id),
  decision: (positionId: VNextPositionId, id: string) => named(CATALOGS[positionId].decisions, id),
  clue: (positionId: VNextPositionId, id: string) => named(CATALOGS[positionId].clues, id),
};

export function program(programId: ProgramId): ProgramIdentityVNext {
  return programIdentityVNext(programId);
}

export const key = (value: string): MessageKey => value as MessageKey;

export function archetypesFor(positionId: VNextPositionId) {
  return positionAlphaContent.archetypes.filter((entry) => entry.positionId === positionId);
}

export function archetypeModifiers(archetypeId: string) {
  return (
    positionAlphaContent.creationMechanics.archetypeProfiles.find(({ id }) => id === archetypeId)
      ?.attributeModifiers ?? []
  );
}

export function backgroundModifiers(positionId: VNextPositionId, backgroundId: string) {
  return (
    positionAlphaContent.creationMechanics.backgroundProfiles.find(
      (profile) => profile.id === backgroundId && profile.positionId === positionId,
    )?.attributeModifiers ?? []
  );
}

export const backgrounds = creationContent.recruitingBackgrounds;
export const traits = creationContent.personalityTraits;
export const appearanceCatalog = creationContent.appearanceCatalog;

const SHARED_ATTRIBUTE_KEYS = {
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
} as const satisfies Record<string, MessageKey>;

const ATTRIBUTE_KEYS = new Map<string, string>([
  ...Object.entries(SHARED_ATTRIBUTE_KEYS),
  ...positionAlphaContent.attributes.map(({ id, nameKey }) => [id, nameKey] as const),
]);

export function attributeNameKey(attributeId: string): MessageKey {
  const found = ATTRIBUTE_KEYS.get(attributeId);
  if (found === undefined) throw new Error(`Missing attribute presentation for ${attributeId}.`);
  return found as MessageKey;
}

/** Practice-score letter band for the weekly report (presentation of an engine number). */
export function practiceBand(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  return score >= 75 ? 'A' : score >= 65 ? 'B' : score >= 55 ? 'C' : score >= 45 ? 'D' : 'F';
}

const FOCUS_TEXT = new Map<string, { readonly nameKey: string; readonly descriptionKey: string }>([
  ...positionAlphaContent.trainingActions.map((entry) => [entry.id, entry] as const),
  ...weeklyActions.map((entry) => [entry.id, entry] as const),
]);

export function focusText(id: string): {
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
} {
  const found = FOCUS_TEXT.get(id);
  if (found === undefined) throw new Error(`Missing focus presentation for ${id}.`);
  return {
    nameKey: found.nameKey as MessageKey,
    descriptionKey: found.descriptionKey as MessageKey,
  };
}

export function participantName(
  t: AppTranslate,
  room: PositionRoomContext,
  participantId: string,
  playerName: string,
): string {
  if (participantId === room.playerId) return playerName;
  const athlete = room.competitors.find(({ id }) => id === participantId);
  if (athlete === undefined) return playerName;
  const given = programContent.rosterGivenNames.find(({ id }) => id === athlete.givenNameId)!;
  const family = programContent.rosterFamilyNames.find(({ id }) => id === athlete.familyNameId)!;
  return t('career.program.room.competitorName', {
    given: t(given.nameKey as MessageKey),
    family: t(family.nameKey as MessageKey),
  });
}

export const DEPTH_COMPONENT_KEYS = {
  talentFit: 'v2.depth.talent',
  coachTrust: 'v2.depth.trust',
  practiceForm: 'v2.depth.form',
  schemeFit: 'v2.depth.scheme',
  experienceReadiness: 'v2.depth.experience',
} as const satisfies Record<string, MessageKey>;

/** Current overall from live attribute progress (creation-time overall is a snapshot). */
export function currentOverall(career: CareerVNext): number {
  const result = derivePositionOverall(
    career.athlete.profile.positionId,
    career.athlete.profile.attributes,
  );
  return result.ok ? result.overall : career.athlete.profile.overall;
}
