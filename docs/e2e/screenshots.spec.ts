import { expect, test } from '@playwright/test';

test.describe('README screenshots', () => {
  test.skip(
    !process.env.SCREENSHOTS,
    'set SCREENSHOTS=1 to regenerate README screenshots',
  );

  test('capture light and dark homepage screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    for (const theme of ['light', 'dark'] as const) {
      await page
        .locator('html')
        .evaluate((el, next) => el.setAttribute('data-theme', next), theme);
      await expect(page.locator('.hero')).toBeVisible();
      await page.screenshot({
        path: `../.github/screenshots/${theme}.png`,
      });
    }
  });
});
