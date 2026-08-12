// packages/starlight/test/build.test.ts
import { beforeAll, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const DIST = join(import.meta.dir, '../../../docs/dist');

function allFiles(ext: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext)) out.push(p);
    }
  };
  walk(DIST);
  return out;
}

function allText(ext: string): string {
  return allFiles(ext)
    .map((p) => readFileSync(p, 'utf8'))
    .join('\n');
}

beforeAll(async () => {
  await $`bun run --filter '@nebari/starlight' build`.cwd(
    join(import.meta.dir, '../../..'),
  );
  await $`bun run build`.cwd(join(import.meta.dir, '../../../docs'));
}, 120_000);

test('compiled CSS maps Starlight accent onto the nebari brand (grays deferred to Starlight)', () => {
  const css = allText('.css');
  // Accent maps to --nbr-brand, which is the per-theme Nebari magenta.
  expect(css).toMatch(/--sl-color-accent:\s*var\(--nbr-brand\)/);
  expect(css).toMatch(/--nbr-brand:\s*var\(--nbr-primary\)/);
  // Grays are intentionally NOT overridden (Starlight's are WCAG-tuned), so we do
  // not assert a --sl-color-gray-* mapping. The light-mode accent cascade fix is
  // regression-tested in the demo e2e.
  // A namespaced primitive carries a literal oklch value
  expect(css).toMatch(/--nbr-zinc-50:\s*oklch/);
  // Semantic token resolves through the namespace (not a literal oklch)
  expect(css).toMatch(/--nbr-background:\s*var\(--nbr-/);
});

test('both light and dark token blocks are present', () => {
  const css = allText('.css');
  expect(css).toMatch(/data-theme=['"]?dark['"]?/);
  expect(css).toMatch(/data-theme=['"]?light['"]?/);
});

test('fonts are self-hosted, no external font host', () => {
  const css = allText('.css');
  const html = allText('.html');
  expect(css).toMatch(/Geist/);
  expect(css).toMatch(/IBM Plex Mono/);
  expect(css + html).not.toMatch(
    /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|cdn\.[a-z0-9-]+\.[a-z]/i,
  );
});

test('woff2 files are emitted into the build', () => {
  const fonts = allFiles('.woff2');
  expect(fonts.length).toBeGreaterThan(0);
});

test('branded footer marker renders on pages', () => {
  const html = allText('.html');
  expect(html).toContain('data-nebari-footer');
});

test('Nebari logo is rendered in the header', () => {
  const html = allText('.html');
  expect(html).toMatch(/alt="Nebari"/);
});

function navTabsMarkup(page: string): string {
  const html = readFileSync(join(DIST, page), 'utf8');
  const match = html.match(
    /<nav class="nbr-nav-tabs[^"]*"[^>]*>[\s\S]*?<\/nav>/,
  );
  if (!match) throw new Error(`no nav tabs rendered in ${page}`);
  return match[0];
}

test('the nav option renders top-level tabs in the header', () => {
  const tabs = navTabsMarkup('index.html');
  expect(tabs).toContain('>Docs<');
  expect(tabs).toContain('>Guides<');
  expect(tabs).toContain('>Reference<');
});

test('exactly one nav tab is marked aria-current per page', () => {
  for (const page of [
    'index.html',
    'reference/configuration/index.html',
    'guides/deployment/build/index.html',
  ]) {
    const current = navTabsMarkup(page).match(/aria-current="page"/g) ?? [];
    expect(current.length, `${page} lit ${current.length} tabs`).toBe(1);
  }
});

test('the active tab is the section the page belongs to', () => {
  expect(navTabsMarkup('guides/deployment/build/index.html')).toMatch(
    /href="\/guides\/authoring-content\/"[^>]*aria-current="page"/,
  );
  expect(navTabsMarkup('reference/components/index.html')).toMatch(
    /href="\/reference\/configuration\/"[^>]*aria-current="page"/,
  );
  expect(navTabsMarkup('getting-started/installation/index.html')).toMatch(
    /href="\/"[^>]*aria-current="page"/,
  );
});

test('nav tabs render in both the header and the mobile drawer', () => {
  const html = readFileSync(
    join(DIST, 'guides/deployment/build/index.html'),
    'utf8',
  );
  expect(html).toContain('nbr-nav-tabs--header');
  expect(html).toContain('nbr-nav-tabs--drawer');
});

test('the search label is overridden through injectTranslations', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  expect(html).toContain('Search docs');
  expect(html).toMatch(/aria-label="Search docs[^"]*"/);
});

test('a nested page renders a breadcrumb trail above the title', () => {
  const html = readFileSync(
    join(DIST, 'guides/deployment/build/index.html'),
    'utf8',
  );
  expect(html).toMatch(/<nav class="nbr-breadcrumbs[^"]*" aria-label="[^"]+"/);
  const trail = html.match(/<li[^>]*>([^<]+)<\/li>/g)?.join(' ') ?? '';
  expect(trail).toContain('Guides');
  expect(trail).toContain('Deployment');
  expect(html).toMatch(/<li[^>]*aria-current="page"/);
});

test('the splash home renders no page header, so no breadcrumb', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  expect(html).not.toContain('nbr-page-header');
  expect(html).not.toContain('nbr-breadcrumbs');
});

test('the page title keeps the id Starlight anchors and the skip link target', () => {
  const html = readFileSync(
    join(DIST, 'guides/deployment/build/index.html'),
    'utf8',
  );
  expect(html).toMatch(/<h1 id="_top"/);
});

test('the meta row shows the updated date and the read time', () => {
  const html = readFileSync(
    join(DIST, 'guides/authoring-content/index.html'),
    'utf8',
  );
  expect(html).toMatch(
    /Updated\s*<time[^>]*datetime="[^"]+"[^>]*>[^<]+<\/time>/,
  );
  expect(html).toMatch(/\d+ min read/);
});

test('read time is derived per page, not a constant', () => {
  const long = readFileSync(
    join(DIST, 'guides/authoring-content/index.html'),
    'utf8',
  ).match(/(\d+) min read/)?.[1];
  const short = readFileSync(
    join(DIST, 'getting-started/installation/index.html'),
    'utf8',
  ).match(/(\d+) min read/)?.[1];
  expect(long).toBeDefined();
  expect(short).toBeDefined();
  expect(Number(long)).toBeGreaterThan(Number(short));
});

test('the last-updated date is not printed a second time in the footer', () => {
  const html = readFileSync(
    join(DIST, 'guides/authoring-content/index.html'),
    'utf8',
  );
  expect(html).not.toContain('Last updated:');
});

test('the footer renders the link columns and bottom bar', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  expect(html).toContain('data-nebari-footer');
  expect(html).toContain('Documentation');
  expect(html).toContain('Community');
  expect(html).toContain('Project');
  expect(html).toContain('Built with Astro Starlight');
  expect(html).toMatch(/(©|&copy;)\s*\d{4} Nebari/);
});

test('SiteTitle links the header logo to the site root by default', () => {
  const html = allText('.html');
  // The demo config omits logoHref, so SiteTitle falls back to the site base
  // (import.meta.env.BASE_URL, i.e. "/"). Astro appends a scoped-style hash
  // class (e.g. "astro-xxxxxxxx") after nbr-site-title, so match the class as a
  // token rather than the full attribute value.
  expect(html).toMatch(/<a[^>]*href="\/"[^>]*class="nbr-site-title\b/);
});
