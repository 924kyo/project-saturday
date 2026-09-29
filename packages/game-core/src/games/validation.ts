import {
  isGameClueId,
  isGameCoverageId,
  isGameId,
  isGameInformationTierId,
  isGameLeverageId,
  isGameParticipationFeedbackId,
  isGamePlayResultId,
  isGamePossessionId,
  isGameResultId,
  isKeySnapDecisionFamilyId,
  isKeySnapDecisionId,
  isKeySnapId,
  isKeySnapPatternId,
  isPerformanceGradeBandId,
} from './ids.js';
import {
  MENTAL_ATTRIBUTE_IDS,
  PHYSICAL_ATTRIBUTE_IDS,
  PLAYER_ATTRIBUTE_IDS,
  isPlayerAttributeId,
  isProgramId,
  type PlayerAttributeId,
} from '../player/ids.js';
import { isDepthRoleId } from '../programs/ids.js';
import { isSkillGameHookId, isSkillId } from '../skills/ids.js';

type UnknownRecord = Record<string, unknown>;

export interface GameInvariantIssue {
  readonly code:
    | 'invariant.duplicate_value'
    | 'invariant.invalid_combination'
    | 'invariant.invalid_id'
    | 'invariant.invalid_type'
    | 'invariant.invalid_value'
    | 'invariant.missing_field'
    | 'invariant.noncanonical_order'
    | 'invariant.out_of_bounds'
    | 'invariant.unknown_field';
  readonly path: string;
}

function add(issues: GameInvariantIssue[], code: GameInvariantIssue['code'], path: string): void {
  issues.push({ code, path });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strictRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  if (!isRecord(value)) {
    add(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      add(issues, 'invariant.missing_field', `${path}.${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      add(issues, 'invariant.unknown_field', `${path}.${key}`);
    }
  }
  return value;
}

function denseArray(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    add(issues, 'invariant.invalid_type', path);
    return undefined;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      add(issues, 'invariant.invalid_type', `${path}.${index}`);
    }
  }
  return value;
}

function integer(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}

function validateStats(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const stats = strictRecord(
    value,
    path,
    ['targets', 'receptions', 'receivingYards', 'receivingTouchdowns', 'drops', 'turnovers'],
    issues,
  );
  if (stats === undefined) {
    return undefined;
  }
  for (const key of ['targets', 'receptions', 'receivingTouchdowns', 'drops', 'turnovers']) {
    if (!integer(stats[key], 0, 10_000)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (!integer(stats['receivingYards'], -10_000, 1_000_000)) {
    add(issues, 'invariant.out_of_bounds', `${path}.receivingYards`);
  }
  if (
    integer(stats['targets'], 0, 10_000) &&
    integer(stats['receptions'], 0, 10_000) &&
    (stats['receptions'] as number) > (stats['targets'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.receptions`);
  }
  return stats;
}

function validateScore(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const score = strictRecord(value, path, ['playerTeam', 'opponent'], issues);
  if (score !== undefined) {
    for (const key of ['playerTeam', 'opponent']) {
      if (!integer(score[key], 0, 200)) {
        add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
      }
    }
  }
  return score;
}

function validateProjection(value: unknown, path: string, issues: GameInvariantIssue[]): void {
  const projection = strictRecord(
    value,
    path,
    ['rank', 'roleId', 'minSnapPermille', 'maxSnapPermille'],
    issues,
  );
  if (projection === undefined) {
    return;
  }
  if (!integer(projection['rank'], 1, 8)) {
    add(issues, 'invariant.out_of_bounds', `${path}.rank`);
  }
  if (!isDepthRoleId(projection['roleId'])) {
    add(issues, 'invariant.invalid_id', `${path}.roleId`);
  }
  if (!integer(projection['minSnapPermille'], 0, 1_000)) {
    add(issues, 'invariant.out_of_bounds', `${path}.minSnapPermille`);
  }
  if (!integer(projection['maxSnapPermille'], 0, 1_000)) {
    add(issues, 'invariant.out_of_bounds', `${path}.maxSnapPermille`);
  }
  if (
    typeof projection['minSnapPermille'] === 'number' &&
    typeof projection['maxSnapPermille'] === 'number' &&
    projection['minSnapPermille'] > projection['maxSnapPermille']
  ) {
    add(issues, 'invariant.invalid_combination', path);
  }
}

const MATCHUP_KEYS = [
  'gameId',
  'weekIndex',
  'playerProgramId',
  'opponentProgramId',
  'isHome',
  'playerOffenseRating',
  'playerDefenseRating',
  'playerQbRating',
  'opponentOffenseRating',
  'opponentDefenseRating',
  'pregameProjection',
  'opportunityBudget',
  'opportunityGameHooks',
  'completedWeek',
] as const;

function validateOffFieldGameContext(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const context = strictRecord(
    value,
    path,
    [
      'model',
      'relationshipEffects',
      'injuryMaximumOpportunities',
      'academicRestrictionGamesBefore',
      'academicRestrictionGamesAfter',
      'maximumOpportunities',
    ],
    issues,
  );
  if (context === undefined) return undefined;
  if (context['model'] !== 'off_field_game_context_v1') {
    add(issues, 'invariant.invalid_value', `${path}.model`);
  }
  const effects = strictRecord(
    context['relationshipEffects'],
    `${path}.relationshipEffects`,
    ['coachTrustModifier', 'informationScoreModifier', 'opportunitySnapBonusPermille'],
    issues,
  );
  if (effects !== undefined) {
    if (!integer(effects['coachTrustModifier'], -10, 10)) {
      add(issues, 'invariant.out_of_bounds', `${path}.relationshipEffects.coachTrustModifier`);
    }
    if (!integer(effects['informationScoreModifier'], -12, 12)) {
      add(
        issues,
        'invariant.out_of_bounds',
        `${path}.relationshipEffects.informationScoreModifier`,
      );
    }
    if (!integer(effects['opportunitySnapBonusPermille'], -100, 100)) {
      add(
        issues,
        'invariant.out_of_bounds',
        `${path}.relationshipEffects.opportunitySnapBonusPermille`,
      );
    }
  }
  for (const key of ['injuryMaximumOpportunities', 'maximumOpportunities'] as const) {
    if (!integer(context[key], 0, 12)) add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
  }
  for (const key of ['academicRestrictionGamesBefore', 'academicRestrictionGamesAfter'] as const) {
    if (!integer(context[key], 0, 3)) add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
  }
  if (
    typeof context['academicRestrictionGamesBefore'] === 'number' &&
    typeof context['academicRestrictionGamesAfter'] === 'number' &&
    context['academicRestrictionGamesAfter'] !==
      Math.max(0, context['academicRestrictionGamesBefore'] - 1)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.academicRestrictionGamesAfter`);
  }
  if (
    typeof context['academicRestrictionGamesBefore'] === 'number' &&
    typeof context['injuryMaximumOpportunities'] === 'number' &&
    context['maximumOpportunities'] !==
      (context['academicRestrictionGamesBefore'] > 0 ? 0 : context['injuryMaximumOpportunities'])
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.maximumOpportunities`);
  }
  return context;
}

