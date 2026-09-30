import {
  academicStatusVNext,
  nextAcademicCheckpointVNext,
  type AcademicStatusVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type VNextPositionId,
  worldDefinitionVNext,
  nilOfVNext,
  VNEXT_NIL_TUNING,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { AthletePortrait } from '../career/AthletePortrait';
import { useAppTranslation } from '../i18n/i18n';
import {
  CLASS_YEAR_KEYS,
  POSITION_ABBR_KEYS,
  POSITION_NAME_KEYS,
  ROLE_KEYS,
  ROUND_KEYS,
  STAT_KEYS,
  archetypesFor,
  attributeNameKey,
  backgrounds,
  currentOverall,
  injuryText,
  key,
  participantName,
  program,
  traits,
  conferenceOf,
  familiarNames,
  formatUsd,
  imperialMeasure,
} from './content';
import { METER_COLORS, PORTRAIT } from './theme';
import { Crest, Meter, Panel } from './ui';
import { benefitNameKey, nilOfferText } from './nil';

const TOP_RANKINGS = 10;

const ACADEMIC_KEYS = {
  ELIGIBLE: 'v2.profile.status.eligible',
  WARNING: 'v2.profile.status.warning',
  INELIGIBLE: 'v2.profile.status.ineligible',
} as const satisfies Record<AcademicStatusVNext, MessageKey>;

const gpaText = (gpa: number) => gpa.toFixed(2);

/** Team: where the program stands, the full position room, and the season's schedule. */
export function TeamPanel({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const world = career.season.world;
  if (career.program === null || world === null) return null;
  const programId = career.program.programId;
  const identity = program(programId);
  const record = world.programRecords.find((entry) => entry.programId === programId);
  const rank = world.rankings.find((entry) => entry.programId === programId)?.rank ?? null;
  const rival = mechanics.world.programProfiles.find(
    (entry) => entry.programId === programId,
  )?.rivalProgramId;
  const room = career.program.room;
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const abbr = t(POSITION_ABBR_KEYS[positionId]);
  const rows = [...room.evaluations].sort((left, right) => left.rank - right.rank);
  const definition = worldDefinitionVNext(world, mechanics);
  const conferenceId = definition.programProfiles.find(
    (entry) => entry.programId === programId,
  )?.groupId;
  const conference = conferenceOf(programId);
  const standings = world.groupStandings.filter((entry) => entry.groupId === conferenceId);
  const schedule = definition.regularSeasonRounds
    .map((round) => ({
      week: round.roundNumber - 1,
      fixture: round.fixtures.find(
        ({ homeProgramId, awayProgramId }) =>
          homeProgramId === programId || awayProgramId === programId,
      ),
    }))
    .filter(
      (entry): entry is { week: number; fixture: NonNullable<typeof entry.fixture> } =>
        entry.fixture !== undefined,
    );
  const recordOf = (id: string) => world.programRecords.find((entry) => entry.programId === id);
  const top = [...world.rankings].sort((a, b) => a.rank - b.rank).slice(0, TOP_RANKINGS);
  return (
    <div className="s2-stack" id="s2-team">
      <section aria-labelledby="s2-team-title" className="s2-scene">
        <div className="s2-row" style={{ alignItems: 'center', gap: 14 }}>
          <Crest identity={identity} size={64} />
          <div>
            <h1 className="s2-display s2-size-h1" id="s2-team-title">
              {t(key(identity.nameKey))}
            </h1>
            <p className="s2-note s2-num">
              {rank !== null && rank <= 25
                ? t('v2.stakes.ranked', { rank })
                : t('v2.team.unranked')}{' '}
              ·{' '}
              {t('v2.team.recordLine', {
                wins: record?.wins ?? 0,
                losses: record?.losses ?? 0,
                ties: record?.ties ?? 0,
              })}
            </p>
          </div>
        </div>
        <p className="s2-scene__body">{t(key(identity.descriptionKey))}</p>
        {familiarNames(career, programId) !== null && (
          <p className="s2-note">
            {t('v2.legacy.familiar', { names: familiarNames(career, programId)! })}
          </p>
        )}
      </section>
      <div className="s2-grid-2">
        <Panel id="s2-team-depth" title={t('v2.depth.title', { position: abbr })}>
          <ol className="s2-depthlist">
            {rows.map((row) => {
              const competitor = room.competitors.find(({ id }) => id === row.participantId);
              const you = row.participantId === room.playerId;
              const year = competitor?.classYear ?? Math.min(4, career.season.index + 1);
              const name = participantName(
                t,
                room,
                row.participantId,
                career.athlete.profile.displayName,
              );
              return (
                <li
                  className={`s2-depthrow ${you ? 's2-depthrow--you' : ''}`}
                  key={row.participantId}
                >
                  <span className="s2-depthrow__rank s2-num">
                    {abbr}
                    {row.rank}
                  </span>
                  <span>
                    <span className="s2-depthrow__name">
                      {you ? t('v2.depth.you', { name }) : name}
                    </span>
                    <br />
                    <span className="s2-depthrow__tag">
                      {t('v2.depth.classRole', {
                        year: t(CLASS_YEAR_KEYS[year as 1 | 2 | 3 | 4]),
                        role: t(ROLE_KEYS[row.roleId]),
                      })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <div className="s2-stack">
          <Panel id="s2-team-schedule" title={t('v2.team.schedule')}>
            <ol className="s2-schedule">
              {schedule.map(({ week, fixture }) => {
                const home = fixture.homeProgramId === programId;
                const opponentId = home ? fixture.awayProgramId : fixture.homeProgramId;
                const opponent = program(opponentId);
                const played = career.log.find(
                  (recap) => recap.weekIndex === week && recap.round === undefined,
                );
                const current = played === undefined && week === career.season.weekIndex;
                return (
                  <li
                    className={`s2-schedule__row ${current ? 's2-schedule__row--now' : ''}`}
                    key={fixture.id}
                  >
                    <span className="s2-note s2-num">{t('v2.team.week', { n: week + 1 })}</span>
                    <Crest identity={opponent} size={26} />
                    <span className="s2-schedule__opp">
                      {t(home ? 'v2.week.vsHome' : 'v2.week.atAway', {
                        opponent: t(key(opponent.shortNameKey)),
                      })}
                      {opponentId === rival && (
                        <span className="s2-effect s2-effect--down">{t('v2.stakes.rivalry')}</span>
                      )}
                    </span>
                    <strong
                      className={`s2-num ${
                        played?.resultId === 'game_result_win'
                          ? 's2-up'
                          : played?.resultId === 'game_result_loss'
                            ? 's2-down'
                            : ''
                      }`}
                    >
                      {played !== undefined
                        ? t(
                            played.resultId === 'game_result_win'
                              ? 'v2.team.win'
                              : played.resultId === 'game_result_loss'
                                ? 'v2.team.loss'
                                : 'v2.team.tie',
                            { us: played.playerScore, them: played.opponentScore },
                          )
                        : current
                          ? t('v2.team.next')
                          : null}
                    </strong>
                  </li>
                );
              })}
              {career.log
                .filter((recap) => recap.round !== undefined)
                .map((recap) => {
                  const opponent = program(recap.opponentProgramId);
                  return (
                    <li className="s2-schedule__row" key={`${recap.round}`}>
                      <span className="s2-note">{t(ROUND_KEYS[recap.round!])}</span>
                      <Crest identity={opponent} size={26} />
                      <span className="s2-schedule__opp">{t(key(opponent.shortNameKey))}</span>
                      <strong
                        className={`s2-num ${recap.resultId === 'game_result_win' ? 's2-up' : recap.resultId === 'game_result_loss' ? 's2-down' : ''}`}
                      >
                        {t(
                          recap.resultId === 'game_result_win'
                            ? 'v2.team.win'
                            : recap.resultId === 'game_result_loss'
                              ? 'v2.team.loss'
                              : 'v2.team.tie',
                          { us: recap.playerScore, them: recap.opponentScore },
                        )}
                      </strong>
                    </li>
                  );
                })}
            </ol>
          </Panel>
          {conference !== null && standings.length > 0 && (
            <Panel
              id="s2-team-conference"
              title={t('v2.team.conference', { conference: t(key(conference.nameKey)) })}
            >
              <ol className="s2-schedule">
                {standings.map((entry) => {
                  const identityRow = program(entry.programId);
                  return (
                    <li
                      className={`s2-schedule__row ${entry.programId === programId ? 's2-schedule__row--now' : ''}`}
                      key={entry.programId}
                    >
                      <span className="s2-num">{entry.rank}</span>
                      <Crest identity={identityRow} size={26} />
                      <span className="s2-schedule__opp">{t(key(identityRow.shortNameKey))}</span>
                      <span className="s2-note s2-num">
                        {t('v2.team.conferenceRecord', {
                          wins: entry.groupWins,
                          losses: entry.groupLosses,
                          ties: entry.groupTies,
                        })}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="s2-note" style={{ marginTop: 8 }}>
                {t('v2.team.playoffLine')}
              </p>
            </Panel>
          )}
          <Panel id="s2-team-rankings" title={t('v2.team.rankings')}>
            <ol className="s2-schedule">
              {top.map((entry) => {
                const identityRow = program(entry.programId);
                const line = recordOf(entry.programId);
                return (
                  <li
                    className={`s2-schedule__row ${entry.programId === programId ? 's2-schedule__row--now' : ''}`}
                    key={entry.programId}
                  >
                    <span className="s2-num">{t('v2.stakes.ranked', { rank: entry.rank })}</span>
                    <Crest identity={identityRow} size={26} />
                    <span className="s2-schedule__opp">{t(key(identityRow.shortNameKey))}</span>
                    <span className="s2-note s2-num">
                      {t('v2.stakes.record', {
                        wins: line?.wins ?? 0,
                        losses: line?.losses ?? 0,
                        ties: line?.ties ?? 0,
                      })}
                    </span>
                  </li>
                );
              })}
            </ol>
            {rank !== null && rank > TOP_RANKINGS && (
              <p className="s2-note s2-num" style={{ marginTop: 8 }}>
                {t('v2.team.yourRank', { rank: t('v2.stakes.ranked', { rank }) })}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function seasonTotals(career: CareerVNext): readonly [string, number][] {
  const totals = new Map<string, number>();
  for (const recap of career.log) {
    if (recap.engine.game.type !== 'COMPLETE') continue;
    for (const [field, value] of Object.entries(
      recap.engine.game.summary.statLine as unknown as Record<string, number>,
    ))
      if (STAT_KEYS[field] !== undefined) totals.set(field, (totals.get(field) ?? 0) + value);
  }
  return [...totals.entries()].filter(([, value]) => value !== 0);
}

/** Profile: who the athlete is, every rating, the season line, and academic/health standing. */
/** NIL, benefits and the locker room: all saved facts, no hidden numbers. */
function NilPanel({ career }: { readonly career: CareerVNext }): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const nil = nilOfVNext(career);
  const room = nil.lockerRoom;
  return (
    <Panel id="s2-profile-nil" title={t('v2.nil.title')}>
      <p className="s2-num">
        <strong>
          {t('v2.nil.fundsTotal', { value: formatUsd(i18n.resolvedLanguage, nil.fundsUsd) })}
        </strong>{' '}
        · {t('v2.nil.brand', { value: career.athlete.profile.state.brand })}
      </p>
      <p className="s2-note">
        {nil.obligation === null
          ? t('v2.nil.noDeal')
          : t('v2.nil.active', {
              offer: t(key(nilOfferText(nil.obligation.offerId).nameKey)),
              weeks: nil.obligation.weeksRemaining,
            })}
      </p>
      <p className="s2-note s2-num">
        {t('v2.nil.lockerRoomLine', {
          value: room,
          effect: t(
            room >= VNEXT_NIL_TUNING.lockerRoomHigh
              ? 'v2.nil.lockerRoomHigh'
              : room <= VNEXT_NIL_TUNING.lockerRoomLow
                ? 'v2.nil.lockerRoomLow'
                : 'v2.nil.lockerRoomNeutral',
          ),
        })}
      </p>
      <p className="s2-note">
        {nil.benefits.length === 0
          ? t('v2.nil.noBenefits')
          : t('v2.nil.benefits', {
              list: nil.benefits
                .map(({ benefitId, quantity }) => `${t(benefitNameKey(benefitId))} ×${quantity}`)
                .join(', '),
            })}
      </p>
    </Panel>
  );
}

export function ProfilePanel({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const profile = career.athlete.profile;
  const positionId = profile.positionId as VNextPositionId;
  const archetype = archetypesFor(positionId).find(({ id }) => id === profile.archetypeId);
  const background = backgrounds.find(({ id }) => id === profile.recruitingBackgroundId);
  const personality = profile.personalityTraitIds
    .map((id) => traits.find((trait) => trait.id === id))
    .filter((trait) => trait !== undefined);
  const ratings = Object.entries(profile.attributes)
    .filter((entry): entry is [string, { rating: number; xp: number }] => entry[1] !== undefined)
    .sort((left, right) => right[1].rating - left[1].rating);
  const totals = seasonTotals(career);
  const live = career.log.filter(({ liveSnapCount }) => liveSnapCount > 0).length;
  const status = academicStatusVNext(profile.state.gpa, mechanics);
  const checkpoint = nextAcademicCheckpointVNext(career, mechanics);
  const injury = career.condition.injury;
  return (
    <div className="s2-stack" id="s2-profile">
      <section aria-labelledby="s2-profile-title" className="s2-scene">
        <div className="s2-row" style={{ alignItems: 'center', gap: 14 }}>
          <AthletePortrait
            appearance={profile.appearance}
            label={t('v2.player.portrait', { name: profile.displayName })}
            size={PORTRAIT.compact}
          />
          <div>
            <p className="s2-eyebrow">{t('v2.profile.title')}</p>
            <h1 className="s2-display s2-size-h1" id="s2-profile-title">
              {profile.displayName}
            </h1>
            <p className="s2-note">
              {t(POSITION_NAME_KEYS[positionId])}
              {archetype !== undefined && <> · {t(key(archetype.nameKey))}</>}
            </p>
            <p className="s2-note s2-num">
              {i18n.resolvedLanguage === 'en-US'
                ? t(
                    'v2.profile.measureImperial',
                    imperialMeasure(profile.heightCm, profile.weightKg),
                  )
                : t('v2.profile.measure', {
                    height: profile.heightCm,
                    weight: profile.weightKg,
                  })}{' '}
              · {t('v2.player.ovr', { ovr: currentOverall(career) })}
            </p>
          </div>
        </div>
        <p className="s2-note">
          {background !== undefined && (
            <>
              {t('v2.profile.background')}: {t(key(background.nameKey))}
            </>
          )}
          {personality.length > 0 && (
            <>
              {' '}
              · {t('v2.profile.traits')}:{' '}
              {personality.map((trait) => t(key(trait.nameKey))).join(', ')}
            </>
          )}
        </p>
      </section>
      <div className="s2-grid-2">
        <Panel id="s2-profile-ratings" title={t('v2.profile.ratings')}>
          <div className="s2-meters">
            {ratings.map(([attributeId, progress]) => (
              <Meter
                color={METER_COLORS.preparation}
                key={attributeId}
                label={t(attributeNameKey(attributeId))}
                value={progress.rating}
              />
            ))}
          </div>
        </Panel>
        <div className="s2-stack">
          <Panel id="s2-profile-season" title={t('v2.profile.season')}>
            <p className="s2-note s2-num">
              {t('v2.profile.games', { count: live, total: career.log.length })}
            </p>
            {totals.length === 0 ? (
              <p className="s2-note">{t('v2.profile.noStats')}</p>
            ) : (
              <div className="s2-statline" style={{ marginTop: 10 }}>
                {totals.map(([field, value]) => (
                  <div className="s2-stat" key={field}>
                    <span className="s2-stat__value s2-num">{value}</span>
                    <span className="s2-stat__label">{t(STAT_KEYS[field]!)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <NilPanel career={career} />
          <Panel id="s2-profile-academics" title={t('v2.profile.academics')}>
            <p className="s2-row" style={{ gap: 8, alignItems: 'center' }}>
              <strong className="s2-num">
                {t('v2.profile.gpa', { gpa: gpaText(profile.state.gpa) })}
              </strong>
              <span
                className={`s2-effect ${status === 'ELIGIBLE' ? 's2-effect--up' : 's2-effect--down'}`}
              >
                {t(ACADEMIC_KEYS[status])}
              </span>
            </p>
            <p className="s2-note">
              {checkpoint === null
                ? t('v2.profile.noCheck')
                : t('v2.profile.nextCheck', { week: checkpoint + 1 })}
            </p>
            <p className="s2-note" style={{ marginTop: 8 }}>
              {injury === null
                ? t('v2.profile.healthy')
                : t(
                    injury.defaultAvailabilityId === 'injury_availability_out'
                      ? 'v2.inj.planOut'
                      : 'v2.inj.planLimited',
                    { name: t(injuryText(injury.outcomeId).nameKey), count: injury.remainingWeeks },
                  )}
            </p>
            <div className="s2-meters" style={{ marginTop: 10 }}>
              <Meter
                color={METER_COLORS.body}
                label={t('v2.stat.body')}
                value={profile.state.body}
              />
              <Meter
                color={METER_COLORS.confidence}
                label={t('v2.stat.conf')}
                value={profile.state.confidence}
              />
              <Meter
                color={METER_COLORS.trust}
                label={t('v2.stat.trust')}
                value={profile.state.coachTrust}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Actionable academic alert for the planner: only near a checkpoint and only below the bar. */
export function AcademicAlert({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const checkpoint = nextAcademicCheckpointVNext(career, mechanics);
  const gpa = career.athlete.profile.state.gpa;
  if (
    checkpoint === null ||
    checkpoint - career.season.weekIndex > 2 ||
    academicStatusVNext(gpa, mechanics) === 'ELIGIBLE'
  )
    return null;
  return (
    <div className="s2-banner" role="status">
      <p>
        {t('v2.acad.alert', {
          week: checkpoint + 1,
          gpa: gpaText(gpa),
          floor: gpaText(mechanics.academics.warningGpaMilli / 1_000),
        })}
      </p>
    </div>
  );
}
