import { expect, type Locator, type Page } from '@playwright/test';

import { readIndexedDbValue } from './indexed-db';

export type AppLocale = 'en-US' | 'ko-KR';
export type CareerPhaseType =
  'PLAN_ACTIONS' | 'RESOLVE_ACTIONS' | 'SKILL_BREAKTHROUGH' | 'WEEK_END';

export interface PersistedRngState {
  readonly algorithm: 'xoshiro128ss-v1';
  readonly drawCount: number;
  readonly state: readonly [number, number, number, number];
}

export type PersistedAppliedWeeklySkillEffect =
  | {
      readonly effectIndex: number;
      readonly multiplierPermille: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_body_cost_multiplier' | 'action_xp_multiplier';
    }
  | {
      readonly delta: number;
      readonly effectIndex: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_body_delta_flat';
    }
  | {
      readonly deltaMilli: number;
      readonly effectIndex: number;
      readonly skillId: string;
      readonly slotIndex: 0 | 1 | 2 | 3;
      readonly type: 'action_gpa_delta_milli';
    };

export interface PersistedWeeklySkillEffectAggregates {
  readonly bodyCostMultiplierPermille: number;
  readonly bodyDeltaFlat: number;
  readonly gpaDeltaMilli: number;
  readonly xpMultiplierPermille: number;
}

export interface PersistedWeeklyActionResult {
  readonly actionId: string;
  readonly actionIndex: number;
  readonly actualBodyDelta: number;
  readonly appliedSkillEffects: readonly PersistedAppliedWeeklySkillEffect[];
  readonly attributeXp: readonly {
    readonly appliedXp: number;
    readonly attributeId: string;
    readonly awardedXp: number;
    readonly baseXp: number;
  }[];
  readonly baseBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly skillEffectAggregates: PersistedWeeklySkillEffectAggregates;
  readonly weekIndex: number;
}

export interface PersistedSkillBreakthroughOffer {
  readonly offerIndex: number;
  readonly offeredSkillIds: readonly [string, string, string];
  readonly rngDrawCountAfter: number;
  readonly rngDrawCountBefore: number;
  readonly weekIndex: number;
}

export type PersistedCareerPhase =
  | { readonly type: 'PLAN_ACTIONS' }
  | {
      readonly actionIds: readonly [string, string, string];
      readonly nextActionIndex: 0 | 1 | 2;
      readonly results: readonly PersistedWeeklyActionResult[];
      readonly type: 'RESOLVE_ACTIONS';
    }
  | {
      readonly offer: PersistedSkillBreakthroughOffer;
      readonly type: 'SKILL_BREAKTHROUGH';
    }
  | {
      readonly results: readonly [
        PersistedWeeklyActionResult,
        PersistedWeeklyActionResult,
        PersistedWeeklyActionResult,
      ];
      readonly type: 'WEEK_END';
    };

export interface PersistedSkillAcquisition extends PersistedSkillBreakthroughOffer {
  readonly selectedSkillId: string;
}

export interface PersistedPassiveBodyRecovery {
  readonly actualBodyDelta: number;
  readonly appliedSkillEffects: readonly {
    readonly delta: number;
    readonly effectIndex: number;
    readonly skillId: string;
    readonly slotIndex: 0 | 1 | 2 | 3;
    readonly type: 'passive_body_recovery_flat';
  }[];
  readonly baseBodyDelta: number;
  readonly bodyAfter: number;
  readonly bodyBefore: number;
  readonly requestedBodyDelta: number;
  readonly weekIndex: number;
}

export interface PersistedCareer {
  readonly careerSeed: string;
  readonly id: string;
  readonly lastPassiveBodyRecovery: PersistedPassiveBodyRecovery | null;
  readonly phase: PersistedCareerPhase;
  readonly player: {
    readonly appearance: Readonly<Record<string, string | null>>;
    readonly archetypeId: string;
    readonly attributes: unknown;
    readonly displayName: string;
    readonly heightCm: number;
    readonly id: string;
    readonly personalityTraitIds: readonly string[];
    readonly recruitingBackgroundId: string;
    readonly state: {
      readonly body: number;
      readonly brand: number;
      readonly coachTrust: number;
      readonly confidence: number;
      readonly gpa: number;
    };
    readonly skillState: {
      readonly acquisitions: readonly PersistedSkillAcquisition[];
      readonly equippedSkillIds: readonly [
        string | null,
        string | null,
        string | null,
        string | null,
      ];
    };
    readonly trainingProficiencyUses: Readonly<Record<string, number>>;
    readonly weightKg: number;
  };
  readonly recentWeeklyActionIds: readonly string[];
  readonly revision: number;
  readonly rng: PersistedRngState;
  readonly schemaVersion: 2;
  readonly weekIndex: number;
}

export type PersistedCareerInPhase<PhaseType extends CareerPhaseType> = PersistedCareer & {
  readonly phase: Extract<PersistedCareerPhase, { readonly type: PhaseType }>;
};

