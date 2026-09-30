import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { createCareer, playWeek, primaryAction } from './support/slice';

/**
 * M10 accessibility gate: every screen of a playable week (plus the Week tabs) is scanned with axe
 * for WCAG 2 A/AA rules. Serious and critical violations fail; the list names the screen.
 */
async function scan(page: Page, label: string, findings: string[]) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  for (const violation of result.violations)
    if (violation.impact === 'serious' || violation.impact === 'critical')
      findings.push(
        `${label}: ${violation.id} (${violation.nodes.length}) ${violation.nodes[0]?.target.join(' ')}`,
      );
}

for (const locale of ['en-US', 'ko-KR'] as const)
  test(`a week passes the accessibility scan (${locale})`, async ({ page, isMobile }) => {
    test.skip(isMobile && locale === 'en-US', 'one locale per project on phones');
    test.setTimeout(240_000);
    const findings: string[] = [];
    await page.goto('/');
    await expect(primaryAction(page)).toBeVisible({ timeout: 20_000 });
    if ((await page.locator('html').getAttribute('lang')) !== locale)
      await page.locator('.s2-topbar__actions .s2-chipbtn').first().click();
    await scan(page, 'create', findings);
    await createCareer(page, 'Access Tester');
    await scan(page, 'week', findings);
    for (const [index, tab] of ['build', 'team', 'profile'].entries()) {
      await page
        .locator('[role=tab]')
        .nth(index + 1)
        .click();
      await scan(page, tab, findings);
    }
    await page.locator('[role=tab]').nth(0).click();
    await playWeek(page, async (label) => {
      await page.waitForTimeout(400);
      await scan(page, label, findings);
    });
    expect(findings).toEqual([]);
  });
