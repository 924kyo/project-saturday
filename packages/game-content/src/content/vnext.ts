import type {
  CareerVNextMechanics,
  PositionPlayerCreationIdentity,
  ProgramId,
  SkillMechanicsDefinition,
} from '@project-saturday/game-core';

import { keySnapFamilyMechanicsDefinitions, keySnapPatternMechanicsDefinitions } from './games.js';
import { eventMechanicsDefinitions } from './events.js';
import { buildShippedPositionAlphaSessionCommandMechanics } from './position-alpha-session.js';
import { skillMechanicsDefinitions } from './skills.js';
import { defenderCatalog, edgeContent, lbContent } from './defenders.js';
import { lifeEventMechanics } from './life-events.js';
import {
  addedPrograms96VNext,
  addedProgramsVNext,
  worldVNext96MechanicsDefinition,
  worldVNextMechanicsDefinition,
} from './world-vnext.js';

/**
 * The shipped WR card catalog on VNext's WR drills. Skill scopes may only name weekly actions, so a
 * scope that names an old WR drill becomes the equivalent focus-tag scope: route, release and
 * catch drills map to the three VNext WR drills' focus tags, and extra practice (the multi-skill
 * session) to every WR position drill. Card IDs, grades, weights, hooks and copy are unchanged.
 */
const WR_SCOPE_TAGS: Readonly<Record<string, string>> = {
  action_route_drills: 'action_focus_route_running',
  action_release_drills: 'action_focus_release',
  action_hands_catch_work: 'action_focus_catching',
  action_extra_practice: 'action_skill_position_training',
  action_film_study: 'action_focus_film_study',
  action_recovery: 'action_focus_body',
  action_speed_work: 'action_focus_speed',
  action_study_hall: 'action_focus_gpa',
  action_weight_room: 'action_focus_strength',
};
const OLD_WR_DRILLS = new Set([
  'action_route_drills',
  'action_release_drills',
  'action_hands_catch_work',
  'action_extra_practice',
]);

function remapWrScope<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(remapWrScope) as T;
  const record = value as Record<string, unknown>;
  const ids = record['actionIds'];
  if (
    record['type'] === 'action_ids' &&
    Array.isArray(ids) &&
    ids.some((id: string) => OLD_WR_DRILLS.has(id))
  )
    return {
      type: 'action_tags',
      actionTagIds: [...new Set(ids.map((id: string) => WR_SCOPE_TAGS[id]!))],
    } as T;
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, remapWrScope(entry)]),
  ) as T;
}

/** WR drills carry the training family and focus tags the WR cards are authored against. */
const WR_DRILL_TAGS = {
  action_wr_route_craft: [
    'action_family_training',
    'action_focus_route_running',
    'action_skill_training',
    'action_skill_position_training',
  ],
  action_wr_separation: [
    'action_family_training',
    'action_focus_release',
    'action_skill_training',
    'action_skill_position_training',
  ],
  action_wr_catch_point: [
    'action_family_training',
    'action_focus_catching',
    'action_skill_training',
    'action_skill_position_training',
  ],
} as const;

/**
 * Career VNext development pacing (balance harness, 2026-09-30). The shipped focus catalog grew an
 * athlete about one overall point per season and Recovery (+32 Body) pinned Body at 100. VNext
 * triples focus XP (the base XP bound was widened to 100 for this) and softens Recovery so Body is
 * a budget.
 */
export const VNEXT_DEVELOPMENT_TUNING = Object.freeze({
  focusXpMultiplier: 3,
  maximumBaseXp: 100,
  recoveryBodyDelta: 20,
});

function developed<T extends { readonly attributeXp: readonly { readonly baseXp: number }[] }>(
  definition: T,
): T {
  return {
    ...definition,
    attributeXp: definition.attributeXp.map((entry) => ({
      ...entry,
      baseXp: Math.min(
        VNEXT_DEVELOPMENT_TUNING.maximumBaseXp,
        entry.baseXp * VNEXT_DEVELOPMENT_TUNING.focusXpMultiplier,
      ),
    })),
  };
}

/** LB/EDGE game catalogs (M8), mechanics only. */
export const DEFENDER_CATALOGS = Object.freeze({
  position_lb: defenderCatalog(lbContent),
  position_edge: defenderCatalog(edgeContent),
});

