import type {
  DepthRoleId,
  GameInformationTierId,
  GamePlayResultId,
  GameResultId,
  KeySnapDecisionId,
  PerformanceGradeBandId,
  ProgramId,
} from '@project-saturday/game-core';
import { gameContent, programContent } from '@project-saturday/game-content/content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import { ATTRIBUTE_LABEL_KEYS } from './career-ui';
import { formatSignedNumber } from './units';
import { wrResolvedSnap, wrTacticalGame, type WrCareerSurface } from './wr-view';

const ROLE_LABEL_KEYS = {
  depth_role_starter: 'career.program.role.starter',
  depth_role_rotation: 'career.program.role.rotation',
  depth_role_reserve: 'career.program.role.reserve',
  depth_role_developmental: 'career.program.role.developmental',
} as const satisfies Readonly<Record<DepthRoleId, MessageKey>>;

const INFORMATION_TIER_LABEL_KEYS = {
  game_information_uncertain: 'career.game.information.uncertain',
  game_information_partial: 'career.game.information.partial',
  game_information_diagnostic: 'career.game.information.diagnostic',
} as const satisfies Readonly<Record<GameInformationTierId, MessageKey>>;

const GAME_RESULT_LABEL_KEYS = {
  game_result_win: 'career.game.result.win',
  game_result_loss: 'career.game.result.loss',
  game_result_tie: 'career.game.result.tie',
} as const satisfies Readonly<Record<GameResultId, MessageKey>>;

const GRADE_BAND_LABEL_KEYS = {
  performance_grade_elite: 'career.game.grade.elite',
  performance_grade_strong: 'career.game.grade.strong',
  performance_grade_solid: 'career.game.grade.solid',
  performance_grade_developing: 'career.game.grade.developing',
  performance_grade_poor: 'career.game.grade.poor',
} as const satisfies Readonly<Record<PerformanceGradeBandId, MessageKey>>;

const PLAY_RESULT_LABEL_KEYS = {
  game_play_result_not_targeted: 'career.game.play.notTargeted',
  game_play_result_incomplete: 'career.game.play.incomplete',
  game_play_result_drop: 'career.game.play.drop',
  game_play_result_reception: 'career.game.play.reception',
  game_play_result_touchdown: 'career.game.play.touchdown',
  game_play_result_turnover: 'career.game.play.turnover',
} as const satisfies Readonly<Record<GamePlayResultId, MessageKey>>;

export interface GameFlowProps {
  readonly career: WrCareerSurface;
  readonly controlsDisabled: boolean;
  readonly locale: SupportedLocale;
  readonly onChooseDecision: (decisionId: KeySnapDecisionId) => void;
  readonly onContinueSnap?: (() => void) | undefined;
  readonly onStartGame: () => void;
}

function contentMessage(t: AppTranslate, key: string): string {
  return t(key as MessageKey);
}

function programName(t: AppTranslate, programId: ProgramId): string {
  const program = programContent.programs.find(({ id }) => id === programId);
  if (program === undefined) throw new Error(`Missing program presentation for ${programId}.`);
  return contentMessage(t, program.nameKey);
}

function formatClock(locale: SupportedLocale, secondsRemaining: number): string {
  const minuteFormatter = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  const secondFormatter = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  return `${minuteFormatter.format(Math.floor(secondsRemaining / 60))}:${secondFormatter.format(secondsRemaining % 60)}`;
}

function scoreBoard(
  t: AppTranslate,
  playerProgramId: ProgramId,
  opponentProgramId: ProgramId,
  playerScore: number,
  opponentScore: number,
): React.JSX.Element {
  return (
    <section className="game-scoreboard" aria-label={t('career.game.scoreboard')}>
      <div>
        <span>{programName(t, playerProgramId)}</span>
        <strong>{playerScore}</strong>
      </div>
      <span className="game-scoreboard__divider" aria-hidden="true">
        –
      </span>
      <div>
        <span>{programName(t, opponentProgramId)}</span>
        <strong>{opponentScore}</strong>
      </div>
    </section>
  );
}

