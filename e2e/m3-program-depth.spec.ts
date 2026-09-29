import { expect, test, type Page } from '@playwright/test';

import {
  createRepresentativeRecruit,
  draftActions,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  readActiveCareer,
  waitForPersistedCareer,
  type AppLocale,
  type PersistedCareer,
  type PersistedCareerInPhase,
} from './support/career';

const FIXED_BROWSER_UUID = '00000000-0000-4000-8000-000000000005';
const FIXED_CAREER_SEED = `career-seed:${FIXED_BROWSER_UUID}`;
const PLAYER_ID = 'player_897f7079e3e32f66';
const PROGRAM_ID = 'program_northstar_college';
const PRACTICE_PLAN = ['action_extra_practice', 'action_route_drills', 'action_recovery'] as const;
const CHOOSING_RNG = {
  algorithm: 'xoshiro128ss-v1',
  drawCount: 0,
  state: [3928550998, 1826456429, 3006816905, 297862492],
} as const;
const COMMITTED_RNG = {
  algorithm: 'xoshiro128ss-v1',
  drawCount: 35,
  state: [2145635926, 3087451979, 978163042, 201750171],
} as const;
const EXPECTED_OFFERS = [
  {
    interest: 94,
    priority: 286,
    programId: PROGRAM_ID,
    projectedDepthBandId: 'projected_depth_band_reserve_path',
    schemeFit: 98,
  },
  {
    interest: 100,
    priority: 282,
    programId: 'program_high_desert_state',
    projectedDepthBandId: 'projected_depth_band_rotation_path',
    schemeFit: 82,
  },
  {
    interest: 98,
    priority: 280,
    programId: 'program_prairie_forge',
    projectedDepthBandId: 'projected_depth_band_reserve_path',
    schemeFit: 84,
  },
  {
    interest: 96,
    priority: 272,
    programId: 'program_ember_peak_polytechnic',
    projectedDepthBandId: 'projected_depth_band_reserve_path',
    schemeFit: 80,
  },
  {
    interest: 80,
    priority: 244,
    programId: 'program_crown_sound',
    projectedDepthBandId: 'projected_depth_band_developmental',
    schemeFit: 84,
  },
] as const;
// Newly generated rosters use the M7.5 diversity catalog. Football inputs and the
// exact committed RNG below remain the original M3 expectations.
const EXPECTED_COMPETITORS = [
  {
    archetypeId: 'archetype_wr_deep_threat',
    classYear: 4,
    coachTrust: 37,
    experienceReadiness: 63,
    familyNameId: 'roster_family_name_hayes',
    givenNameId: 'roster_given_name_isaiah',
    id: 'roster_player_northstar_college_01',
    practiceForm: 58,
    schemeFit: 76,
    talentFit: 69,
  },
  {
    archetypeId: 'archetype_wr_possession_receiver',
    classYear: 4,
    coachTrust: 37,
    experienceReadiness: 63,
    familyNameId: 'roster_family_name_ellis',
    givenNameId: 'roster_given_name_miles',
    id: 'roster_player_northstar_college_02',
    practiceForm: 50,
    schemeFit: 84,
    talentFit: 43,
  },
  {
    archetypeId: 'archetype_wr_deep_threat',
    classYear: 3,
    coachTrust: 32,
    experienceReadiness: 55,
    familyNameId: 'roster_family_name_bennett',
    givenNameId: 'roster_given_name_noah',
    id: 'roster_player_northstar_college_03',
    practiceForm: 55,
    schemeFit: 76,
    talentFit: 58,
  },
  {
    archetypeId: 'archetype_wr_possession_receiver',
    classYear: 1,
    coachTrust: 22,
    experienceReadiness: 39,
    familyNameId: 'roster_family_name_adeyemi',
    givenNameId: 'roster_given_name_omar',
    id: 'roster_player_northstar_college_04',
    practiceForm: 53,
    schemeFit: 84,
    talentFit: 52,
  },
  {
    archetypeId: 'archetype_wr_possession_receiver',
    classYear: 4,
    coachTrust: 37,
    experienceReadiness: 63,
    familyNameId: 'roster_family_name_grant',
    givenNameId: 'roster_given_name_jamir',
    id: 'roster_player_northstar_college_05',
    practiceForm: 55,
    schemeFit: 84,
    talentFit: 60,
  },
  {
    archetypeId: 'archetype_wr_deep_threat',
    classYear: 3,
    coachTrust: 32,
    experienceReadiness: 55,
    familyNameId: 'roster_family_name_griffin',
    givenNameId: 'roster_given_name_terrell',
    id: 'roster_player_northstar_college_06',
    practiceForm: 50,
    schemeFit: 76,
    talentFit: 44,
  },
  {
    archetypeId: 'archetype_wr_possession_receiver',
    classYear: 2,
    coachTrust: 27,
    experienceReadiness: 47,
    familyNameId: 'roster_family_name_alvarez',
    givenNameId: 'roster_given_name_henry',
    id: 'roster_player_northstar_college_07',
    practiceForm: 55,
    schemeFit: 84,
    talentFit: 58,
  },
] as const;
const INITIAL_DEPTH_ORDER = [
  'roster_player_northstar_college_01',
  'roster_player_northstar_college_05',
  'roster_player_northstar_college_03',
  'roster_player_northstar_college_07',
  'roster_player_northstar_college_02',
  PLAYER_ID,
  'roster_player_northstar_college_04',
  'roster_player_northstar_college_06',
] as const;
const PROMOTED_DEPTH_ORDER = [
  'roster_player_northstar_college_01',
  'roster_player_northstar_college_05',
  'roster_player_northstar_college_03',
  'roster_player_northstar_college_07',
  PLAYER_ID,
  'roster_player_northstar_college_02',
  'roster_player_northstar_college_04',
  'roster_player_northstar_college_06',
] as const;