export const wrVNextSkillDefinitions: readonly SkillMechanicsDefinition[] =
  skillMechanicsDefinitions.map((definition) => remapWrScope(definition));

/** VNext reuses the shipped catalogs; creation mechanics depend on the chosen identity. */
export function buildCareerVNextMechanics(
  identity: PositionPlayerCreationIdentity,
): CareerVNextMechanics | null {
  const positionId = identity.positionId;
  if (
    positionId !== 'position_qb' &&
    positionId !== 'position_rb' &&
    positionId !== 'position_wr' &&
    positionId !== 'position_cb' &&
    positionId !== 'position_lb' &&
    positionId !== 'position_edge'
  )
    return null;
  // The shared bundle is position-parameterized; WR adds its own key-snap catalogs below.
  const shared = buildShippedPositionAlphaSessionCommandMechanics({
    identity: identity as Parameters<
      typeof buildShippedPositionAlphaSessionCommandMechanics
    >[0]['identity'],
  });
  if (shared === null) return null;
  return {
    ...shared,
    trainingActions: shared.trainingActions.map(developed),
    commonFocuses: shared.commonFocuses.map((focus) =>
      developed(
        focus.id === 'action_recovery'
          ? { ...focus, bodyDelta: VNEXT_DEVELOPMENT_TUNING.recoveryBodyDelta }
          : focus,
      ),
    ),
    // WR builds use the shipped WR cards; QB/RB/CB keep their position build catalogs.
    ...(positionId === 'position_wr'
      ? {
          skillBuilds: {
            definitions: wrVNextSkillDefinitions,
            actionTags: { ...shared.skillBuilds.actionTags, ...WR_DRILL_TAGS },
          },
        }
      : {}),
    wr: {
      events: eventMechanicsDefinitions,
      families: keySnapFamilyMechanicsDefinitions,
      patterns: keySnapPatternMechanicsDefinitions,
    },
    defenders: DEFENDER_CATALOGS,
    life: { events: lifeEventMechanics },
    // These two deals are written for receivers (route clinic, glove workshop).
    nilOfferPositions: {
      nil_offer_youth_route_clinic: ['position_wr'],
      nil_offer_receiver_glove_workshop: ['position_wr'],
    },
    // M9: new seasons use the 96-program world. A season in progress finishes on the world it
    // started on: the M8 64-program world or the 32-program alpha world.
    world: worldVNext96MechanicsDefinition,
    world64: worldVNextMechanicsDefinition,
    legacyWorld: shared.world,
  };
}

export interface ProgramIdentityVNext {
  readonly id: ProgramId;
  readonly nameKey: string;
  readonly shortNameKey: string;
  readonly descriptionKey: string;
  /** Original fictional palette: primary field color and trim. */
  readonly primary: string;
  readonly secondary: string;
  /** Language-neutral letter mark rendered inside the generated crest. */
  readonly monogram: string;
  readonly crest: 'shield' | 'circle' | 'diamond' | 'pennant';
}

type Row = readonly [
  id: string,
  key: string,
  world: boolean,
  monogram: string,
  primary: string,
  secondary: string,
];

