import { isStableDomainId } from '../player/ids.js';

export const GAME_RESULT_IDS = Object.freeze([
  'game_result_win',
  'game_result_loss',
  'game_result_tie',
] as const);

export const PERFORMANCE_GRADE_BAND_IDS = Object.freeze([
  'performance_grade_elite',
  'performance_grade_strong',
  'performance_grade_solid',
  'performance_grade_developing',
  'performance_grade_poor',
] as const);

export const GAME_POSSESSION_IDS = Object.freeze([
  'game_possession_player_team',
  'game_possession_opponent',
] as const);

export const GAME_INFORMATION_TIER_IDS = Object.freeze([
  'game_information_uncertain',
  'game_information_partial',
  'game_information_diagnostic',
] as const);

export const GAME_PARTICIPATION_FEEDBACK_IDS = Object.freeze([
  'game_participation_offensive_role',
  'game_participation_special_teams',
  'game_participation_package_reps',
  'game_participation_late_reps',
  'game_participation_sideline_learning',
  'game_participation_scout_preparation',
] as const);

export const GAME_PLAY_RESULT_IDS = Object.freeze([
  'game_play_result_not_targeted',
  'game_play_result_incomplete',
  'game_play_result_drop',
  'game_play_result_reception',
  'game_play_result_touchdown',
  'game_play_result_turnover',
] as const);

export const GAME_COMMAND_FAILURE_REASONS = Object.freeze([
  'game.invalid_career',
  'game.invalid_phase',
  'game.revision_exhausted',
  'game.rng_exhausted',
  'game.invalid_player_profile',
  'game.invalid_opponent_profile',
  'game.invalid_opponent',
  'game.invalid_tuning',
  'game.invalid_family_definitions',
  'game.invalid_pattern_definitions',
  'game.invalid_skill_definitions',
  'game.invalid_decision',
  'game.internal_invariant_failure',
] as const);

export const KEY_SNAP_DECISION_FAMILY_IDS = Object.freeze([
  'key_snap_family_release',
  'key_snap_family_route',
  'key_snap_family_catch',
  'key_snap_family_yac',
] as const);

export type GameId = `game_${string}`;
export type GameResultId = (typeof GAME_RESULT_IDS)[number];
export type PerformanceGradeBandId = (typeof PERFORMANCE_GRADE_BAND_IDS)[number];
export type GamePossessionId = (typeof GAME_POSSESSION_IDS)[number];
export type GameInformationTierId = (typeof GAME_INFORMATION_TIER_IDS)[number];
export type GameParticipationFeedbackId = (typeof GAME_PARTICIPATION_FEEDBACK_IDS)[number];
export type GameCommandFailureReason = (typeof GAME_COMMAND_FAILURE_REASONS)[number];
export type KeySnapDecisionFamilyId = (typeof KEY_SNAP_DECISION_FAMILY_IDS)[number];
export type KeySnapId = `key_snap_${string}`;
export type KeySnapPatternId = `key_snap_pattern_${string}`;
export type KeySnapDecisionId = `key_snap_decision_${string}`;
export type GameCoverageId = `game_coverage_${string}`;
export type GameLeverageId = `game_leverage_${string}`;
export type GameClueId = `game_clue_${string}`;
export type GamePlayResultId = (typeof GAME_PLAY_RESULT_IDS)[number];

function isMember<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === 'string' && values.some((candidate) => candidate === value);
}

function isPrefixedStableId(value: unknown, prefix: string): value is string {
  return isStableDomainId(value) && value.startsWith(prefix) && value.length > prefix.length;
}

export function isGameId(value: unknown): value is GameId {
  return isPrefixedStableId(value, 'game_');
}

export function isGameResultId(value: unknown): value is GameResultId {
  return isMember(value, GAME_RESULT_IDS);
}

export function isPerformanceGradeBandId(value: unknown): value is PerformanceGradeBandId {
  return isMember(value, PERFORMANCE_GRADE_BAND_IDS);
}

export function isGamePossessionId(value: unknown): value is GamePossessionId {
  return isMember(value, GAME_POSSESSION_IDS);
}

export function isGameInformationTierId(value: unknown): value is GameInformationTierId {
  return isMember(value, GAME_INFORMATION_TIER_IDS);
}

export function isGameParticipationFeedbackId(
  value: unknown,
): value is GameParticipationFeedbackId {
  return isMember(value, GAME_PARTICIPATION_FEEDBACK_IDS);
}

export function isKeySnapDecisionFamilyId(value: unknown): value is KeySnapDecisionFamilyId {
  return isMember(value, KEY_SNAP_DECISION_FAMILY_IDS);
}

export function isKeySnapId(value: unknown): value is KeySnapId {
  return isPrefixedStableId(value, 'key_snap_');
}

export function isKeySnapPatternId(value: unknown): value is KeySnapPatternId {
  return isPrefixedStableId(value, 'key_snap_pattern_');
}

export function isKeySnapDecisionId(value: unknown): value is KeySnapDecisionId {
  return isPrefixedStableId(value, 'key_snap_decision_');
}

export function isGameCoverageId(value: unknown): value is GameCoverageId {
  return isPrefixedStableId(value, 'game_coverage_');
}

export function isGameLeverageId(value: unknown): value is GameLeverageId {
  return isPrefixedStableId(value, 'game_leverage_');
}

export function isGameClueId(value: unknown): value is GameClueId {
  return isPrefixedStableId(value, 'game_clue_');
}

export function isGamePlayResultId(value: unknown): value is GamePlayResultId {
  return isMember(value, GAME_PLAY_RESULT_IDS);
}
