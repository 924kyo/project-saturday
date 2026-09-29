import { expect, test } from '@playwright/test';

import {
  createRepresentativeCareer,
  expectHorizontallyWithinViewport,
  expectNoHorizontalOverflow,
  expectTouchTarget,
  type AppLocale,
} from './support/career';
import { readIndexedDbValue } from './support/indexed-db';

const LOCALE_CASES = [
  {
    creationTitle: '뚜렷한 선수를 만드세요',
    locale: 'ko-KR',
    playerName: '안내 토요일',
    skillsTitle: '나만의 빌드를 설계하세요',
    teamTitle: '뎁스 경로를 읽으세요',
    weekTitle: '주간 우선순위를 정하세요',
  },
  {
    creationTitle: 'Build a distinct athlete',
    locale: 'en-US',
    playerName: 'Guide Saturday',
    skillsTitle: 'Shape your build',
    teamTitle: 'Read the depth path',
    weekTitle: 'Set weekly priorities',
  },
] as const satisfies readonly {
  readonly creationTitle: string;
  readonly locale: AppLocale;
  readonly playerName: string;
  readonly skillsTitle: string;
  readonly teamTitle: string;
  readonly weekTitle: string;
}[];

for (const localeCase of LOCALE_CASES) {
  test.describe(`M3.5 contextual onboarding (${localeCase.locale})`, () => {
    test.use({ locale: localeCase.locale, viewport: { height: 760, width: 320 } });

    test('persists four contextual guides and replays Skills from Help', async ({ page }) => {
      await page.goto('/');
      const creationGuide = page.getByTestId('onboarding-creation');
      await expect(creationGuide).toContainText(localeCase.creationTitle);
      await expectHorizontallyWithinViewport(page, creationGuide);
      const creationComplete = page.getByTestId('onboarding-complete-creation');
      await expectTouchTarget(creationComplete);
      await creationComplete.focus();
      await page.keyboard.press('Enter');
      await expect(creationGuide).not.toBeVisible();

      await createRepresentativeCareer(page, localeCase.locale, localeCase.playerName);
      const weekGuide = page.getByTestId('onboarding-week');
      await expect(weekGuide).toContainText(localeCase.weekTitle);
      await expectHorizontallyWithinViewport(page, weekGuide);
      await page.getByTestId('onboarding-complete-week').click();

      await page.getByTestId('career-nav-team').click();
      const teamGuide = page.getByTestId('onboarding-team');
      await expect(teamGuide).toContainText(localeCase.teamTitle);
      await expectHorizontallyWithinViewport(page, teamGuide);
      await page.getByTestId('onboarding-complete-team').click();

      await page.getByTestId('career-nav-skills').click();
      const skillsGuide = page.getByTestId('onboarding-skills');
      await expect(skillsGuide).toContainText(localeCase.skillsTitle);
      await expectHorizontallyWithinViewport(page, skillsGuide);
      await page.getByTestId('onboarding-complete-skills').click();

      const helpButton = page.getByTestId('help-settings-open');
      await expectTouchTarget(helpButton);
      await helpButton.focus();
      await page.keyboard.press('Enter');
      const helpPanel = page.getByTestId('help-settings-panel');
      await expect(helpPanel).toBeVisible();
      await expectHorizontallyWithinViewport(page, helpPanel);
      await page.getByTestId('help-review-skills').click();
      await expect(page.getByTestId('help-guide-review')).toContainText(localeCase.skillsTitle);
      const replaySkills = page.getByTestId('help-replay-skills');
      await expectTouchTarget(replaySkills);
      await replaySkills.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('onboarding-skills')).toBeVisible();

      await page.getByTestId('onboarding-skip-all').click();
      await expect(page.getByTestId('onboarding-skills')).not.toBeVisible();
      await expect
        .poll(async () => {
          const settings = await readIndexedDbValue<{
            readonly completedTopics: readonly string[];
          }>(page, 'settings', 'onboarding-v1');
          return settings?.completedTopics;
        })
        .toEqual(['creation', 'week', 'team', 'skills']);
      await page.reload();
      await page.getByTestId('career-nav-skills').click();
      await expect(page.getByTestId('destination-skills')).toBeVisible();
      await expect(page.getByTestId('onboarding-skills')).not.toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
}