const rows: readonly Row[] = [
  ['program_ember_peak_polytechnic', 'emberPeakPolytechnic', false, 'EP', '#b3261e', '#f2b134'],
  ['program_capital_commonwealth', 'capitalCommonwealth', false, 'CC', '#1f3a93', '#d9dde8'],
  ['program_cascade_tech', 'cascadeTech', false, 'CT', '#0b6e6e', '#9fe3d8'],
  ['program_gulf_meridian', 'gulfMeridian', false, 'GM', '#e0662b', '#12355b'],
  ['program_high_desert_state', 'highDesertState', false, 'HD', '#c47a2c', '#3b2a1e'],
  ['program_ironwood', 'ironwood', false, 'IW', '#3d4a3d', '#c9b37e'],
  ['program_lakefront_union', 'lakefrontUnion', false, 'LU', '#2a6fdb', '#f4f1e8'],
  ['program_northstar_college', 'northstarCollege', false, 'NS', '#14213d', '#fca311'],
  ['program_prairie_forge', 'prairieForge', false, 'PF', '#7a1f2b', '#e8c872'],
  ['program_redwood_bay', 'redwoodBay', false, 'RB', '#8c2f1b', '#2f5d3a'],
  ['program_solis_coast', 'solisCoast', false, 'SC', '#f5a623', '#1b4965'],
  ['program_crown_sound', 'crownSound', false, 'CS', '#5b2a86', '#e7c873'],
  ['program_amber_coast', 'amberCoast', true, 'AC', '#d98a1f', '#1d2d44'],
  ['program_ashgrove_state', 'ashgroveState', true, 'AS', '#4f5d75', '#bfc0c0'],
  ['program_blue_ridge_institute', 'blueRidgeInstitute', true, 'BR', '#23579a', '#9ab7d3'],
  ['program_copperfield', 'copperfield', true, 'CF', '#b86b35', '#2b2d42'],
  ['program_delta_vale', 'deltaVale', true, 'DV', '#2d6a4f', '#d8f3dc'],
  ['program_eastern_pines', 'easternPines', true, 'EP', '#1b4332', '#e9c46a'],
  ['program_fairwind', 'fairwind', true, 'FW', '#3a86ff', '#ffbe0b'],
  ['program_frostline_state', 'frostlineState', true, 'FS', '#5fa8d3', '#1b263b'],
  ['program_granite_harbor', 'graniteHarbor', true, 'GH', '#495057', '#e63946'],
  ['program_juniper_plains', 'juniperPlains', true, 'JP', '#6a994e', '#f2e8cf'],
  ['program_kingsport_technical', 'kingsportTechnical', true, 'KT', '#9d0208', '#adb5bd'],
  ['program_lantern_city', 'lanternCity', true, 'LC', '#ffb703', '#023047'],
  ['program_marshland_a_and_m', 'marshlandAAndM', true, 'MA', '#606c38', '#fefae0'],
  ['program_oak_river', 'oakRiver', true, 'OR', '#774936', '#e6ccb2'],
  ['program_palisade', 'palisade', true, 'PS', '#6d597a', '#eaac8b'],
  ['program_quartz_hill', 'quartzHill', true, 'QH', '#8d99ae', '#ef233c'],
  ['program_rivergate', 'rivergate', true, 'RG', '#0077b6', '#caf0f8'],
  ['program_sagebrush_university', 'sagebrushUniversity', true, 'SU', '#8a9a5b', '#3d405b'],
  ['program_tidewater_polytechnic', 'tidewaterPolytechnic', true, 'TP', '#005f73', '#ee9b00'],
  ['program_western_orchard', 'westernOrchard', true, 'WO', '#bc4749', '#f2e8cf'],
];

const crests = ['shield', 'circle', 'diamond', 'pennant'] as const;

export const programIdentitiesVNext: readonly ProgramIdentityVNext[] = Object.freeze([
  ...rows.map(([id, key, world, monogram, primary, secondary], index) =>
    Object.freeze({
      id: id as ProgramId,
      nameKey: `${world ? 'm7World' : 'programWorld'}.programs.${key}.name`,
      shortNameKey: `${world ? 'm7World' : 'programWorld'}.programs.${key}.shortName`,
      descriptionKey: `${world ? 'm7World' : 'programWorld'}.programs.${key}.description`,
      primary,
      secondary,
      monogram,
      crest: crests[index % crests.length]!,
    }),
  ),
  ...[...addedProgramsVNext, ...addedPrograms96VNext].map((entry, index) =>
    Object.freeze({
      id: entry.id as ProgramId,
      nameKey: entry.nameKey,
      shortNameKey: entry.shortNameKey,
      descriptionKey: entry.descriptionKey,
      primary: entry.primary,
      secondary: entry.secondary,
      monogram: entry.monogram,
      crest: crests[(rows.length + index) % crests.length]!,
    }),
  ),
]);

export function programIdentityVNext(programId: ProgramId): ProgramIdentityVNext {
  const identity = programIdentitiesVNext.find(({ id }) => id === programId);
  if (identity === undefined) throw new Error(`Missing program identity for ${programId}.`);
  return identity;
}