function validateMatchup(
  value: unknown,
  path: string,
  careerWeekIndex: unknown,
  careerProgramId: unknown,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const hasOffFieldContext = isRecord(value) && 'offFieldContext' in value;
  const matchup = strictRecord(
    value,
    path,
    hasOffFieldContext ? [...MATCHUP_KEYS, 'offFieldContext'] : MATCHUP_KEYS,
    issues,
  );
  if (matchup === undefined) {
    return undefined;
  }
  if (!isGameId(matchup['gameId'])) {
    add(issues, 'invariant.invalid_id', `${path}.gameId`);
  }
  if (!integer(matchup['weekIndex'], 0, Number.MAX_SAFE_INTEGER)) {
    add(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  } else if (matchup['weekIndex'] !== careerWeekIndex) {
    add(issues, 'invariant.invalid_combination', `${path}.weekIndex`);
  }
  if (!isProgramId(matchup['playerProgramId'])) {
    add(issues, 'invariant.invalid_id', `${path}.playerProgramId`);
  } else if (matchup['playerProgramId'] !== careerProgramId) {
    add(issues, 'invariant.invalid_combination', `${path}.playerProgramId`);
  }
  if (!isProgramId(matchup['opponentProgramId'])) {
    add(issues, 'invariant.invalid_id', `${path}.opponentProgramId`);
  }
  if (matchup['opponentProgramId'] === matchup['playerProgramId']) {
    add(issues, 'invariant.invalid_combination', `${path}.opponentProgramId`);
  }
  if (typeof matchup['isHome'] !== 'boolean') {
    add(issues, 'invariant.invalid_type', `${path}.isHome`);
  }
  for (const key of [
    'playerOffenseRating',
    'playerDefenseRating',
    'playerQbRating',
    'opponentOffenseRating',
    'opponentDefenseRating',
  ]) {
    if (!integer(matchup[key], 0, 100)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (!integer(matchup['opportunityBudget'], 0, 12)) {
    add(issues, 'invariant.out_of_bounds', `${path}.opportunityBudget`);
  }
  if (hasOffFieldContext) {
    const context = validateOffFieldGameContext(
      matchup['offFieldContext'],
      `${path}.offFieldContext`,
      issues,
    );
    if (
      context !== undefined &&
      typeof matchup['opportunityBudget'] === 'number' &&
      typeof context['maximumOpportunities'] === 'number' &&
      matchup['opportunityBudget'] > context['maximumOpportunities']
    ) {
      add(issues, 'invariant.invalid_combination', `${path}.opportunityBudget`);
    }
  }
  validateAppliedHooks(matchup['opportunityGameHooks'], `${path}.opportunityGameHooks`, issues);
  if (Array.isArray(matchup['opportunityGameHooks'])) {
    matchup['opportunityGameHooks'].forEach((hook, index) => {
      if (isRecord(hook) && hook['hookId'] !== 'game_hook_package_snap_bonus') {
        add(
          issues,
          'invariant.invalid_combination',
          `${path}.opportunityGameHooks.${index}.hookId`,
        );
      }
    });
  }
  validateCompletedWeekEvidence(matchup['completedWeek'], `${path}.completedWeek`, issues);
  validateProjection(matchup['pregameProjection'], `${path}.pregameProjection`, issues);
  return matchup;
}

function validateCompletedWeekEvidence(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const evidence = strictRecord(value, path, ['version', 'results', 'depthUpdate'], issues);
  if (evidence === undefined) {
    return undefined;
  }
  if (evidence['version'] !== 1 && evidence['version'] !== 2) {
    add(issues, 'invariant.invalid_value', `${path}.version`);
  }
  const results = denseArray(evidence['results'], `${path}.results`, issues);
  if (results !== undefined && results.length !== 3) {
    add(issues, 'invariant.invalid_combination', `${path}.results`);
  }
  if (evidence['depthUpdate'] !== null && !isRecord(evidence['depthUpdate'])) {
    add(issues, 'invariant.invalid_type', `${path}.depthUpdate`);
  }
  return evidence;
}

function validateSummary(
  value: unknown,
  path: string,
  careerProgramId: unknown,
  maxRngDrawCount: number,
  issues: GameInvariantIssue[],
  allowedHistoricalProgramIds?: readonly unknown[],
): UnknownRecord | undefined {
  const summary = strictRecord(
    value,
    path,
    [
      'gameId',
      'weekIndex',
      'playerProgramId',
      'opponentProgramId',
      'isHome',
      'score',
      'resultId',
      'statLine',
      'keySnapCount',
      'performanceGradeScore',
      'performanceGradeBandId',
      'participationFeedbackId',
      'gameRngDrawCountBefore',
      'gameRngDrawCountAfter',
    ],
    issues,
  );
  if (summary === undefined) {
    return undefined;
  }
  if (!isGameId(summary['gameId'])) {
    add(issues, 'invariant.invalid_id', `${path}.gameId`);
  }
  if (!integer(summary['weekIndex'], 0, Number.MAX_SAFE_INTEGER)) {
    add(issues, 'invariant.out_of_bounds', `${path}.weekIndex`);
  }
  if (!isProgramId(summary['playerProgramId'])) {
    add(issues, 'invariant.invalid_id', `${path}.playerProgramId`);
  } else if (
    allowedHistoricalProgramIds === undefined
      ? summary['playerProgramId'] !== careerProgramId
      : !allowedHistoricalProgramIds.includes(summary['playerProgramId'])
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.playerProgramId`);
  }
  if (!isProgramId(summary['opponentProgramId'])) {
    add(issues, 'invariant.invalid_id', `${path}.opponentProgramId`);
  }
  if (summary['opponentProgramId'] === summary['playerProgramId']) {
    add(issues, 'invariant.invalid_combination', `${path}.opponentProgramId`);
  }
  if (typeof summary['isHome'] !== 'boolean') {
    add(issues, 'invariant.invalid_type', `${path}.isHome`);
  }
  const score = validateScore(summary['score'], `${path}.score`, issues);
  if (!isGameResultId(summary['resultId'])) {
    add(issues, 'invariant.invalid_id', `${path}.resultId`);
  } else if (score !== undefined) {
    const playerTeam = score['playerTeam'];
    const opponent = score['opponent'];
    const expected =
      typeof playerTeam === 'number' && typeof opponent === 'number'
        ? playerTeam > opponent
          ? 'game_result_win'
          : playerTeam < opponent
            ? 'game_result_loss'
            : 'game_result_tie'
        : undefined;
    if (expected !== undefined && summary['resultId'] !== expected) {
      add(issues, 'invariant.invalid_combination', `${path}.resultId`);
    }
  }
  const stats = validateStats(summary['statLine'], `${path}.statLine`, issues);
  if (!integer(summary['keySnapCount'], 0, 12)) {
    add(issues, 'invariant.out_of_bounds', `${path}.keySnapCount`);
  } else if (
    stats !== undefined &&
    integer(stats['targets'], 0, 10_000) &&
    (stats['targets'] as number) > (summary['keySnapCount'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.keySnapCount`);
  }
  if (!integer(summary['performanceGradeScore'], 0, 100)) {
    add(issues, 'invariant.out_of_bounds', `${path}.performanceGradeScore`);
  }
  if (!isPerformanceGradeBandId(summary['performanceGradeBandId'])) {
    add(issues, 'invariant.invalid_id', `${path}.performanceGradeBandId`);
  }
  if (!isGameParticipationFeedbackId(summary['participationFeedbackId'])) {
    add(issues, 'invariant.invalid_id', `${path}.participationFeedbackId`);
  }
  if (!integer(summary['gameRngDrawCountBefore'], 0, maxRngDrawCount)) {
    add(issues, 'invariant.out_of_bounds', `${path}.gameRngDrawCountBefore`);
  }
  if (!integer(summary['gameRngDrawCountAfter'], 0, maxRngDrawCount)) {
    add(issues, 'invariant.out_of_bounds', `${path}.gameRngDrawCountAfter`);
  }
  if (
    typeof summary['gameRngDrawCountBefore'] === 'number' &&
    typeof summary['gameRngDrawCountAfter'] === 'number' &&
    summary['gameRngDrawCountBefore'] > summary['gameRngDrawCountAfter']
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.gameRngDrawCountAfter`);
  }
  return summary;
}

export function isCompletedGameSummary(
  value: unknown,
  careerProgramId: unknown,
  maxRngDrawCount: number,
): boolean {
  const issues: GameInvariantIssue[] = [];
  validateSummary(value, 'summary', careerProgramId, maxRngDrawCount, issues);
  return issues.length === 0;
}

export function isWrGameStatLine(value: unknown): boolean {
  const issues: GameInvariantIssue[] = [];
  validateStats(value, 'statLine', issues);
  return issues.length === 0;
}

function validateGameCareerState(
  value: unknown,
  careerProgramId: unknown,
  maxRngDrawCount: number,
  issues: GameInvariantIssue[],
  allowedHistoricalProgramIds?: readonly unknown[],
): UnknownRecord | undefined {
  const state = strictRecord(
    value,
    'career.gameCareerState',
    [
      'gamesPlayed',
      'wins',
      'losses',
      'ties',
      'cumulativeStats',
      'cumulativeGradeScore',
      'lastGame',
    ],
    issues,
  );
  if (state === undefined) {
    return undefined;
  }
  for (const key of ['gamesPlayed', 'wins', 'losses', 'ties']) {
    if (!integer(state[key], 0, 10_000)) {
      add(issues, 'invariant.out_of_bounds', `career.gameCareerState.${key}`);
    }
  }
  if (
    integer(state['gamesPlayed'], 0, 10_000) &&
    integer(state['wins'], 0, 10_000) &&
    integer(state['losses'], 0, 10_000) &&
    integer(state['ties'], 0, 10_000) &&
    state['gamesPlayed'] !==
      (state['wins'] as number) + (state['losses'] as number) + (state['ties'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', 'career.gameCareerState.gamesPlayed');
  }
  validateStats(state['cumulativeStats'], 'career.gameCareerState.cumulativeStats', issues);
  if (!integer(state['cumulativeGradeScore'], 0, 1_000_000)) {
    add(issues, 'invariant.out_of_bounds', 'career.gameCareerState.cumulativeGradeScore');
  }
  if (state['lastGame'] === null) {
    if (state['gamesPlayed'] !== 0) {
      add(issues, 'invariant.invalid_combination', 'career.gameCareerState.lastGame');
    }
  } else {
    validateSummary(
      state['lastGame'],
      'career.gameCareerState.lastGame',
      careerProgramId,
      maxRngDrawCount,
      issues,
      allowedHistoricalProgramIds,
    );
    if (state['gamesPlayed'] === 0) {
      add(issues, 'invariant.invalid_combination', 'career.gameCareerState.lastGame');
    }
  }
  return state;
}

function validateAppliedHooks(value: unknown, path: string, issues: GameInvariantIssue[]): void {
  const hooks = denseArray(value, path, issues);
  if (hooks === undefined) {
    return;
  }
  let previousSlotIndex = -1;
  let previousEffectIndex = -1;
  const seen = new Set<string>();
  for (const [index, rawHook] of hooks.entries()) {
    const hookPath = `${path}.${index}`;
    const hook = strictRecord(
      rawHook,
      hookPath,
      ['skillId', 'slotIndex', 'effectIndex', 'hookId', 'valueMilli', 'appliedValue'],
      issues,
    );
    if (hook === undefined) {
      continue;
    }
    if (!isSkillId(hook['skillId'])) {
      add(issues, 'invariant.invalid_id', `${hookPath}.skillId`);
    }
    if (!integer(hook['slotIndex'], 0, 3)) {
      add(issues, 'invariant.out_of_bounds', `${hookPath}.slotIndex`);
    }
    if (!integer(hook['effectIndex'], 0, 100)) {
      add(issues, 'invariant.out_of_bounds', `${hookPath}.effectIndex`);
    }
    if (!isSkillGameHookId(hook['hookId'])) {
      add(issues, 'invariant.invalid_id', `${hookPath}.hookId`);
    }
    if (!integer(hook['valueMilli'], -10_000, 10_000)) {
      add(issues, 'invariant.out_of_bounds', `${hookPath}.valueMilli`);
    }
    if (!integer(hook['appliedValue'], -1_000_000, 1_000_000)) {
      add(issues, 'invariant.out_of_bounds', `${hookPath}.appliedValue`);
    }
    if (integer(hook['slotIndex'], 0, 3) && integer(hook['effectIndex'], 0, 100)) {
      const slotIndex = hook['slotIndex'] as number;
      const effectIndex = hook['effectIndex'] as number;
      if (
        slotIndex < previousSlotIndex ||
        (slotIndex === previousSlotIndex && effectIndex <= previousEffectIndex)
      ) {
        add(issues, 'invariant.noncanonical_order', hookPath);
      }
      previousSlotIndex = slotIndex;
      previousEffectIndex = effectIndex;
      const identity = `${slotIndex}:${effectIndex}`;
      if (seen.has(identity)) add(issues, 'invariant.duplicate_value', hookPath);
      seen.add(identity);
    }
  }
}

function validateResolution(value: unknown, path: string, issues: GameInvariantIssue[]): void {
  const resolution = strictRecord(
    value,
    path,
    [
      'attributeScore',
      'attributeContributionMilli',
      'matchupScore',
      'matchupContributionMilli',
      'decisionFitScore',
      'decisionFitContributionMilli',
      'teamContextScore',
      'teamContextContributionMilli',
      'bodyScore',
      'bodyContributionMilli',
      'preparationScore',
      'preparationContributionMilli',
      'confidenceScore',
      'confidenceContributionMilli',
      'weightedScoreMilli',
      'skillAdjustment',
      'rngRoll',
      'finalScore',
      'targetChancePermille',
      'catchChancePermille',
      'dropRiskPermille',
      'turnoverRiskPermille',
      'touchdownChancePermille',
      'receivingYardsBeforeHooks',
      'receivingYardsAfterHooks',
    ],
    issues,
  );
  if (resolution === undefined) return;
  for (const key of [
    'attributeScore',
    'matchupScore',
    'decisionFitScore',
    'teamContextScore',
    'bodyScore',
    'preparationScore',
    'confidenceScore',
    'finalScore',
    'receivingYardsBeforeHooks',
    'receivingYardsAfterHooks',
  ]) {
    if (!integer(resolution[key], 0, 100)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  for (const key of [
    'attributeContributionMilli',
    'matchupContributionMilli',
    'decisionFitContributionMilli',
    'teamContextContributionMilli',
    'bodyContributionMilli',
    'preparationContributionMilli',
    'confidenceContributionMilli',
    'weightedScoreMilli',
  ]) {
    if (!integer(resolution[key], 0, 100_000)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  for (const key of [
    'targetChancePermille',
    'catchChancePermille',
    'dropRiskPermille',
    'turnoverRiskPermille',
    'touchdownChancePermille',
  ]) {
    if (!integer(resolution[key], 0, 1_000)) {
      add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
    }
  }
  if (!integer(resolution['skillAdjustment'], -1_000, 1_000)) {
    add(issues, 'invariant.out_of_bounds', `${path}.skillAdjustment`);
  }
  if (!integer(resolution['rngRoll'], -100, 100)) {
    add(issues, 'invariant.out_of_bounds', `${path}.rngRoll`);
  }
  const contributionKeys = [
    'attributeContributionMilli',
    'matchupContributionMilli',
    'decisionFitContributionMilli',
    'teamContextContributionMilli',
    'bodyContributionMilli',
    'preparationContributionMilli',
    'confidenceContributionMilli',
  ] as const;
  if (
    contributionKeys.every((key) => typeof resolution[key] === 'number') &&
    resolution['weightedScoreMilli'] !==
      contributionKeys.reduce((total, key) => total + (resolution[key] as number), 0)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.weightedScoreMilli`);
  }
}

function validateKeyPlay(
  value: unknown,
  path: string,
  maxRngDrawCount: number,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const play = strictRecord(
    value,
    path,
    [
      'keySnapId',
      'patternId',
      'familyId',
      'decisionId',
      'decisionFit',
      'resolution',
      'resultId',
      'targetDelta',
      'receptionDelta',
      'receivingYardsDelta',
      'receivingTouchdownDelta',
      'dropDelta',
      'turnoverDelta',
      'scoreBefore',
      'scoreAfter',
      'rngDrawCountBefore',
      'rngDrawCountAfter',
      'appliedGameHooks',
    ],
    issues,
  );
  if (play === undefined) {
    return undefined;
  }
  if (!isKeySnapId(play['keySnapId'])) add(issues, 'invariant.invalid_id', `${path}.keySnapId`);
  if (!isKeySnapPatternId(play['patternId']))
    add(issues, 'invariant.invalid_id', `${path}.patternId`);
  if (!isKeySnapDecisionFamilyId(play['familyId']))
    add(issues, 'invariant.invalid_id', `${path}.familyId`);
  if (!isKeySnapDecisionId(play['decisionId']))
    add(issues, 'invariant.invalid_id', `${path}.decisionId`);
  if (!integer(play['decisionFit'], -100, 100))
    add(issues, 'invariant.out_of_bounds', `${path}.decisionFit`);
  validateResolution(play['resolution'], `${path}.resolution`, issues);
  if (!isGamePlayResultId(play['resultId']))
    add(issues, 'invariant.invalid_id', `${path}.resultId`);
  for (const key of [
    'targetDelta',
    'receptionDelta',
    'receivingTouchdownDelta',
    'dropDelta',
    'turnoverDelta',
  ]) {
    if (!integer(play[key], 0, 1)) add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
  }
  if (!integer(play['receivingYardsDelta'], -99, 100))
    add(issues, 'invariant.out_of_bounds', `${path}.receivingYardsDelta`);
  const scoreBefore = validateScore(play['scoreBefore'], `${path}.scoreBefore`, issues);
  const scoreAfter = validateScore(play['scoreAfter'], `${path}.scoreAfter`, issues);
  if (!integer(play['rngDrawCountBefore'], 0, maxRngDrawCount))
    add(issues, 'invariant.out_of_bounds', `${path}.rngDrawCountBefore`);
  if (!integer(play['rngDrawCountAfter'], 0, maxRngDrawCount))
    add(issues, 'invariant.out_of_bounds', `${path}.rngDrawCountAfter`);
  if (
    typeof play['rngDrawCountBefore'] === 'number' &&
    typeof play['rngDrawCountAfter'] === 'number' &&
    play['rngDrawCountBefore'] > play['rngDrawCountAfter']
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.rngDrawCountAfter`);
  }
  if (
    typeof play['rngDrawCountBefore'] === 'number' &&
    typeof play['rngDrawCountAfter'] === 'number' &&
    play['rngDrawCountAfter'] - play['rngDrawCountBefore'] !== 6
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.rngDrawCountAfter`);
  }
  validateAppliedHooks(play['appliedGameHooks'], `${path}.appliedGameHooks`, issues);
  if (Array.isArray(play['appliedGameHooks'])) {
    play['appliedGameHooks'].forEach((hook, index) => {
      if (
        isRecord(hook) &&
        (hook['hookId'] === 'game_hook_coverage_clue_bonus' ||
          hook['hookId'] === 'game_hook_package_snap_bonus')
      ) {
        add(issues, 'invariant.invalid_combination', `${path}.appliedGameHooks.${index}.hookId`);
      }
    });
  }
  const targetDelta = play['targetDelta'];
  const receptionDelta = play['receptionDelta'];
  const receivingYardsDelta = play['receivingYardsDelta'];
  const receivingTouchdownDelta = play['receivingTouchdownDelta'];
  const dropDelta = play['dropDelta'];
  const turnoverDelta = play['turnoverDelta'];
  if (
    integer(targetDelta, 0, 1) &&
    integer(receptionDelta, 0, 1) &&
    integer(receivingYardsDelta, -99, 100) &&
    integer(receivingTouchdownDelta, 0, 1) &&
    integer(dropDelta, 0, 1) &&
    integer(turnoverDelta, 0, 1)
  ) {
    if (
      receptionDelta > targetDelta ||
      receivingTouchdownDelta > receptionDelta ||
      (receptionDelta === 0 && receivingYardsDelta !== 0) ||
      dropDelta + turnoverDelta > 1 ||
      (dropDelta === 1 && (targetDelta !== 1 || receptionDelta !== 0))
    ) {
      add(issues, 'invariant.invalid_combination', path);
    }
    const expectedResultId =
      targetDelta === 0
        ? 'game_play_result_not_targeted'
        : turnoverDelta === 1
          ? 'game_play_result_turnover'
          : dropDelta === 1
            ? 'game_play_result_drop'
            : receptionDelta === 0
              ? 'game_play_result_incomplete'
              : receivingTouchdownDelta === 1
                ? 'game_play_result_touchdown'
                : 'game_play_result_reception';
    if (play['resultId'] !== expectedResultId) {
      add(issues, 'invariant.invalid_combination', `${path}.resultId`);
    }
    if (
      scoreBefore !== undefined &&
      scoreAfter !== undefined &&
      integer(scoreBefore['playerTeam'], 0, 200) &&
      integer(scoreBefore['opponent'], 0, 200) &&
      integer(scoreAfter['playerTeam'], 0, 200) &&
      integer(scoreAfter['opponent'], 0, 200) &&
      (scoreAfter['opponent'] !== scoreBefore['opponent'] ||
        scoreAfter['playerTeam'] !==
          (scoreBefore['playerTeam'] as number) + receivingTouchdownDelta * 7)
    ) {
      add(issues, 'invariant.invalid_combination', `${path}.scoreAfter`);
    }
  }
  return play;
}