interface ProgramJourneyCase {
  readonly factLabels: readonly [string, string, string, string, string, string];
  readonly locale: AppLocale;
  readonly movementTitle: string;
  readonly playerName: string;
  readonly programName: string;
  readonly programShortName: string;
  readonly projectedPath: string;
  readonly retryProgramSave: boolean;
}

const PROGRAM_JOURNEYS = [
  {
    factLabels: ['명성', '선수 육성', '학업', 'NIL 시장', '전술 적합도', '예상 뎁스 경로'],
    locale: 'ko-KR',
    movementTitle: '뎁스 차트에서 올라갔습니다',
    playerName: '프로그램 토요일',
    programName: '노스스타 칼리지',
    programShortName: '노스스타',
    projectedPath: '리저브 경쟁 경로',
    retryProgramSave: false,
  },
  {
    factLabels: [
      'Prestige',
      'Player development',
      'Academics',
      'NIL market',
      'Scheme Fit',
      'Projected depth path',
    ],
    locale: 'en-US',
    movementTitle: 'You moved up the depth chart',
    playerName: 'Program Saturday',
    programName: 'Northstar College',
    programShortName: 'Northstar',
    projectedPath: 'Reserve competition path',
    retryProgramSave: true,
  },
] as const satisfies readonly ProgramJourneyCase[];

async function installFixedCareerSeed(page: Page): Promise<void> {
  await page.addInitScript((fixedUuid) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: () => fixedUuid,
    });
  }, FIXED_BROWSER_UUID);
}

async function failNextAutosaveSnapshotWrite(page: Page): Promise<void> {
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function patchedPut(
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      if (this.name === 'autosaveSnapshots') {
        IDBObjectStore.prototype.put = originalPut;
        throw new DOMException('Intentional M3 Playwright save failure.', 'AbortError');
      }
      return Reflect.apply(
        originalPut,
        this,
        key === undefined ? [value] : [value, key],
      ) as IDBRequest<IDBValidKey>;
    };
  });
}

