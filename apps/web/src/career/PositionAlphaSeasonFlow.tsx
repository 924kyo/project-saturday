import { useEffect, useRef, useState } from 'react';
import type { PositionAlphaSessionV2, ProgramId } from '@project-saturday/game-core';
import {
  seasonContent,
  qbAlphaContent,
  rbAlphaContent,
  cbAlphaContent,
} from '@project-saturday/game-content';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';
import { AthletePortrait } from './AthletePortrait';
import {
  POSITION_CAREER_STAT_KEYS,
  POSITION_ROLE_KEYS,
  positionProgramNameKey,
} from './position-labels';

const PHASE_KEYS = {
  SEASON_REVIEW: 'm7Direct.season.regular',
  POSTSEASON_PLANNING: 'm7Direct.season.worldRound',
  POSTSEASON_REVIEW: 'm7Direct.season.review',
  OFFSEASON_DECISION: 'm7Ui.offseason.title',
  CAREER_COMPLETE: 'm7Ui.complete.title',
} as const satisfies Record<string, MessageKey>;
const OPTION_FACTOR_KEYS = {
  roomPressure: 'm7Direct.season.roomPressure',
  positionRating: 'm7Direct.season.rating',
  staffContinuityScore: 'm7Direct.season.staff',
  relationshipScore: 'm7Direct.season.relationships',
  familiarityScore: 'm7Direct.season.familiarity',
} as const;
const OPTION_FACTORS = Object.keys(OPTION_FACTOR_KEYS) as (keyof typeof OPTION_FACTOR_KEYS)[];
const SKILLS = [...qbAlphaContent.skills, ...rbAlphaContent.skills, ...cbAlphaContent.skills];

export interface PositionAlphaSeasonFlowProps {
  readonly session: PositionAlphaSessionV2;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onBeginPostseason: () => void;
  readonly onWorldRound: () => void;
  readonly onReview: () => void;
  readonly onCommit: (programId: ProgramId) => void;
  readonly onComplete: () => void;
  readonly onHub: () => void;
}

