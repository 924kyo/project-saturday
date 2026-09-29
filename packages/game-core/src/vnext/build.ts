import { positionSkillEffectLoadout } from '../season/position-alpha-skill-builds.js';
import {
  collectEquippedGameHooks,
  collectEquippedLifeHooks,
  deriveInjuryRiskSkillEffects,
} from '../skills/effects.js';
import type { SkillId } from '../skills/ids.js';
import { sampleOfferIds } from '../skills/offers.js';
import type { CollectedGameHook, SkillMechanicsDefinition } from '../skills/types.js';
import { createRng } from '../random/rng.js';
import type { BreakthroughOfferVNext, CareerVNext, CareerVNextMechanics } from './types.js';

/**
 * Build expression for VNext: the breakthrough gauge (practice, some events) buys one card from a
 * three-card weighted offer; four slots hold the equipped build. Card effects are consumed by the
 * owning rules (focus resolution, rollover, injury risk, game kernels, event choices).
 */
export const VNEXT_BREAKTHROUGH_THRESHOLD = 80;
export const VNEXT_BUILD_SLOTS = 4;

/** The position's card mechanics (QB/RB/CB position builds; WR ships its own card catalog). */
export function skillDefinitionsVNext(
  mechanics: Pick<CareerVNextMechanics, 'skillBuilds'>,
): readonly SkillMechanicsDefinition[] {
  return mechanics.skillBuilds.definitions;
}

export function loadoutVNext(career: CareerVNext, mechanics: CareerVNextMechanics) {
  return positionSkillEffectLoadout(
    career.build.equippedSkillIds,
    skillDefinitionsVNext(mechanics),
  );
}

/** Offer weights: QB/RB/CB use their authored offer table; WR uses each card's base weight. */
export function offerCandidatesVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly { readonly skillId: SkillId; readonly weight: number }[] {
  const positionId = career.athlete.profile.positionId;
  const owned = new Set<string>(career.build.ownedSkillIds);
  const table =
    positionId === 'position_wr'
      ? skillDefinitionsVNext(mechanics).map(({ id, baseOfferWeight }) => ({
          skillId: id,
          weight: baseOfferWeight,
        }))
      : positionId === 'position_lb' || positionId === 'position_edge'
        ? mechanics.defenders[positionId].skills.map(({ id, baseOfferWeight }) => ({
            skillId: id,
            weight: baseOfferWeight,
          }))
        : mechanics.skillOffers
            .filter((offer) => offer.positionId === positionId)
            .map(({ id, baseOfferWeight }) => ({ skillId: id, weight: baseOfferWeight }));
  // QB/RB/CB game-only cards have no weekly build definition; their kernels consume them directly.
  return table
    .filter(({ skillId }) => !owned.has(skillId))
    .sort((left, right) => (left.skillId < right.skillId ? -1 : 1));
}

/** A full gauge buys an offer of three unowned cards from a named stream; null otherwise. */
export function attemptBreakthroughVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): BreakthroughOfferVNext | null {
  if (career.athlete.breakthroughGauge < VNEXT_BREAKTHROUGH_THRESHOLD) return null;
  const candidates = offerCandidatesVNext(career, mechanics);
  if (candidates.length < 3) return null;
  const sampled = sampleOfferIds(
    createRng(
      `${String(career.seed)}:vnext:breakthrough:${career.season.index}:${career.season.weekIndex}`,
    ),
    candidates,
  );
  if (!sampled.ok) return null;
  return {
    weekIndex: career.season.weekIndex,
    skillIds: [...sampled.offeredSkillIds],
    chosenSkillId: null,
    slotIndex: null,
  };
}

export function gameHooksVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): readonly CollectedGameHook[] {
  const collected = collectEquippedGameHooks(
    loadoutVNext(career, mechanics),
    skillDefinitionsVNext(mechanics),
  );
  return collected.ok ? collected.hooks : [];
}

export function hasLifeHookVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
  hookId: 'life_hook_event_option_access',
): boolean {
  const collected = collectEquippedLifeHooks(
    loadoutVNext(career, mechanics),
    skillDefinitionsVNext(mechanics),
  );
  return collected.ok && collected.hooks.some((hook) => hook.hookId === hookId);
}

export function injuryRiskMultiplierVNext(
  career: CareerVNext,
  mechanics: CareerVNextMechanics,
): number {
  const derived = deriveInjuryRiskSkillEffects(
    loadoutVNext(career, mechanics),
    skillDefinitionsVNext(mechanics),
  );
  return derived.ok ? derived.multiplierPermille : 1_000;
}

/** Package cards: every full 100 permille of package bonus earns one extra live snap. */
export function packageSnapBonusVNext(hooks: readonly CollectedGameHook[]): number {
  const total = hooks
    .filter(({ hookId }) => hookId === 'game_hook_package_snap_bonus')
    .reduce((sum, { valueMilli }) => sum + valueMilli, 0);
  return Math.floor(total / 100);
}