async function expectServiceWorkerControl(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker?.controller?.state ?? null), {
      timeout: 15_000,
    })
    .toBe('activated');
}

async function commitNorthstar(
  page: Page,
  choosing: PersistedCareer,
  retryProgramSave: boolean,
): Promise<PersistedCareer> {
  const radio = page.locator(`input[name="program-offer"][value="${PROGRAM_ID}"]`);
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
  if (retryProgramSave) {
    await failNextAutosaveSnapshotWrite(page);
  }
  const commitButton = page.getByTestId('commit-program');
  await commitButton.focus();
  await page.keyboard.press('Enter');

  if (retryProgramSave) {
    const warning = page.getByTestId('save-failure');
    await expect(warning).toBeVisible();
    await expect(warning).toBeFocused();
    expect(await readActiveCareer(page)).toEqual(choosing);
    await expect(page.getByTestId('program-recruiting')).toBeVisible();
    for (const offerRadio of await page.locator('input[name="program-offer"]').all()) {
      await expect(offerRadio).toBeDisabled();
    }
    await expect(commitButton).toBeDisabled();
    await page.getByTestId('retry-save').click();
    await expect(warning).not.toBeVisible();
  }

  return waitForPersistedCareer(page, {
    phase: 'PLAN_ACTIONS',
    revision: 4,
    weekIndex: 0,
  });
}

function expectExactChoosing(career: PersistedCareer): void {
  expect(career).toMatchObject({
    careerSeed: FIXED_CAREER_SEED,
    id: 'career_70a2e9430240c987',
    player: { id: PLAYER_ID },
    programContext: null,
    programId: null,
    revision: 1,
    rng: CHOOSING_RNG,
  });
  expect(career.recruitingState).toEqual({
    backgroundModifier: 0,
    offers: EXPECTED_OFFERS,
    recruitAbilityScore: 53,
    recruitScore: 53,
    recruitTierId: 'recruit_tier_developmental',
    type: 'CHOOSING',
  });
}

function expectExactCommitment(career: PersistedCareer): void {
  expect(career).toMatchObject({
    programId: PROGRAM_ID,
    revision: 4,
    rng: COMMITTED_RNG,
  });
  expect(career.recruitingState).toEqual({
    backgroundModifier: 0,
    offers: EXPECTED_OFFERS,
    recruitAbilityScore: 53,
    recruitScore: 53,
    recruitTierId: 'recruit_tier_developmental',
    rosterRngDrawCountAfter: 35,
    rosterRngDrawCountBefore: 0,
    selectedAtWeekIndex: 0,
    selectedProgramId: PROGRAM_ID,
    type: 'COMMITTED',
  });
  expect(career.programContext).not.toBeNull();
  expect(career.programContext?.competitors).toEqual(EXPECTED_COMPETITORS);
  expect(career.programContext).toMatchObject({
    depthOrderIds: INITIAL_DEPTH_ORDER,
    latestDepthUpdate: null,
    offenseStyleId: 'offense_style_precision_spread',
    playerPracticeForm: 54,
    programId: PROGRAM_ID,
    projection: {
      maxSnapPermille: 300,
      minSnapPermille: 120,
      rank: 6,
      roleId: 'depth_role_reserve',
    },
    rotationPolicyId: 'rotation_policy_wide',
  });
}