function sumKeyPlayStats(log: readonly unknown[]): Readonly<Record<string, number>> {
  const stats: Record<string, number> = {
    targets: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    drops: 0,
    turnovers: 0,
  };
  for (const rawPlay of log) {
    if (!isRecord(rawPlay)) continue;
    for (const [statKey, playKey] of [
      ['targets', 'targetDelta'],
      ['receptions', 'receptionDelta'],
      ['receivingYards', 'receivingYardsDelta'],
      ['receivingTouchdowns', 'receivingTouchdownDelta'],
      ['drops', 'dropDelta'],
      ['turnovers', 'turnoverDelta'],
    ] as const) {
      const delta = rawPlay[playKey];
      if (typeof delta === 'number') stats[statKey] = (stats[statKey] ?? 0) + delta;
    }
  }
  return stats;
}

function validateActiveGame(
  value: unknown,
  path: string,
  weekIndex: unknown,
  programId: unknown,
  maxRngDrawCount: number,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const game = strictRecord(
    value,
    path,
    [
      'matchup',
      'clock',
      'situation',
      'score',
      'opportunitiesPresented',
      'statLine',
      'keyPlayLog',
      'gameRngDrawCountBefore',
    ],
    issues,
  );
  if (game === undefined) return undefined;
  const matchup = validateMatchup(game['matchup'], `${path}.matchup`, weekIndex, programId, issues);
  const clock = strictRecord(
    game['clock'],
    `${path}.clock`,
    ['period', 'clockSecondsRemaining'],
    issues,
  );
  if (clock !== undefined) {
    if (!integer(clock['period'], 1, 4))
      add(issues, 'invariant.out_of_bounds', `${path}.clock.period`);
    if (!integer(clock['clockSecondsRemaining'], 0, 900))
      add(issues, 'invariant.out_of_bounds', `${path}.clock.clockSecondsRemaining`);
  }
  const situation = strictRecord(
    game['situation'],
    `${path}.situation`,
    ['possessionId', 'driveIndex', 'down', 'distanceYards', 'yardLine'],
    issues,
  );
  if (situation !== undefined) {
    if (!isGamePossessionId(situation['possessionId']))
      add(issues, 'invariant.invalid_id', `${path}.situation.possessionId`);
    if (!integer(situation['driveIndex'], 0, 100))
      add(issues, 'invariant.out_of_bounds', `${path}.situation.driveIndex`);
    if (!integer(situation['down'], 1, 4))
      add(issues, 'invariant.out_of_bounds', `${path}.situation.down`);
    if (!integer(situation['distanceYards'], 1, 99))
      add(issues, 'invariant.out_of_bounds', `${path}.situation.distanceYards`);
    if (!integer(situation['yardLine'], 0, 100))
      add(issues, 'invariant.out_of_bounds', `${path}.situation.yardLine`);
  }
  validateScore(game['score'], `${path}.score`, issues);
  if (!integer(game['opportunitiesPresented'], 0, 12))
    add(issues, 'invariant.out_of_bounds', `${path}.opportunitiesPresented`);
  else if (
    matchup !== undefined &&
    integer(matchup['opportunityBudget'], 0, 12) &&
    (game['opportunitiesPresented'] as number) > (matchup['opportunityBudget'] as number)
  ) {
    add(issues, 'invariant.invalid_combination', `${path}.opportunitiesPresented`);
  }
  const statLine = validateStats(game['statLine'], `${path}.statLine`, issues);
  const log = denseArray(game['keyPlayLog'], `${path}.keyPlayLog`, issues);
  if (log !== undefined) {
    if (log.length > 12) add(issues, 'invariant.out_of_bounds', `${path}.keyPlayLog`);
    log.forEach((play, index) =>
      validateKeyPlay(play, `${path}.keyPlayLog.${index}`, maxRngDrawCount, issues),
    );
    if (game['opportunitiesPresented'] !== log.length + 1) {
      add(issues, 'invariant.invalid_combination', `${path}.opportunitiesPresented`);
    }
    if (statLine !== undefined) {
      const expectedStats = sumKeyPlayStats(log);
      for (const [key, expected] of Object.entries(expectedStats)) {
        if (statLine[key] !== expected) {
          add(issues, 'invariant.invalid_combination', `${path}.statLine.${key}`);
        }
      }
    }
  }
  if (!integer(game['gameRngDrawCountBefore'], 0, maxRngDrawCount))
    add(issues, 'invariant.out_of_bounds', `${path}.gameRngDrawCountBefore`);
  return game;
}

