import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The theme picker is the Nebari icon toggle button (a rounded sun/moon button
// that replaces Starlight's default <select>). Two instances exist (desktop
// header + mobile sidebar); the first is the desktop one.
const THEME_TOGGLE = '.nbr-theme-toggle';

test('theme toggle switches data-theme between light and dark', async ({
  page,
}) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator(THEME_TOGGLE).first();

  // Force a known starting state, then click the toggle to flip it.
  await html.evaluate((el) => el.setAttribute('data-theme', 'light'));
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // Verify the Nebari accent token is populated (non-empty custom property).
  const accent = await html.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--sl-color-accent').trim(),
  );
  expect(accent.length).toBeGreaterThan(0);
});

test('light-mode accent is the Nebari magenta, not Starlight default blue', async ({
  page,
}) => {
  // Regression: theme.css mapped --sl-color-* under plain :root (0,1,0), which lost
  // to Starlight's :root[data-theme='light'] (0,1,1), so light-mode links rendered
  // Starlight's default blue instead of the Nebari magenta. The fix lists the
  // [data-theme] selectors so the Nebari mapping wins.
  await page.goto('/');
  await page
    .locator('html')
    .evaluate((el) => el.setAttribute('data-theme', 'light'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const link = page.locator('.sl-markdown-content a').first();
  await expect(link).toBeVisible();
  const color = await link.evaluate((el) => getComputedStyle(el).color);
  const nums = (color.match(/[\d.]+/g) || []).map(Number);
  // Chromium returns the accent in its authored space. Nebari magenta is
  // oklch hue ~311 (or rgb red ~149); Starlight's default blue is oklch hue
  // ~264 (or rgb red ~61).
  const isNebariMagenta = /^oklch/i.test(color)
    ? nums[2] > 290 && nums[2] < 340
    : nums[0] > 100;
  expect(
    isNebariMagenta,
    `content link color was ${color}; expected Nebari magenta, not Starlight default blue`,
  ).toBe(true);
});

test('search returns the seeded token', async ({ page }) => {
  await page.goto('/');

  // Open the Pagefind search dialog via the button (Starlight 0.33 uses button[data-open-modal]).
  await page.locator('button[data-open-modal]').first().click();

  // The Pagefind UI renders its input with class pagefind-ui__search-input inside #starlight__search.
  // Fall back to any input inside the dialog if the class is not present.
  const searchInput = page
    .locator('#starlight__search input, dialog input.pagefind-ui__search-input')
    .first();

  await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
  await searchInput.fill('pagefind-probe-token');

  // The probe token lives in the Components reference page; Pagefind surfaces it
  // under that page's title.
  await expect(page.locator('text=Components').first()).toBeVisible({
    timeout: 15_000,
  });
});

test('home and content pages have no serious/critical a11y violations', async ({
  page,
}) => {
  // Cover the splash home plus a component-heavy guide and a table-heavy
  // reference page, so the a11y sweep exercises the full docs layout.
  for (const path of [
    '/',
    '/guides/authoring-content/',
    '/reference/components/',
  ]) {
    await page.goto(path);
    // Expressive Code marks horizontally scrollable code blocks keyboard
    // accessible (tabindex + role="region") from a requestIdleCallback, so axe
    // must not sample the DOM before that pass has run.
    await page.waitForFunction(() =>
      [...document.querySelectorAll('pre')].every(
        (el) => el.scrollWidth <= el.clientWidth || el.hasAttribute('tabindex'),
      ),
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  }
});
