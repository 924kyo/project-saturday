import type { NilEffect } from '@project-saturday/game-core';
import { offFieldContent } from '@project-saturday/game-content';
import type { MessageKey } from '@project-saturday/game-content/locales';

import type { AppTranslate } from '../i18n/i18n';
import { key } from './content';

/** NIL presentation lookups: authored offer, benefit and category copy by stable ID. */
const STATE_KEYS = {
  nil_state_body: 'v2.stat.body',
  nil_state_preparation: 'v2.stat.prep',
  nil_state_confidence: 'v2.stat.conf',
  nil_state_coach_trust: 'v2.stat.trust',
  nil_state_brand: 'v2.stat.brand',
} as const satisfies Record<string, MessageKey>;

export function named(
  list: readonly { readonly id: string; readonly nameKey: string }[],
  id: string,
) {
  const found = list.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`Missing presentation for ${id}.`);
  return key(found.nameKey);
}

export function nilOfferText(offerId: string) {
  const offer = offFieldContent.nil.offers.find(({ id }) => id === offerId);
  if (offer === undefined) throw new Error(`Missing NIL offer presentation for ${offerId}.`);
  return offer;
}

export function benefitNameKey(benefitId: string): MessageKey {
  return named(offFieldContent.benefits, benefitId);
}

/** The effect as it actually landed (after multipliers and bounds). */
export function withDelta(effect: NilEffect, delta: number): NilEffect {
  switch (effect.type) {
    case 'nil_integer_state_delta':
    case 'nil_relationship_delta':
      return { ...effect, delta };
    case 'nil_gpa_delta_milli':
      return { ...effect, deltaMilli: delta };
    case 'nil_funds_delta_usd':
      return { ...effect, deltaUsd: delta };
    case 'nil_benefit_grant':
      return { ...effect, quantity: delta };
  }
}

const signed = (value: number) => `${value > 0 ? '+' : '−'}${Math.abs(value)}`;

/** One chip per authored NIL effect, with the exact value the effect carries. */
export function nilEffectChips(
  t: AppTranslate,
  effects: readonly NilEffect[],
): readonly { readonly text: string; readonly value: number }[] {
  return effects.map((effect) => {
    switch (effect.type) {
      case 'nil_integer_state_delta':
        return {
          text: `${t(STATE_KEYS[effect.stateId])} ${signed(effect.delta)}`,
          value: effect.delta,
        };
      case 'nil_gpa_delta_milli':
        return {
          text: `${t('v2.stat.gpa')} ${signed(Math.round(effect.deltaMilli / 10) / 100)}`,
          value: effect.deltaMilli,
        };
      case 'nil_funds_delta_usd':
        return {
          text: t('v2.nil.funds', { value: signed(effect.deltaUsd) }),
          value: effect.deltaUsd,
        };
      case 'nil_relationship_delta':
        return {
          text: `${t(
            effect.actorId === 'relationship_actor_position_coach'
              ? 'v2.stat.trust'
              : 'v2.nil.lockerRoom',
          )} ${signed(effect.delta)}`,
          value: effect.delta,
        };
      case 'nil_benefit_grant':
        return {
          text: t('v2.nil.benefit', { benefit: t(benefitNameKey(effect.benefitId)) }),
          value: 1,
        };
    }
  });
}

export function nilCategoryNameKey(categoryId: string): MessageKey {
  return named(offFieldContent.nil.categories, categoryId);
}