function validatePendingSnap(
  value: unknown,
  path: string,
  maxRngDrawCount: number,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const snap = strictRecord(
    value,
    path,
    [
      'keySnapId',
      'patternId',
      'familyId',
      'decisionIds',
      'coverageId',
      'leverageId',
      'matchupRating',
      'information',
      'informationScore',
      'informationTierId',
      'revealedClueIds',
      'informationGameHooks',
      'rngDrawCountBefore',
    ],
    issues,
  );
  if (snap === undefined) return undefined;
  if (!isKeySnapId(snap['keySnapId'])) add(issues, 'invariant.invalid_id', `${path}.keySnapId`);
  if (!isKeySnapPatternId(snap['patternId']))
    add(issues, 'invariant.invalid_id', `${path}.patternId`);
  if (!isKeySnapDecisionFamilyId(snap['familyId']))
    add(issues, 'invariant.invalid_id', `${path}.familyId`);
  const decisionIds = denseArray(snap['decisionIds'], `${path}.decisionIds`, issues);
  if (decisionIds !== undefined) {
    if (decisionIds.length !== 3)
      add(issues, 'invariant.invalid_combination', `${path}.decisionIds`);
    const seen = new Set<string>();
    decisionIds.forEach((decisionId, index) => {
      if (!isKeySnapDecisionId(decisionId))
        add(issues, 'invariant.invalid_id', `${path}.decisionIds.${index}`);
      else if (seen.has(decisionId))
        add(issues, 'invariant.duplicate_value', `${path}.decisionIds.${index}`);
      else seen.add(decisionId);
    });
  }
  if (!isGameCoverageId(snap['coverageId']))
    add(issues, 'invariant.invalid_id', `${path}.coverageId`);
  if (!isGameLeverageId(snap['leverageId']))
    add(issues, 'invariant.invalid_id', `${path}.leverageId`);
  if (!integer(snap['matchupRating'], 0, 100))
    add(issues, 'invariant.out_of_bounds', `${path}.matchupRating`);
  const hasRelationshipModifier =
    isRecord(snap['information']) && 'relationshipScoreModifier' in snap['information'];
  const information = strictRecord(
    snap['information'],
    `${path}.information`,
    hasRelationshipModifier
      ? [
          'footballIqScore',
          'footballIqContributionMilli',
          'preparationScore',
          'preparationContributionMilli',
          'baseScore',
          'filmStudyApplied',
          'filmStudyBonus',
          'hookScoreBonus',
          'relationshipScoreModifier',
          'finalScore',
        ]
      : [
          'footballIqScore',
          'footballIqContributionMilli',
          'preparationScore',
          'preparationContributionMilli',
          'baseScore',
          'filmStudyApplied',
          'filmStudyBonus',
          'hookScoreBonus',
          'finalScore',
        ],
    issues,
  );
  if (information !== undefined) {
    for (const key of ['footballIqScore', 'preparationScore', 'baseScore', 'finalScore']) {
      if (!integer(information[key], 0, 200)) {
        add(issues, 'invariant.out_of_bounds', `${path}.information.${key}`);
      }
    }
    for (const key of ['footballIqContributionMilli', 'preparationContributionMilli']) {
      if (!integer(information[key], 0, 100_000)) {
        add(issues, 'invariant.out_of_bounds', `${path}.information.${key}`);
      }
    }
    for (const key of ['filmStudyBonus', 'hookScoreBonus']) {
      if (!integer(information[key], 0, 200)) {
        add(issues, 'invariant.out_of_bounds', `${path}.information.${key}`);
      }
    }
    if (hasRelationshipModifier && !integer(information['relationshipScoreModifier'], -12, 12)) {
      add(issues, 'invariant.out_of_bounds', `${path}.information.relationshipScoreModifier`);
    }
    if (typeof information['filmStudyApplied'] !== 'boolean') {
      add(issues, 'invariant.invalid_type', `${path}.information.filmStudyApplied`);
    }
    if (information['finalScore'] !== snap['informationScore']) {
      add(issues, 'invariant.invalid_combination', `${path}.information.finalScore`);
    }
  }
  if (!integer(snap['informationScore'], 0, 200))
    add(issues, 'invariant.out_of_bounds', `${path}.informationScore`);
  if (!isGameInformationTierId(snap['informationTierId']))
    add(issues, 'invariant.invalid_id', `${path}.informationTierId`);
  validateAppliedHooks(snap['informationGameHooks'], `${path}.informationGameHooks`, issues);
  if (Array.isArray(snap['informationGameHooks'])) {
    snap['informationGameHooks'].forEach((hook, index) => {
      if (isRecord(hook) && hook['hookId'] !== 'game_hook_coverage_clue_bonus') {
        add(
          issues,
          'invariant.invalid_combination',
          `${path}.informationGameHooks.${index}.hookId`,
        );
      }
    });
  }
  const clues = denseArray(snap['revealedClueIds'], `${path}.revealedClueIds`, issues);
  if (clues !== undefined) {
    if (clues.length > 4) add(issues, 'invariant.out_of_bounds', `${path}.revealedClueIds`);
    const seen = new Set<string>();
    clues.forEach((clueId, index) => {
      if (!isGameClueId(clueId))
        add(issues, 'invariant.invalid_id', `${path}.revealedClueIds.${index}`);
      else if (seen.has(clueId))
        add(issues, 'invariant.duplicate_value', `${path}.revealedClueIds.${index}`);
      else seen.add(clueId);
    });
  }
  if (!integer(snap['rngDrawCountBefore'], 0, maxRngDrawCount))
    add(issues, 'invariant.out_of_bounds', `${path}.rngDrawCountBefore`);
  return snap;
}

