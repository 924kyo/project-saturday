import {
  cbAlphaContent,
  creationContent,
  gameContent,
  positionAlphaContent,
  positionSkillBuilds,
  programContent,
  qbAlphaContent,
  rbAlphaContent,
  skills as wrSkills,
  weeklyActions,
} from '@project-saturday/game-content';
import {
  buildCareerVNextMechanics,
  edgeContent,
  eventContent,
  lbContent,
  injuryContent,
  programIdentityVNext,
  type ProgramIdentityVNext,
} from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import {
  overallVNext,
  type CreatedPositionPlayerProfile,
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
  'position_wr',
  'position_cb',
  'position_lb',
  'position_edge',
];

export const POSITION_ABBR_KEYS = {
  position_qb: 'v2.position.qb.abbr',
  position_rb: 'v2.position.rb.abbr',
  position_wr: 'v2.position.wr.abbr',
  position_cb: 'v2.position.cb.abbr',
  position_lb: 'v2.position.lb.abbr',
  position_edge: 'v2.position.edge.abbr',
} as const satisfies Record<VNextPositionId, MessageKey>;
export const POSITION_PITCH_KEYS = {
  position_qb: 'v2.position.qb.pitch',
  position_rb: 'v2.position.rb.pitch',
  position_wr: 'v2.position.wr.pitch',
  position_cb: 'v2.position.cb.pitch',
  position_lb: 'v2.position.lb.pitch',
  position_edge: 'v2.position.edge.pitch',
} as const satisfies Record<VNextPositionId, MessageKey>;
export const POSITION_NAME_KEYS = {
  position_qb: 'v2.position.qb.name',
  position_rb: 'v2.position.rb.name',
  position_wr: 'v2.position.wr.name',
  position_cb: 'v2.position.cb.name',
  position_lb: 'v2.position.lb.name',
  position_edge: 'v2.position.edge.name',
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
  position_wr: gameContent as unknown as GameCatalog,
  position_cb: cbAlphaContent as unknown as GameCatalog,
  position_lb: lbContent as unknown as GameCatalog,
  position_edge: edgeContent as unknown as GameCatalog,
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

export interface ArchetypeView {
  readonly id: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly priorityAttributeIds: readonly string[];
}

const WR_PRIORITY: Readonly<Record<string, readonly string[]>> = {
  archetype_wr_deep_threat: [
    'attribute_speed',
    'attribute_wr_release',
    'attribute_wr_route_running',
  ],
  archetype_wr_route_technician: [
    'attribute_wr_route_running',
    'attribute_wr_release',
    'attribute_wr_hands',
  ],
  archetype_wr_possession_receiver: [
    'attribute_wr_hands',
    'attribute_wr_catch_in_traffic',
    'attribute_strength',
  ],
};

/** One archetype view for every position (WR archetypes live in the original creation catalog). */
export function archetypesFor(positionId: VNextPositionId): readonly ArchetypeView[] {
  if (positionId === 'position_wr')
    return creationContent.wrArchetypes.map((entry) => ({
      id: entry.id,
      nameKey: entry.nameKey,
      descriptionKey: entry.descriptionKey,
      priorityAttributeIds: WR_PRIORITY[entry.id] ?? [],
    }));
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

/** Mechanics per identity for presentation-only projections (content is static per build). */
const MECHANICS = new Map<string, ReturnType<typeof buildCareerVNextMechanics>>();
function mechanicsFor(profile: CreatedPositionPlayerProfile) {
  const cacheKey = `${profile.positionId}|${profile.archetypeId}`;
  if (!MECHANICS.has(cacheKey)) MECHANICS.set(cacheKey, buildCareerVNextMechanics(profile));
  return MECHANICS.get(cacheKey) ?? null;
}

/** The position-weighted overall the career core uses (see `overallVNext`). */
export function positionOverall(profile: CreatedPositionPlayerProfile): number {
  const mechanics = mechanicsFor(profile);
  return mechanics === null ? profile.overall : overallVNext(profile, mechanics);
}

export function currentOverall(career: CareerVNext): number {
  return positionOverall(career.athlete.profile);
}

export const ROUND_KEYS = {
  SEMIFINAL: 'v2.round.semifinal',
  FINAL: 'v2.round.final',
} as const satisfies Record<'SEMIFINAL' | 'FINAL', MessageKey>;

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

/** LB and EDGE share the front-seven result vocabulary, so they share its headlines. */
const DEFENDER_PLAY_KEYS: Readonly<Record<string, MessageKey>> = {
  NO_PLAY: 'v2.play.def.noPlay',
  STOP: 'v2.play.def.stop',
  LOSS: 'v2.play.def.loss',
  SACK: 'v2.play.def.sack',
  PRESSURE: 'v2.play.def.pressure',
  PASS_DEFENDED: 'v2.play.def.passDefended',
  INTERCEPTION: 'v2.play.def.interception',
  FORCED_FUMBLE: 'v2.play.def.forcedFumble',
  GAIN_ALLOWED: 'v2.play.def.gainAllowed',
  MISSED_TACKLE: 'v2.play.def.missedTackle',
};

const PLAY_KEYS: Readonly<Record<string, MessageKey>> = {
  'position_qb:COMPLETION': 'v2.play.qb.completion',
  'position_qb:INCOMPLETION': 'v2.play.qb.incompletion',
  'position_qb:INTERCEPTION': 'v2.play.qb.interception',
  'position_qb:SACK': 'v2.play.qb.sack',
  'position_qb:SCRAMBLE': 'v2.play.qb.scramble',
  'position_qb:THROW_AWAY': 'v2.play.qb.throwAway',
  'position_wr:NOT_TARGETED': 'v2.play.wr.notTargeted',
  'position_wr:INCOMPLETE': 'v2.play.wr.incomplete',
  'position_wr:DROP': 'v2.play.wr.drop',
  'position_wr:RECEPTION': 'v2.play.wr.reception',
  'position_wr:INTERCEPTION': 'v2.play.wr.interception',
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
  ...Object.fromEntries(
    (['position_lb', 'position_edge'] as const).flatMap((positionId) =>
      Object.entries(DEFENDER_PLAY_KEYS).map(([result, messageKey]) => [
        `${positionId}:${result}`,
        messageKey,
      ]),
    ),
  ),
};

export function playHeadlineKey(positionId: VNextPositionId, playResultId: string): MessageKey {
  const found = PLAY_KEYS[`${positionId}:${playResultId}`];
  if (found === undefined)
    throw new Error(`Missing play headline for ${positionId}:${playResultId}.`);
  return found;
}

interface EventText extends Named {
  readonly choices: readonly Named[];
}
const EVENT_TEXT = new Map<string, EventText>(
  [
    ...qbAlphaContent.events,
    ...rbAlphaContent.events,
    ...cbAlphaContent.events,
    ...lbContent.events.map((event) => ({ ...event, choices: [] })),
    ...edgeContent.events.map((event) => ({ ...event, choices: [] })),
    ...eventContent.events,
  ].map((event) => [event.id, event as EventText]),
);

export function eventText(id: string): {
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
} {
  const found = EVENT_TEXT.get(id);
  if (found === undefined) throw new Error(`Missing event presentation for ${id}.`);
  return { nameKey: key(found.nameKey), descriptionKey: key(found.descriptionKey) };
}

const camel = (value: string) =>
  value.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

/**
 * QB/RB/CB (and LB/EDGE) shipped choice names are generic ("Commit fully"), so VNext authors a label per event
 * choice; WR events already carry specific authored choice copy.
 */
export function eventChoiceKey(eventId: string, choiceId: string): MessageKey {
  const shared = /^event_((?:qb|rb|cb|lb|edge)_[a-z0-9_]+)$/.exec(eventId);
  if (shared !== null) return key(`v2.evt.${camel(shared[1]!)}.${choiceId.split('_').at(-1)!}`);
  const choice = EVENT_TEXT.get(eventId)?.choices.find(({ id }) => id === choiceId);
  if (choice === undefined) throw new Error(`Missing event choice presentation for ${choiceId}.`);
  return key(choice.nameKey);
}

export const EXPOSURE_KEYS = {
  position_qb: 'v2.evt.modExposure.qb',
  position_rb: 'v2.evt.modExposure.rb',
  position_wr: 'v2.evt.modExposure.wr',
  position_cb: 'v2.evt.modExposure.cb',
  position_lb: 'v2.evt.modExposure.lb',
  position_edge: 'v2.evt.modExposure.edge',
} as const satisfies Record<VNextPositionId, MessageKey>;

const INJURY_TEXT = new Map<string, Named>(
  [...injuryContent.outcomes, ...injuryContent.choices].map((entry) => [entry.id, entry]),
);

export function injuryText(id: string): {
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
} {
  const found = INJURY_TEXT.get(id);
  if (found === undefined) throw new Error(`Missing injury presentation for ${id}.`);
  return { nameKey: key(found.nameKey), descriptionKey: key(found.descriptionKey) };
}

export type RiskBand = 'low' | 'elevated' | 'high';
export const RISK_KEYS = {
  low: 'v2.risk.low',
  elevated: 'v2.risk.elevated',
  high: 'v2.risk.high',
} as const satisfies Record<RiskBand, MessageKey>;

/** Qualitative band over the exact core risk; thresholds are presentation-only labels. */
export function riskBand(riskPermille: number): RiskBand {
  return riskPermille < 60 ? 'low' : riskPermille < 150 ? 'elevated' : 'high';
}

export const GRADE_KEYS = {
  skill_grade_c: 'skills.grade.c',
  skill_grade_b: 'skills.grade.b',
  skill_grade_a: 'skills.grade.a',
  skill_grade_s: 'skills.grade.s',
} as const satisfies Record<string, MessageKey>;
export const FAMILY_KEYS = {
  skill_family_development: 'skills.family.development',
  skill_family_role_coach: 'skills.family.roleCoach',
  skill_family_game_day: 'skills.family.gameDay',
  skill_family_body: 'skills.family.body',
  skill_family_mindset: 'skills.family.mindset',
  skill_family_life: 'skills.family.life',
} as const satisfies Record<string, MessageKey>;

export interface CardView {
  readonly id: string;
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly gradeKey: MessageKey;
  readonly gradeLetter: string;
  readonly familyKey: MessageKey;
  /** The card's weekly build effect, when it has one VNext actually applies. */
  readonly weeklyKey: MessageKey | null;
}

// NIL and relationships are not in Career VNext yet, so their build lines would promise nothing.
const LIVE_BUILDS = new Set(['film', 'repetition', 'body', 'mindset', 'role']);
const WEEKLY_KEYS = new Map(
  positionSkillBuilds
    .filter(({ buildId }) => LIVE_BUILDS.has(buildId))
    .map(({ skillId, descriptionKey }) => [skillId as string, key(descriptionKey)]),
);
const CARD_TEXT = new Map<string, CardView>(
  [
    ...qbAlphaContent.skills,
    ...rbAlphaContent.skills,
    ...cbAlphaContent.skills,
    ...lbContent.skills,
    ...edgeContent.skills,
    ...wrSkills,
  ].map((card) => [
    card.id,
    {
      id: card.id,
      nameKey: key(card.nameKey),
      descriptionKey: key(card.descriptionKey),
      gradeKey: GRADE_KEYS[card.gradeId as keyof typeof GRADE_KEYS],
      gradeLetter: card.gradeId.slice(-1).toUpperCase(),
      familyKey: FAMILY_KEYS[card.familyId as keyof typeof FAMILY_KEYS],
      weeklyKey: WEEKLY_KEYS.get(card.id) ?? null,
    },
  ]),
);

export function cardView(id: string): CardView {
  const found = CARD_TEXT.get(id);
  if (found === undefined) throw new Error(`Missing card presentation for ${id}.`);
  return found;
}

export const STAT_KEYS: Readonly<Record<string, MessageKey>> = {
  completions: 'v2.stats.completions',
  passAttempts: 'v2.stats.attempts',
  passingYards: 'v2.stats.passYards',
  passingTouchdowns: 'v2.stats.passTd',
  interceptions: 'v2.stats.int',
  sacksTaken: 'v2.stats.sacked',
  rushAttempts: 'v2.stats.carries',
  rushingYards: 'v2.stats.rushYards',
  rushingTouchdowns: 'v2.stats.rushTd',
  fumbles: 'v2.stats.fumbles',
  carries: 'v2.stats.carries',
  receptions: 'v2.stats.receptions',
  receivingYards: 'v2.stats.recYards',
  receivingTouchdowns: 'v2.stats.recTd',
  protectionWins: 'v2.stats.protectionWins',
  targets: 'v2.stats.targeted',
  completionsAllowed: 'v2.stats.allowed',
  yardsAllowed: 'v2.stats.yardsAllowed',
  touchdownsAllowed: 'v2.stats.tdAllowed',
  passesDefended: 'v2.stats.pbu',
  tackles: 'v2.stats.tackles',
  tacklesForLoss: 'v2.stats.tfl',
  sacks: 'v2.stats.sacks',
  pressures: 'v2.stats.pressures',
  forcedFumbles: 'v2.stats.forcedFumbles',
  missedTackles: 'v2.stats.missedTackles',
  drops: 'v2.stats.drops',
  turnovers: 'v2.stats.turnovers',
};
