import { useEffect, useRef } from 'react';
import { qbAlphaContent, rbAlphaContent, cbAlphaContent } from '@project-saturday/game-content';
import type { PositionAlphaSessionV2 } from '@project-saturday/game-core';
import type { MessageKey, SupportedLocale } from '@project-saturday/game-content/locales';
import { useAppTranslation } from '../i18n/i18n';

const CATALOGS = {
  position_qb: qbAlphaContent,
  position_rb: rbAlphaContent,
  position_cb: cbAlphaContent,
};

/** A literal migrated pending event must resolve before the first current focus commitment. */
export function PositionAlphaPendingEvent({
  session,
  locale,
  busy,
  saveFailed,
  onChoose,
}: {
  readonly session: PositionAlphaSessionV2;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly saveFailed: boolean;
  readonly onChoose: (choiceId: string) => void;
}): React.JSX.Element | null {
  const { t } = useAppTranslation(locale);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = session.events.pending;
  useEffect(() => {
    heading.current?.focus();
  }, [pending?.eventId]);
  if (session.gameDay.type !== 'IDLE' || pending === null) return null;
  const event = CATALOGS[session.player.positionId].events.find(
    ({ id }) => id === pending.eventId,
  )!;
  return (
    <section
      className="panel"
      aria-labelledby="position-pending-event-heading"
      data-testid="position-pending-event"
    >
      <h2 id="position-pending-event-heading" ref={heading} tabIndex={-1}>
        {t(event.nameKey as MessageKey)}
      </h2>
      <p>{t(event.descriptionKey as MessageKey)}</p>
      <div className="choice-grid">
        {event.choices
          .filter(({ id }) => pending.choiceIds.includes(id))
          .map((choice) => (
            <button
              className="choice-card"
              type="button"
              key={choice.id}
              disabled={busy || saveFailed}
              onClick={() => onChoose(choice.id)}
              aria-labelledby={`${choice.id}-name`}
              aria-describedby={`${choice.id}-description`}
            >
              <span className="choice-card__copy">
                <strong id={`${choice.id}-name`}>{t(choice.nameKey as MessageKey)}</strong>
                <small id={`${choice.id}-description`}>
                  {t(choice.descriptionKey as MessageKey)}
                </small>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}
