import type {
  CareerVNextMechanics,
  PositionPlayerCreationIdentity,
  ProgramId,
} from '@project-saturday/game-core';

import { keySnapFamilyMechanicsDefinitions, keySnapPatternMechanicsDefinitions } from './games.js';
import { eventMechanicsDefinitions } from './events.js';
import { buildShippedPositionAlphaSessionCommandMechanics } from './position-alpha-session.js';

/** VNext reuses the shipped catalogs; creation mechanics depend on the chosen identity. */
export function buildCareerVNextMechanics(
  identity: PositionPlayerCreationIdentity,
): CareerVNextMechanics | null {
  const positionId = identity.positionId;
  if (
    positionId !== 'position_qb' &&
    positionId !== 'position_rb' &&
    positionId !== 'position_wr' &&
    positionId !== 'position_cb'
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
    wr: {
      events: eventMechanicsDefinitions,
      families: keySnapFamilyMechanicsDefinitions,
      patterns: keySnapPatternMechanicsDefinitions,
    },
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

export const programIdentitiesVNext: readonly ProgramIdentityVNext[] = Object.freeze(
  rows.map(([id, key, world, monogram, primary, secondary], index) =>
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
);

export function programIdentityVNext(programId: ProgramId): ProgramIdentityVNext {
  const identity = programIdentitiesVNext.find(({ id }) => id === programId);
  if (identity === undefined) throw new Error(`Missing program identity for ${programId}.`);
  return identity;
}
