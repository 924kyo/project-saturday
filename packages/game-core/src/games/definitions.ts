import { isPlayerAttributeId, isProgramId } from '../player/ids.js';
import {
  KEY_SNAP_DECISION_FAMILY_IDS,
  PERFORMANCE_GRADE_BAND_IDS,
  isGameClueId,
  isGameCoverageId,
  isGameLeverageId,
  isKeySnapDecisionFamilyId,
  isKeySnapDecisionId,
  isKeySnapPatternId,
} from './ids.js';
import type {
  GameOpponentMechanicsProfile,
  GameTuningDefinition,
  KeySnapFamilyMechanicsDefinition,
  KeySnapPatternMechanicsDefinition,
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is UnknownRecord {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    actual.every((key) => keys.includes(key)) &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isDenseArray(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false;
  }
  return true;
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

function integerRecord(
  value: unknown,
  keys: readonly string[],
  minimum: number,
  maximum: number,
): value is Readonly<Record<string, number>> {
  return hasExactKeys(value, keys) && keys.every((key) => integer(value[key], minimum, maximum));
}

export function isGameOpponentMechanicsProfile(
  value: unknown,
): value is GameOpponentMechanicsProfile {
  return (
    hasExactKeys(value, ['programId', 'offenseRating', 'defenseRating', 'qbRating']) &&
    isProgramId(value['programId']) &&
    integer(value['offenseRating'], 40, 100) &&
    integer(value['defenseRating'], 40, 100) &&
    integer(value['qbRating'], 40, 100)
  );
}

function validGradeBands(value: unknown): boolean {
  if (!isDenseArray(value) || value.length !== PERFORMANCE_GRADE_BAND_IDS.length) return false;
  return value.every((rawBand, index) => {
    if (!hasExactKeys(rawBand, ['id', 'minimumScore'])) return false;
    const previous = value[index - 1];
    return (
      rawBand['id'] === PERFORMANCE_GRADE_BAND_IDS[index] &&
      integer(rawBand['minimumScore'], 0, 100) &&
      (previous === undefined ||
        (isRecord(previous) &&
          typeof previous['minimumScore'] === 'number' &&
          rawBand['minimumScore'] < previous['minimumScore']))
    );
  });
}

export function isGameTuningDefinition(value: unknown): value is GameTuningDefinition {
  if (
    !hasExactKeys(value, [
      'drive',
      'grade',
      'growth',
      'information',
      'maxKeySnapOpportunities',
      'opportunityBands',
      'opportunityBoundsByDepthRank',
      'periodCount',
      'periodLengthSeconds',
      'resolution',
      'zeroOpportunityMaxSnapPermille',
    ]) ||
    value['maxKeySnapOpportunities'] !== 12 ||
    value['periodCount'] !== 4 ||
    value['periodLengthSeconds'] !== 900 ||
    !integer(value['zeroOpportunityMaxSnapPermille'], 0, 100)
  ) {
    return false;
  }

  const drive = value['drive'];
  if (
    !hasExactKeys(drive, [
      'fieldGoalBasePermille',
      'homeRatingBonus',
      'maxDriveCount',
      'maximumSecondsElapsed',
      'minimumSecondsElapsed',
      'ratingEdgePermillePerPoint',
      'touchdownBasePermille',
    ]) ||
    !integer(drive['fieldGoalBasePermille'], 0, 1_000) ||
    !integer(drive['homeRatingBonus'], 0, 10) ||
    !integer(drive['maxDriveCount'], 8, 40) ||
    !integer(drive['maximumSecondsElapsed'], 60, 600) ||
    !integer(drive['minimumSecondsElapsed'], 30, 300) ||
    !integer(drive['ratingEdgePermillePerPoint'], 0, 25) ||
    !integer(drive['touchdownBasePermille'], 0, 1_000) ||
    drive['minimumSecondsElapsed'] > drive['maximumSecondsElapsed'] ||
    drive['fieldGoalBasePermille'] + drive['touchdownBasePermille'] > 1_000
  ) {
    return false;
  }

  const grade = value['grade'];
  if (
    !hasExactKeys(grade, [
      'baseScore',
      'bands',
      'dropPenalty',
      'fitDivisor',
      'opportunityNormalizationTarget',
      'receivingYardsDivisor',
      'receptionValue',
      'touchdownValue',
      'turnoverPenalty',
    ]) ||
    !integer(grade['baseScore'], 0, 100) ||
    !validGradeBands(grade['bands']) ||
    !integer(grade['dropPenalty'], 0, 50) ||
    !integer(grade['fitDivisor'], 1, 20) ||
    !integer(grade['opportunityNormalizationTarget'], 1, 12) ||
    !integer(grade['receivingYardsDivisor'], 1, 50) ||
    !integer(grade['receptionValue'], 0, 20) ||
    !integer(grade['touchdownValue'], 0, 50) ||
    !integer(grade['turnoverPenalty'], 0, 100)
  ) {
    return false;
  }

  const growth = value['growth'];
  if (
    !hasExactKeys(growth, [
      'baseAttributeXpPerOpportunity',
      'baseBodyCost',
      'confidenceDeltaByBand',
      'fitXpDivisor',
      'trustDeltaByBand',
    ]) ||
    !integer(growth['baseAttributeXpPerOpportunity'], 0, 100) ||
    !integer(growth['baseBodyCost'], -30, 0) ||
    !integer(growth['fitXpDivisor'], 1, 30) ||
    !integerRecord(growth['confidenceDeltaByBand'], PERFORMANCE_GRADE_BAND_IDS, -20, 20) ||
    !integerRecord(growth['trustDeltaByBand'], PERFORMANCE_GRADE_BAND_IDS, -20, 20)
  ) {
    return false;
  }

  const information = value['information'];
  if (
    !hasExactKeys(information, [
      'diagnosticMinimumScore',
      'filmStudyBonus',
      'footballIqWeightPermille',
      'partialMinimumScore',
      'preparationWeightPermille',
    ]) ||
    !integer(information['diagnosticMinimumScore'], 0, 200) ||
    !integer(information['filmStudyBonus'], 0, 100) ||
    !integer(information['footballIqWeightPermille'], 0, 1_000) ||
    !integer(information['partialMinimumScore'], 0, 200) ||
    !integer(information['preparationWeightPermille'], 0, 1_000) ||
    information['partialMinimumScore'] >= information['diagnosticMinimumScore'] ||
    information['footballIqWeightPermille'] + information['preparationWeightPermille'] !== 1_000
  ) {
    return false;
  }

  const resolution = value['resolution'];
  const resolutionWeightKeys = [
    'attributeWeightPermille',
    'bodyWeightPermille',
    'confidenceWeightPermille',
    'decisionFitWeightPermille',
    'matchupWeightPermille',
    'preparationWeightPermille',
    'teamContextWeightPermille',
  ] as const;
  if (
    !hasExactKeys(resolution, [...resolutionWeightKeys, 'rollMaximum', 'rollMinimum']) ||
    !resolutionWeightKeys.every((key) => integer(resolution[key], 0, 1_000)) ||
    !integer(resolution['rollMaximum'], 1, 100) ||
    !integer(resolution['rollMinimum'], -100, -1) ||
    resolution['rollMinimum'] >= resolution['rollMaximum'] ||
    resolutionWeightKeys.reduce((total, key) => total + (resolution[key] as number), 0) !== 1_000
  ) {
    return false;
  }

  const bands = value['opportunityBands'];
  if (!isDenseArray(bands) || bands.length !== 9) return false;
  for (const [index, rawBand] of bands.entries()) {
    if (
      !hasExactKeys(rawBand, ['minimumSnapPermille', 'opportunityBudget']) ||
      !integer(rawBand['minimumSnapPermille'], 0, 1_000) ||
      !integer(rawBand['opportunityBudget'], 1, 12)
    ) {
      return false;
    }
    const previous = bands[index - 1];
    if (
      previous !== undefined &&
      isRecord(previous) &&
      (rawBand['minimumSnapPermille'] >= (previous['minimumSnapPermille'] as number) ||
        rawBand['opportunityBudget'] >= (previous['opportunityBudget'] as number))
    ) {
      return false;
    }
  }

  const bounds = value['opportunityBoundsByDepthRank'];
  if (!isDenseArray(bounds) || bounds.length !== 8) return false;
  for (const [index, rawBounds] of bounds.entries()) {
    if (
      !hasExactKeys(rawBounds, ['depthRank', 'maximumOpportunities', 'minimumOpportunities']) ||
      rawBounds['depthRank'] !== index + 1 ||
      !integer(rawBounds['minimumOpportunities'], 0, 12) ||
      !integer(rawBounds['maximumOpportunities'], 0, 12) ||
      rawBounds['minimumOpportunities'] > rawBounds['maximumOpportunities']
    ) {
      return false;
    }
  }
  return true;
}

function isFamilyDefinition(value: unknown): value is KeySnapFamilyMechanicsDefinition {
  if (!hasExactKeys(value, ['attributeWeights', 'decisionIds', 'id'])) return false;
  if (!isKeySnapDecisionFamilyId(value['id'])) return false;
  const decisions = value['decisionIds'];
  if (
    !isDenseArray(decisions) ||
    decisions.length !== 3 ||
    new Set(decisions).size !== 3 ||
    !decisions.every(isKeySnapDecisionId)
  ) {
    return false;
  }
  const weights = value['attributeWeights'];
  if (!isDenseArray(weights) || weights.length < 2 || weights.length > 4) return false;
  const attributes = new Set<string>();
  let total = 0;
  for (const weight of weights) {
    if (
      !hasExactKeys(weight, ['attributeId', 'weightPermille']) ||
      !isPlayerAttributeId(weight['attributeId']) ||
      !integer(weight['weightPermille'], 1, 1_000) ||
      attributes.has(weight['attributeId'])
    ) {
      return false;
    }
    attributes.add(weight['attributeId']);
    total += weight['weightPermille'];
  }
  return total === 1_000;
}

export function isKeySnapFamilyMechanicsDefinitionCatalog(
  value: unknown,
): value is readonly KeySnapFamilyMechanicsDefinition[] {
  if (!isDenseArray(value) || value.length !== KEY_SNAP_DECISION_FAMILY_IDS.length) return false;
  if (!value.every(isFamilyDefinition)) return false;
  const familyIds = new Set(value.map(({ id }) => id));
  const decisionIds = value.flatMap(({ decisionIds }) => decisionIds);
  return (
    KEY_SNAP_DECISION_FAMILY_IDS.every((id) => familyIds.has(id)) &&
    new Set(decisionIds).size === decisionIds.length
  );
}

function isPatternDefinition(value: unknown): value is KeySnapPatternMechanicsDefinition {
  if (
    !hasExactKeys(value, [
      'clueIds',
      'coverageId',
      'decisionFits',
      'familyId',
      'id',
      'leverageId',
      'outcome',
    ]) ||
    !isKeySnapPatternId(value['id']) ||
    !isKeySnapDecisionFamilyId(value['familyId']) ||
    !isGameCoverageId(value['coverageId']) ||
    !isGameLeverageId(value['leverageId'])
  ) {
    return false;
  }
  const clues = value['clueIds'];
  if (
    !isDenseArray(clues) ||
    clues.length !== 2 ||
    new Set(clues).size !== 2 ||
    !clues.every(isGameClueId)
  ) {
    return false;
  }
  const fits = value['decisionFits'];
  if (!isDenseArray(fits) || fits.length !== 3) return false;
  const decisions = new Set<string>();
  const fitValues: number[] = [];
  for (const fit of fits) {
    if (
      !hasExactKeys(fit, ['decisionId', 'fit']) ||
      !isKeySnapDecisionId(fit['decisionId']) ||
      !integer(fit['fit'], -30, 30) ||
      decisions.has(fit['decisionId'])
    ) {
      return false;
    }
    decisions.add(fit['decisionId']);
    fitValues.push(fit['fit']);
  }
  const best = Math.max(...fitValues);
  if (fitValues.filter((fit) => fit === best).length !== 1 || !fitValues.some((fit) => fit < 0)) {
    return false;
  }
  const outcome = value['outcome'];
  return (
    hasExactKeys(outcome, [
      'baseCatchPermille',
      'baseReceivingYards',
      'baseTargetPermille',
      'dropRiskPermille',
      'touchdownChancePermille',
      'turnoverRiskPermille',
    ]) &&
    integer(outcome['baseCatchPermille'], 0, 1_000) &&
    integer(outcome['baseReceivingYards'], -5, 50) &&
    integer(outcome['baseTargetPermille'], 0, 1_000) &&
    integer(outcome['dropRiskPermille'], 0, 500) &&
    integer(outcome['touchdownChancePermille'], 0, 1_000) &&
    integer(outcome['turnoverRiskPermille'], 0, 500) &&
    outcome['baseCatchPermille'] <= outcome['baseTargetPermille']
  );
}

export function isKeySnapPatternMechanicsDefinitionCatalog(
  value: unknown,
  familyDefinitions: readonly KeySnapFamilyMechanicsDefinition[],
): value is readonly KeySnapPatternMechanicsDefinition[] {
  if (
    !isKeySnapFamilyMechanicsDefinitionCatalog(familyDefinitions) ||
    !isDenseArray(value) ||
    value.length !== 8 ||
    !value.every(isPatternDefinition) ||
    new Set(value.map(({ id }) => id)).size !== value.length
  ) {
    return false;
  }
  const familyById = new Map(familyDefinitions.map((family) => [family.id, family]));
  for (const familyId of KEY_SNAP_DECISION_FAMILY_IDS) {
    const family = familyById.get(familyId)!;
    const patterns = value.filter((pattern) => pattern.familyId === familyId);
    if (patterns.length !== 2) return false;
    const bestIds = new Set<string>();
    for (const pattern of patterns) {
      if (
        pattern.decisionFits.some(
          ({ decisionId }, index) => decisionId !== family.decisionIds[index],
        )
      ) {
        return false;
      }
      bestIds.add(
        pattern.decisionFits.reduce((left, right) => (right.fit > left.fit ? right : left))
          .decisionId,
      );
    }
    if (bestIds.size < 2) return false;
  }
  return true;
}
