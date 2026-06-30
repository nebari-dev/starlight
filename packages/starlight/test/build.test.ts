// packages/starlight/test/build.test.ts
import { test, expect, beforeAll } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
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
  return allFiles(ext).map((p) => readFileSync(p, 'utf8')).join('\n');
}

beforeAll(async () => {
  await $`bun run --filter '@nebari/starlight' build`.cwd(join(import.meta.dir, '../../..'));
  await $`bun run build`.cwd(join(import.meta.dir, '../../../docs'));
}, 120_000);

test('compiled CSS maps Starlight accent and grays onto nebari tokens', () => {
  const css = allText('.css');
  expect(css).toMatch(/--sl-color-accent:\s*var\(--nbr-primary\)/);
  expect(css).toMatch(/--sl-color-gray-1:\s*color-mix/);
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
  expect(css).toMatch(/Atkinson Hyperlegible/);
  expect(css).toMatch(/Fira Code/);
  expect(css).toMatch(/Poppins/);
  expect(css + html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|cdn/i);
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
