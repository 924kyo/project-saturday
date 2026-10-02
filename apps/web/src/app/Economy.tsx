import {
  buyGearCareerVNext,
  buyServiceCareerVNext,
  cardCatalogVNext,
  cardTellBonusesVNext,
  cardsOfVNext,
  craftCardCareerVNext,
  drawCardCareerVNext,
  equipGearCareerVNext,
  GEAR_IDS_VNEXT,
  masterCardCareerVNext,
  nilLedgerVNext,
  nilOfVNext,
  SHOP_SERVICE_IDS_VNEXT,
  shopOfVNext,
  VNEXT_CARD_TUNING,
  VNEXT_SHOP_TUNING,
  type CardAttributionVNext,
  type CareerVNext,
  type CareerVNextMechanics,
  type GearIdVNext,
  type ShopServiceIdVNext,
} from '@project-saturday/game-core';
import type { MessageKey } from '@project-saturday/game-content/locales';

import { useAppTranslation, type AppTranslate } from '../i18n/i18n';
import type { CareerCommand } from './command';
import { cardView, formatUsd, key } from './content';
import { nilOfferText } from './nil';
import { Panel } from './ui';

const signed = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
const camel = (id: string) =>
  id
    .split('_')
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('');
const serviceKey = (id: ShopServiceIdVNext) => key(`v2.shop.service.${camel(id)}`);
const gearKey = (id: GearIdVNext) => key(`v2.shop.gear.${camel(id)}`);
const GRADE_LETTER: Readonly<Record<string, string>> = {
  skill_grade_c: 'C',
  skill_grade_b: 'B',
  skill_grade_a: 'A',
  skill_grade_s: 'S',
};

function effectsText(t: AppTranslate, row: Omit<CardAttributionVNext, 'skillId' | 'active'>) {
  const parts: [MessageKey, number, string][] = [
    ['v2.cards.attribution.xp', row.xp, signed(row.xp)],
    ['v2.cards.attribution.body', row.body, signed(row.body)],
    ['v2.cards.attribution.prep', row.preparation, signed(row.preparation)],
    ['v2.cards.attribution.conf', row.confidence, signed(row.confidence)],
    ['v2.cards.attribution.gpa', row.gpaMilli, signed(Math.round(row.gpaMilli / 10) / 100)],
  ];
  return parts
    .filter(([, value]) => value !== 0)
    .map(([messageKey, , value]) => t(messageKey, { value }))
    .join(' · ');
}

