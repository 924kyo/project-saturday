import { useId, useState } from 'react';

import { useAppTranslation } from '../i18n/i18n';
import { key } from './content';
import { GLOSSARY_TERMS, type GlossaryTerm } from './glossary-terms';

/** Every term with its plain definition (M12 UI-06), shown in Settings. */
export function GlossaryList(): React.JSX.Element {
  const { t } = useAppTranslation();
  return (
    <div className="s2-stack" id="s2-glossary" style={{ gap: 6 }}>
      <p className="s2-note">{t('v2.glossary.help')}</p>
      <dl className="s2-glossary">
        {GLOSSARY_TERMS.map((term) => (
          <div key={term}>
            <dt>{t(key(`v2.glossary.${term}.name`))}</dt>
            <dd>{t(key(`v2.glossary.${term}.def`))}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A term that opens its definition in place, by click or keyboard (first-use explanations). */
export function Term({ term }: { readonly term: GlossaryTerm }): React.JSX.Element {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="s2-term">
      <button
        aria-controls={id}
        aria-expanded={open}
        className="s2-term__name"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {t(key(`v2.glossary.${term}.name`))}
      </button>
      {open && (
        <span className="s2-term__def" id={id} role="note">
          {t(key(`v2.glossary.${term}.def`))}
        </span>
      )}
    </span>
  );
}

/** A row of terms for a screen's key words; one definition opens below the row at a time. */
export function TermRow({ terms }: { readonly terms: readonly GlossaryTerm[] }): React.JSX.Element {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState<GlossaryTerm | null>(null);
  const id = useId();
  return (
    <div className="s2-note">
      <p className="s2-termrow">
        <span className="s2-eyebrow">{t('v2.glossary.terms')}</span>{' '}
        {terms.map((term) => (
          <button
            aria-controls={id}
            aria-expanded={open === term}
            className="s2-term__name"
            key={term}
            onClick={() => setOpen((value) => (value === term ? null : term))}
            type="button"
          >
            {t(key(`v2.glossary.${term}.name`))}
          </button>
        ))}
      </p>
      {open !== null && (
        <p className="s2-term__def" id={id} role="note">
          {t(key(`v2.glossary.${open}.def`))}
        </p>
      )}
    </div>
  );
}