function validateGrowth(
  value: unknown,
  path: string,
  issues: GameInvariantIssue[],
): UnknownRecord | undefined {
  const growth = strictRecord(
    value,
    path,
    [
      'bodyBefore',
      'requestedBodyDelta',
      'actualBodyDelta',
      'bodyAfter',
      'confidenceBefore',
      'requestedConfidenceDelta',
      'actualConfidenceDelta',
      'confidenceAfter',
      'coachTrustBefore',
      'requestedCoachTrustDelta',
      'actualCoachTrustDelta',
      'coachTrustAfter',
      'attributeXp',
    ],
    issues,
  );
  if (growth === undefined) return undefined;
  for (const key of [
    'bodyBefore',
    'bodyAfter',
    'confidenceBefore',
    'confidenceAfter',
    'coachTrustBefore',
    'coachTrustAfter',
  ]) {
    if (!integer(growth[key], 0, 100)) add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
  }
  for (const key of [
    'requestedBodyDelta',
    'actualBodyDelta',
    'requestedConfidenceDelta',
    'actualConfidenceDelta',
    'requestedCoachTrustDelta',
    'actualCoachTrustDelta',
  ]) {
    if (!integer(growth[key], -100, 100)) add(issues, 'invariant.out_of_bounds', `${path}.${key}`);
  }
  for (const [resource, beforeKey, requestedKey, actualKey, afterKey] of [
    ['body', 'bodyBefore', 'requestedBodyDelta', 'actualBodyDelta', 'bodyAfter'],
    [
      'confidence',
      'confidenceBefore',
      'requestedConfidenceDelta',
      'actualConfidenceDelta',
      'confidenceAfter',
    ],
    [
      'coachTrust',
      'coachTrustBefore',
      'requestedCoachTrustDelta',
      'actualCoachTrustDelta',
      'coachTrustAfter',
    ],
  ] as const) {
    const before = growth[beforeKey];
    const requested = growth[requestedKey];
    const actual = growth[actualKey];
    const after = growth[afterKey];
    if (
      typeof before === 'number' &&
      typeof requested === 'number' &&
      typeof actual === 'number' &&
      typeof after === 'number'
    ) {
      const expectedAfter = Math.min(100, Math.max(0, before + requested));
      if (after !== expectedAfter || actual !== expectedAfter - before) {
        add(issues, 'invariant.invalid_combination', `${path}.${resource}`);
      }
    }
  }
  const xp = denseArray(growth['attributeXp'], `${path}.attributeXp`, issues);
  let previousAttributeIndex = -1;
  const seenAttributeIds = new Set<string>();
  xp?.forEach((rawEntry, index) => {
    const entryPath = `${path}.attributeXp.${index}`;
    const entry = strictRecord(
      rawEntry,
      entryPath,
      [
        'attributeId',
        'awardedXp',
        'appliedXp',
        'ratingBefore',
        'xpBefore',
        'ratingAfter',
        'xpAfter',
      ],
      issues,
    );
    if (entry === undefined) return;
    if (!isPlayerAttributeId(entry['attributeId'])) {
      add(issues, 'invariant.invalid_id', `${entryPath}.attributeId`);
    } else {
      const attributeIndex = PLAYER_ATTRIBUTE_IDS.indexOf(entry['attributeId']);
      if (seenAttributeIds.has(entry['attributeId'])) {
        add(issues, 'invariant.duplicate_value', `${entryPath}.attributeId`);
      } else if (attributeIndex <= previousAttributeIndex) {
        add(issues, 'invariant.noncanonical_order', `${entryPath}.attributeId`);
      }
      seenAttributeIds.add(entry['attributeId']);
      previousAttributeIndex = attributeIndex;
    }
    for (const key of ['awardedXp', 'appliedXp']) {
      if (!integer(entry[key], 0, 1_000_000))
        add(issues, 'invariant.out_of_bounds', `${entryPath}.${key}`);
    }
    for (const key of ['xpBefore', 'xpAfter']) {
      if (!integer(entry[key], 0, 99))
        add(issues, 'invariant.out_of_bounds', `${entryPath}.${key}`);
    }
    for (const key of ['ratingBefore', 'ratingAfter']) {
      if (!integer(entry[key], 0, 100))
        add(issues, 'invariant.out_of_bounds', `${entryPath}.${key}`);
    }
    if (
      integer(entry['awardedXp'], 0, 1_000_000) &&
      integer(entry['appliedXp'], 0, 1_000_000) &&
      integer(entry['ratingBefore'], 0, 100) &&
      integer(entry['xpBefore'], 0, 99) &&
      integer(entry['ratingAfter'], 0, 100) &&
      integer(entry['xpAfter'], 0, 99)
    ) {
      const ratingBefore = entry['ratingBefore'] as number;
      const xpBefore = entry['xpBefore'] as number;
      const awardedXp = entry['awardedXp'] as number;
      const xpCapacity = ratingBefore >= 100 ? 0 : (100 - ratingBefore) * 100 - xpBefore;
      const expectedAppliedXp = Math.min(awardedXp, xpCapacity);
      const totalXp = xpBefore + expectedAppliedXp;
      const expectedRatingAfter = Math.min(100, ratingBefore + Math.floor(totalXp / 100));
      const expectedXpAfter = expectedRatingAfter === 100 ? 0 : totalXp % 100;
      if (
        entry['appliedXp'] !== expectedAppliedXp ||
        entry['ratingAfter'] !== expectedRatingAfter ||
        entry['xpAfter'] !== expectedXpAfter
      ) {
        add(issues, 'invariant.invalid_combination', entryPath);
      }
    }
  });
  return growth;
}

