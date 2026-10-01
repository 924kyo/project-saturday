import type { CSSProperties } from 'react';
import {
  explainGamePlaysVNext,
  gameScoreSplitVNext,
  projectCompletedPlayFrames,
  selectGameHighlightsVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type VNextPositionId,
} from '@project-saturday/game-core';

import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  ROUND_KEYS,
  STAT_KEYS,
  READ_KEYS,
  VERDICT_KEYS,
  athleteName,
  currentOverall,
  gameText,
  key,
  playHeadlineKey,
  practiceBand,
  program,
  athleteShortName,
} from './content';
import { explanationLines } from './explanation';
import { GrowthList } from './Growth';
import { mergeGrowth } from './growth-model';
import { Nameplate } from './Nameplate';
import { usePreferences } from './preferences';
import { SPEAKER_KEYS, selectReactions } from './reactions';
import { Crest, Meter, Panel } from './ui';
import { METER_COLORS } from './theme';

export function PostGameScreen({
  career,
  mechanics,
  blocked,
  onNext,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onNext: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const { playReview } = usePreferences();
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
  const lastName = athleteShortName(t, career);
  const stats = Object.entries(summary.statLine as unknown as Record<string, number>).filter(
    ([field, value]) => value !== 0 && STAT_KEYS[field] !== undefined,
  );
  const allPlays = projectCompletedPlayFrames(positionId, recap.engine, {
    career,
    weekIndex: recap.weekIndex,
    mechanics,
    ...(recap.lookIds === undefined ? {} : { lookIds: recap.lookIds }),
  }).map((play, index) => ({ ...play, index }));
  // M12: the story picks plays by leverage (down, quarter, margin, outcome), not raw yards, and a
  // play that went the athlete's way is always eligible (regression report P9).
  const explanations = explainGamePlaysVNext(
    career,
    recap.engine,
    recap.weekIndex,
    mechanics,
    recap.lookIds,
  );
  const highlights = selectGameHighlightsVNext(explanations);
  const plays = highlights.defining.map((index) => allPlays[index]!).filter(Boolean);
  const split = gameScoreSplitVNext(recap.engine, {
    playerTeam: recap.playerScore,
    opponent: recap.opponentScore,
  });
  const verdict = practiceBand(recap.coachGrade ?? summary.gradeScore);
  const grown = mergeGrowth(growth.attributeXp);
  const sharp = recap.sideline.filter(({ grade }) => grade === 'SHARP').length;
  const reactions = selectReactions(
    recap,
    positionId,
    career.program === null || career.legacy === undefined
      ? undefined
      : { programId: career.program.programId, alumni: career.legacy.alumni },
  );
  const style = { '--left': us.primary, '--right': them.primary } as CSSProperties;
  const decisionName = (id: string) => t(gameText.decision(positionId, id).nameKey as MessageKey);
  const headline = (play: (typeof allPlays)[number]) =>
    t(
      playHeadlineKey(positionId, play.result.playResultId, play.result.yards, play.result.outcome),
      {
        name: lastName,
        yards: Math.abs(play.result.yards),
      },
    );
  // The news report: headline and lede from saved facts only.
  const names = {
    name: athleteName(t, career),
    us: t(key(us.shortNameKey)),
    them: t(key(them.shortNameKey)),
    a: recap.playerScore,
    b: recap.opponentScore,
  };
  const star = recap.liveSnapCount > 0 && (recap.coachGrade ?? 0) >= 75;
  const newsHead = t(
    won
      ? star
        ? 'v2.news.headWinStar'
        : 'v2.news.headWin'
      : star
        ? 'v2.news.headLossStar'
        : 'v2.news.headLoss',
    names,
  );
  const liveSharp = allPlays.filter(({ result }) => result.readQuality === 'SHARP').length;
  const lede: string[] = [];
  if (stats.length > 0)
    lede.push(
      t('v2.news.stats', {
        name: lastName,
        line: stats.map(([field, value]) => `${value} ${t(STAT_KEYS[field]!)}`).join(' · '),
      }),
    );
  if (allPlays.length > 0)
    lede.push(t('v2.news.reads', { sharp: liveSharp, total: allPlays.length }));
  else if (recap.sideline.length > 0)
    lede.push(t('v2.news.sideline', { sharp, total: recap.sideline.length }));
  // "Play of the game" is the athlete's best positive snap; without one, the snap that mattered most.
  if (highlights.playOfGame !== null)
    lede.push(t('v2.news.best', { play: headline(allPlays[highlights.playOfGame]!) }));
  else if (highlights.turningPoint !== null)
    lede.push(t('v2.news.turningPointWhy', { play: headline(allPlays[highlights.turningPoint]!) }));
  if (allPlays.length > 0)
    lede.push(
      t('v2.post.contribution', {
        us: us.monogram,
        them: them.monogram,
        a: split.onSnaps.playerTeam,
        b: split.onSnaps.opponent,
        c: split.elsewhere.playerTeam,
        d: split.elsewhere.opponent,
      }),
    );
  if (recap.liveSnapCount > 0) lede.push(t('v2.news.grade', { band: verdict }));

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

      <article aria-labelledby="s2-news-head" className="s2-news">
        <p className="s2-eyebrow">{t('v2.news.eyebrow')}</p>
        <h2 className="s2-display s2-news__head" id="s2-news-head">
          {newsHead}
        </h2>
        {lede.map((line) => (
          <p className="s2-news__line" key={line}>
            {line}
          </p>
        ))}
      </article>

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
                        {t(
                          playHeadlineKey(
                            positionId,
                            play.result.playResultId,
                            play.result.yards,
                            play.result.outcome,
                          ),
                          {
                            name: lastName,
                            yards: Math.abs(play.result.yards),
                          },
                        )}
                      </strong>
                      <br />
                      <span className="s2-note">
                        {play.lookNameKey !== null
                          ? t(key(play.lookNameKey))
                          : t(
                              gameText.pattern(positionId, play.patternId).nameKey as MessageKey,
                            )}{' '}
                        ·{' '}
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
                aria-label={t('v2.post.gradeLabel', { band: verdict })}
              >
                {recap.liveSnapCount > 0 ? verdict : '—'}
              </span>
              <p>
                {t(recap.liveSnapCount > 0 ? VERDICT_KEYS[verdict] : 'v2.post.verdict.sideline')}
                {recap.gradeParts !== undefined && recap.gradeParts.reads !== null && (
                  <span className="s2-note s2-gradewhy">
                    {t('v2.post.gradeWhy', {
                      reads: recap.gradeParts.reads,
                      box: recap.gradeParts.box,
                    })}{' '}
                    {t('v2.post.gradeScale')}
                  </span>
                )}
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
            <p className="s2-note" style={{ marginTop: 6 }}>
              {t('v2.player.ovr', { ovr: currentOverall(career) })}
            </p>
          </Panel>
        </div>
        {grown.length > 0 && (
          <Panel className="s2-panel--wide" id="s2-post-growth" title={t('v2.post.growthTitle')}>
            <GrowthList rows={grown} />
          </Panel>
        )}
        {playReview && allPlays.length > 0 && (
          <Panel className="s2-panel--wide" id="s2-playreview" title={t('v2.review.title')}>
            <details className="s2-reviewfold">
              <summary>{t('v2.review.expand')}</summary>
              <ol className="s2-review">
                {allPlays.map((play) => (
                  <li className="s2-review__row" key={play.index}>
                    <span className="s2-play__tag">
                      {t('v2.post.quarter', { period: play.situation.period })}
                    </span>
                    <span className="s2-stack" style={{ gap: 2 }}>
                      <strong>
                        {play.lookNameKey !== null
                          ? t(key(play.lookNameKey))
                          : t(gameText.pattern(positionId, play.patternId).nameKey as MessageKey)}
                      </strong>
                      <span>
                        {t('v2.review.yourCall', {
                          decision: decisionName(play.result.decisionId),
                        })}
                      </span>
                      {play.bestDecisionId !== null &&
                        play.bestDecisionId !== play.result.decisionId && (
                          <span className="s2-up">
                            {t('v2.review.best', { decision: decisionName(play.bestDecisionId) })}
                          </span>
                        )}
                      <span className="s2-note">{headline(play)}</span>
                      {explanations[play.index] !== undefined && (
                        <span className="s2-note">
                          {(() => {
                            const lines = explanationLines(
                              t,
                              positionId,
                              explanations[play.index]!,
                              decisionName,
                              playReview,
                            );
                            return `${lines.execution} ${lines.situation}`;
                          })()}
                        </span>
                      )}
                    </span>
                    <span
                      className={`s2-effect ${play.result.readQuality === 'MISSED' ? 's2-effect--down' : 's2-effect--up'}`}
                    >
                      {t(READ_KEYS[play.result.readQuality].name)}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </Panel>
        )}
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