async function finishPromotionWeek(page: Page): Promise<PersistedCareerInPhase<'WEEK_END'>> {
  await page.getByTestId('career-nav-week').click();
  await draftActions(page, PRACTICE_PLAN);
  await page.getByTestId('action-commit').click();
  await waitForPersistedCareer(page, {
    actionIds: PRACTICE_PLAN,
    nextActionIndex: 0,
    phase: 'RESOLVE_ACTIONS',
    resultActionIds: [],
    revision: 5,
    weekIndex: 0,
  });
  for (let actionIndex = 0; actionIndex < PRACTICE_PLAN.length; actionIndex += 1) {
    await page.getByTestId('resolve-next').click();
    if (actionIndex < PRACTICE_PLAN.length - 1) {
      await waitForPersistedCareer(page, {
        actionIds: PRACTICE_PLAN,
        nextActionIndex: actionIndex + 1,
        phase: 'RESOLVE_ACTIONS',
        resultActionIds: PRACTICE_PLAN.slice(0, actionIndex + 1),
        revision: 6 + actionIndex,
        weekIndex: 0,
      });
    }
  }
  return waitForPersistedCareer(page, {
    phase: 'WEEK_END',
    resultActionIds: PRACTICE_PLAN,
    revision: 8,
    weekIndex: 0,
  });
}

function expectExactPromotion(career: PersistedCareerInPhase<'WEEK_END'>): void {
  const expectedProjectionBefore = {
    maxSnapPermille: 300,
    minSnapPermille: 120,
    rank: 6,
    roleId: 'depth_role_reserve',
  } as const;
  const expectedProjectionAfter = {
    maxSnapPermille: 400,
    minSnapPermille: 200,
    rank: 5,
    roleId: 'depth_role_reserve',
  } as const;
  expect(career.rng).toEqual(COMMITTED_RNG);
  expect(career.phase.depthUpdate).toEqual({
    actualCoachTrustDelta: 4,
    coachTrustAfter: 29,
    coachTrustBefore: 25,
    hysteresisThresholdMilli: 2000,
    movement: 'PROMOTED',
    neighborParticipantId: 'roster_player_northstar_college_02',
    practiceFormAfter: 68,
    practiceFormBefore: 54,
    practiceGrade: {
      baseScore: 50,
      bodyAfterFocus: 92,
      bodyContribution: 6,
      confidenceAfterFocus: 58,
      confidenceContribution: 1,
      focusImpact: 20,
      model: 'experience_v1',
      preparationAfterFocus: 59,
      preparationContribution: 1,
      preparationTarget: 55,
    },
    rankAfter: 5,
    rankBefore: 6,
    requestedCoachTrustDelta: 4,
    roleAfter: 'depth_role_reserve',
    roleBefore: 'depth_role_reserve',
    snapProjectionAfter: expectedProjectionAfter,
    snapProjectionBefore: expectedProjectionBefore,
    weekIndex: 0,
    weeklyPracticeScore: 78,
  });
  expect(career.programContext).toMatchObject({
    depthOrderIds: PROMOTED_DEPTH_ORDER,
    latestDepthUpdate: career.phase.depthUpdate,
    playerPracticeForm: 68,
    projection: expectedProjectionAfter,
  });
  expect(career.player.state.coachTrust).toBe(29);
}

