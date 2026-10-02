import {
  castMemberVNext,
  programSchemeVNext,
  roomMechanicsVNext,
  schemeFitBandVNext,
  seasonGoalIdVNext,
  storyOfVNext,
  toneNilChancePermilleVNext,
  VNEXT_KEY_PLAYER_SNAPS,
  VNEXT_PROGRAM_TUNING,
  type CareerVNext,
  type CareerVNextMechanics,
  type ContributorHonorIdVNext,
  type SeasonGoalIdVNext,
  type SeasonReviewVNext,
  type StoryRoleVNext,
} from '@project-saturday/game-core';
import { schemeNameKeyVNext, storyKeysVNext } from '@project-saturday/game-content/content';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { ROLE_KEYS, TONE_KEYS, key, personNameVNext } from './content';
import { Panel } from './ui';

const CAST_ROLES: readonly StoryRoleVNext[] = ['rival', 'coach', 'captain', 'reporter'];

const CAST_ROLE_KEYS = {
  rival: 'v2.cast.role.rival',
  coach: 'v2.cast.role.coach',
  captain: 'v2.cast.role.captain',
  reporter: 'v2.cast.role.reporter',
} as const satisfies Record<StoryRoleVNext, MessageKey>;

const GOAL_KEYS = {
  goal_earn_role: 'v2.goal.earnRole',
  goal_key_player: 'v2.goal.keyPlayer',
  goal_contender: 'v2.goal.contender',
  goal_senior_legacy: 'v2.goal.seniorLegacy',
} as const satisfies Record<SeasonGoalIdVNext, MessageKey>;

const HONOR_KEYS = {
  honor_captain: 'v2.honor.captain',
  honor_most_improved: 'v2.honor.mostImproved',
} as const satisfies Record<ContributorHonorIdVNext, MessageKey>;

const FIT_KEYS = {
  ideal: 'v2.programProfile.fit.ideal',
  neutral: 'v2.programProfile.fit.neutral',
  poor: 'v2.programProfile.fit.poor',
} as const satisfies Record<'ideal' | 'neutral' | 'poor', MessageKey>;

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0');

/** The cast with relationship values and the last change (REL-01), plus the press tone. */
export function CastPanel({ career }: { readonly career: CareerVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.story === undefined || career.program === null) return null;
  const story = storyOfVNext(career);
  const programId = career.program.programId;
  const tone = story.tone;
  return (
    <Panel id="s2-cast" title={t('v2.cast.title')}>
      <ul className="s2-list s2-cast">
        {CAST_ROLES.map((role) => {
          const person = castMemberVNext(story, role, programId);
          if (person === null) return null;
          const last = person.history.at(-1);
          // The coach's relationship is coach trust itself (no second number).
          const value = role === 'coach' ? career.athlete.profile.state.coachTrust : person.value;
          return (
            <li data-role={role} key={role}>
              <span className="s2-eyebrow">{t(CAST_ROLE_KEYS[role])}</span>{' '}
              <strong>{personNameVNext(t, person)}</strong> · {t('v2.cast.value', { value })}
              {last !== undefined && (
                <span className="s2-note">
                  {' '}
                  {t('v2.cast.last', {
                    delta: signed(last.delta),
                    beat: t(key(storyKeysVNext(last.beatId).title), {
                      rival: personNameVNext(t, person),
                      reporter: personNameVNext(t, castMemberVNext(story, 'reporter', programId)),
                    }),
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="s2-note">
        {tone === null
          ? t('v2.cast.noTone')
          : t('v2.cast.toneLine', {
              tone: t(TONE_KEYS[tone]),
              chance: toneNilChancePermilleVNext(career),
            })}
      </p>
    </Panel>
  );
}

/** This class year's goal and where the season stands on it (REL-03). */
export function GoalLine({ career }: { readonly career: CareerVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.program === null) return null;
  const goalId = seasonGoalIdVNext(career.season.index);
  const snaps = career.log
    .filter((recap) => (recap.seasonIndex ?? 0) === career.season.index)
    .reduce((sum, { liveSnapCount }) => sum + liveSnapCount, 0);
  return (
    <p className="s2-note" id="s2-goal">
      <strong>{t('v2.goal.title')}:</strong>{' '}
      {t(GOAL_KEYS[goalId], { snaps: VNEXT_KEY_PLAYER_SNAPS })}{' '}
      {t('v2.goal.progress.role', {
        role: t(ROLE_KEYS[career.program.room.projection.roleId]),
        snaps,
      })}
    </p>
  );
}

/** The season's graded goal and contributor honors in the review. */
export function ReviewGoal({
  review,
}: {
  readonly review: SeasonReviewVNext;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (review.goal === undefined) return null;
  return (
    <div className="s2-stack" id="s2-review-goal" style={{ gap: 6 }}>
      <p>
        <span className={`s2-effect ${review.goal.met ? 's2-effect--up' : 's2-effect--down'}`}>
          {t(review.goal.met ? 'v2.goal.met' : 'v2.goal.missed')}
        </span>{' '}
        {t(GOAL_KEYS[review.goal.goalId], { snaps: VNEXT_KEY_PLAYER_SNAPS })}
      </p>
      {(review.honors ?? []).length > 0 && (
        <p className="s2-offer__tags">
          {(review.honors ?? []).map((honor) => (
            <span className="s2-tag" key={honor}>
              {t(HONOR_KEYS[honor])}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/** The program's scheme, what it favors, and the athlete's fit as the depth chart counts it. */
export function SchemePanel({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.program === null) return null;
  const positionId = career.athlete.profile.positionId;
  const programId = career.program.programId;
  const scheme = programSchemeVNext(
    career.seed,
    programId,
    positionId,
    career.season.index,
    mechanics,
  );
  if (scheme === null) return null;
  const archetypeId = career.athlete.profile.archetypeId;
  const value =
    roomMechanicsVNext(mechanics, career.seed, programId, positionId, career.season.index)
      .schemeFitByArchetype[archetypeId] ?? 0;
  const band = schemeFitBandVNext(scheme.schemeId, archetypeId, mechanics);
  const delta =
    band === 'ideal'
      ? VNEXT_PROGRAM_TUNING.schemeFit.ideal
      : band === 'poor'
        ? VNEXT_PROGRAM_TUNING.schemeFit.poor
        : 0;
  const favorsKey = schemeNameKeyVNext(scheme.schemeId).replace(
    'v2.programProfile.scheme.',
    'v2.scheme.favors.',
  );
  return (
    <Panel id="s2-scheme" title={t('v2.scheme.title')}>
      <p>{t(key(favorsKey))}</p>
      <p className="s2-note">
        {t('v2.scheme.fit', { fit: t(FIT_KEYS[band]), value, delta: signed(delta) })}
      </p>
    </Panel>
  );
}