interface SaveEnvelope {
  readonly payload: PersistedCareer;
}

export const REPRESENTATIVE_APPEARANCE = Object.freeze({
  bodyTypeId: 'body_type_broad',
  faceId: 'face_angular',
  glovesId: 'gloves_accent',
  hairStyleId: 'hair_style_braids',
  skinToneId: 'skin_tone_deep',
});

export const REPRESENTATIVE_IDENTITY = Object.freeze({
  archetypeId: 'archetype_wr_route_technician',
  personalityTraitIds: ['personality_competitive', 'personality_leader'] as const,
  recruitingBackgroundId: 'background_late_bloomer',
});

export async function readActiveCareer(page: Page): Promise<PersistedCareer | undefined> {
  const envelope = await readIndexedDbValue<SaveEnvelope>(page, 'currentCareer', 'active');
  return envelope?.payload;
}

export async function waitForPersistedCareer<PhaseType extends CareerPhaseType>(
  page: Page,
  expected: {
    readonly actionIds?: readonly string[];
    readonly nextActionIndex?: number;
    readonly phase: PhaseType;
    readonly resultActionIds?: readonly string[];
    readonly revision: number;
    readonly weekIndex: number;
  },
): Promise<PersistedCareerInPhase<PhaseType>> {
  await expect
    .poll(async () => {
      const career = await readActiveCareer(page);
      return career === undefined
        ? undefined
        : {
            actionIds: career.phase.type === 'RESOLVE_ACTIONS' ? career.phase.actionIds : undefined,
            nextActionIndex:
              career.phase.type === 'RESOLVE_ACTIONS' ? career.phase.nextActionIndex : undefined,
            phase: career.phase.type,
            resultActionIds:
              career.phase.type === 'RESOLVE_ACTIONS' || career.phase.type === 'WEEK_END'
                ? career.phase.results.map(({ actionId }) => actionId)
                : undefined,
            revision: career.revision,
            weekIndex: career.weekIndex,
          };
    })
    .toEqual({
      actionIds: expected.actionIds,
      nextActionIndex: expected.nextActionIndex,
      phase: expected.phase,
      resultActionIds: expected.resultActionIds,
      revision: expected.revision,
      weekIndex: expected.weekIndex,
    });

  const career = await readActiveCareer(page);
  if (career === undefined) {
    throw new Error('active_career_missing_after_poll');
  }
  return career as PersistedCareerInPhase<PhaseType>;
}

async function selectAppearanceOption(page: Page, optionId: string): Promise<void> {
  const select = page
    .getByTestId('creation-form')
    .locator(`select:has(option[value="${optionId}"])`);
  await expect(select).toHaveCount(1);
  await select.selectOption(optionId);
}

export async function fillRepresentativeCreation(
  page: Page,
  locale: AppLocale,
  displayName: string,
): Promise<void> {
  await expect(page.getByTestId('creation-form')).toBeVisible();
  await page.getByTestId('creation-name').fill(displayName);

  await page
    .locator(`input[name="archetype"][value="${REPRESENTATIVE_IDENTITY.archetypeId}"]`)
    .check();
  await page
    .locator(`input[name="background"][value="${REPRESENTATIVE_IDENTITY.recruitingBackgroundId}"]`)
    .check();
  for (const personalityId of REPRESENTATIVE_IDENTITY.personalityTraitIds) {
    await page.locator(`input[name="personality"][value="${personalityId}"]`).check();
  }

  for (const optionId of Object.values(REPRESENTATIVE_APPEARANCE)) {
    await selectAppearanceOption(page, optionId);
  }

  if (locale === 'en-US') {
    await page.getByTestId('creation-height-feet').fill('6');
    await page.getByTestId('creation-height-inches').fill('3');
    await page.getByTestId('creation-weight-lb').fill('210');
  } else {
    await page.getByTestId('creation-height-cm').fill('191');
    await page.getByTestId('creation-weight-kg').fill('95');
  }
}

export async function createRepresentativeCareer(
  page: Page,
  locale: AppLocale,
  displayName: string,
): Promise<PersistedCareer> {
  await fillRepresentativeCreation(page, locale, displayName);
  await page.getByTestId('creation-submit').click();
  await expect(page.getByTestId('career-screen')).toBeVisible();
  return waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: 0,
    weekIndex: 0,
  });
}

export async function draftActions(page: Page, actionIds: readonly string[]): Promise<void> {
  for (const actionId of actionIds) {
    await page.getByTestId(`action-choice-${actionId}`).click();
  }
  for (const [index, actionId] of actionIds.entries()) {
    await expect(page.getByTestId(`draft-slot-${index}`)).toHaveAttribute(
      'data-action-id',
      actionId,
    );
  }
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

export async function expectTouchTarget(locator: Locator, minimumSize = 44): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.width).toBeGreaterThanOrEqual(minimumSize);
  expect(box.height).toBeGreaterThanOrEqual(minimumSize);
}

export async function expectHorizontallyWithinViewport(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
}