for (const journey of PROGRAM_JOURNEYS) {
  test.describe(`M3 recruiting and depth journey (${journey.locale})`, () => {
    test.use({ locale: journey.locale });

    test('persists exact offers, roster generation, save retry, promotion, and offline reload', async ({
      page,
    }) => {
      await installFixedCareerSeed(page);
      await page.goto('/');
      const choosing = await createRepresentativeRecruit(page, journey.locale, journey.playerName);
      expectExactChoosing(choosing);
      await expect(page.getByTestId('program-recruiting')).toBeVisible();
      await expect(page.locator('input[name="program-offer"]')).toHaveCount(5);

      const northstarOffer = page.locator(`[data-program-id="${PROGRAM_ID}"]`);
      await expect(northstarOffer).toContainText(journey.programName);
      await expect(northstarOffer.locator('dt')).toHaveText([...journey.factLabels]);
      await expect(northstarOffer.locator('dd')).toHaveText([
        '54',
        '74',
        '94',
        '38',
        '98',
        journey.projectedPath,
      ]);
      await expect(northstarOffer.locator('.program-offer__traits span')).toHaveCount(3);
      await expectNoHorizontalOverflow(page);

      const committed = await commitNorthstar(page, choosing, journey.retryProgramSave);
      expectExactCommitment(committed);
      await page.getByTestId('career-nav-team').click();
      await expect(page.getByTestId('program-depth')).toContainText(journey.programShortName);
      await expect(page.getByTestId('depth-snap-outlook')).toBeVisible();
      await expect(
        page.getByTestId('depth-opportunity').locator('.depth-factor-list > li'),
      ).toHaveCount(5);
      await expect(page.getByTestId('depth-suggestions').locator('li')).toHaveCount(2);
      await page.locator('.receiver-room > summary').click();
      await expect(page.locator('[data-testid^="depth-row-"]')).toHaveCount(8);
      await expectNoHorizontalOverflow(page);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(committed);
      await page.getByTestId('career-nav-team').click();
      await expect(page.getByTestId('program-depth')).toBeVisible();

      const weekEnd = await finishPromotionWeek(page);
      expectExactPromotion(weekEnd);
      const movement = page.getByTestId('depth-movement');
      await expect(movement).toHaveAttribute('data-movement', 'PROMOTED');
      await expect(movement).toContainText(journey.movementTitle);
      await expect(movement).toContainText('WR6 → WR5');
      await expectNoHorizontalOverflow(page);

      await page.reload();
      expect(await readActiveCareer(page)).toEqual(weekEnd);
      await expect(movement).toBeVisible();
      await expectServiceWorkerControl(page);
      await page.context().setOffline(true);
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('app-shell')).toBeVisible();
        await expect(page.getByTestId('depth-movement')).toContainText(journey.movementTitle);
        await page.getByTestId('career-nav-team').click();
        await expect(page.getByTestId('program-depth')).toBeVisible();
        expect(await readActiveCareer(page)).toEqual(weekEnd);
      } finally {
        await page.context().setOffline(false);
      }
    });
  });
}

