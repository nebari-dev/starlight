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

test('the mobile drawer exposes nav tabs and keeps accessible names', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/guides/deployment/build/');

  await expect(page.locator('.nbr-nav-tabs--header')).toBeHidden();
  const menu = page.locator('starlight-menu-button');
  await expect(page.locator('.nbr-nav-tabs--drawer')).toBeHidden();
  await menu.locator('button').click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');

  const drawerTabs = page.locator('.nbr-nav-tabs--drawer');
  await expect(drawerTabs).toBeVisible();
  await expect(drawerTabs.locator('a[aria-current="page"]')).toHaveCount(1);

  const summaries = page.locator('#starlight__sidebar summary');
  for (let i = 0; i < (await summaries.count()); i++) {
    expect((await summaries.nth(i).innerText()).trim().length).toBeGreaterThan(
      0,
    );
  }
});

test('home and content pages have no serious/critical a11y violations', async ({
  page,
}) => {
  // Cover the splash home plus a component-heavy guide and a table-heavy
  // reference page, so the a11y sweep exercises the full docs layout.
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const [width, height] of [
      [1440, 900],
      [375, 800],
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of [
        '/',
        '/guides/authoring-content/',
        '/reference/components/',
        '/reference/kitchen-sink/',
      ]) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          colorScheme,
        );
        await page.waitForFunction(() =>
          [...document.querySelectorAll('pre')].every(
            (el) =>
              el.scrollWidth <= el.clientWidth || el.hasAttribute('tabindex'),
          ),
        );
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(
          serious,
          `${colorScheme} ${width}px ${path}: ${JSON.stringify(
            serious.map((v) => v.id),
          )}`,
        ).toEqual([]);
      }
    }
  }
});

// Nothing in the suite asserted computed type before this: build.test.ts greps class
// names and token mappings, and axe checks contrast. A 13px TOC entry where the design
// binds 14px therefore passed every gate. Size and weight only, never colour — Chromium
// returns colours in their authored space, as the note above explains.
const TYPE_SCALE: Array<{
  selector: string;
  fontSize?: string;
  fontWeight?: string;
}> = [
  { selector: '#starlight__on-this-page', fontSize: '11px', fontWeight: '500' },
  { selector: '.right-sidebar starlight-toc a', fontSize: '14px' },
  {
    selector: '.right-sidebar starlight-toc a[aria-current="true"]',
    fontWeight: '500',
  },
  { selector: '.pagination-links a', fontSize: '12px', fontWeight: '500' },
  { selector: '.pagination-links .link-title', fontSize: '16px' },
  { selector: '.nbr-page-header h1', fontSize: '34px', fontWeight: '700' },
  { selector: '.nbr-page-meta', fontSize: '13px' },
  {
    selector: '.sidebar-content .group-label .large',
    fontSize: '14px',
    fontWeight: '400',
  },
];

test('page chrome renders at the design type scale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/guides/deployment/build/');

  // starlight-toc marks the current entry client-side on first intersection, so
  // the aria-current row does not exist in the served HTML.
  await expect(
    page.locator('.right-sidebar starlight-toc a[aria-current="true"]'),
  ).toHaveCount(1);

  for (const { selector, fontSize, fontWeight } of TYPE_SCALE) {
    const target = page.locator(selector).first();
    await expect(target, `${selector} is missing`).toBeAttached();
    const actual = await target.evaluate((el) => {
      const style = getComputedStyle(el);
      return { fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    if (fontSize) {
      expect(actual.fontSize, `${selector} font-size`).toBe(fontSize);
    }
    if (fontWeight) {
      expect(actual.fontWeight, `${selector} font-weight`).toBe(fontWeight);
    }
  }
});

test('exactly one "Site" nav landmark is exposed at each width', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [375, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/guides/authoring-content/');
    const exposed = await page.evaluate(
      () =>
        [...document.querySelectorAll('nav[aria-label="Site"]')].filter(
          (n) => (n as HTMLElement).offsetParent !== null,
        ).length,
    );
    expect(exposed, `${width}px exposed ${exposed} "Site" navs`).toBe(1);
  }
});
