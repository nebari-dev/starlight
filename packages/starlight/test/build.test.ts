// packages/starlight/test/build.test.ts
import { test, expect, beforeAll } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const DIST = join(import.meta.dir, '../../../docs/dist');

function allText(ext: string): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext)) out.push(readFileSync(p, 'utf8'));
    }
  };
  walk(DIST);
  return out.join('\n');
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