function playerAttributeProgress(player: UnknownRecord, attributeId: PlayerAttributeId): unknown {
  const attributes = player['attributes'];
  if (!isRecord(attributes)) return undefined;
  const group = PHYSICAL_ATTRIBUTE_IDS.some((id) => id === attributeId)
    ? attributes['physical']
    : MENTAL_ATTRIBUTE_IDS.some((id) => id === attributeId)
      ? attributes['mental']
      : attributes['wr'];
  return isRecord(group) ? group[attributeId] : undefined;
}

export function validateCareerGameState(input: {
  readonly gameCareerState: unknown;
  readonly phase: unknown;
  readonly careerWeekIndex: unknown;
  readonly careerProgramId: unknown;
  readonly careerRngDrawCount: number;
  readonly player?: unknown;
  readonly historicalCareerProgramIds?: readonly unknown[];
}): readonly GameInvariantIssue[] {
  const issues: GameInvariantIssue[] = [];
  const careerState = validateGameCareerState(
    input.gameCareerState,
    input.careerProgramId,
    input.careerRngDrawCount,
    issues,
    input.historicalCareerProgramIds,
  );
  if (!isRecord(input.phase)) {
    return issues;
  }
  const type = input.phase['type'];
  if (type === 'GAME_PREVIEW') {
    const phase = strictRecord(input.phase, 'career.phase', ['type', 'matchup'], issues);
    if (phase !== undefined) {
      validateMatchup(
        phase['matchup'],
        'career.phase.matchup',
        input.careerWeekIndex,
        input.careerProgramId,
        issues,
      );
    }
  } else if (type === 'KEY_SNAP') {
    const phase = strictRecord(
      input.phase,
      'career.phase',
      ['type', 'game', 'pendingSnap'],
      issues,
    );
    if (phase !== undefined) {
      const game = validateActiveGame(
        phase['game'],
        'career.phase.game',
        input.careerWeekIndex,
        input.careerProgramId,
        input.careerRngDrawCount,
        issues,
      );
      const snap = validatePendingSnap(
        phase['pendingSnap'],
        'career.phase.pendingSnap',
        input.careerRngDrawCount,
        issues,
      );
      if (
        game !== undefined &&
        snap !== undefined &&
        isRecord(game['matchup']) &&
        integer(game['opportunitiesPresented'], 0, 12) &&
        integer(game['matchup']['opportunityBudget'], 0, 12) &&
        game['opportunitiesPresented'] > game['matchup']['opportunityBudget']
      ) {
        add(issues, 'invariant.invalid_combination', 'career.phase.pendingSnap');
      }
    }
  } else if (type === 'POST_GAME') {
    const phase = strictRecord(
      input.phase,
      'career.phase',
      ['type', 'summary', 'growth', 'keyPlayLog', 'completedWeek'],
      issues,
    );
    if (phase !== undefined) {
      const summary = validateSummary(
        phase['summary'],
        'career.phase.summary',
        input.careerProgramId,
        input.careerRngDrawCount,
        issues,
      );
      const growth = validateGrowth(phase['growth'], 'career.phase.growth', issues);
      const keyPlayLog = denseArray(phase['keyPlayLog'], 'career.phase.keyPlayLog', issues);
      keyPlayLog?.forEach((play, index) =>
        validateKeyPlay(play, `career.phase.keyPlayLog.${index}`, input.careerRngDrawCount, issues),
      );
      if (
        summary !== undefined &&
        keyPlayLog !== undefined &&
        summary['keySnapCount'] !== keyPlayLog.length
      ) {
        add(issues, 'invariant.invalid_combination', 'career.phase.keyPlayLog');
      }
      if (summary !== undefined && keyPlayLog !== undefined && isRecord(summary['statLine'])) {
        const expectedStats = sumKeyPlayStats(keyPlayLog);
        for (const [key, expected] of Object.entries(expectedStats)) {
          if (summary['statLine'][key] !== expected) {
            add(issues, 'invariant.invalid_combination', `career.phase.summary.statLine.${key}`);
          }
        }
      }
      validateCompletedWeekEvidence(phase['completedWeek'], 'career.phase.completedWeek', issues);
      if (summary !== undefined && careerState !== undefined) {
        const lastGame = careerState['lastGame'];
        if (lastGame === null || !sameCompletedGameSummary(summary, lastGame)) {
          add(issues, 'invariant.invalid_combination', 'career.gameCareerState.lastGame');
        }
        const cumulativeGradeScore = careerState['cumulativeGradeScore'];
        if (
          typeof cumulativeGradeScore === 'number' &&
          typeof summary['performanceGradeScore'] === 'number' &&
          cumulativeGradeScore < summary['performanceGradeScore']
        ) {
          add(
            issues,
            'invariant.invalid_combination',
            'career.gameCareerState.cumulativeGradeScore',
          );
        }
      }
      if (growth !== undefined && isRecord(input.player)) {
        const state = input.player['state'];
        if (isRecord(state)) {
          for (const [growthKey, playerKey] of [
            ['bodyAfter', 'body'],
            ['confidenceAfter', 'confidence'],
            ['coachTrustAfter', 'coachTrust'],
          ] as const) {
            if (growth[growthKey] !== state[playerKey]) {
              add(issues, 'invariant.invalid_combination', `career.phase.growth.${growthKey}`);
            }
          }
        }
        const attributeXp = growth['attributeXp'];
        if (Array.isArray(attributeXp)) {
          attributeXp.forEach((rawEntry, index) => {
            if (!isRecord(rawEntry) || !isPlayerAttributeId(rawEntry['attributeId'])) return;
            const progress = playerAttributeProgress(
              input.player as UnknownRecord,
              rawEntry['attributeId'],
            );
            if (
              !isRecord(progress) ||
              progress['rating'] !== rawEntry['ratingAfter'] ||
              progress['xp'] !== rawEntry['xpAfter']
            ) {
              add(
                issues,
                'invariant.invalid_combination',
                `career.phase.growth.attributeXp.${index}`,
              );
            }
          });
        }
      }
    }
  }
  return issues;
}

