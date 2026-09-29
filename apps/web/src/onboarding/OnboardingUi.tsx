import { useState } from 'react';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';

import { useAppTranslation } from '../i18n/i18n';
import { ONBOARDING_TOPICS, type OnboardingTopic } from './onboarding';

interface TopicCopyKeys {
  readonly consequenceKey: MessageKey;
  readonly purposeKey: MessageKey;
  readonly titleKey: MessageKey;
}

const TOPIC_COPY_KEYS = {
  creation: {
    consequenceKey: 'onboarding.creation.consequence',
    purposeKey: 'onboarding.creation.purpose',
    titleKey: 'onboarding.creation.title',
  },
  week: {
    consequenceKey: 'onboarding.week.consequence',
    purposeKey: 'onboarding.week.purpose',
    titleKey: 'onboarding.week.title',
  },
  team: {
    consequenceKey: 'onboarding.team.consequence',
    purposeKey: 'onboarding.team.purpose',
    titleKey: 'onboarding.team.title',
  },
  skills: {
    consequenceKey: 'onboarding.skills.consequence',
    purposeKey: 'onboarding.skills.purpose',
    titleKey: 'onboarding.skills.title',
  },
} as const satisfies Record<OnboardingTopic, TopicCopyKeys>;

interface GuideCopyProps {
  readonly locale: SupportedLocale;
  readonly topic: OnboardingTopic;
}

function GuideCopy({ locale, topic }: GuideCopyProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const copy = TOPIC_COPY_KEYS[topic];
  return (
    <>
      <p>{t(copy.purposeKey)}</p>
      <p className="onboarding-guide__consequence">{t(copy.consequenceKey)}</p>
    </>
  );
}

export interface OnboardingGuideProps {
  readonly locale: SupportedLocale;
  readonly onComplete: (topic: OnboardingTopic) => void;
  readonly onSkipAll: () => void;
  readonly topic: OnboardingTopic;
}

export function OnboardingGuide({
  locale,
  onComplete,
  onSkipAll,
  topic,
}: OnboardingGuideProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const titleId = `onboarding-${topic}-title`;
  return (
    <aside
      aria-labelledby={titleId}
      className="onboarding-guide"
      data-testid={`onboarding-${topic}`}
    >
      <div className="onboarding-guide__marker" aria-hidden="true" />
      <div className="onboarding-guide__body">
        <p className="step-mark">{t('onboarding.label')}</p>
        <h2 id={titleId}>{t(TOPIC_COPY_KEYS[topic].titleKey)}</h2>
        <GuideCopy locale={locale} topic={topic} />
        <div className="onboarding-guide__actions">
          <button
            className="button button--primary"
            data-testid={`onboarding-complete-${topic}`}
            type="button"
            onClick={() => onComplete(topic)}
          >
            {t('onboarding.complete')}
          </button>
          <button
            className="button button--quiet"
            data-testid="onboarding-skip-all"
            type="button"
            onClick={onSkipAll}
          >
            {t('onboarding.skipAll')}
          </button>
        </div>
      </div>
    </aside>
  );
}

export interface HelpSettingsPanelProps {
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onReplayAll: () => void;
  readonly onReplayTopic: (topic: OnboardingTopic) => void;
}

export function HelpSettingsPanel({
  locale,
  onClose,
  onReplayAll,
  onReplayTopic,
}: HelpSettingsPanelProps): React.JSX.Element {
  const { t } = useAppTranslation(locale);
  const [reviewedTopic, setReviewedTopic] = useState<OnboardingTopic>('creation');

  return (
    <section
      aria-labelledby="help-settings-title"
      className="help-settings"
      id="help-settings-panel"
      data-testid="help-settings-panel"
      role="region"
    >
      <header>
        <div>
          <p className="step-mark">{t('help.label')}</p>
          <h2 id="help-settings-title">{t('help.title')}</h2>
        </div>
        <button className="button button--quiet" type="button" onClick={onClose}>
          {t('help.close')}
        </button>
      </header>
      <p>{t('help.intro')}</p>
      <div className="help-settings__topics" role="tablist" aria-label={t('help.guides')}>
        {ONBOARDING_TOPICS.map((topic) => (
          <button
            aria-controls="help-guide-review"
            aria-selected={reviewedTopic === topic}
            className="help-settings__topic"
            data-testid={`help-review-${topic}`}
            id={`help-tab-${topic}`}
            key={topic}
            role="tab"
            type="button"
            onClick={() => setReviewedTopic(topic)}
          >
            {t(TOPIC_COPY_KEYS[topic].titleKey)}
          </button>
        ))}
      </div>
      <article
        aria-labelledby={`help-tab-${reviewedTopic}`}
        className="help-settings__review"
        data-testid="help-guide-review"
        id="help-guide-review"
        role="tabpanel"
      >
        <h3 id={`help-review-${reviewedTopic}-title`}>
          {t(TOPIC_COPY_KEYS[reviewedTopic].titleKey)}
        </h3>
        <GuideCopy locale={locale} topic={reviewedTopic} />
        <button
          className="button button--quiet"
          data-testid={`help-replay-${reviewedTopic}`}
          type="button"
          onClick={() => {
            onReplayTopic(reviewedTopic);
            onClose();
          }}
        >
          {t('help.replayTopic')}
        </button>
      </article>
      <button
        className="button button--primary"
        data-testid="help-replay-all"
        type="button"
        onClick={() => {
          onReplayAll();
          onClose();
        }}
      >
        {t('help.replayAll')}
      </button>
    </section>
  );
}
