import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  explainCurrentSnapVNext,
  projectGameStakesVNext,
  projectSnapBoardFrame,
  type CareerVNextMechanics,
  type GameStakesVNext,
  type CareerVNext,
  type SnapBoardFrame,
  type VNextPositionId,
  kickoffVNext,
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
  ROUND_KEYS,
  athleteShortName,
} from './content';
import { explanationLines } from './explanation';
import { TacticalBoard } from './TacticalBoard';
import { usePreferences } from './preferences';
import { Crest, Meter } from './ui';
import { METER_COLORS, inkOn } from './theme';

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const OUTLOOK_KEYS = {
  ADVANTAGE: 'v2.stakes.advantage',
  BALANCED: 'v2.stakes.balanced',
  CHALLENGE: 'v2.stakes.challenge',
} as const satisfies Record<GameStakesVNext['outlook'], MessageKey>;

/** Five-band pregame line (M12); the chip color keeps the three-way outlook classes. */
function outlookChip(stakes: GameStakesVNext): {
  readonly label: MessageKey;
  readonly tone: string;
} {
  if (stakes.band === undefined)
    return { label: OUTLOOK_KEYS[stakes.outlook], tone: stakes.outlook.toLowerCase() };
  const tone =
    stakes.band === 'HEAVY_FAVORITE' || stakes.band === 'FAVORITE'
      ? 'advantage'
      : stakes.band === 'TOSS_UP'
        ? 'balanced'
        : 'challenge';
  return { label: `v2.stakes.band.${stakes.band}`, tone };
}

function downText(t: AppTranslate, frame: Extract<SnapBoardFrame, { kind: 'LIVE' }>): string {
  const s = frame.situation;
  const down = t(DOWN_KEYS[s.down]);
  return s.firstDownYards >= 100
    ? t('v2.gd.andGoal', { down })
    : t('v2.gd.downDistance', { down, distance: s.distanceYards });
}

const OUTCOME_ACCENT: Readonly<Record<string, string>> = {
  TURNOVER: 'var(--hot)',
  TOUCHDOWN: 'var(--volt)',
  STOP: 'var(--volt)',
  GAIN: 'var(--volt)',
};