function sameCompletedGameSummary(left: Record<string, unknown>, rightValue: unknown): boolean {
  if (!isRecord(rightValue)) {
    return false;
  }
  const right = rightValue;
  const leftScore = left['score'];
  const rightScore = right['score'];
  const leftStats = left['statLine'];
  const rightStats = right['statLine'];
  if (
    !isRecord(leftScore) ||
    !isRecord(rightScore) ||
    !isRecord(leftStats) ||
    !isRecord(rightStats)
  ) {
    return false;
  }
  return (
    left['gameId'] === right['gameId'] &&
    left['weekIndex'] === right['weekIndex'] &&
    left['playerProgramId'] === right['playerProgramId'] &&
    left['opponentProgramId'] === right['opponentProgramId'] &&
    left['isHome'] === right['isHome'] &&
    leftScore['playerTeam'] === rightScore['playerTeam'] &&
    leftScore['opponent'] === rightScore['opponent'] &&
    left['resultId'] === right['resultId'] &&
    leftStats['targets'] === rightStats['targets'] &&
    leftStats['receptions'] === rightStats['receptions'] &&
    leftStats['receivingYards'] === rightStats['receivingYards'] &&
    leftStats['receivingTouchdowns'] === rightStats['receivingTouchdowns'] &&
    leftStats['drops'] === rightStats['drops'] &&
    leftStats['turnovers'] === rightStats['turnovers'] &&
    left['keySnapCount'] === right['keySnapCount'] &&
    left['performanceGradeScore'] === right['performanceGradeScore'] &&
    left['performanceGradeBandId'] === right['performanceGradeBandId'] &&
    left['participationFeedbackId'] === right['participationFeedbackId'] &&
    left['gameRngDrawCountBefore'] === right['gameRngDrawCountBefore'] &&
    left['gameRngDrawCountAfter'] === right['gameRngDrawCountAfter']
  );
}
