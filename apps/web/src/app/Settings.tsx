import { GlossaryList } from './Glossary';
import { useAppTranslation } from '../i18n/i18n';
import type { Preferences } from './preferences';

const UNIT_OPTIONS: readonly Preferences['units'][] = ['metric', 'imperial'];
const MOTION_OPTIONS: readonly Preferences['motion'][] = ['system', 'on', 'off'];
const NAME_OPTIONS: readonly Preferences['nameDisplay'][] = ['localized', 'original'];
const MOTION_KEYS = {
  system: 'v2.settings.motionSystem',
  on: 'v2.settings.motionOn',
  off: 'v2.settings.motionOff',
} as const;

/** Device settings: units and Play Review. Language stays on its own top-bar switch. */
export function SettingsPanel({
  preferences,
  onChange,
  onClose,
}: {
  readonly preferences: Preferences;
  readonly onChange: (next: Preferences) => void;
  readonly onClose: () => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  return (
    <section aria-labelledby="s2-settings-title" className="s2-panel s2-settings" role="dialog">
      <h2 className="s2-display s2-size-h2" id="s2-settings-title">
        {t('v2.settings.title')}
      </h2>
      <fieldset className="s2-settings__row">
        <legend className="s2-eyebrow">{t('v2.settings.units')}</legend>
        <div className="s2-swatches" role="group">
          {UNIT_OPTIONS.map((units) => (
            <button
              aria-pressed={preferences.units === units}
              className="s2-swatch"
              key={units}
              onClick={() => onChange({ ...preferences, units })}
              type="button"
            >
              {t(units === 'metric' ? 'v2.settings.metric' : 'v2.settings.imperial')}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="s2-settings__row">
        <legend className="s2-eyebrow">{t('v2.settings.motion')}</legend>
        <div className="s2-swatches" role="group">
          {MOTION_OPTIONS.map((motion) => (
            <button
              aria-pressed={preferences.motion === motion}
              className="s2-swatch"
              key={motion}
              onClick={() => onChange({ ...preferences, motion })}
              type="button"
            >
              {t(MOTION_KEYS[motion])}
            </button>
          ))}
        </div>
        <p className="s2-note">{t('v2.settings.motionHelp')}</p>
      </fieldset>
      <fieldset className="s2-settings__row">
        <legend className="s2-eyebrow">{t('v2.settings.nameDisplay')}</legend>
        <div className="s2-swatches" role="group">
          {NAME_OPTIONS.map((nameDisplay) => (
            <button
              aria-pressed={preferences.nameDisplay === nameDisplay}
              className="s2-swatch"
              key={nameDisplay}
              onClick={() => onChange({ ...preferences, nameDisplay })}
              type="button"
            >
              {t(
                nameDisplay === 'localized'
                  ? 'v2.settings.nameLocalized'
                  : 'v2.settings.nameOriginal',
              )}
            </button>
          ))}
        </div>
        <p className="s2-note">{t('v2.settings.nameHelp')}</p>
      </fieldset>
      <div className="s2-settings__row">
        <label className="s2-toggle">
          <input
            checked={preferences.playReview}
            onChange={(event) => onChange({ ...preferences, playReview: event.target.checked })}
            type="checkbox"
          />
          <span className="s2-toggle__track" aria-hidden="true" />
          <span>
            <strong>{t('v2.settings.playReview')}</strong>
            <br />
            <span className="s2-note">{t('v2.settings.playReviewHelp')}</span>
          </span>
        </label>
      </div>
      <details className="s2-disclosure s2-settings__row">
        <summary>{t('v2.glossary.title')}</summary>
        <GlossaryList />
      </details>
      <button className="s2-btn s2-btn--ghost" onClick={onClose} type="button">
        {t('v2.settings.close')}
      </button>
    </section>
  );
}
