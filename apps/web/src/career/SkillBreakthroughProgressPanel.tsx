import type {
  SkillBreakthroughGaugeState,
  SkillBreakthroughOffer,
  SkillBreakthroughProgressEvidence,
  SkillBreakthroughSourceId,
} from '@project-saturday/game-core';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { ProgressMeter } from './ProgressMeter';

const SOURCE_LABEL_KEYS = {
  breakthrough_source_development: 'career.skills.gauge.source.development',
  breakthrough_source_role_coach: 'career.skills.gauge.source.roleCoach',
  breakthrough_source_game_day: 'career.skills.gauge.source.gameDay',
  breakthrough_source_mindset: 'career.skills.gauge.source.mindset',
  breakthrough_source_body: 'career.skills.gauge.source.body',
  breakthrough_source_life: 'career.skills.gauge.source.life',
} as const satisfies Record<SkillBreakthroughSourceId, MessageKey>;

export interface SkillBreakthroughProgressPanelProps {
  readonly gauge: SkillBreakthroughGaugeState;
  readonly locale: SupportedLocale;
  readonly offer?: SkillBreakthroughOffer;
}

function offerTrigger(
  offer: SkillBreakthroughOffer | undefined,
): SkillBreakthroughProgressEvidence | null {
  return offer !== undefined && 'trigger' in offer ? offer.trigger : null;
}

export function SkillBreakthroughProgressPanel({
  gauge,
  locale,
  offer,
}: SkillBreakthroughProgressPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const trigger = offerTrigger(offer);
  const ready = trigger !== null;
  const evidence = trigger ?? gauge.lastProgress;
  const meterValue = ready ? gauge.threshold : gauge.progress;
  const remaining = Math.max(0, gauge.threshold - gauge.progress);

  return (
    <section
      className="breakthrough-progress"
      data-ready={ready}
      data-testid="skill-breakthrough-gauge"
      aria-labelledby="skill-breakthrough-gauge-heading"
    >
      <header>
        <div>
          <p className="step-mark">{t('career.skills.gauge.label')}</p>
          <h3 id="skill-breakthrough-gauge-heading">{t('career.skills.gauge.title')}</h3>
        </div>
        <strong data-testid="skill-breakthrough-gauge-value">
          {t(ready ? 'career.skills.gauge.ready' : 'career.skills.gauge.value', {
            current: gauge.progress,
            required: gauge.threshold,
          })}
        </strong>
      </header>
      <ProgressMeter
        label={t('career.skills.gauge.aria', {
          current: meterValue,
          required: gauge.threshold,
        })}
        maximum={gauge.threshold}
        value={meterValue}
        valueText={t(ready ? 'career.skills.gauge.ready' : 'career.skills.gauge.value', {
          current: gauge.progress,
          required: gauge.threshold,
        })}
      />
      <p className="breakthrough-progress__help">
        {t(ready ? 'career.skills.gauge.readyHelp' : 'career.skills.gauge.help', { remaining })}
      </p>
      {evidence === null ? (
        <p className="breakthrough-progress__empty">{t('career.skills.gauge.noEvidence')}</p>
      ) : (
        <div className="breakthrough-progress__evidence" data-testid="skill-gauge-evidence">
          <div>
            <span>
              {t(
                ready
                  ? 'career.skills.gauge.triggerEvidence'
                  : 'career.skills.gauge.latestEvidence',
                { count: evidence.weekIndex },
              )}
            </span>
            <strong>{t('career.skills.gauge.points', { count: evidence.pointsEarned })}</strong>
          </div>
          {evidence.sources.length === 0 ? (
            <p>{t('career.skills.gauge.noPoints')}</p>
          ) : (
            <ul>
              {evidence.sources.map((source) => (
                <li data-source-id={source.sourceId} key={source.sourceId}>
                  <span>{t(SOURCE_LABEL_KEYS[source.sourceId])}</span>
                  <strong>+{source.points}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
