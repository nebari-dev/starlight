import { expect, type Page, test } from '@playwright/test';

// The reference page renders three diagrams (flowchart, sequence, state), each
// in its own .doodle-wrap, so a bare '.doodle-wrap' locator now matches three
// elements and Playwright's strict mode rejects it. The tests below exercise
// flowchart-specific rendering (its node text, its .flowchart-link edge
// class), so they need the wrapper that follows the "Flowchart" heading
// specifically, not "the first .doodle-wrap on the page".
function flowchartDiagram(page: Page) {
  return page
    .locator('#flowchart')
    .locator(
      'xpath=following::*[contains(concat(" ", normalize-space(@class), " "), " doodle-wrap ")][1]',
    );
}

test('renders a mermaid fence as an SVG diagram', async ({ page }) => {
  await page.goto('/reference/diagrams/');
  const diagram = flowchartDiagram(page);
  await expect(diagram.locator('svg')).toBeVisible();
  await expect(diagram.locator('svg')).toContainText('Reader');
});

test('redraws the diagram in the new theme palette', async ({ page }) => {
  // Mermaid regenerates element ids on every render, so comparing raw SVG
  // markup would pass even if the palette mapping were completely broken:
  // it would only prove a redraw happened, not that it used the right
  // colours. Reading a resolved colour off the edge line (mermaid's
  // lineColor, sourced from --doodle-accent) catches that: it only differs
  // if the diagram actually redrew in the other theme's palette.
  await page.goto('/reference/diagrams/');
  const diagram = flowchartDiagram(page);
  await expect(diagram.locator('svg')).toBeVisible();
  const edgeStroke = () =>
    diagram
      .locator('svg path.flowchart-link')
      .first()
      .evaluate((el) => getComputedStyle(el).stroke);
  const before = await edgeStroke();
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-theme', 'dark'),
  );
  await expect.poll(edgeStroke).not.toBe(before);
});

test('maps the diagram accent to the site primary token', async ({ page }) => {
  // Regression guard: the mapping in theme.css must alias --doodle-accent to
  // --nbr-primary, this site's own accent token, not merely to some
  // non-empty value. Reading both through getComputedStyle the same way
  // keeps their formats directly comparable, so this catches a mapping
  // pointed at the wrong token, not only an empty or literal one.
  await page.goto('/reference/diagrams/');
  await expect(flowchartDiagram(page).locator('svg')).toBeVisible();
  const [accent, primary] = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [
      style.getPropertyValue('--doodle-accent').trim(),
      style.getPropertyValue('--nbr-primary').trim(),
    ];
  });
  expect(accent).not.toBe('');
  expect(accent).toBe(primary);
});

test('every diagram on the page draws as an SVG, not only the flowchart', async ({
  page,
}) => {
  // The tests above only exercise the flowchart. mermaid-doodle renders each
  // .doodle-wrap independently, so a diagram type it fails to draw (a mermaid
  // config or look/security setting that happens to suit flowcharts but not
  // sequence or state diagrams) is left as inert text rather than raising an
  // error Playwright would otherwise catch. Comparing both counts catches a
  // diagram silently staying unrendered instead of becoming an SVG.
  await page.goto('/reference/diagrams/');
  await expect(page.locator('.doodle-wrap')).toHaveCount(3);
  await expect(page.locator('.doodle-wrap svg')).toHaveCount(3);
});