export function GameDayScreen({
  career,
  mechanics,
  blocked,
  reducedMotion,
  onKickoff,
  onChoose,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly reducedMotion: boolean;
  readonly onKickoff: () => void;
  readonly onChoose: (decisionId: string) => void;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const { playReview } = usePreferences();
  const [preview, setPreview] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const compact = globalThis.matchMedia?.('(max-width: 719px)').matches ?? false;
  // Kickoff is a pure command, so its result is an exact game plan: the live snaps and sideline
  // reads this Saturday holds, and how many tells the first read will show.
  const plan = useMemo(() => {
    if (career.flow.type !== 'GAME' || career.flow.game.stage !== 'PREGAME') return null;
    const kicked = kickoffVNext(career, mechanics);
    if (!kicked.ok || kicked.career.flow.type !== 'GAME') return null;
    const slots = kicked.career.flow.game.slots;
    const live = slots.filter(({ kind }) => kind === 'LIVE').length;
    const frame = projectSnapBoardFrame(kicked.career, mechanics);
    return {
      live,
      reps: slots.length - live,
      clues: frame?.look?.tellKeys.length ?? frame?.revealedClueIds.length ?? 0,
      familyNameKey: frame?.look?.familyNameKey ?? null,
    };
  }, [career, mechanics]);
  const frame = useMemo(() => projectSnapBoardFrame(career, mechanics), [career, mechanics]);
  const explanation = useMemo(
    () => explainCurrentSnapVNext(career, mechanics),
    [career, mechanics],
  );
  const choosing =
    career.flow.type === 'GAME' && career.flow.game.stage === 'SNAP' && frame !== null && !blocked;
  // Play-call shortcuts: 1–3 pick the matching card (never while typing).
  useEffect(() => {
    if (!choosing || frame === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      const index = ['1', '2', '3'].indexOf(event.key);
      const decisionId = index < 0 ? undefined : frame.decisionIds[index];
      if (decisionId === undefined) return;
      event.preventDefault();
      setPreview(null);
      onChoose(decisionId);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [choosing, frame, onChoose]);
  if (career.flow.type !== 'GAME' || career.program === null) return null;
  const game = career.flow.game;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const us = program(career.program.programId);
  const them = program(game.opponentProgramId);
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const style = {
    '--left': us.primary,
    '--right': them.primary,
    '--left-ink': inkOn(us.primary),
    '--right-ink': inkOn(them.primary),
  } as CSSProperties;
  const lastName = athleteShortName(t, career);

  if (game.stage === 'PREGAME') {
    const projection = career.program.room.projection;
    const state = career.athlete.profile.state;
    const stakes = projectGameStakesVNext(career, game.opponentProgramId, game.isHome, mechanics);
    return (
      <section aria-labelledby="s2-pregame" className="s2-gd s2-gd--pregame">
        <div className="s2-matchup" style={style}>
          <p className="s2-eyebrow s2-matchup__eyebrow">
            {game.round === undefined
              ? t('v2.gd.pregameEyebrow', { week: game.weekIndex + 1 })
              : t(ROUND_KEYS[game.round])}{' '}
            · {t(game.isHome ? 'v2.gd.home' : 'v2.gd.away')}
          </p>
          <div className="s2-matchup__teams">
            <div className="s2-matchup__team s2-matchup__team--us">
              <Crest identity={us} size={112} />
              <span className="s2-display s2-matchup__name">{t(key(us.shortNameKey))}</span>
              {stakes !== null && (
                <span className="s2-matchup__record s2-num">
                  {stakes.playerRank !== null && (
                    <>{t('v2.stakes.ranked', { rank: stakes.playerRank })} </>
                  )}
                  {t('v2.stakes.record', stakes.playerRecord)}
                </span>
              )}
            </div>
            <span aria-hidden="true" className="s2-display s2-matchup__vs">
              {t('v2.gd.versus')}
            </span>
            <div className="s2-matchup__team s2-matchup__team--them">
              <Crest identity={them} size={112} />
              <span className="s2-display s2-matchup__name">{t(key(them.shortNameKey))}</span>
              {stakes !== null && (
                <span className="s2-matchup__record s2-num">
                  {stakes.opponentRank !== null && (
                    <>{t('v2.stakes.ranked', { rank: stakes.opponentRank })} </>
                  )}
                  {t('v2.stakes.record', stakes.opponentRecord)}
                </span>
              )}
            </div>
          </div>
          <h1 className="s2-sr" id="s2-pregame">
            {t(key(us.shortNameKey))} {t('v2.gd.versus')} {t(key(them.shortNameKey))}
          </h1>
          {stakes !== null && (
            <div className="s2-stakes" aria-label={t('v2.stakes.title')}>
              <span
                className={`s2-stakes__chip s2-stakes__chip--${outlookChip(stakes).tone}`}
                title={t('v2.stakes.bandHelp')}
              >
                {t(outlookChip(stakes).label)}
              </span>
              {stakes.rivalry && (
                <span className="s2-stakes__chip s2-stakes__chip--rivalry">
                  {t('v2.stakes.rivalry')}
                </span>
              )}
              {game.academicHold === true && (
                <span className="s2-stakes__chip s2-stakes__chip--challenge">
                  {t('v2.gd.academicHold')}
                </span>
              )}
              {career.condition.availability !== null && (
                <span className="s2-stakes__chip s2-stakes__chip--challenge">
                  {t(
                    career.condition.availability.opportunityCap === 0
                      ? 'v2.gd.availOut'
                      : 'v2.gd.availLimited',
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="s2-grid-2">
          <div className="s2-panel s2-stack">
            <p className="s2-eyebrow">{t('v2.gd.yourRole')}</p>
            <p className="s2-display s2-size-h2">
              {abbr}
              {projection.rank} · {t(ROLE_KEYS[projection.roleId])}
            </p>
            {plan === null ? (
              <p className="s2-note">
                {projection.interactiveSnapMaximum >= 2
                  ? t('v2.gd.expectSnaps', {
                      min: projection.interactiveSnapMinimum,
                      max: projection.interactiveSnapMaximum,
                    })
                  : t('v2.gd.expectSideline')}
              </p>
            ) : (
              <ul className="s2-bullets" id="s2-gameplan">
                <li>
                  <span className="s2-num">
                    {t('v2.gd.planSnaps', { live: plan.live, reps: plan.reps })}
                  </span>
                </li>
                <li>
                  <span>
                    {t('v2.gd.planClues', { prep: state.preparation, count: plan.clues })}
                  </span>
                </li>
                {plan.familyNameKey !== null && (
                  <li>
                    <span>{t('v2.gd.planFirst', { look: t(key(plan.familyNameKey)) })}</span>
                  </li>
                )}
              </ul>
            )}
            {(plan?.live ?? 0) > 0 && <p className="s2-note">{t('v2.gd.keyMoments')}</p>}
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
              className="s2-btn s2-btn--block s2-btn--kickoff"
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
        <div
          className={`s2-final ${won ? 's2-final--win' : lost ? 's2-final--loss' : ''}`}
          style={style}
        >
          <p className="s2-eyebrow">{t('v2.gd.final')}</p>
          <h1
            className={`s2-display s2-final__verdict ${won ? 's2-result-w' : lost ? 's2-result-l' : ''}`}
            id="s2-final"
          >
            {t(won ? 'v2.gd.win' : lost ? 'v2.gd.loss' : 'v2.gd.regulationTie')}
          </h1>
          <div className="s2-final__score s2-display s2-num">
            <Crest identity={us} size={72} />
            <span>{summary.playerTeamScore}</span>
            <span className="s2-final__dash">–</span>
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
              {t(won || lost ? 'v2.gd.toStory' : 'v2.gd.toOvertime')}{' '}
              <span className="s2-btn__arrow">→</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (frame === null) return null;
  const pattern = gameText.pattern(positionId, frame.patternId);
  const look = frame.look;
  const live = frame.kind === 'LIVE' ? frame : null;
  const result = live?.result ?? null;
  const sideline = frame.kind === 'SIDELINE' ? frame : null;
  const resolved = game.stage === 'RESULT';
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
  // Before the snap the athlete sees the situation, never the answer-bearing look name.
  const title = look !== null ? t(key(look.familyNameKey)) : t(pattern.nameKey as MessageKey);
  const prompt =
    look !== null ? t(key(look.familyPromptKey)) : t(pattern.descriptionKey as MessageKey);
  const seen = frame.revealedClueIds.length;
  const tells =
    look !== null
      ? look.tellKeys.map((tellKey) => t(key(tellKey)))
      : frame.revealedClueIds.map((clueId) =>
          t(gameText.clue(positionId, clueId).nameKey as MessageKey),
        );
  const hidden = look === null || resolved ? 0 : Math.max(0, 3 - look.tellKeys.length);
  const decisionName = (decisionId: string) =>
    t(gameText.decision(positionId, decisionId).nameKey as MessageKey);
  const chosenId = result?.decisionId ?? sideline?.result?.decisionId ?? null;
  // M12: read, execution and the down are explained separately, from the saved play evidence.
  const lines =
    explanation === null
      ? null
      : explanationLines(t, positionId, explanation, decisionName, playReview);
  const preparationMaxed = career.athlete.profile.state.preparation >= 100;

  return (
    <section aria-labelledby="s2-snap-title" className="s2-gd s2-gd--snap">
      <div className="s2-scorebug" role="group" aria-label={t('v2.gd.scoreboard')}>
        <div
          className="s2-scorebug__team"
          style={{ '--c': us.primary, '--c-ink': inkOn(us.primary) } as CSSProperties}
        >
          <Crest identity={us} size={30} />
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
        <div
          className="s2-scorebug__team s2-scorebug__team--them"
          style={{ '--c': them.primary, '--c-ink': inkOn(them.primary) } as CSSProperties}
        >
          <span className="s2-scorebug__score s2-num">{score?.opponent ?? '–'}</span>
          <span className="s2-scorebug__abbr">{them.monogram}</span>
          <Crest identity={them} size={30} />
        </div>
        <div className="s2-scorebug__situation">
          {live !== null ? downText(t, live) : t('v2.gd.sideline')}
        </div>
      </div>

      {live !== null &&
        game.stage === 'SNAP' &&
        (live.meanwhile.playerTeam > 0 || live.meanwhile.opponent > 0) && (
          <p className="s2-ticker" role="status">
            {t('v2.gd.meanwhile', {
              us: us.monogram,
              a: live.meanwhile.playerTeam,
              them: them.monogram,
              b: live.meanwhile.opponent,
            })}
          </p>
        )}
      <div className="s2-gd__stage">
        <div className="s2-gd__field">
          <TacticalBoard
            athleteLabel={abbr}
            banner={sideline !== null ? t('v2.gd.sidelineBanner') : snapCounter}
            compact={compact}
            frame={frame}
            gapLabels={[t('v2.board.gapA'), t('v2.board.gapB'), t('v2.board.gapC')]}
            legend={{ presnap: t('v2.look.legendPresnap'), read: t('v2.look.legendRead') }}
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
          {resolved && result !== null && (
            <div
              className={`s2-lowerthird s2-lowerthird--${result.outcome.toLowerCase()}`}
              role="status"
              style={
                { '--accent': OUTCOME_ACCENT[result.outcome] ?? 'var(--gold)' } as CSSProperties
              }
            >
              <div className="s2-lowerthird__body">
                <p className="s2-eyebrow">{decisionName(result.decisionId)}</p>
                <p className="s2-display s2-lowerthird__headline">
                  {t(
                    playHeadlineKey(positionId, result.playResultId, result.yards, result.outcome),
                    {
                      name: lastName,
                      yards: Math.abs(result.yards),
                    },
                  )}
                </p>
                <p>
                  <span
                    className={`s2-effect ${result.readQuality === 'MISSED' ? 's2-effect--down' : 's2-effect--up'}`}
                  >
                    {t(READ_KEYS[result.readQuality].name)}
                  </span>{' '}
                  <span className="s2-note">{lines?.read}</span>
                </p>
                {lines !== null && (
                  <dl className="s2-explain">
                    <div className="s2-explain__row">
                      <dt>{t('v2.explain.execution')}</dt>
                      <dd>{lines.execution}</dd>
                    </div>
                    <div className="s2-explain__row">
                      <dt>{t('v2.explain.situation')}</dt>
                      <dd>{lines.situation}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          )}
          {resolved && sideline?.result != null && (
            <div className="s2-lowerthird" role="status">
              <div className="s2-lowerthird__body">
                <p className="s2-eyebrow">{t('v2.gd.sideline')}</p>
                <p className="s2-display s2-lowerthird__headline">
                  {t(READ_KEYS[sideline.result.grade].sideline)}
                </p>
                {sideline.result.grade !== 'SHARP' && (
                  <p className="s2-note">
                    {t('v2.sideline.best', {
                      decision: decisionName(sideline.result.bestDecisionId),
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="s2-gd__call">
          <header className="s2-gd__head">
            <p className="s2-eyebrow">{snapCounter}</p>
            <h1 className="s2-display s2-size-h2" id="s2-snap-title">
              {title}
            </h1>
            <p className="s2-note">{prompt}</p>
          </header>
          {!resolved && (
            <div className="s2-clues" aria-label={t('v2.look.tellsTitle')} role="list">
              <p className="s2-eyebrow">{t('v2.look.tellsTitle')}</p>
              {tells.length === 0 ? (
                <p className="s2-note" role="listitem">
                  {t('v2.look.noTells')}
                </p>
              ) : (
                tells.map((tell, index) => (
                  <div className="s2-clue" key={tell} role="listitem">
                    <span className="s2-clue__n">{index + 1}</span>
                    <span>{tell}</span>
                  </div>
                ))
              )}
              {hidden > 0 && (
                <p className="s2-clue s2-clue--locked" role="listitem">
                  <span aria-hidden="true" className="s2-clue__n">
                    ?
                  </span>
                  <span>
                    {t(preparationMaxed ? 'v2.look.moreTellsCapped' : 'v2.look.moreTells', {
                      count: hidden,
                    })}
                  </span>
                </p>
              )}
            </div>
          )}
          {game.stage === 'SNAP' ? (
            <>
              <div aria-label={t('v2.gd.chooseLabel')} className="s2-choices" role="group">
                {frame.decisionIds.map((decisionId, index) => {
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
                      <span aria-hidden="true" className="s2-choice__key">
                        {index + 1}
                      </span>
                      <span className="s2-choice__name">{t(decision.nameKey as MessageKey)}</span>
                      <span className="s2-choice__desc">
                        {t(decision.descriptionKey as MessageKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p aria-hidden="true" className="s2-note s2-gd__keys">
                {t('v2.look.keysHint')}
              </p>
            </>
          ) : (
            <div className="s2-stack">
              {playReview && look?.reveal != null && (
                <div className="s2-reveal">
                  <p className="s2-eyebrow">{t('v2.look.revealTitle')}</p>
                  <p className="s2-display s2-reveal__name">{t(key(look.reveal.nameKey))}</p>
                  <p
                    className={`s2-reveal__answer ${chosenId === look.reveal.bestDecisionId ? 's2-up' : 's2-down'}`}
                  >
                    {t('v2.look.answer', { decision: decisionName(look.reveal.bestDecisionId) })}
                  </p>
                  <ol className="s2-reveal__tells">
                    {look.reveal.allTellKeys.map((tellKey, index) => (
                      <li
                        className={
                          index < seen
                            ? 's2-reveal__tell'
                            : 's2-reveal__tell s2-reveal__tell--unseen'
                        }
                        key={tellKey}
                      >
                        {index >= seen && <span className="s2-sr">{t('v2.look.unseen')}: </span>}
                        {t(key(tellKey))}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
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
        </aside>
      </div>
      {resolved && (
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