function GamePreview({
  career,
  controlsDisabled,
  locale,
  onStartGame,
}: Pick<GameFlowProps, 'career' | 'controlsDisabled' | 'locale' | 'onStartGame'>) {
  const { t } = useAppTranslation(locale);
  if (career.phase.type !== 'GAME_PREVIEW') return null;
  const { matchup } = career.phase;
  const usedFilmStudy = matchup.completedWeek.results.some(
    ({ actionId }) => actionId === 'action_film_study',
  );

  return (
    <div className="game-flow game-preview" data-testid="game-preview">
      <p className="game-flow__lead">{t('career.game.preview.help')}</p>
      <section className="matchup-card" aria-label={t('career.game.matchup')}>
        <p className="matchup-card__venue">
          {t(matchup.isHome ? 'career.game.venue.home' : 'career.game.venue.away')}
        </p>
        <div className="matchup-card__teams">
          <strong>{programName(t, matchup.playerProgramId)}</strong>
          <span>{t('career.game.matchupVersus')}</span>
          <strong>{programName(t, matchup.opponentProgramId)}</strong>
        </div>
      </section>
      <dl className="game-preview__facts">
        <div>
          <dt>{t('career.game.preview.role')}</dt>
          <dd>{t(ROLE_LABEL_KEYS[matchup.pregameProjection.roleId])}</dd>
        </div>
        <div>
          <dt>{t('career.game.preview.opportunities')}</dt>
          <dd>{matchup.opportunityBudget}</dd>
        </div>
        <div>
          <dt>{t('career.player.body')}</dt>
          <dd>{career.player.state.body}</dd>
        </div>
        <div>
          <dt>{t('career.player.preparation')}</dt>
          <dd>{career.player.state.preparation}</dd>
        </div>
        <div>
          <dt>{t('career.player.confidence')}</dt>
          <dd>{career.player.state.confidence}</dd>
        </div>
        <div>
          <dt>{t('career.game.preview.filmStudy')}</dt>
          <dd>{t(usedFilmStudy ? 'career.game.yes' : 'career.game.no')}</dd>
        </div>
      </dl>
      <p className="game-flow__note">
        {t(
          matchup.opportunityBudget === 0
            ? 'career.game.preview.zeroOpportunity'
            : 'career.game.preview.opportunityHelp',
        )}
      </p>
      <button
        className="primary-action"
        data-testid="start-game"
        disabled={controlsDisabled}
        type="button"
        onClick={onStartGame}
      >
        {t(controlsDisabled ? 'career.game.saving' : 'career.game.preview.start')}
      </button>
    </div>
  );
}