test.describe('M3 320px full recruiting and promotion journey', () => {
  test.use({ locale: 'en-US', viewport: { height: 760, width: 320 } });

  test('keeps program choice, room, practice plan, and promotion reachable', async ({ page }) => {
    await installFixedCareerSeed(page);
    await page.goto('/');
    const choosing = await createRepresentativeRecruit(page, 'en-US', 'Compact Program Saturday');
    expectExactChoosing(choosing);

    const northstarOffer = page.locator(`[data-program-id="${PROGRAM_ID}"]`);
    await expectTouchTarget(northstarOffer);
    await expectHorizontallyWithinViewport(page, northstarOffer);
    await expectNoHorizontalOverflow(page);
    const radio = northstarOffer.locator('input');
    await radio.focus();
    await page.keyboard.press('Space');
    await expect(radio).toBeChecked();
    const commitButton = page.getByTestId('commit-program');
    await expectTouchTarget(commitButton);
    await expectHorizontallyWithinViewport(page, commitButton);
    await commitButton.focus();
    await page.keyboard.press('Enter');
    const committed = await waitForPersistedCareer(page, {
      phase: 'PLAN_ACTIONS',
      revision: 4,
      weekIndex: 0,
    });
    expectExactCommitment(committed);

    for (const destination of ['home', 'week', 'team', 'skills', 'player'] as const) {
      const navigationItem = page.getByTestId(`career-nav-${destination}`);
      await expectTouchTarget(navigationItem);
      await expectHorizontallyWithinViewport(page, navigationItem);
    }
    await page.getByTestId('career-nav-home').click();
    const expectedHairStyleId = committed.player.appearance['hairStyleId'];
    const expectedSkinToneId = committed.player.appearance['skinToneId'];
    if (typeof expectedHairStyleId !== 'string' || typeof expectedSkinToneId !== 'string') {
      throw new Error('Expected persisted appearance identifiers.');
    }
    const homePortrait = page.getByTestId('athletePortraitHome').getByRole('img');
    await expect(homePortrait).toBeVisible();
    await expect(homePortrait).toHaveAttribute('data-hair-style', expectedHairStyleId);
    await expect(homePortrait).toHaveAttribute('data-skin-tone', expectedSkinToneId);
    const roleStrip = page.getByTestId('home-role-strip');
    await expect(roleStrip).toBeVisible();
    await expectHorizontallyWithinViewport(page, roleStrip);
    if (committed.programContext === null) {
      throw new Error('Expected committed program context for the home role strip.');
    }
    await expect(roleStrip).toContainText(
      `${committed.programContext.projection.minSnapPermille / 10}%`,
    );
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('career-nav-player').click();
    const playerPortrait = page.getByTestId('athletePortraitPlayer').getByRole('img');
    await expect(playerPortrait).toHaveAttribute('data-hair-style', expectedHairStyleId);
    await expect(playerPortrait).toHaveAttribute('data-skin-tone', expectedSkinToneId);
    const speedProgress = page.getByTestId('attribute-progress-attribute_speed');
    await expect(speedProgress).toBeVisible();
    await expectHorizontallyWithinViewport(page, speedProgress);
    await expect(speedProgress.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
    const routeProficiency = page.getByTestId('proficiency-progress-proficiency_route_drills');
    await expect(routeProficiency).toBeVisible();
    await expectHorizontallyWithinViewport(page, routeProficiency);
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('career-nav-team').click();
    for (const panel of ['depth-snap-outlook', 'depth-opportunity', 'depth-suggestions'] as const) {
      const teamPanel = page.getByTestId(panel);
      await expect(teamPanel).toBeVisible();
      await expectHorizontallyWithinViewport(page, teamPanel);
    }
    await expect(
      page.getByTestId('depth-opportunity').locator('.depth-factor-list > li'),
    ).toHaveCount(5);
    const roomSummary = page.locator('.receiver-room > summary');
    await expectTouchTarget(roomSummary);
    await expectHorizontallyWithinViewport(page, roomSummary);
    await roomSummary.click();
    await expect(page.locator('[data-testid^="depth-row-"]')).toHaveCount(8);
    await expectNoHorizontalOverflow(page);

    await page.getByTestId('career-nav-week').click();
    for (const actionId of PRACTICE_PLAN) {
      const choice = page.getByTestId(`action-choice-${actionId}`);
      await expectTouchTarget(choice);
      await expectHorizontallyWithinViewport(page, choice);
    }
    await draftActions(page, PRACTICE_PLAN);
    const actionCommit = page.getByTestId('action-commit');
    await expectTouchTarget(actionCommit);
    await expectHorizontallyWithinViewport(page, actionCommit);
    await actionCommit.click();
    await waitForPersistedCareer(page, {
      actionIds: PRACTICE_PLAN,
      nextActionIndex: 0,
      phase: 'RESOLVE_ACTIONS',
      resultActionIds: [],
      revision: 5,
      weekIndex: 0,
    });
    const resolve = page.getByTestId('resolve-next');
    await expectTouchTarget(resolve);
    await expectHorizontallyWithinViewport(page, resolve);
    for (let actionIndex = 0; actionIndex < PRACTICE_PLAN.length; actionIndex += 1) {
      await resolve.click();
      if (actionIndex < PRACTICE_PLAN.length - 1) {
        await waitForPersistedCareer(page, {
          actionIds: PRACTICE_PLAN,
          nextActionIndex: actionIndex + 1,
          phase: 'RESOLVE_ACTIONS',
          resultActionIds: PRACTICE_PLAN.slice(0, actionIndex + 1),
          revision: 6 + actionIndex,
          weekIndex: 0,
        });
      }
    }
    const weekEnd = await waitForPersistedCareer(page, {
      phase: 'WEEK_END',
      resultActionIds: PRACTICE_PLAN,
      revision: 8,
      weekIndex: 0,
    });
    expectExactPromotion(weekEnd);
    await expect(page.getByTestId('depth-movement')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
