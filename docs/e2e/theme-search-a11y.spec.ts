import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The theme select is rendered as <starlight-theme-select><label><select>...</select></label></starlight-theme-select>
// There are two instances in the DOM (desktop header + mobile sidebar); the first is the desktop one.
const THEME_SELECT = 'starlight-theme-select select';

test('theme toggle switches data-theme to dark', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const select = page.locator(THEME_SELECT).first();

  // Set to light first so we have a known starting state, then switch to dark.
  await select.selectOption('light');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await select.selectOption('dark');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Verify the Nebari accent token is populated (non-empty custom property).
  const accent = await html.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--sl-color-accent').trim(),
  );
  expect(accent.length).toBeGreaterThan(0);
});

test('search returns the seeded token', async ({ page }) => {
  await page.goto('/');

  // Open the Pagefind search dialog via the button (Starlight 0.33 uses button[data-open-modal]).
  await page.locator('button[data-open-modal]').first().click();

  // The Pagefind UI renders its input with class pagefind-ui__search-input inside #starlight__search.
  // Fall back to any input inside the dialog if the class is not present.
  const searchInput = page.locator(
    '#starlight__search input, dialog input.pagefind-ui__search-input',
  ).first();

  await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
  await searchInput.fill('pagefind-probe-token');

  await expect(page.locator('text=Sample content').first()).toBeVisible({ timeout: 15_000 });
});

test('home and sample page have no serious/critical a11y violations', async ({ page }) => {
  for (const path of ['/', '/sample/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  }
});
