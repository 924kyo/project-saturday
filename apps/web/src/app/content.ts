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
  type DepthRoleId,
  type SidelineRepGradeVNext,
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
export const POSITION_PITCH_KEYS = {
  position_qb: 'v2.position.qb.pitch',
  position_rb: 'v2.position.rb.pitch',
  position_cb: 'v2.position.cb.pitch',
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

export const CLASS_YEAR_KEYS = {
  1: 'v2.classYear.freshman',
  2: 'v2.classYear.sophomore',
  3: 'v2.classYear.junior',
  4: 'v2.classYear.senior',
} as const satisfies Record<1 | 2 | 3 | 4, MessageKey>;

export const ROLE_KEYS = {
  depth_role_starter: 'v2.role.starter',
  depth_role_rotation: 'v2.role.rotation',
  depth_role_reserve: 'v2.role.reserve',
  depth_role_developmental: 'v2.role.developmental',
} as const satisfies Record<DepthRoleId, MessageKey>;

export const MOVEMENT_KEYS = {
  PROMOTED: 'v2.report.movement.promoted',
  DEMOTED: 'v2.report.movement.demoted',
  HELD: 'v2.report.movement.held',
} as const satisfies Record<'PROMOTED' | 'DEMOTED' | 'HELD', MessageKey>;

export const DOWN_KEYS = {
  1: 'v2.gd.down.first',
  2: 'v2.gd.down.second',
  3: 'v2.gd.down.third',
  4: 'v2.gd.down.fourth',
} as const satisfies Record<1 | 2 | 3 | 4, MessageKey>;

export const READ_KEYS = {
  SHARP: { name: 'v2.read.sharp', help: 'v2.read.sharpHelp', sideline: 'v2.sideline.sharp' },
  SOLID: { name: 'v2.read.solid', help: 'v2.read.solidHelp', sideline: 'v2.sideline.solid' },
  MISSED: { name: 'v2.read.missed', help: 'v2.read.missedHelp', sideline: 'v2.sideline.missed' },
} as const satisfies Record<
  SidelineRepGradeVNext,
  Record<'name' | 'help' | 'sideline', MessageKey>
>;

export const VERDICT_KEYS = {
  A: 'v2.post.verdict.a',
  B: 'v2.post.verdict.b',
  C: 'v2.post.verdict.c',
  D: 'v2.post.verdict.d',
  F: 'v2.post.verdict.f',
} as const satisfies Record<'A' | 'B' | 'C' | 'D' | 'F', MessageKey>;

const PLAY_KEYS: Readonly<Record<string, MessageKey>> = {
  'position_qb:COMPLETION': 'v2.play.qb.completion',
  'position_qb:INCOMPLETION': 'v2.play.qb.incompletion',
  'position_qb:INTERCEPTION': 'v2.play.qb.interception',
  'position_qb:SACK': 'v2.play.qb.sack',
  'position_qb:SCRAMBLE': 'v2.play.qb.scramble',
  'position_qb:THROW_AWAY': 'v2.play.qb.throwAway',
  'position_rb:RUSH': 'v2.play.rb.rush',
  'position_rb:RECEPTION': 'v2.play.rb.reception',
  'position_rb:PROTECTION_WIN': 'v2.play.rb.protectionWin',
  'position_rb:PROTECTION_MISS': 'v2.play.rb.protectionMiss',
  'position_cb:NO_TARGET': 'v2.play.cb.noTarget',
  'position_cb:COVERED': 'v2.play.cb.covered',
  'position_cb:COMPLETION_ALLOWED': 'v2.play.cb.completionAllowed',
  'position_cb:PASS_DEFENDED': 'v2.play.cb.passDefended',
  'position_cb:INTERCEPTION': 'v2.play.cb.interception',
  'position_cb:TACKLE': 'v2.play.cb.tackle',
  'position_cb:MISSED_TACKLE': 'v2.play.cb.missedTackle',
};

export function playHeadlineKey(positionId: VNextPositionId, playResultId: string): MessageKey {
  const found = PLAY_KEYS[`${positionId}:${playResultId}`];
  if (found === undefined)
    throw new Error(`Missing play headline for ${positionId}:${playResultId}.`);
  return found;
}