/** Saved bracket/shortlist/summary evidence only; never simulate a season in presentation. */
export function PositionAlphaSeasonFlow(
  props: PositionAlphaSeasonFlowProps,
): React.JSX.Element | null {
  const { session, locale } = props;
  const { t } = useAppTranslation(locale);
  const heading = useRef<HTMLHeadingElement>(null);
  const decisionKey = `${session.lifecycle.careerId}/${session.lifecycle.offseason?.seasonIndex ?? ''}`;
  const [choice, setChoice] = useState<{
    readonly key: string;
    readonly programId: ProgramId;
  } | null>(null);
  const selected = choice?.key === decisionKey ? choice.programId : null;
  const phase = session.phase.type;
  const postseason = session.world.postseason;
  const round =
    postseason.type === 'ACTIVE' ? postseason.rounds[postseason.currentRoundIndex] : null;
  useEffect(() => {
    heading.current?.focus();
  }, [phase, round?.id, decisionKey]);
  const ownsFixture =
    round?.fixtures.some(
      ({ homeProgramId, awayProgramId }) =>
        homeProgramId === session.world.playerProgramId ||
        awayProgramId === session.world.playerProgramId,
    ) ?? false;
  if (
    !(phase in PHASE_KEYS) ||
    session.gameDay.type !== 'IDLE' ||
    (phase === 'POSTSEASON_PLANNING' && ownsFixture)
  )
    return null;
  const blocked =
    props.busy ||
    props.saveFailed ||
    session.skills.offeredSkillIds !== null ||
    session.events.pending !== null;
  const currentFinalReview =
    phase === 'OFFSEASON_DECISION' &&
    session.phase.seasonIndex === 1 &&
    session.seasonReview !== undefined;
  const legacyFinalDecision =
    phase === 'OFFSEASON_DECISION' &&
    session.phase.seasonIndex === 1 &&
    session.seasonReview === undefined;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
  const currentRecord = session.world.programRecords.find(
    ({ programId }) => programId === session.lifecycle.currentProgramId,
  )!;
  const options = session.lifecycle.offseason?.options ?? [];
  const selectedOption = options.find(({ programId }) => programId === selected);
  const alumnus = session.meta?.alumni.find(
    ({ careerId }) => careerId === session.lifecycle.careerId,
  );
  return (
    <section
      className="panel"
      aria-labelledby="position-season-heading"
      data-testid="position-season-flow"
      data-phase={phase}
    >
      <h2 id="position-season-heading" ref={heading} tabIndex={-1}>
        {t(PHASE_KEYS[phase as keyof typeof PHASE_KEYS])}
      </h2>
      {phase !== 'CAREER_COMPLETE' && (
        <>
          <h3>{t(positionProgramNameKey(session.lifecycle.currentProgramId))}</h3>
          <p>
            {t('career.season.review.record', {
              wins: currentRecord.wins,
              losses: currentRecord.losses,
              ties: currentRecord.ties,
            })}
          </p>
        </>
      )}
      {phase === 'SEASON_REVIEW' && (
        <>
          <p>{t('m7Direct.season.beginHelp')}</p>
          <button
            className="primary-action"
            type="button"
            disabled={blocked}
            onClick={() => props.onBeginPostseason()}
          >
            {t('m7Direct.season.begin')}
          </button>
        </>
      )}
      {phase === 'POSTSEASON_PLANNING' && round && (
        <>
          <p>{t('m7Direct.season.worldOnly')}</p>
          <ul>
            {round.fixtures.map((fixture) => (
              <li key={fixture.id}>
                {t('m7Direct.season.fixture', {
                  home: t(positionProgramNameKey(fixture.homeProgramId)),
                  away: t(positionProgramNameKey(fixture.awayProgramId)),
                })}
              </li>
            ))}
          </ul>
          <button
            className="primary-action"
            type="button"
            disabled={blocked}
            onClick={() => props.onWorldRound()}
          >
            {t('m7Direct.season.advanceWorld')}
          </button>
        </>
      )}
      {postseason.type === 'COMPLETE' && (
        <p>
          {t('m7Direct.season.champion', {
            program: t(positionProgramNameKey(postseason.championProgramId)),
          })}
        </p>
      )}
      {phase === 'POSTSEASON_REVIEW' && (
        <button
          className="primary-action"
          type="button"
          disabled={blocked}
          onClick={() => props.onReview()}
        >
          {t('m7Direct.season.saveReview')}
        </button>
      )}
      {session.lifecycle.completedSeasons.map((summary) => (
        <details
          key={summary.seasonId}
          open={summary === session.lifecycle.completedSeasons.at(-1)}
        >
          <summary>
            {t('m7Direct.season.summary', {
              season: summary.seasonIndex + 1,
              program: t(positionProgramNameKey(summary.programId)),
            })}
          </summary>
          <p>
            {t(
              seasonContent.postseason.outcomes.find(({ id }) => id === summary.outcomeId)!
                .nameKey as MessageKey,
            )}
          </p>
          <p>
            {t('career.season.review.record', {
              wins: summary.wins,
              losses: summary.losses,
              ties: summary.ties,
            })}
          </p>
          <p>
            {t('m7Direct.season.performance', {
              games: summary.gamesPlayed,
              grade: number(summary.averagePerformanceGrade),
            })}
          </p>
          <p>
            {t('m7Direct.plan.change', {
              label: t('m7Ui.team.depth'),
              before: summary.startingDepthRank,
              after: summary.finalDepthRank,
            })}
          </p>
          <p>
            {t('m7Direct.plan.change', {
              label: t('m7Direct.season.role'),
              before: t(POSITION_ROLE_KEYS[summary.startingRoleId]),
              after: t(POSITION_ROLE_KEYS[summary.finalRoleId]),
            })}
          </p>
          <p>{t('m7Direct.season.injuries', { count: summary.injuryWeeksMissed })}</p>
          <h4>{t('m7Direct.season.build')}</h4>
          <ul>
            {summary.equippedSkillIds.map((id, index) => (
              <li key={index}>
                {t('m7Ui.skills.slot', {
                  slot: index + 1,
                  skill:
                    id === null
                      ? t('m7Ui.skills.open')
                      : t(SKILLS.find((skill) => skill.id === id)!.nameKey as MessageKey),
                })}
              </li>
            ))}
          </ul>
          <ul>
            {summary.stats.entries.map(({ statId, value }) => (
              <li key={statId}>
                {t('m7Direct.day.stat', {
                  label: t(POSITION_CAREER_STAT_KEYS[statId]!),
                  value: number(value),
                })}
              </li>
            ))}
          </ul>
        </details>
      ))}
      {phase === 'OFFSEASON_DECISION' &&
        (currentFinalReview ? (
          <>
            <p>{t('m7Direct.season.retireHelp')}</p>
            <button
              className="primary-action"
              type="button"
              disabled={blocked}
              onClick={() => props.onComplete()}
            >
              {t('m7Direct.season.retire')}
            </button>
          </>
        ) : (
          <>
            <p>
              {t(
                legacyFinalDecision
                  ? 'm7Direct.season.legacyFinal'
                  : 'm7Direct.season.comparisonHelp',
              )}
            </p>
            <fieldset className="choice-fieldset form-section" disabled={blocked}>
              <legend>
                {t(legacyFinalDecision ? 'm7Direct.season.legacyChoice' : 'm7Ui.offseason.choice')}
              </legend>
              <div className="choice-grid">
                {options.map((option) => (
                  <label className="choice-card" key={option.programId}>
                    <input
                      type="radio"
                      name="position-offseason-v2"
                      value={option.programId}
                      checked={selected === option.programId}
                      onChange={() => setChoice({ key: decisionKey, programId: option.programId })}
                    />
                    <span className="choice-card__copy">
                      <strong>{t(positionProgramNameKey(option.programId))}</strong>
                      <small>
                        {t(
                          option.kind === 'STAY'
                            ? 'm7Ui.offseason.stay'
                            : 'm7Ui.offseason.transfer',
                          { rank: option.projectedDepthRank, score: option.comparisonScore },
                        )}
                      </small>
                      <small>{t(POSITION_ROLE_KEYS[option.projectedRoleId])}</small>
                      {OPTION_FACTORS.map((field) => (
                        <small key={field}>
                          {t('m7Direct.day.stat', {
                            label: t(OPTION_FACTOR_KEYS[field]),
                            value: number(option[field]),
                          })}
                        </small>
                      ))}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              className="primary-action"
              type="button"
              disabled={blocked || selectedOption === undefined}
              onClick={() => {
                if (selectedOption) props.onCommit(selectedOption.programId);
              }}
            >
              {t('m7Ui.offseason.commit')}
            </button>
          </>
        ))}
      {phase === 'CAREER_COMPLETE' && (
        <>
          <AthletePortrait
            appearance={session.player.appearance}
            label={session.player.displayName}
          />
          <h3>{session.player.displayName}</h3>
          <p>{t('m7Ui.complete.help')}</p>
          {alumnus && (
            <section data-testid="position-alumni-totals">
              <h3>{t('m7Direct.season.careerTotals')}</h3>
              <p>{t('m7Direct.season.championships', { count: alumnus.championshipCount })}</p>
              <ul>
                {alumnus.careerStats.entries.map(({ statId, value }) => (
                  <li key={statId}>
                    {t('m7Direct.day.stat', {
                      label: t(POSITION_CAREER_STAT_KEYS[statId]!),
                      value: number(value),
                    })}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p>
            {t('m7Ui.complete.seasons', { seasons: session.lifecycle.completedSeasons.length })}
          </p>
          <button
            className="primary-action"
            type="button"
            disabled={props.busy || props.saveFailed}
            onClick={() => props.onHub()}
          >
            {t('m7Direct.season.hub')}
          </button>
        </>
      )}
    </section>
  );
}
