import type { CSSProperties } from 'react';
import {
  projectCompletedPlayFrames,
  type CareerVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  ROUND_KEYS,
  STAT_KEYS,
  VERDICT_KEYS,
  attributeNameKey,
  currentOverall,
  gameText,
  playHeadlineKey,
  practiceBand,
  program,
} from './content';
import { Nameplate } from './Nameplate';
import { SPEAKER_KEYS, selectReactions } from './reactions';
import { Crest, Meter, Panel } from './ui';
import { METER_COLORS } from './theme';

export function PostGameScreen({
  career,
  blocked,
  onNext,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onNext: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'POST_GAME' || career.program === null) return null;
  const recap = career.flow.recap;
  if (recap.engine.game.type !== 'COMPLETE') return null;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const us = program(career.program.programId);
  const them = program(recap.opponentProgramId);
  const summary = recap.engine.game.summary;
  const growth = recap.engine.game.growth;
  const won = recap.resultId === 'game_result_win';
  const lost = recap.resultId === 'game_result_loss';
  const name = career.athlete.profile.displayName;
  const lastName = name.split(' ').at(-1) ?? name;
  const stats = Object.entries(summary.statLine as unknown as Record<string, number>).filter(
    ([field, value]) => value !== 0 && STAT_KEYS[field] !== undefined,
  );
  const plays = projectCompletedPlayFrames(positionId, recap.engine)
    .map((play, index) => ({ ...play, index }))
    .sort(
      (a, b) =>
        Number(b.result.outcome === 'TOUCHDOWN' || b.result.outcome === 'TURNOVER') -
          Number(a.result.outcome === 'TOUCHDOWN' || a.result.outcome === 'TURNOVER') ||
        Math.abs(b.result.yards) - Math.abs(a.result.yards),
    )
    .slice(0, 3);
  const verdict = practiceBand(recap.coachGrade ?? summary.gradeScore);
  const xp = [...growth.attributeXp]
    .filter(({ awardedXp }) => awardedXp > 0)
    .sort((a, b) => b.awardedXp - a.awardedXp)
    .slice(0, 3);
  const sharp = recap.sideline.filter(({ grade }) => grade === 'SHARP').length;
  const reactions = selectReactions(
    recap,
    positionId,
    career.program === null || career.legacy === undefined
      ? undefined
      : { programId: career.program.programId, alumni: career.legacy.alumni },
  );
  const style = { '--left': us.primary, '--right': them.primary } as CSSProperties;

  return (
    <div className="s2-stack">
      <div className="s2-final" style={style}>
        <p className="s2-eyebrow" style={{ color: '#fff' }}>
          {recap.round === undefined
            ? t('v2.post.eyebrow', { week: recap.weekIndex + 1 })
            : t('v2.post.roundEyebrow', { round: t(ROUND_KEYS[recap.round]) })}
        </p>
        <h1 className={`s2-display ${won ? 's2-result-w' : lost ? 's2-result-l' : ''}`}>
          {t(won ? 'v2.gd.win' : lost ? 'v2.gd.loss' : 'v2.gd.tie')}
        </h1>
        {recap.overtime === true && (
          <p className="s2-eyebrow" style={{ color: '#fff' }}>
            {t('v2.post.overtime')}
          </p>
        )}
        <div className="s2-final__score s2-display s2-num s2-size-score">
          <Crest identity={us} size={48} />
          <span>{recap.playerScore}</span>
          <span style={{ opacity: 0.5 }}>–</span>
          <span>{recap.opponentScore}</span>
          <Crest identity={them} size={48} />
        </div>
        <p style={{ color: '#fff' }}>
          {t('v2.post.record', { ...recap.recordAfter })}
          {recap.rankAfter !== null && recap.rankAfter <= 25 && (
            <span className="s2-rank-note">{t('v2.post.ranked', { rank: recap.rankAfter })}</span>
          )}
        </p>
      </div>

      <div className="s2-grid-2">
        <div className="s2-stack">
          <Panel id="s2-line" title={t('v2.post.yourGame', { name: lastName })}>
            {stats.length > 0 ? (
              <div className="s2-statline">
                {stats.map(([field, value]) => (
                  <div className="s2-stat" key={field}>
                    <span className="s2-stat__value s2-num">{value}</span>
                    <span className="s2-stat__label">{t(STAT_KEYS[field]!)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="s2-note">{t('v2.post.noLiveStats')}</p>
            )}
            {recap.sideline.length > 0 && (
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t('v2.post.sideline', { sharp, total: recap.sideline.length })}
              </p>
            )}
            {recap.academicHold === true && (
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t('v2.post.academicHold')}
              </p>
            )}
            {recap.availabilityId !== 'injury_availability_full' && (
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t(
                  recap.availabilityId === 'injury_availability_out'
                    ? 'v2.post.satOut'
                    : 'v2.post.playedLimited',
                )}
              </p>
            )}
          </Panel>
          {plays.length > 0 && (
            <Panel id="s2-plays" title={t('v2.post.definingPlays')}>
              <ol className="s2-plays">
                {plays.map((play) => (
                  <li
                    className="s2-play"
                    key={play.index}
                    style={
                      {
                        '--accent':
                          play.result.outcome === 'TOUCHDOWN'
                            ? '#3ecf8e'
                            : play.result.outcome === 'TURNOVER'
                              ? '#ff5a5f'
                              : '#f5c542',
                      } as CSSProperties
                    }
                  >
                    <span className="s2-play__tag">
                      {t('v2.post.quarter', { period: play.situation.period })}
                    </span>
                    <span>
                      <strong>
                        {t(playHeadlineKey(positionId, play.result.playResultId), {
                          name: lastName,
                          yards: Math.abs(play.result.yards),
                        })}
                      </strong>
                      <br />
                      <span className="s2-note">
                        {t(gameText.pattern(positionId, play.patternId).nameKey as MessageKey)} ·{' '}
                        {t(
                          gameText.decision(positionId, play.result.decisionId)
                            .nameKey as MessageKey,
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
        <div className="s2-stack">
          <Panel id="s2-coach" title={t('v2.post.coach')}>
            <div className="s2-row" style={{ alignItems: 'center', gap: 16 }}>
              <span
                className="s2-grade"
                role="img"
                aria-label={t('v2.report.gradeLabel', { band: verdict })}
              >
                {recap.liveSnapCount > 0 ? verdict : '—'}
              </span>
              <p>
                {t(recap.liveSnapCount > 0 ? VERDICT_KEYS[verdict] : 'v2.post.verdict.sideline')}
              </p>
            </div>
          </Panel>
          {reactions.length > 0 && (
            <Panel id="s2-reactions" title={t('v2.post.reactions')}>
              <ul className="s2-reactions">
                {reactions.map((reaction) => (
                  <li className="s2-reaction" key={reaction.id}>
                    <span className="s2-reaction__who">{t(SPEAKER_KEYS[reaction.speaker])}</span>
                    <span>{t(reaction.key, reaction.params)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel id="s2-changes" title={t('v2.post.changes')}>
            <div className="s2-meters">
              <Meter
                after={recap.coachTrust.after}
                color={METER_COLORS.trust}
                label={t('v2.stat.trust')}
                value={recap.coachTrust.before}
              />
              <Meter
                after={recap.body.after}
                color={METER_COLORS.body}
                label={t('v2.stat.body')}
                value={recap.body.before}
              />
              <Meter
                after={recap.confidence.after}
                color={METER_COLORS.confidence}
                label={t('v2.stat.conf')}
                value={recap.confidence.before}
              />
            </div>
            {xp.length > 0 && (
              <p className="s2-note" style={{ marginTop: 10 }}>
                {t('v2.report.growth', {
                  list: xp
                    .map((entry) => `${t(attributeNameKey(entry.attributeId))} +${entry.awardedXp}`)
                    .join(' · '),
                })}
              </p>
            )}
            <p className="s2-note" style={{ marginTop: 6 }}>
              {t('v2.player.ovr', { ovr: currentOverall(career) })}
            </p>
          </Panel>
        </div>
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={blocked}
            onClick={onNext}
            type="button"
          >
            {t('v2.post.next')} <span className="s2-btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Legacy v2 saves may rest here after week 12; the next step runs the postseason. */
export function SeasonEndScreen({
  career,
  blocked,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onContinue: () => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const last = career.log.at(-1);
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <div className="s2-next">
        <p className="s2-eyebrow">{t('v2.season.eyebrow')}</p>
        <h1 className="s2-display s2-next__title">{t('v2.season.title')}</h1>
        {last !== undefined && <p>{t('v2.post.record', { ...last.recordAfter })}</p>}
        <p className="s2-note">{t('v2.season.more')}</p>
        <button className="s2-btn" disabled={blocked} onClick={onContinue} type="button">
          {t('v2.season.continue')}
        </button>
      </div>
    </div>
  );
}
