import { useState, type CSSProperties } from 'react';
import {
  projectSnapBoardFrame,
  type CareerVNext,
  type SnapBoardFrame,
  type VNextPositionId,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import {
  DOWN_KEYS,
  POSITION_ABBR_KEYS,
  READ_KEYS,
  ROLE_KEYS,
  gameText,
  key,
  playHeadlineKey,
  program,
} from './content';
import { TacticalBoard } from './TacticalBoard';
import { Crest, Meter } from './ui';
import { METER_COLORS } from './theme';

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function downText(t: AppTranslate, frame: Extract<SnapBoardFrame, { kind: 'LIVE' }>): string {
  const s = frame.situation;
  const down = t(DOWN_KEYS[s.down]);
  return s.firstDownYards >= 100
    ? t('v2.gd.andGoal', { down })
    : t('v2.gd.downDistance', { down, distance: s.distanceYards });
}

export function GameDayScreen({
  career,
  blocked,
  reducedMotion,
  onKickoff,
  onChoose,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly reducedMotion: boolean;
  readonly onKickoff: () => void;
  readonly onChoose: (decisionId: string) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const compact = globalThis.matchMedia?.('(max-width: 719px)').matches ?? false;
  if (career.flow.type !== 'GAME' || career.program === null) return null;
  const game = career.flow.game;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const us = program(career.program.programId);
  const them = program(game.opponentProgramId);
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const style = { '--left': us.primary, '--right': them.primary } as CSSProperties;
  const name = career.athlete.profile.displayName;
  const lastName = name.split(' ').at(-1) ?? name;

  if (game.stage === 'PREGAME') {
    const projection = career.program.room.projection;
    const state = career.athlete.profile.state;
    return (
      <section aria-labelledby="s2-pregame" className="s2-gd">
        <div className="s2-final" style={style}>
          <p className="s2-eyebrow" style={{ color: '#fff' }}>
            {t('v2.gd.pregameEyebrow', { week: game.weekIndex + 1 })} ·{' '}
            {t(game.isHome ? 'v2.gd.home' : 'v2.gd.away')}
          </p>
          <div className="s2-final__score s2-display">
            <Crest identity={us} size={96} />
            <span style={{ fontSize: 40 }}>{t('v2.gd.versus')}</span>
            <Crest identity={them} size={96} />
          </div>
          <h1 className="s2-display s2-size-h2" id="s2-pregame">
            {t(key(us.shortNameKey))} {t('v2.gd.versus')} {t(key(them.shortNameKey))}
          </h1>
        </div>
        <div className="s2-grid-2">
          <div className="s2-panel s2-stack">
            <p className="s2-eyebrow">{t('v2.gd.yourRole')}</p>
            <p className="s2-display" style={{ fontSize: 34 }}>
              {abbr}
              {projection.rank} · {t(ROLE_KEYS[projection.roleId])}
            </p>
            <p className="s2-note">
              {projection.interactiveSnapMaximum >= 2
                ? t('v2.gd.expectSnaps', {
                    min: projection.interactiveSnapMinimum,
                    max: projection.interactiveSnapMaximum,
                  })
                : t('v2.gd.expectSideline')}
            </p>
          </div>
          <div className="s2-panel">
            <div className="s2-meters">
              <Meter color={METER_COLORS.body} label={t('v2.stat.body')} value={state.body} />
              <Meter
                color={METER_COLORS.preparation}
                label={t('v2.stat.prep')}
                value={state.preparation}
              />
              <Meter
                color={METER_COLORS.confidence}
                label={t('v2.stat.conf')}
                value={state.confidence}
              />
            </div>
          </div>
        </div>
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={onKickoff}
              type="button"
            >
              {t('v2.gd.kickoff')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (game.stage === 'FINAL') {
    const summary = game.engine?.game.type === 'COMPLETE' ? game.engine.game.summary : null;
    if (summary === null) return null;
    const won = summary.playerTeamScore > summary.opponentScore;
    const lost = summary.playerTeamScore < summary.opponentScore;
    return (
      <section aria-labelledby="s2-final" className="s2-gd">
        <div className="s2-final" style={style}>
          <p className="s2-eyebrow" style={{ color: '#fff' }}>
            {t('v2.gd.final')}
          </p>
          <h1
            className={`s2-display ${won ? 's2-result-w' : lost ? 's2-result-l' : ''}`}
            id="s2-final"
            style={{ fontSize: 44 }}
          >
            {t(won ? 'v2.gd.win' : lost ? 'v2.gd.loss' : 'v2.gd.tie')}
          </h1>
          <div className="s2-final__score s2-display s2-num">
            <Crest identity={us} size={72} />
            <span>{summary.playerTeamScore}</span>
            <span style={{ opacity: 0.5 }}>–</span>
            <span>{summary.opponentScore}</span>
            <Crest identity={them} size={72} />
          </div>
        </div>
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={onContinue}
              type="button"
            >
              {t('v2.gd.toStory')} <span className="s2-btn__arrow">→</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const frame = projectSnapBoardFrame(career);
  if (frame === null) return null;
  const pattern = gameText.pattern(positionId, frame.patternId);
  const live = frame.kind === 'LIVE' ? frame : null;
  const result = live?.result ?? null;
  const sideline = frame.kind === 'SIDELINE' ? frame : null;
  const score = result?.scoreAfter ?? live?.situation.score ?? null;
  const summaryText =
    live !== null
      ? t('v2.gd.boardSummary', {
          down: downText(t, live),
          yard: live.situation.lineOfScrimmageYards,
          period: live.situation.period,
          clock: clock(live.situation.secondsRemaining),
        })
      : t('v2.gd.sidelineSummary', { period: frame.kind === 'SIDELINE' ? frame.period : 1 });
  const snapCounter =
    live !== null
      ? t('v2.gd.snapCounter', { n: live.snapNumber, total: live.snapTotal })
      : t('v2.gd.repCounter', { n: sideline!.repNumber, total: sideline!.repTotal });

  return (
    <section aria-labelledby="s2-snap-title" className="s2-gd">
      <div className="s2-scorebug" role="group" aria-label={t('v2.gd.scoreboard')}>
        <div className="s2-scorebug__team" style={{ '--c': us.primary } as CSSProperties}>
          <span className="s2-scorebug__abbr">{us.monogram}</span>
          <span className="s2-scorebug__score s2-num">{score?.playerTeam ?? '–'}</span>
        </div>
        <div className="s2-scorebug__mid s2-num">
          {live !== null
            ? t('v2.gd.quarterClock', {
                period: live.situation.period,
                clock: clock(live.situation.secondsRemaining),
              })
            : t('v2.gd.quarter', { period: sideline!.period })}
        </div>
        <div className="s2-scorebug__team" style={{ '--c': them.primary } as CSSProperties}>
          <span className="s2-scorebug__abbr">{them.monogram}</span>
          <span className="s2-scorebug__score s2-num">{score?.opponent ?? '–'}</span>
        </div>
        <div className="s2-scorebug__situation">
          {live !== null ? downText(t, live) : t('v2.gd.sideline')}
        </div>
      </div>

      <div className="s2-grid-2">
        <div className="s2-stack">
          <TacticalBoard
            athleteLabel={abbr}
            banner={sideline !== null ? t('v2.gd.sidelineBanner') : snapCounter}
            compact={compact}
            frame={frame}
            gapLabels={[t('v2.board.gapA'), t('v2.board.gapB'), t('v2.board.gapC')]}
            opponentColor={them.primary}
            positionId={positionId}
            previewDecisionId={preview}
            reducedMotion={reducedMotion}
            replayKey={replay}
            summary={summaryText}
            tagLabels={{
              td: t('v2.tag.td'),
              int: t('v2.tag.int'),
              fumble: t('v2.tag.fumble'),
              sack: t('v2.tag.sack'),
              pbu: t('v2.tag.pbu'),
              drop: t('v2.tag.drop'),
              incomplete: t('v2.tag.incomplete'),
            }}
            teamColor={us.primary}
          />
          <p className="s2-sr">{summaryText}</p>
          {game.stage === 'RESULT' && result !== null && (
            <div
              className="s2-lowerthird"
              role="status"
              style={
                {
                  '--accent':
                    result.outcome === 'TURNOVER'
                      ? '#ff5a5f'
                      : result.outcome === 'TOUCHDOWN'
                        ? '#3ecf8e'
                        : '#f5c542',
                } as CSSProperties
              }
            >
              <div className="s2-lowerthird__body">
                <p className="s2-eyebrow">
                  {t(gameText.decision(positionId, result.decisionId).nameKey as MessageKey)}
                </p>
                <p className="s2-display s2-lowerthird__headline">
                  {t(playHeadlineKey(positionId, result.playResultId), {
                    name: lastName,
                    yards: Math.abs(result.yards),
                  })}
                </p>
                <p>
                  <span
                    className={`s2-effect ${result.readQuality === 'MISSED' ? 's2-effect--down' : 's2-effect--up'}`}
                  >
                    {t(READ_KEYS[result.readQuality].name)}
                  </span>{' '}
                  <span className="s2-note">{t(READ_KEYS[result.readQuality].help)}</span>
                </p>
              </div>
            </div>
          )}
          {game.stage === 'RESULT' && sideline?.result != null && (
            <div className="s2-lowerthird" role="status">
              <div className="s2-lowerthird__body">
                <p className="s2-eyebrow">{t('v2.gd.sideline')}</p>
                <p className="s2-display s2-lowerthird__headline">
                  {t(READ_KEYS[sideline.result.grade].sideline)}
                </p>
                {sideline.result.grade !== 'SHARP' && (
                  <p className="s2-note">
                    {t('v2.sideline.best', {
                      decision: t(
                        gameText.decision(positionId, sideline.result.bestDecisionId)
                          .nameKey as MessageKey,
                      ),
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="s2-stack">
          <div>
            <p className="s2-eyebrow">{snapCounter}</p>
            <h1 className="s2-display s2-size-h2" id="s2-snap-title">
              {t(pattern.nameKey as MessageKey)}
            </h1>
            <p className="s2-note">{t(pattern.descriptionKey as MessageKey)}</p>
          </div>
          <div className="s2-clues" aria-label={t('v2.gd.whatYouSee')} role="list">
            <p className="s2-eyebrow">{t('v2.gd.whatYouSee')}</p>
            {frame.revealedClueIds.length === 0 ? (
              <p className="s2-note">{t('v2.gd.noClues')}</p>
            ) : (
              frame.revealedClueIds.map((clueId, index) => {
                const clue = gameText.clue(positionId, clueId);
                return (
                  <div className="s2-clue" key={clueId} role="listitem">
                    <span className="s2-clue__n">{index + 1}</span>
                    <span>
                      <strong>{t(clue.nameKey as MessageKey)}</strong>
                      {t(clue.descriptionKey as MessageKey) !== t(clue.nameKey as MessageKey) && (
                        <>
                          <br />
                          {t(clue.descriptionKey as MessageKey)}
                        </>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {game.stage === 'SNAP' ? (
            <div aria-label={t('v2.gd.chooseLabel')} className="s2-choices" role="group">
              {frame.decisionIds.map((decisionId) => {
                const decision = gameText.decision(positionId, decisionId);
                return (
                  <button
                    className="s2-choice"
                    disabled={blocked}
                    key={decisionId}
                    onBlur={() => setPreview(null)}
                    onClick={() => {
                      setPreview(null);
                      onChoose(decisionId);
                    }}
                    onFocus={() => setPreview(decisionId)}
                    onMouseEnter={() => setPreview(decisionId)}
                    onMouseLeave={() => setPreview(null)}
                    type="button"
                  >
                    <span className="s2-choice__name">{t(decision.nameKey as MessageKey)}</span>
                    <span className="s2-choice__desc">
                      {t(decision.descriptionKey as MessageKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="s2-row">
              {result !== null && !reducedMotion && (
                <button
                  className="s2-btn s2-btn--ghost"
                  onClick={() => setReplay(replay + 1)}
                  type="button"
                >
                  {t('v2.gd.replay')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {game.stage === 'RESULT' && (
        <div className="s2-actionbar">
          <div className="s2-actionbar__inner">
            <button
              className="s2-btn s2-btn--block"
              disabled={blocked}
              onClick={onContinue}
              type="button"
            >
              {game.cursor + 1 < game.slots.length ? t('v2.gd.nextSnap') : t('v2.gd.toFinal')}{' '}
              <span className="s2-btn__arrow">→</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
