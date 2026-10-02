import {
  careerRoleStatusVNext,
  cardsOfVNext,
  nilOfVNext,
  nilDealCostVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type VNextPositionId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  POSITION_ABBR_KEYS,
  ROLE_KEYS,
  attributeNameKey,
  injuryText,
  key,
  program,
} from './content';
import { Panel } from './ui';

const STATUS_KEYS = {
  SECURE: 'v2.roleStatus.chip.secure',
  CONTESTED: 'v2.roleStatus.chip.contested',
  AT_RISK: 'v2.roleStatus.chip.atRisk',
} as const satisfies Record<'SECURE' | 'CONTESTED' | 'AT_RISK', MessageKey>;

/**
 * Week home, change first (M12 UI-03): what changed since the last plan, from saved facts only —
 * Saturday's result and grade, the ratings it raised, the role and its security, health, the NIL
 * obligation's practice cost, and cards and Insight.
 */
export function SinceLastWeek({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const last = career.log.at(-1);
  if (last === undefined || career.program === null) return null;
  const game = last.engine.game as unknown as {
    readonly growth?: {
      readonly attributeXp?: readonly {
        readonly attributeId: string;
        readonly ratingBefore: number;
        readonly ratingAfter: number;
      }[];
    };
  };
  const raised = (game.growth?.attributeXp ?? []).filter(
    ({ ratingAfter, ratingBefore }) => ratingAfter > ratingBefore,
  );
  const status = careerRoleStatusVNext(career, mechanics);
  const projection = career.program.room.projection;
  const abbr = t(POSITION_ABBR_KEYS[career.athlete.profile.positionId as VNextPositionId]);
  const injury = career.condition.injury;
  const obligation = nilOfVNext(career).obligation;
  const cards = cardsOfVNext(career);
  const result =
    last.resultId === 'game_result_win'
      ? 'v2.team.win'
      : last.resultId === 'game_result_loss'
        ? 'v2.team.loss'
        : 'v2.team.tie';
  return (
    <Panel id="s2-since" title={t('v2.since.title')}>
      <ul className="s2-bullets">
        <li>
          <span>
            {t('v2.since.game', {
              opponent: t(key(program(last.opponentProgramId).shortNameKey)),
              result: t(result, { us: last.playerScore, them: last.opponentScore }),
              grade: last.coachGrade ?? '—',
            })}
          </span>
        </li>
        {raised.length > 0 && (
          <li>
            <span>
              {t('v2.since.raised', {
                list: raised
                  .map(
                    ({ attributeId, ratingAfter }) =>
                      `${t(attributeNameKey(attributeId))} ${ratingAfter}`,
                  )
                  .join(' · '),
              })}
            </span>
          </li>
        )}
        <li>
          <span>
            {t('v2.since.role', {
              position: `${abbr}${projection.rank}`,
              role: t(ROLE_KEYS[projection.roleId]),
              status: status === null ? '—' : t(STATUS_KEYS[status.status]),
            })}
          </span>
        </li>
        <li>
          <span>
            {injury === null
              ? t('v2.since.healthy')
              : t('v2.since.injured', {
                  name: t(injuryText(injury.outcomeId).nameKey),
                  weeks: injury.remainingWeeks,
                })}
          </span>
        </li>
        {obligation !== null && (
          <li>
            <span>
              {t('v2.since.nil', {
                weeks: obligation.weeksRemaining,
                cost: nilDealCostVNext({
                  obligation: {
                    durationWeeks: obligation.weeksRemaining,
                    focusCost: obligation.focusCost,
                  },
                } as never).practicePerWeek,
              })}
            </span>
          </li>
        )}
        <li>
          <span>
            {t('v2.since.cards', {
              owned: career.build.ownedSkillIds.length,
              insight: cards.insight,
            })}
          </span>
        </li>
      </ul>
    </Panel>
  );
}
