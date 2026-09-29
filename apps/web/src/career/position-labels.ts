import {
  positionAlphaContent,
  programContent,
  worldAlphaContent,
} from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';
import type { DepthRoleId, PositionStatId } from '@project-saturday/game-core';
import { ATTRIBUTE_LABEL_KEYS } from './career-ui';

export const POSITION_STATE_KEYS = {
  body: 'career.player.body',
  preparation: 'career.player.preparation',
  confidence: 'career.player.confidence',
  gpa: 'career.player.gpa',
  coachTrust: 'career.player.coachTrust',
} as const satisfies Record<string, MessageKey>;
export const POSITION_ATTRIBUTE_KEYS: Readonly<Partial<Record<string, MessageKey>>> = {
  ...ATTRIBUTE_LABEL_KEYS,
  ...Object.fromEntries(
    positionAlphaContent.attributes.map(({ id, nameKey }) => [id, nameKey as MessageKey]),
  ),
};
export const POSITION_ROLE_KEYS = {
  depth_role_starter: 'career.program.role.starter',
  depth_role_rotation: 'career.program.role.rotation',
  depth_role_reserve: 'career.program.role.reserve',
  depth_role_developmental: 'career.program.role.developmental',
} as const satisfies Record<DepthRoleId, MessageKey>;
export const POSITION_STAT_FIELD_KEYS: Readonly<Partial<Record<string, MessageKey>>> = {
  passAttempts: 'm7Ui.stats.passAttempts',
  completions: 'm7Ui.stats.completions',
  passingYards: 'm7Ui.stats.passingYards',
  passingTouchdowns: 'm7Ui.stats.passingTouchdowns',
  interceptions: 'm7Ui.stats.interceptions',
  sacksTaken: 'm7Ui.stats.sacksTaken',
  rushAttempts: 'm7Ui.stats.rushAttempts',
  rushingYards: 'm7Ui.stats.rushingYards',
  rushingTouchdowns: 'm7Ui.stats.rushingTouchdowns',
  fumbles: 'm7Ui.stats.fumbles',
  carries: 'm7Ui.stats.carries',
  receptions: 'm7Ui.stats.receptions',
  receivingYards: 'm7Ui.stats.receivingYards',
  receivingTouchdowns: 'm7Ui.stats.receivingTouchdowns',
  protectionAssignments: 'm7Ui.stats.protectionAssignments',
  protectionWins: 'm7Ui.stats.protectionWins',
  coverageSnaps: 'm7Ui.stats.coverageSnaps',
  targets: 'm7Ui.stats.targets',
  completionsAllowed: 'm7Ui.stats.completionsAllowed',
  yardsAllowed: 'm7Ui.stats.yardsAllowed',
  touchdownsAllowed: 'm7Ui.stats.touchdownsAllowed',
  passesDefended: 'm7Ui.stats.passesDefended',
  tackles: 'm7Ui.stats.tackles',
  missedTackles: 'm7Ui.stats.missedTackles',
};
const PROGRAMS = [...programContent.programs, ...worldAlphaContent.stagedPrograms];
export const POSITION_CAREER_STAT_KEYS: Readonly<Partial<Record<PositionStatId, MessageKey>>> = {
  stat_qb_pass_attempts: 'm7Ui.stats.passAttempts',
  stat_qb_completions: 'm7Ui.stats.completions',
  stat_qb_passing_yards: 'm7Ui.stats.passingYards',
  stat_qb_passing_touchdowns: 'm7Ui.stats.passingTouchdowns',
  stat_qb_interceptions: 'm7Ui.stats.interceptions',
  stat_qb_sacks_taken: 'm7Ui.stats.sacksTaken',
  stat_qb_rush_attempts: 'm7Ui.stats.rushAttempts',
  stat_qb_rushing_yards: 'm7Ui.stats.rushingYards',
  stat_qb_rushing_touchdowns: 'm7Ui.stats.rushingTouchdowns',
  stat_qb_fumbles: 'm7Ui.stats.fumbles',
  stat_rb_carries: 'm7Ui.stats.carries',
  stat_rb_rushing_yards: 'm7Ui.stats.rushingYards',
  stat_rb_rushing_touchdowns: 'm7Ui.stats.rushingTouchdowns',
  stat_rb_receptions: 'm7Ui.stats.receptions',
  stat_rb_receiving_yards: 'm7Ui.stats.receivingYards',
  stat_rb_receiving_touchdowns: 'm7Ui.stats.receivingTouchdowns',
  stat_rb_protection_assignments: 'm7Ui.stats.protectionAssignments',
  stat_rb_protection_wins: 'm7Ui.stats.protectionWins',
  stat_rb_fumbles: 'm7Ui.stats.fumbles',
  stat_cb_coverage_snaps: 'm7Ui.stats.coverageSnaps',
  stat_cb_targets: 'm7Ui.stats.targets',
  stat_cb_completions_allowed: 'm7Ui.stats.completionsAllowed',
  stat_cb_yards_allowed: 'm7Ui.stats.yardsAllowed',
  stat_cb_touchdowns_allowed: 'm7Ui.stats.touchdownsAllowed',
  stat_cb_passes_defended: 'm7Ui.stats.passesDefended',
  stat_cb_interceptions: 'm7Ui.stats.interceptions',
  stat_cb_tackles: 'm7Ui.stats.tackles',
  stat_cb_missed_tackles: 'm7Ui.stats.missedTackles',
};
export function positionProgramNameKey(id: string): MessageKey {
  return PROGRAMS.find((program) => program.id === id)!.nameKey as MessageKey;
}
