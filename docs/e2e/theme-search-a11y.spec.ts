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

test('wide viewports centre the content panel when a TOC is present', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1896, height: 940 });
  await page.goto('/getting-started/quickstart/');

  const [left, right] = await page.evaluate(() => {
    const panel = document.querySelector('main > .content-panel');
    const container = panel?.querySelector('.sl-container');
    if (!panel || !container) return [NaN, NaN];
    const pr = panel.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return [cr.left - pr.left, pr.right - cr.right];
  });
  expect(left).toBeGreaterThan(0);
  expect(Math.abs(left - right)).toBeLessThan(1);
});

test('tables stay in column and scroll locally', async ({ page }) => {
  for (const width of [375, 620, 900]) {
    await page.setViewportSize({ width, height: 800 });

    for (const path of [
      '/reference/configuration/',
      '/reference/kitchen-sink/',
    ]) {
      await page.goto(path);
      await page.waitForFunction(
        () => document.querySelector('.nbr-table-scroll') !== null,
      );
      const layout = await page.evaluate(() => {
        const wrappers = [
          ...document.querySelectorAll<HTMLElement>('.nbr-table-scroll'),
        ];
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
          wrappers: wrappers.map((wrapper) => {
            const table = wrapper.querySelector('table');
            const row = table?.querySelector('tr');
            return {
              client: wrapper.clientWidth,
              scroll: wrapper.scrollWidth,
              tabIndex: wrapper.tabIndex,
              tableWidth: table?.clientWidth ?? 0,
              rowWidth: row?.getBoundingClientRect().width ?? 0,
            };
          }),
        };
      });
      const label = `${width}px ${path}`;
      expect(layout.pageWidth, label).toBe(layout.viewport);
      expect(
        layout.wrappers.every(
          (wrapper) => wrapper.tableWidth <= wrapper.rowWidth + 2,
        ),
        `${label} table grid must meet its border`,
      ).toBe(true);
      expect(
        layout.wrappers.every((wrapper) =>
          wrapper.scroll > wrapper.client
            ? wrapper.tabIndex === 0
            : wrapper.tabIndex <= 0,
        ),
        `${label} wrapper must be keyboard-reachable when it scrolls`,
      ).toBe(true);
    }
  }
});

test('an unbreakable table value scrolls inside its cell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reference/configuration/');
  await page.waitForFunction(
    () => document.querySelector('.nbr-table-cell-scroll') !== null,
  );

  const overflow = await page.evaluate(() => {
    const cell = document.querySelector('.sl-markdown-content td');
    const scroller = cell?.querySelector('.nbr-table-cell-scroll');
    const content = scroller?.querySelector('.nbr-table-cell-content');
    if (!scroller || !content) return null;
    content.textContent = 'x'.repeat(200);
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      cellScroll: scroller.scrollWidth,
      cellClient: scroller.clientWidth,
    };
  });
  expect(overflow).not.toBeNull();
  expect(overflow?.pageWidth).toBe(overflow?.viewport);
  expect((overflow?.cellScroll ?? 0) > (overflow?.cellClient ?? 0)).toBe(true);
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