function GameKeySnap({
  career,
  controlsDisabled,
  locale,
  onChooseDecision,
}: Pick<GameFlowProps, 'career' | 'controlsDisabled' | 'locale' | 'onChooseDecision'>) {
  const { t } = useAppTranslation(locale);
  if (career.phase.type !== 'KEY_SNAP') return null;
  const { game, pendingSnap } = career.phase;
  const pattern = gameContent.patterns.find(({ id }) => id === pendingSnap.patternId);
  const family = gameContent.decisionFamilies.find(({ id }) => id === pendingSnap.familyId);
  if (pattern === undefined || family === undefined) {
    throw new Error(`Missing game presentation for ${pendingSnap.patternId}.`);
  }
  const previousPlay = game.keyPlayLog.at(-1);

  return (
    <div className="game-flow key-snap-flow" data-testid="game-key-snap">
      {scoreBoard(
        t,
        game.matchup.playerProgramId,
        game.matchup.opponentProgramId,
        game.score.playerTeam,
        game.score.opponent,
      )}
      <div className="game-situation" data-testid="game-situation">
        <strong>
          {t('career.game.situation', {
            clock: formatClock(locale, game.clock.clockSecondsRemaining),
            distance: game.situation.distanceYards,
            down: game.situation.down,
            period: game.clock.period,
            yardLine: game.situation.yardLine,
          })}
        </strong>
        <span>
          {t('career.game.opportunityProgress', {
            count: game.opportunitiesPresented + 1,
            total: game.matchup.opportunityBudget,
          })}
        </span>
      </div>
      {previousPlay !== undefined && (
        <p className="last-play" data-testid="last-key-snap-result" role="status">
          {t('career.game.lastPlay', {
            result: t(PLAY_RESULT_LABEL_KEYS[previousPlay.resultId]),
            yards: previousPlay.receivingYardsDelta,
          })}
        </p>
      )}
      <section className="snap-context" aria-labelledby="snap-context-heading">
        <p className="step-mark">{contentMessage(t, family.nameKey)}</p>
        <h3 id="snap-context-heading">{contentMessage(t, pattern.nameKey)}</h3>
        <p>{contentMessage(t, pattern.descriptionKey)}</p>
      </section>
      <section className="snap-information" aria-label={t('career.game.information.title')}>
        <div>
          <span>{t('career.game.information.title')}</span>
          <strong>{t(INFORMATION_TIER_LABEL_KEYS[pendingSnap.informationTierId])}</strong>
        </div>
        <p>
          {t(
            pendingSnap.information.filmStudyApplied
              ? 'career.game.information.filmApplied'
              : 'career.game.information.filmNotApplied',
          )}
        </p>
        {pendingSnap.revealedClueIds.length === 0 ? (
          <p>{t('career.game.information.noClues')}</p>
        ) : (
          <ul>
            {pendingSnap.revealedClueIds.map((clueId) => {
              const clue = gameContent.clues.find(({ id }) => id === clueId);
              // eslint-disable-next-line i18next/no-literal-string -- Internal content-integrity diagnostic.
              if (clue === undefined) throw new Error(`Missing clue presentation for ${clueId}.`);
              return (
                <li key={clueId}>
                  <strong>{contentMessage(t, clue.nameKey)}</strong>
                  <span>{contentMessage(t, clue.descriptionKey)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <fieldset className="snap-decisions" disabled={controlsDisabled}>
        <legend>{t('career.game.keySnap.choose')}</legend>
        {pendingSnap.decisionIds.map((decisionId) => {
          const decision = gameContent.decisions.find(({ id }) => id === decisionId);
          if (decision === undefined) {
            // eslint-disable-next-line i18next/no-literal-string -- Internal content-integrity diagnostic.
            throw new Error(`Missing decision presentation for ${decisionId}.`);
          }
          return (
            <button
              className="snap-decision"
              data-decision-id={decisionId}
              data-testid={`game-decision-${decisionId}`}
              key={decisionId}
              type="button"
              onClick={() => onChooseDecision(decisionId)}
            >
              <strong>{contentMessage(t, decision.nameKey)}</strong>
              <span>{contentMessage(t, decision.descriptionKey)}</span>
            </button>
          );
        })}
      </fieldset>
      {controlsDisabled && <p className="game-flow__note">{t('career.game.saving')}</p>}
    </div>
  );
}

/** Saved current-rules result; continuing is a separate explicit command, never automatic. */
function GameResolvedSnap({
  career,
  controlsDisabled,
  locale,
  onContinueSnap,
}: Pick<GameFlowProps, 'career' | 'controlsDisabled' | 'locale' | 'onContinueSnap'>) {
  const { t } = useAppTranslation(locale);
  const resolved = wrResolvedSnap(career);
  const preview = wrTacticalGame(career)?.source.phase;
  if (resolved === null || preview?.type !== 'GAME_PREVIEW') return null;
  const { play } = resolved;
  const pattern = gameContent.patterns.find(({ id }) => id === play.patternId);
  const decision = gameContent.decisions.find(({ id }) => id === play.decisionId);
  if (pattern === undefined || decision === undefined) {
    throw new Error(`Missing play presentation for ${play.keySnapId}.`);
  }
  const { matchup } = preview;

  return (
    <div className="game-flow resolved-snap-flow" data-testid="game-snap-resolved">
      {scoreBoard(
        t,
        matchup.playerProgramId,
        matchup.opponentProgramId,
        play.scoreAfter.playerTeam,
        play.scoreAfter.opponent,
      )}
      <section
        className="resolved-snap"
        aria-labelledby="resolved-snap-heading"
        data-result={play.resultId}
        role="status"
      >
        <p className="step-mark">{contentMessage(t, pattern.nameKey)}</p>
        <h3 id="resolved-snap-heading">
          {t('career.game.resolved.outcome', {
            result: t(PLAY_RESULT_LABEL_KEYS[play.resultId]),
            yards: play.receivingYardsDelta,
          })}
        </h3>
        <p>{t('career.game.resolved.choice', { decision: contentMessage(t, decision.nameKey) })}</p>
        <p className="game-flow__note">{t('career.game.resolved.help')}</p>
        {resolved.finishPlayerDrive && (
          <p className="game-flow__note">{t('career.game.resolved.driveFinish')}</p>
        )}
      </section>
      <button
        className="primary-action"
        data-testid="continue-snap"
        disabled={controlsDisabled || onContinueSnap === undefined}
        type="button"
        onClick={onContinueSnap}
      >
        {t(controlsDisabled ? 'career.game.saving' : 'career.game.resolved.continue')}
      </button>
    </div>
  );
}

function GamePostGame({ career, locale }: Pick<GameFlowProps, 'career' | 'locale'>) {
  const { t } = useAppTranslation(locale);
  if (career.phase.type !== 'POST_GAME') return null;
  const { growth, keyPlayLog, summary } = career.phase;
  const participation = gameContent.participationFeedback.find(
    ({ id }) => id === summary.participationFeedbackId,
  );
  if (participation === undefined) {
    throw new Error(`Missing participation presentation for ${summary.participationFeedbackId}.`);
  }
  const number = new Intl.NumberFormat(locale);

  return (
    <div className="game-flow post-game-flow" data-testid="game-post-game">
      <div className="post-game-result" data-result={summary.resultId}>
        <span>{t(GAME_RESULT_LABEL_KEYS[summary.resultId])}</span>
        <strong>{t(GRADE_BAND_LABEL_KEYS[summary.performanceGradeBandId])}</strong>
      </div>
      {scoreBoard(
        t,
        summary.playerProgramId,
        summary.opponentProgramId,
        summary.score.playerTeam,
        summary.score.opponent,
      )}
      <section className="performance-grade" aria-label={t('career.game.postGame.grade')}>
        <span>{t('career.game.postGame.grade')}</span>
        <strong>{summary.performanceGradeScore}</strong>
        <p>{t('career.game.postGame.gradeHelp')}</p>
      </section>
      <section className="participation-feedback" data-testid="game-participation">
        <h3>{contentMessage(t, participation.nameKey)}</h3>
        <p>{contentMessage(t, participation.descriptionKey)}</p>
      </section>
      <section aria-labelledby="game-stats-heading">
        <h3 id="game-stats-heading">{t('career.game.postGame.stats')}</h3>
        <dl className="game-stat-grid">
          {/* eslint-disable i18next/no-literal-string -- Typed domain field identifiers, not copy. */}
          {(
            [
              ['targets', 'career.game.stats.targets'],
              ['receptions', 'career.game.stats.receptions'],
              ['receivingYards', 'career.game.stats.yards'],
              ['receivingTouchdowns', 'career.game.stats.touchdowns'],
              ['drops', 'career.game.stats.drops'],
              ['turnovers', 'career.game.stats.turnovers'],
            ] as const satisfies readonly (readonly [keyof typeof summary.statLine, MessageKey])[]
          ).map(([statId, labelKey]) => (
            <div key={statId}>
              <dt>{t(labelKey)}</dt>
              <dd>{number.format(summary.statLine[statId])}</dd>
            </div>
          ))}
          {/* eslint-enable i18next/no-literal-string */}
        </dl>
      </section>
      <section className="post-game-growth" aria-labelledby="game-growth-heading">
        <h3 id="game-growth-heading">{t('career.game.postGame.growth')}</h3>
        <dl>
          <div>
            <dt>{t('career.player.body')}</dt>
            <dd>
              {growth.bodyBefore} → {growth.bodyAfter}{' '}
              <span>({formatSignedNumber(locale, growth.actualBodyDelta, 0)})</span>
            </dd>
          </div>
          <div>
            <dt>{t('career.player.confidence')}</dt>
            <dd>
              {growth.confidenceBefore} → {growth.confidenceAfter}{' '}
              <span>({formatSignedNumber(locale, growth.actualConfidenceDelta, 0)})</span>
            </dd>
          </div>
          <div>
            <dt>{t('career.player.coachTrust')}</dt>
            <dd>
              {growth.coachTrustBefore} → {growth.coachTrustAfter}{' '}
              <span>({formatSignedNumber(locale, growth.actualCoachTrustDelta, 0)})</span>
            </dd>
          </div>
        </dl>
        {growth.attributeXp.length === 0 ? (
          <p>{t('career.game.postGame.noAttributeXp')}</p>
        ) : (
          <ul className="game-xp-list">
            {growth.attributeXp.map((entry) => (
              <li key={entry.attributeId}>
                <span>{t(ATTRIBUTE_LABEL_KEYS[entry.attributeId])}</span>
                <strong>{t('career.game.postGame.attributeXp', { count: entry.appliedXp })}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="career-record" data-testid="game-career-record">
        {t('career.game.postGame.record', {
          losses: career.gameCareerState.losses,
          ties: career.gameCareerState.ties,
          wins: career.gameCareerState.wins,
        })}
      </p>
      {keyPlayLog.length > 0 && (
        <details className="game-play-log" data-testid="game-play-log">
          <summary>{t('career.game.postGame.plays')}</summary>
          <ol>
            {keyPlayLog.map((play) => {
              const pattern = gameContent.patterns.find(({ id }) => id === play.patternId);
              const decision = gameContent.decisions.find(({ id }) => id === play.decisionId);
              if (pattern === undefined || decision === undefined) {
                // eslint-disable-next-line i18next/no-literal-string -- Internal content-integrity diagnostic.
                throw new Error(`Missing play presentation for ${play.keySnapId}.`);
              }
              return (
                <li key={play.keySnapId}>
                  <strong>{contentMessage(t, pattern.nameKey)}</strong>
                  <span>{contentMessage(t, decision.nameKey)}</span>
                  <span>
                    {t('career.game.postGame.playResult', {
                      fit: play.decisionFit,
                      result: t(PLAY_RESULT_LABEL_KEYS[play.resultId]),
                      yards: play.receivingYardsDelta,
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </div>
  );
}

export function GameFlow(props: GameFlowProps): React.JSX.Element | null {
  switch (props.career.phase.type) {
    case 'GAME_PREVIEW':
      return <GamePreview {...props} />;
    case 'KEY_SNAP':
      return <GameKeySnap {...props} />;
    case 'SNAP_RESOLVED':
      return <GameResolvedSnap {...props} />;
    case 'POST_GAME':
      return <GamePostGame {...props} />;
    default:
      return null;
  }
}
