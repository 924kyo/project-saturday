import {
  CAREER_VNEXT_REGULAR_SEASON_WEEKS,
  postseasonRoundVNext,
  type CareerVNext,
  type VNextPositionId,
} from '@project-saturday/game-core';

import { AthletePortrait } from '../career/AthletePortrait';
import { PORTRAIT } from './theme';
import { useAppTranslation } from '../i18n/i18n';
import {
  CLASS_YEAR_KEYS,
  POSITION_ABBR_KEYS,
  ROLE_KEYS,
  ROUND_KEYS,
  currentOverall,
  key,
  program,
} from './content';
import { Crest } from './ui';

/** Locker-room nameplate: who you are, where you play, where you stand. */
export function Nameplate({ career }: { readonly career: CareerVNext }): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (career.program === null) return null;
  const identity = program(career.program.programId);
  const positionId = career.athlete.profile.positionId as VNextPositionId;
  const rank = career.program.room.projection.rank;
  const round = postseasonRoundVNext(career);
  const flow = career.flow.type;
  // After the schedule the nameplate names the season stage instead of a week number.
  const stage =
    flow === 'OFFSEASON'
      ? t('v2.off.eyebrow')
      : flow === 'CAREER_COMPLETE'
        ? t('v2.alumni.eyebrow')
        : round !== null
          ? t(ROUND_KEYS[round])
          : career.season.weekIndex >= CAREER_VNEXT_REGULAR_SEASON_WEEKS
            ? t('v2.review.eyebrow', { n: career.season.index + 1 })
            : t('v2.week.label', { week: career.season.weekIndex + 1 });
  return (
    <header className="s2-nameplate">
      <div className="s2-nameplate__portrait">
        <AthletePortrait
          appearance={career.athlete.profile.appearance}
          label={t('v2.player.portrait', { name: career.athlete.profile.displayName })}
          size={PORTRAIT.card}
        />
      </div>
      <div className="s2-nameplate__who">
        <p className="s2-eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {t(key(identity.shortNameKey))} ·{' '}
          {t(CLASS_YEAR_KEYS[Math.min(4, career.season.index + 1) as 1 | 2 | 3 | 4])} · {stage}
        </p>
        <h1 className="s2-display s2-nameplate__name">{career.athlete.profile.displayName}</h1>
        <p className="s2-nameplate__meta">
          {t(ROLE_KEYS[career.program.room.projection.roleId])} ·{' '}
          {t('v2.player.ovr', { ovr: currentOverall(career) })}
        </p>
      </div>
      <div className="s2-nameplate__side">
        <Crest identity={identity} size={52} />
        <span className="s2-rankchip s2-num" aria-label={t('v2.depth.rankLabel', { rank })}>
          <small>{t('v2.depth.chart')}</small>
          {t(POSITION_ABBR_KEYS[positionId])}
          {rank}
        </span>
      </div>
    </header>
  );
}
