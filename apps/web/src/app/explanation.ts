import {
  RISK_REASONS_VNEXT,
  type SnapExplanationVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import type { AppTranslate } from '../i18n/i18n';
import { READ_KEYS, attributeNameKey, key } from './content';

/** The three explanation lines for one resolved snap (M12: read · execution · the down). */
export interface ExplanationLines {
  readonly read: string;
  readonly execution: string;
  readonly situation: string;
}

/** Message keys are camelCase segments; reason IDs are snake_case. */
export const camelKey = (id: string) =>
  id.toLowerCase().replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

const DEFENSE: ReadonlySet<string> = new Set(['position_cb', 'position_lb', 'position_edge']);

export function explanationLines(
  t: AppTranslate,
  positionId: VNextPositionId,
  explanation: SnapExplanationVNext,
  decisionName: (decisionId: string) => string,
  playReview: boolean,
): ExplanationLines {
  const { read, execution, situation } = explanation;
  const readLine = (): string => {
    if (read.basis === 'EXACT') return t(READ_KEYS.SHARP.help);
    if (read.basis === 'ALTERNATIVE')
      return playReview && read.bestDecisionId !== null
        ? t('v2.read.sharpAlternative', { best: decisionName(read.bestDecisionId) })
        : t(READ_KEYS.SHARP.help);
    if (read.basis === 'PARTIAL') return t(READ_KEYS.SOLID.help);
    // A wrong read the play rewarded anyway: the staff still grades the read.
    if (execution.verdict === 'WON') return t('v2.read.wrongReadGoodPlay');
    if (read.basis === 'LIMITED') {
      if (playReview && read.ambiguousLookNameKey !== null)
        return t('v2.read.missedAmbiguous', { look: t(key(read.ambiguousLookNameKey)) });
      if (playReview && read.nextTellKey !== null)
        return t('v2.read.missedLimitedTell', { tell: t(key(read.nextTellKey)) });
      return t('v2.read.missedLimited');
    }
    return t(READ_KEYS.MISSED.help);
  };
  const executionLine = (): string => {
    const reason = execution.reasonId;
    const parts: string[] = [
      reason === null ? t('v2.exec.won') : t(key(`v2.exec.${camelKey(reason)}`) as MessageKey),
    ];
    if (execution.chancePermille !== null && reason !== null && execution.verdict !== 'NEUTRAL')
      parts.push(
        t(RISK_REASONS_VNEXT.has(reason) ? 'v2.exec.chanceRisk' : 'v2.exec.chanceSuccess', {
          chance: Math.round(execution.chancePermille / 10),
        }),
      );
    if (execution.verdict === 'LOST' && execution.attribute !== null)
      parts.push(
        t('v2.exec.attribute', {
          attribute: t(attributeNameKey(execution.attribute.attributeId)),
          rating: execution.attribute.rating,
        }),
      );
    return parts.join(' ');
  };
  const situationLine = (): string => {
    const params = { yards: Math.max(0, situation.yards), distance: situation.distance };
    const side = DEFENSE.has(positionId) ? 'def' : 'off';
    switch (situation.kind) {
      case 'TOUCHDOWN':
        return t(`v2.sit.${side}.touchdown`);
      case 'TURNOVER':
        return t(`v2.sit.${side}.turnover`);
      case 'FIRST_DOWN':
        return t(`v2.sit.${side}.firstDown`, params);
      case 'SHORT_OF_STICKS':
        return situation.team === 'PARTIAL'
          ? t(`v2.sit.${side}.onSchedule`, params)
          : t(`v2.sit.${side}.short`, params);
      case 'TURNOVER_ON_DOWNS':
        return t(`v2.sit.${side}.downs`);
      case 'NO_PLAY':
        return t('v2.sit.noPlay');
      case 'STOP':
        return t('v2.sit.def.stop');
      case 'NO_GAIN':
        return t('v2.sit.off.noGain');
    }
  };
  return { read: readLine(), execution: executionLine(), situation: situationLine() };
}
