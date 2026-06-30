import { test, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

// Builds can take up to 3 minutes; override the 5 s default.
setDefaultTimeout(180_000);

const HOME = join(import.meta.dir, '../dist/index.html');

beforeAll(async () => {
  await $`bun run --filter '@nebari/starlight' build`.cwd(join(import.meta.dir, '../..'));
  await $`bun run build:base`.cwd(join(import.meta.dir, '..'));
});

test('assets and links are prefixed with the base path', () => {
  const html = readFileSync(HOME, 'utf8');
  // CSS/font/asset URLs and internal nav links include the base.
  expect(html).toMatch(/(href|src)="\/demo-pack\//);
  // No bare-root asset references that would 404 behind the Worker subpath.
  expect(html).not.toMatch(/href="\/_astro\//);
});
