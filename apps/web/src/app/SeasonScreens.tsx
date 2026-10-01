import { useState, type CSSProperties } from 'react';
import {
  CAREER_VNEXT_SEASONS,
  type AlumniVNext,
  type CareerVNext,
  type ProgramId,
  type SeasonFinishVNext,
  type VNextPositionId,
  canDeclareVNext,
  type CareerEndingVNext,
  type DraftStockBandVNext,
  nilOfVNext,
  recordBookVNext,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import {
  CLASS_YEAR_KEYS,
  POSITION_ABBR_KEYS,
  POSITION_NAME_KEYS,
  ROLE_KEYS,
  STAT_KEYS,
  key,
  conferenceOf,
  program,
  AWARD_KEYS,
  familiarNames,
} from './content';
import { Nameplate } from './Nameplate';
import type { PrototypeAlumniView } from './prototype';
import { inkOn } from './theme';
import { Crest, Delta, Panel } from './ui';

const DRAFT_BAND_KEYS = {
  ROUND_1: 'v2.draft.band.round1',
  ROUNDS_2_3: 'v2.draft.band.rounds2to3',
  ROUNDS_4_7: 'v2.draft.band.rounds4to7',
  UNDRAFTED: 'v2.draft.band.undrafted',
} as const satisfies Record<DraftStockBandVNext, MessageKey>;

const ENDING_KEYS = {
  GRADUATED: 'v2.draft.ending.graduated',
  DECLARED: 'v2.draft.ending.declared',
  RETIRED: 'v2.draft.ending.retired',
} as const satisfies Record<CareerEndingVNext, MessageKey>;

/** Awards and conference titles on the permanent record (absent on pre-M9 plaques). */
function HonorsLine({ alumni }: { readonly alumni: AlumniVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const awards = alumni.awards ?? [];
  const titles = alumni.conferenceTitles ?? 0;
  if (awards.length === 0 && titles === 0) return null;
  const top = awards[0];
  return (
    <span className="s2-note s2-num">
      {awards.length > 0 && t('v2.alumni.awards', { count: awards.length })}
      {top !== undefined && <> ({t(AWARD_KEYS[top])})</>}
      {awards.length > 0 && titles > 0 && ' · '}
      {titles > 0 && t('v2.alumni.conferenceTitles', { count: titles })}
    </span>
  );
}

/** How the college career ended, and the Pro Draft outcome when there was one. */
function EndingLine({ alumni }: { readonly alumni: AlumniVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (alumni.ending === undefined) return null;
  return (
    <span className="s2-note s2-num">
      {t(ENDING_KEYS[alumni.ending])}
      {alumni.draft !== undefined && (
        <>
          {' · '}
          {alumni.draft.round === null || alumni.draft.pick === null
            ? t('v2.draft.undrafted')
            : t('v2.draft.drafted', { round: alumni.draft.round, pick: alumni.draft.pick })}
        </>
      )}
    </span>
  );
}

const FINISH_KEYS = {
  CHAMPION: 'v2.review.finish.champion',
  RUNNER_UP: 'v2.review.finish.runnerUp',
  SEMIFINAL: 'v2.review.finish.semifinal',
  QUARTERFINAL: 'v2.review.finish.quarterfinal',
  FIRST_ROUND: 'v2.review.finish.firstRound',
  MISSED: 'v2.review.finish.missed',
} as const satisfies Record<SeasonFinishVNext, MessageKey>;

function StatLine({
  totals,
}: {
  readonly totals: readonly { readonly field: string; readonly value: number }[];
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const shown = totals.filter(({ field }) => STAT_KEYS[field] !== undefined);
  if (shown.length === 0) return <p className="s2-note">{t('v2.profile.noStats')}</p>;
  return (
    <div className="s2-statline" style={{ marginTop: 10 }}>
      {shown.map(({ field, value }) => (
        <div className="s2-stat" key={field}>
          <span className="s2-stat__value s2-num">{value}</span>
          <span className="s2-stat__label">{t(STAT_KEYS[field]!)}</span>
        </div>
      ))}
    </div>
  );
}

/** The season as it ended: the program's finish, then the athlete's year. */
export function SeasonReviewScreen({
  career,
  blocked,
  onContinue,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onContinue: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'SEASON_REVIEW') return null;
  const review = career.flow.review;
  const identity = program(review.programId);
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const last = review.seasonIndex + 1 >= CAREER_VNEXT_SEASONS;
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section
        aria-labelledby="s2-review-title"
        className={`s2-scene ${review.finish === 'CHAMPION' ? 's2-scene--breakthrough' : ''}`}
        id="s2-review"
      >
        <p className="s2-eyebrow">{t('v2.review.eyebrow', { n: review.seasonIndex + 1 })}</p>
        <div className="s2-row" style={{ alignItems: 'center', gap: 14 }}>
          <Crest identity={identity} size={64} />
          <div>
            <h1 className="s2-display s2-size-h1" id="s2-review-title">
              {t(FINISH_KEYS[review.finish])}
            </h1>
            <p className="s2-note s2-num">
              {review.finalRank !== null && review.finalRank <= 25
                ? t('v2.stakes.ranked', { rank: review.finalRank })
                : t('v2.team.unranked')}{' '}
              · {t('v2.team.recordLine', review.record)}
            </p>
          </div>
        </div>
        {review.conferenceChampion === true && (
          <p className="s2-scene__body">
            {t('v2.review.conferenceChampion', {
              conference: t(key(conferenceOf(review.programId)?.nameKey ?? '')),
            })}
          </p>
        )}
        {review.finish !== 'CHAMPION' && (
          <p className="s2-scene__body">
            {t('v2.review.champion', {
              program: t(key(program(review.championProgramId).shortNameKey)),
            })}
          </p>
        )}
      </section>
      <div className="s2-grid-2">
        <Panel id="s2-review-year" title={t('v2.review.yourYear')}>
          <div className="s2-compare">
            <div className="s2-compare__row">
              <span>{t('v2.review.overall')}</span>
              <strong className="s2-num">
                {review.overall.start} → {review.overall.end}{' '}
                <Delta value={review.overall.end - review.overall.start} />
              </strong>
            </div>
            <div className="s2-compare__row">
              <span>{t('v2.review.depth')}</span>
              <strong className="s2-num">
                {abbr}
                {review.depthRank.start} → {abbr}
                {review.depthRank.end}
              </strong>
            </div>
          </div>
          <p className="s2-note s2-num" style={{ marginTop: 10 }}>
            {t('v2.profile.games', { count: review.liveGames, total: review.games })}
          </p>
          <StatLine totals={review.statTotals} />
        </Panel>
        {review.draftStock !== undefined && (
          <Panel id="s2-review-draft" title={t('v2.draft.stock')}>
            <p className="s2-display s2-size-h2">{t(DRAFT_BAND_KEYS[review.draftStock.band])}</p>
            <p className="s2-note s2-num">{t('v2.draft.factors', review.draftStock.factors)}</p>
            {(review.draftStock.factors.awards ?? 0) > 0 && (
              <p className="s2-note s2-num">
                {t('v2.draft.awardsFactor', { value: review.draftStock.factors.awards! })}
              </p>
            )}
            <p className="s2-note" style={{ marginTop: 8 }}>
              {t('v2.draft.stockHelp')}
            </p>
          </Panel>
        )}
        <Panel id="s2-review-awards" title={t('v2.awards.title')}>
          {(review.awards ?? []).length === 0 ? (
            <p className="s2-note">{t('v2.awards.none')}</p>
          ) : (
            <ul className="s2-bullets">
              {(review.awards ?? []).map((award) => (
                <li key={award}>
                  <strong>{t(AWARD_KEYS[award])}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="s2-note" style={{ marginTop: 8 }}>
            {t('v2.awards.help')}
          </p>
        </Panel>
        <Panel id="s2-review-notes" title={t('v2.review.team')}>
          <ul className="s2-bullets">
            <li>
              <span>{t('v2.review.cards', { count: review.cardsOwned })}</span>
            </li>
            <li>
              <span>{t('v2.review.injuries', { count: review.injuries })}</span>
            </li>
          </ul>
        </Panel>
      </div>
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={blocked}
            onClick={onContinue}
            type="button"
          >
            {t(last ? 'v2.review.toGraduation' : 'v2.review.toOffseason')}{' '}
            <span className="s2-btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Stay or transfer: every option previews the exact room the athlete would join next season. */
export function OffseasonScreen({
  career,
  blocked,
  onCommit,
  onRetire,
  onDeclare,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onCommit: (programId: ProgramId) => void;
  readonly onRetire: () => void;
  readonly onDeclare: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<ProgramId | null>(null);
  const [retiring, setRetiring] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const stock = career.history.at(-1)?.draftStock;
  if (career.flow.type !== 'OFFSEASON') return null;
  const options = career.flow.options;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const choice = options.find(({ programId }) => programId === selected);
  // Facts that tell the options apart (playtest round 2): strength, last season, and why they call.
  const currentRating = options.find(({ kind }) => kind === 'STAY')?.programRating ?? null;
  const records = career.season.world?.programRecords ?? [];
  const strength = (rating: number) => Math.max(1, Math.min(5, Math.round((rating - 50) / 7)));
  const reasonKey = (rating: number) =>
    currentRating === null || Math.abs(rating - currentRating) <= 3
      ? 'v2.off.reasonFit'
      : rating > currentRating
        ? 'v2.off.reasonReach'
        : 'v2.off.reasonRole';
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section aria-labelledby="s2-offseason-title" className="s2-scene" id="s2-offseason">
        <p className="s2-eyebrow">
          {t('v2.off.eyebrow')} ·{' '}
          {t(CLASS_YEAR_KEYS[Math.min(4, career.season.index + 2) as 1 | 2 | 3 | 4])}
        </p>
        <h1 className="s2-display s2-size-h1" id="s2-offseason-title">
          {t('v2.off.title')}
        </h1>
        <p className="s2-scene__body">{t('v2.off.help')}</p>
      </section>
      <div className="s2-offers" role="list">
        {options.map((option) => {
          const identity = program(option.programId);
          return (
            <div key={option.programId} role="listitem">
              <button
                aria-pressed={selected === option.programId}
                className="s2-offer"
                onClick={() => setSelected(option.programId)}
                style={
                  {
                    '--c1': identity.primary,
                    '--c2': identity.secondary,
                    '--c1-ink': inkOn(identity.primary),
                  } as CSSProperties
                }
                type="button"
              >
                <span className="s2-offer__top">
                  <Crest identity={identity} size={56} />
                  <span className="s2-offer__title">
                    <span className="s2-display s2-offer__name">
                      {t(key(identity.shortNameKey))}
                    </span>
                    <br />
                    <span className={`s2-effect ${option.kind === 'STAY' ? 's2-effect--up' : ''}`}>
                      {t(option.kind === 'STAY' ? 'v2.off.stay' : 'v2.off.transfer')}
                    </span>
                    {familiarNames(career, option.programId) !== null && (
                      <>
                        <br />
                        <span className="s2-note">
                          {t('v2.legacy.familiar', {
                            names: familiarNames(career, option.programId)!,
                          })}
                        </span>
                      </>
                    )}
                  </span>
                </span>
                <span className="s2-offer__culture">
                  <span className="s2-offer__tags">
                    {(() => {
                      const record = records.find(
                        ({ programId }) => programId === option.programId,
                      );
                      return record === undefined ? null : (
                        <span className="s2-tag">
                          {t('v2.off.lastSeason', { wins: record.wins, losses: record.losses })}
                        </span>
                      );
                    })()}
                    {option.kind === 'TRANSFER' && (
                      <span className="s2-tag">
                        {t('v2.off.whyOffer', { reason: t(reasonKey(option.programRating)) })}
                      </span>
                    )}
                  </span>
                  <span className="s2-pips" style={{ gridTemplateColumns: '1fr' }}>
                    <span>
                      {t('v2.recruit.strength')}
                      <span aria-hidden="true" className="s2-pip-row">
                        {[1, 2, 3, 4, 5].map((index) => (
                          <span
                            className={`s2-pip ${index <= strength(option.programRating) ? 's2-pip--on' : ''}`}
                            key={index}
                          />
                        ))}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="s2-offer__path">
                  <span className="s2-display s2-offer__rank s2-num">
                    {abbr}
                    {option.preview.rank}
                  </span>
                  <span>
                    <strong>
                      {option.preview.playersAhead === 0
                        ? t('v2.recruit.pathTop')
                        : t('v2.recruit.pathAhead', { count: option.preview.playersAhead })}
                    </strong>
                    <br />
                    <span className="s2-note">
                      {t(ROLE_KEYS[option.preview.roleId])} ·{' '}
                      {t('v2.recruit.snapRange', {
                        min: option.preview.opportunity.interactiveSnapMinimum,
                        max: option.preview.opportunity.interactiveSnapMaximum,
                      })}
                    </span>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {canDeclareVNext(career) && stock !== undefined && (
        <Panel id="s2-declare" title={t('v2.draft.declare')}>
          <p className="s2-note">
            {t('v2.draft.declareHelp', { band: t(DRAFT_BAND_KEYS[stock.band]) })}
          </p>
          {nilOfVNext(career).benefits.some(
            ({ benefitId }) => benefitId === 'off_field_benefit_advisor_insight',
          ) && <p className="s2-note s2-num">{t('v2.draft.exactStock', { score: stock.score })}</p>}
          {declaring ? (
            <div className="s2-banner" role="alertdialog" aria-labelledby="s2-declare-confirm">
              <p id="s2-declare-confirm">{t('v2.draft.declareConfirm')}</p>
              <div className="s2-row">
                <button
                  className="s2-btn s2-btn--ghost"
                  onClick={() => setDeclaring(false)}
                  type="button"
                >
                  {t('v2.common.cancel')}
                </button>
                <button
                  className="s2-btn s2-btn--ghost"
                  disabled={blocked}
                  onClick={onDeclare}
                  type="button"
                >
                  {t('v2.draft.declareYes')}
                </button>
              </div>
            </div>
          ) : (
            <button className="s2-chipbtn" onClick={() => setDeclaring(true)} type="button">
              {t('v2.draft.declare')}
            </button>
          )}
        </Panel>
      )}
      {retiring ? (
        <div className="s2-banner" role="alertdialog" aria-labelledby="s2-retire-confirm">
          <p id="s2-retire-confirm">{t('v2.off.retireConfirm')}</p>
          <div className="s2-row">
            <button
              className="s2-btn s2-btn--ghost"
              onClick={() => setRetiring(false)}
              type="button"
            >
              {t('v2.common.cancel')}
            </button>
            <button
              className="s2-btn s2-btn--ghost"
              disabled={blocked}
              onClick={onRetire}
              type="button"
            >
              {t('v2.off.retireYes')}
            </button>
          </div>
        </div>
      ) : (
        <button className="s2-chipbtn" onClick={() => setRetiring(true)} type="button">
          {t('v2.off.retire')}
        </button>
      )}
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button
            className="s2-btn s2-btn--block"
            disabled={choice === undefined || blocked}
            onClick={() => choice !== undefined && onCommit(choice.programId)}
            type="button"
          >
            {choice === undefined
              ? t('v2.off.pick')
              : t(choice.kind === 'STAY' ? 'v2.off.commitStay' : 'v2.off.commitTransfer', {
                  program: t(key(program(choice.programId).shortNameKey)),
                })}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlumniPlaque({ alumni }: { readonly alumni: AlumniVNext }): React.JSX.Element {
  const { t } = useAppTranslation();
  const home = program(alumni.programIds.at(-1) ?? alumni.programIds[0]!);
  return (
    <li className="s2-plaque">
      <Crest identity={home} size={40} />
      <span className="s2-plaque__body">
        <strong>{alumni.displayName}</strong>
        <span className="s2-note">
          {t(POSITION_NAME_KEYS[alumni.positionId])} ·{' '}
          {alumni.programIds.map((id) => t(key(program(id).shortNameKey))).join(' → ')}
        </span>
        <span className="s2-note s2-num">
          {t('v2.alumni.line', {
            seasons: alumni.seasons,
            ...alumni.record,
            ovr: alumni.finalOverall,
          })}
        </span>
        <span className="s2-note">
          {t('v2.alumni.best', { finish: t(FINISH_KEYS[alumni.bestFinish]) })}
          {alumni.championships > 0 && (
            <> · {t('v2.alumni.titles', { count: alumni.championships })}</>
          )}
        </span>
        <HonorsLine alumni={alumni} />
        <EndingLine alumni={alumni} />
      </span>
    </li>
  );
}

const RECORD_KEYS = {
  record_championships: 'v2.record.championships',
  record_conference_titles: 'v2.record.conferenceTitles',
  record_awards: 'v2.record.awards',
  record_best_pick: 'v2.record.bestPick',
  record_wins: 'v2.record.wins',
  record_live_games: 'v2.record.liveGames',
} as const satisfies Record<string, MessageKey>;

/** The record book: the best mark in each category across every plaque. */
export function RecordBook({
  alumni,
}: {
  readonly alumni: readonly AlumniVNext[];
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const records = recordBookVNext(alumni).filter(
    ({ recordId, field }) =>
      !recordId.startsWith('record_stat_') || STAT_KEYS[field!] !== undefined,
  );
  return (
    <Panel id="s2-record-book" title={t('v2.record.title')}>
      {records.length === 0 ? (
        <p className="s2-note">{t('v2.record.empty')}</p>
      ) : (
        <ol className="s2-schedule">
          {records.map((record) => (
            <li className="s2-schedule__row" key={record.recordId}>
              <span className="s2-note">
                {record.field === undefined
                  ? t(RECORD_KEYS[record.recordId as keyof typeof RECORD_KEYS])
                  : t('v2.record.stat', { stat: t(STAT_KEYS[record.field]!) })}
              </span>
              <span className="s2-schedule__opp">{record.displayName}</span>
              <strong className="s2-num">
                {record.recordId === 'record_best_pick'
                  ? t('v2.record.pick', { value: record.value })
                  : record.value}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Legacy on the landing screen: the record book and the Alumni Wall across careers. */
export function LegacyPanel({
  alumni,
  prototypes,
}: {
  readonly alumni: readonly AlumniVNext[];
  readonly prototypes: readonly PrototypeAlumniView[];
}): React.JSX.Element {
  const { t } = useAppTranslation();
  return (
    <section aria-labelledby="s2-legacy-title" className="s2-stack" id="s2-legacy">
      <h2 className="s2-display s2-size-h2" id="s2-legacy-title">
        {t('v2.legacy.title')}
      </h2>
      <div className="s2-grid-2">
        <RecordBook alumni={alumni} />
        <AlumniWall alumni={alumni} prototypes={prototypes} />
      </div>
    </section>
  );
}

/** The permanent record: this career's plaque, every earlier one, and prototype careers that parse. */
export function AlumniWall({
  alumni,
  prototypes,
}: {
  readonly alumni: readonly AlumniVNext[];
  readonly prototypes: readonly PrototypeAlumniView[];
}): React.JSX.Element {
  const { t } = useAppTranslation();
  return (
    <Panel
      id="s2-alumni-wall"
      title={t('v2.alumni.wall', { count: alumni.length + prototypes.length })}
    >
      {alumni.length + prototypes.length === 0 ? (
        <p className="s2-note">{t('v2.alumni.empty')}</p>
      ) : (
        <ol className="s2-plaques">
          {[...alumni].reverse().map((entry) => (
            <AlumniPlaque alumni={entry} key={entry.careerId} />
          ))}
          {prototypes.map((entry) => (
            <li className="s2-plaque s2-plaque--prototype" key={entry.key}>
              <span className="s2-plaque__body">
                <strong>{entry.displayName}</strong>
                <span className="s2-note">
                  {t('v2.alumni.prototype')}
                  {entry.gamesPlayed !== null && (
                    <> · {t('v2.alumni.prototypeLine', { games: entry.gamesPlayed })}</>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function CareerCompleteScreen({
  career,
  alumni,
  prototypes,
  onNewCareer,
}: {
  readonly career: CareerVNext;
  readonly alumni: readonly AlumniVNext[];
  readonly prototypes: readonly PrototypeAlumniView[];
  readonly onNewCareer: () => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.flow.type !== 'CAREER_COMPLETE') return null;
  const mine = career.flow.alumni;
  return (
    <div className="s2-stack">
      <Nameplate career={career} />
      <section
        aria-labelledby="s2-complete-title"
        className="s2-scene s2-scene--breakthrough"
        id="s2-complete"
      >
        <p className="s2-eyebrow">{t('v2.alumni.eyebrow')}</p>
        <h1 className="s2-display s2-size-h1" id="s2-complete-title">
          {mine.displayName}
        </h1>
        <p className="s2-scene__body s2-num">
          {t('v2.alumni.line', { seasons: mine.seasons, ...mine.record, ovr: mine.finalOverall })}
        </p>
        <p className="s2-note">
          {t('v2.alumni.best', { finish: t(FINISH_KEYS[mine.bestFinish]) })} ·{' '}
          {t('v2.alumni.depth', {
            position: t(POSITION_ABBR_KEYS[mine.positionId]),
            rank: mine.bestDepthRank,
          })}
        </p>
        <p>
          <HonorsLine alumni={mine} />
        </p>
        <p>
          <EndingLine alumni={mine} />
        </p>
        <StatLine totals={mine.statTotals} />
      </section>
      <AlumniWall
        alumni={
          alumni.some(({ careerId }) => careerId === mine.careerId) ? alumni : [...alumni, mine]
        }
        prototypes={prototypes}
      />
      <RecordBook
        alumni={
          alumni.some(({ careerId }) => careerId === mine.careerId) ? alumni : [...alumni, mine]
        }
      />
      <div className="s2-actionbar">
        <div className="s2-actionbar__inner">
          <button className="s2-btn s2-btn--block" onClick={onNewCareer} type="button">
            {t('v2.alumni.new')} <span className="s2-btn__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