/** Each equipped card's difference on a plan: the with/without numbers (CARD-01, CARD-02). */
export function CardAttributionList({
  rows,
}: {
  readonly rows:
    readonly (Omit<CardAttributionVNext, 'skillId'> & { readonly skillId: string })[] | undefined;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  if (rows === undefined || rows.length === 0) return null;
  return (
    <div className="s2-stack" id="s2-card-attribution" style={{ gap: 4 }}>
      <p className="s2-eyebrow">{t('v2.cards.attribution.title')}</p>
      <ul className="s2-list">
        {rows.map((row) => {
          const card = t(cardView(row.skillId).nameKey);
          const text = effectsText(t, row);
          return (
            <li data-active={row.active} key={row.skillId}>
              {row.active && text !== ''
                ? t('v2.cards.attribution.active', { card, effects: text })
                : t('v2.cards.attribution.inactive', { card })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The tells equipped cards add to Saturday's reads (the kernel's clue-bonus input). */
export function CardTells({
  career,
  mechanics,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
}): React.JSX.Element | null {
  const { t } = useAppTranslation();
  const bonuses = cardTellBonusesVNext(career, mechanics);
  if (bonuses.length === 0) return null;
  return (
    <p className="s2-note" id="s2-card-tells">
      {bonuses
        .map(({ skillId, tells }) =>
          t('v2.cards.tells', { card: t(cardView(skillId).nameKey), count: tells }),
        )
        .join(' · ')}
    </p>
  );
}

/** Insight, the Workshop, the Scouting Draw, mastery and the rules (CARD-03…07). */
export function InsightPanel({
  career,
  mechanics,
  blocked,
  onRun,
}: {
  readonly career: CareerVNext;
  readonly mechanics: CareerVNextMechanics;
  readonly blocked: boolean;
  readonly onRun: (command: CareerCommand) => void;
}): React.JSX.Element {
  const { t } = useAppTranslation();
  const cards = cardsOfVNext(career);
  const tuning = VNEXT_CARD_TUNING;
  const planning = career.flow.type === 'WEEK_PLAN';
  const catalog = cardCatalogVNext(career, mechanics);
  const unowned = catalog.filter(({ skillId }) => !career.build.ownedSkillIds.includes(skillId));
  const odds = tuning.draw.oddsPermille;
  const last = cards.draws.at(-1);
  const pct = (permille: number) => Math.round(permille / 10);
  return (
    <div className="s2-stack" id="s2-insight">
      <Panel
        aside={
          <span className="s2-effect s2-num">
            {t('v2.cards.insight.balance', { value: cards.insight })}
          </span>
        }
        id="s2-insight-panel"
        title={t('v2.cards.insight.title')}
      >
        <p className="s2-note">
          {t('v2.cards.insight.sources', {
            skip: tuning.insight.skippedOffer,
            award: tuning.insight.perAward,
            refund: tuning.insight.duplicateRefund,
          })}
        </p>
      </Panel>
      <div className="s2-grid-2">
        <Panel id="s2-workshop" title={t('v2.cards.workshop.title')}>
          <p className="s2-note">{t('v2.cards.workshop.help')}</p>
          {unowned.length === 0 ? (
            <p className="s2-note">{t('v2.cards.workshop.complete')}</p>
          ) : (
            <details className="s2-disclosure">
              <summary>{t('v2.cards.workshop.browse', { count: unowned.length })}</summary>
              <ul className="s2-list s2-shoplist">
                {unowned.map(({ skillId, gradeId }) => {
                  const price = tuning.workshopPrice[gradeId];
                  return (
                    <li key={skillId}>
                      <span>
                        <strong>{GRADE_LETTER[gradeId]}</strong> {t(cardView(skillId).nameKey)}
                      </span>
                      <button
                        className="s2-chipbtn"
                        disabled={blocked || !planning || cards.insight < price}
                        onClick={() => onRun((c, m) => craftCardCareerVNext(c, skillId, m))}
                        type="button"
                      >
                        {t('v2.cards.workshop.craft', { price })}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </Panel>
        <Panel id="s2-draw" title={t('v2.cards.draw.title')}>
          <p className="s2-note">{t('v2.cards.draw.help', { cost: tuning.draw.cost })}</p>
          <p className="s2-num">
            {t('v2.cards.draw.odds', {
              c: pct(odds.skill_grade_c),
              b: pct(odds.skill_grade_b),
              a: pct(odds.skill_grade_a),
              s: pct(odds.skill_grade_s),
            })}
          </p>
          <p className="s2-note">
            {t('v2.cards.draw.pity', {
              draws: tuning.draw.pityDraws,
              left: tuning.draw.pityDraws - cards.pity,
            })}
          </p>
          {last !== undefined && (
            <p className="s2-note">
              {t('v2.cards.draw.last', {
                card: t(cardView(last.skillId).nameKey),
                grade: GRADE_LETTER[last.gradeId] ?? '',
                duplicate: last.duplicate ? 'yes' : 'no',
              })}
            </p>
          )}
          <button
            className="s2-chipbtn"
            disabled={blocked || !planning || cards.insight < tuning.draw.cost}
            onClick={() => onRun((c, m) => drawCardCareerVNext(c, m))}
            type="button"
          >
            {t('v2.cards.draw.button', { cost: tuning.draw.cost })}
          </button>
        </Panel>
      </div>
      <Panel id="s2-mastery" title={t('v2.cards.mastery.title')}>
        <p className="s2-note">
          {t('v2.cards.mastery.help', {
            two: pct(tuning.mastery.strengthPermille[1]),
            three: pct(tuning.mastery.strengthPermille[2]),
          })}
        </p>
        <ul className="s2-list s2-shoplist">
          {career.build.ownedSkillIds.map((skillId) => {
            const level = cards.mastery[skillId] ?? 1;
            const copies = cards.duplicates[skillId] ?? 0;
            const maxed = level >= tuning.mastery.maxLevel;
            const price = tuning.mastery.price[level] ?? 0;
            return (
              <li key={skillId}>
                <span>
                  {t(cardView(skillId).nameKey)} · {t('v2.cards.mastery.level', { level })}
                  {!maxed && (
                    <span className="s2-note">
                      {' '}
                      {t('v2.cards.mastery.preview', {
                        from: pct(tuning.mastery.strengthPermille[level - 1]!),
                        to: pct(tuning.mastery.strengthPermille[level]!),
                      })}
                    </span>
                  )}
                </span>
                {maxed ? (
                  <span className="s2-effect s2-effect--up">{t('v2.cards.mastery.max')}</span>
                ) : (
                  <span className="s2-row" style={{ gap: 6 }}>
                    <button
                      className="s2-chipbtn"
                      disabled={blocked || !planning || cards.insight < price}
                      onClick={() => onRun((c) => masterCardCareerVNext(c, skillId, 'insight'))}
                      type="button"
                    >
                      {t('v2.cards.mastery.raise', { price })}
                    </button>
                    <button
                      className="s2-chipbtn"
                      disabled={blocked || !planning || copies < 1}
                      onClick={() => onRun((c) => masterCardCareerVNext(c, skillId, 'duplicate'))}
                      type="button"
                    >
                      {t('v2.cards.mastery.fuse', { count: copies })}
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel id="s2-card-rules" title={t('v2.cards.legend.title')}>
        <p className="s2-note">{t('v2.cards.legend.grades')}</p>
      </Panel>
    </div>
  );
}

/** The NIL ledger, fixed-price services, gear and style tokens (NIL-01, NIL-02). */
export function ShopPanel({
  career,
  blocked,
  onRun,
}: {
  readonly career: CareerVNext;
  readonly blocked: boolean;
  readonly onRun: (command: CareerCommand) => void;
}): React.JSX.Element {
  const { i18n, t } = useAppTranslation();
  const ledger = nilLedgerVNext(career);
  const shop = shopOfVNext(career);
  const nil = nilOfVNext(career);
  const usd = (value: number) => formatUsd(i18n.resolvedLanguage, value);
  const planning = career.flow.type === 'WEEK_PLAN';
  const tokens =
    nil.benefits.find(({ benefitId }) => benefitId === VNEXT_SHOP_TUNING.styleTokenBenefitId)
      ?.quantity ?? 0;
  const boughtThisWeek = (id: ShopServiceIdVNext) =>
    shop.purchases.some(
      (entry) =>
        entry.itemId === id &&
        entry.seasonIndex === career.season.index &&
        entry.weekIndex === career.season.weekIndex,
    );
  return (
    <Panel id="s2-shop" title={t('v2.shop.title')}>
      <p className="s2-num">
        {t('v2.shop.ledger', {
          earned: usd(ledger.earnedUsd),
          spendable: usd(ledger.spendableUsd),
          spent: usd(ledger.spentUsd),
        })}
      </p>
      {ledger.obligation !== null && (
        <p className="s2-note">
          {t('v2.shop.obligation', {
            offer: t(key(nilOfferText(ledger.obligation.offerId).nameKey)),
            weeks: ledger.obligation.weeksRemaining,
          })}
        </p>
      )}
      <p className="s2-note">{t('v2.shop.help')}</p>
      <ul className="s2-list s2-shoplist">
        {SHOP_SERVICE_IDS_VNEXT.map((id) => {
          const service = VNEXT_SHOP_TUNING.services[id] as {
            readonly priceUsd: number;
            readonly body?: number;
            readonly preparation?: number;
            readonly gpaMilli?: number;
            readonly brand?: number;
            readonly visibilityWeeks?: number;
          };
          const done = boughtThisWeek(id);
          return (
            <li key={id}>
              <span>
                {t(serviceKey(id), {
                  body: service.body ?? 0,
                  prep: service.preparation ?? 0,
                  gpa: ((service.gpaMilli ?? 0) / 1000).toFixed(2),
                  brand: service.brand ?? 0,
                  weeks: service.visibilityWeeks ?? 0,
                })}
              </span>
              {done ? (
                <span className="s2-effect s2-effect--up">{t('v2.shop.bought')}</span>
              ) : (
                <button
                  className="s2-chipbtn"
                  disabled={blocked || !planning || nil.fundsUsd < service.priceUsd}
                  onClick={() => onRun((c) => buyServiceCareerVNext(c, id))}
                  type="button"
                >
                  {t('v2.shop.buy', { price: usd(service.priceUsd) })}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="s2-eyebrow">{t('v2.shop.gearTitle')}</p>
      {tokens > 0 && <p className="s2-note">{t('v2.shop.tokens', { count: tokens })}</p>}
      <ul className="s2-list s2-shoplist">
        {GEAR_IDS_VNEXT.map((id) => {
          const owned = shop.ownedGearIds.includes(id);
          const worn = shop.equippedGearIds.includes(id);
          const price = VNEXT_SHOP_TUNING.gear[id];
          return (
            <li key={id}>
              <span>{t(gearKey(id))}</span>
              {owned ? (
                <button
                  className="s2-chipbtn"
                  disabled={blocked}
                  onClick={() => onRun((c) => equipGearCareerVNext(c, id, !worn))}
                  type="button"
                >
                  {t(worn ? 'v2.shop.putAway' : 'v2.shop.wear')}
                </button>
              ) : (
                <span className="s2-row" style={{ gap: 6 }}>
                  <button
                    className="s2-chipbtn"
                    disabled={blocked || !planning || nil.fundsUsd < price}
                    onClick={() => onRun((c) => buyGearCareerVNext(c, id, 'money'))}
                    type="button"
                  >
                    {t('v2.shop.buy', { price: usd(price) })}
                  </button>
                  {tokens > 0 && (
                    <button
                      className="s2-chipbtn"
                      disabled={blocked || !planning}
                      onClick={() => onRun((c) => buyGearCareerVNext(c, id, 'token'))}
                      type="button"
                    >
                      {t('v2.shop.token')}
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
