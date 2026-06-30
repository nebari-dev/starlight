# `@nebari/starlight` Shared Theme Package - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@nebari/starlight`, a reusable Starlight plugin that gives any Nebari docs site the unified Nebari look (vendored nebari-design OKLCH tokens, brand fonts, logo, footer) and ships standard Pagefind search, so pack maintainers write only markdown plus a tiny config.

**Architecture:** A Starlight plugin (`{ name, hooks }`) whose `config:setup` hook calls `updateConfig()` to inject theme CSS via `customCss`, register branded Astro component overrides (`SiteTitle`, `Head`, `Footer`), and set `social`. Branding is delivered with native Astro components consuming vendored OKLCH tokens (no React, no Tailwind). The repo is a Bun workspace: `packages/starlight` (the publishable package) and `docs` (a demo Starlight site that consumes it via `workspace:*` and doubles as dev harness, visual reference, and the package's own docs).

**Tech Stack:** Bun (package manager + test runner), Astro + Starlight (peer deps), TypeScript, tsup (build to `dist`), Playwright + `@axe-core/playwright` (e2e + a11y), `@fontsource/*` (vendored woff2 source). CSS only for theming (no Tailwind, no React).

## Global Constraints

- Package manager and test runner: **Bun** (matches nebari-design). No npm/pnpm/yarn lockfiles.
- Versioning: **EffVer** (`vMACRO.MESO.MICRO`). Consumers pin to a macro version.
- Integration: **tokens + native Astro components only**. Do NOT add `@astrojs/react`, React, shadcn, or Tailwind to this package.
- Tokens are **vendored** (committed CSS), never a live runtime dependency on `@nebari/theme`. Source of truth for refresh: `https://raw.githubusercontent.com/nebari-dev/nebari-design/main/registry/nebari/globals.css`.
- Fonts are **self-hosted**: woff2 committed in the package, referenced by a local `font-face.css`. Zero external font hosts (no `fonts.googleapis.com`, no CDN) in the build output at runtime.
- Starlight is a **peer dependency** with a pinned supported range; do not bundle it.
- All repo prose/copy/commit messages use regular hyphens, colons, or rewrites. **Never use em dashes (`—`).**
- Brand accent is nebari `--primary` (purple `oklch(0.5809 0.2683 319.62)` light / `oklch(0.6809 0.2483 319.62)` dark).

---

## File Structure

```
package.json                         # private workspace root (workspaces: packages/*, docs)
bunfig.toml                          # bun config (test root)
packages/starlight/
  package.json                       # @nebari/starlight (publishable)
  tsconfig.json
  tsup.config.ts                     # build src/index.ts -> dist/
  src/
    index.ts                         # the plugin: { name, hooks }
    styles/nebari-tokens.css         # VENDORED OKLCH tokens (provenance header)
    styles/theme.css                 # token -> Starlight var mapping + heading font
    fonts/font-face.css              # @font-face for vendored woff2
    fonts/*.woff2                    # vendored brand fonts (Poppins/Atkinson/Fira Code)
    assets/nebari-horizontal-light.svg   # dark-text lockup (shown in light mode)
    assets/nebari-horizontal-dark.svg    # white-text lockup (shown in dark mode)
    assets/nebari-symbol.svg             # favicon source
    components/SiteTitle.astro       # branded logo
    components/Head.astro            # adds favicon link
    components/Footer.astro          # branded footer
  scripts/sync-tokens.ts             # refresh nebari-tokens.css from nebari-design
  test/build.test.ts                 # build-output smoke assertions (bun test)
  test/sync-tokens.test.ts           # sync transform unit test (bun test)
docs/
  package.json                       # demo site; deps @nebari/starlight: workspace:*
  astro.config.mjs                   # starlight({ plugins: [nebari()] })
  src/content/docs/index.md          # splash/home
  src/content/docs/sample.md         # a content page (for search/a11y)
  e2e/theme-search-a11y.spec.ts      # Playwright + axe
  playwright.config.ts
README.md
```

---

### Task 1: Bun workspace + plugin package skeleton + build

**Files:**
- Create: `package.json` (workspace root)
- Create: `bunfig.toml`
- Create: `packages/starlight/package.json`
- Create: `packages/starlight/tsconfig.json`
- Create: `packages/starlight/tsup.config.ts`
- Create: `packages/starlight/src/index.ts`
- Test: `packages/starlight/test/skeleton.test.ts`

**Interfaces:**
- Produces: `export function nebari(): StarlightPlugin` from `@nebari/starlight`. The plugin's `name` is `'@nebari/starlight'`. (The GitHub social-link default is added in Task 6; no options are needed for v1.)

- [ ] **Step 1: Write the failing test**

```ts
// packages/starlight/test/skeleton.test.ts
import { test, expect } from 'bun:test';
import { nebari } from '../src/index.ts';

test('nebari() returns a Starlight plugin object', () => {
  const plugin = nebari();
  expect(plugin.name).toBe('@nebari/starlight');
  expect(typeof plugin.hooks['config:setup']).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/starlight/test/skeleton.test.ts`
Expected: FAIL - cannot resolve `../src/index.ts` (file does not exist).

- [ ] **Step 3: Create the workspace and package files**

```json
// package.json (root, private workspace)
{
  "name": "nebari-starlight-workspace",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "docs"],
  "scripts": {
    "build": "bun run --filter '@nebari/starlight' build",
    "test": "bun test packages/starlight/test",
    "sync-tokens": "bun packages/starlight/scripts/sync-tokens.ts"
  }
}
```

```toml
# bunfig.toml
[test]
root = "packages/starlight/test"
```

```json
// packages/starlight/package.json
{
  "name": "@nebari/starlight",
  "version": "0.0.0",
  "type": "module",
  "license": "Apache-2.0",
  "files": ["dist", "src/styles", "src/fonts", "src/assets", "src/components"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./styles/*": "./src/styles/*",
    "./fonts/*": "./src/fonts/*"
  },
  "scripts": {
    "build": "tsup"
  },
  "peerDependencies": {
    "@astrojs/starlight": ">=0.30.0 <1.0.0",
    "astro": ">=5.0.0 <6.0.0"
  },
  "devDependencies": {
    "@astrojs/starlight": "^0.30.0",
    "astro": "^5.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0"
  }
}
```

```json
// packages/starlight/tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  },
  "include": ["src", "scripts", "test"]
}
```

```ts
// packages/starlight/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // CSS, fonts, assets, and .astro components are shipped as source via package.json "files",
  // not bundled. Only the plugin entry is compiled.
  external: ['@astrojs/starlight', 'astro'],
});
```

```ts
// packages/starlight/src/index.ts
import type { StarlightPlugin } from '@astrojs/starlight/types';

export function nebari(): StarlightPlugin {
  return {
    name: '@nebari/starlight',
    hooks: {
      'config:setup'() {
        // Wiring added in later tasks.
      },
    },
  };
}
```

- [ ] **Step 4: Install deps and run the test to verify it passes**

Run: `bun install && bun test packages/starlight/test/skeleton.test.ts`
Expected: PASS (1 pass).

- [ ] **Step 5: Verify the package builds**

Run: `bun run build`
Expected: exit 0; `packages/starlight/dist/index.js` and `dist/index.d.ts` exist.

- [ ] **Step 6: Commit**

```bash
git add package.json bunfig.toml packages/starlight bun.lock
git commit -m "feat: scaffold @nebari/starlight Bun workspace and plugin skeleton"
```

**Advances journeys:** none (rationale: scaffolding; no user-visible behavior yet).

---

### Task 2: Demo Starlight site consuming the plugin (build baseline)

**Files:**
- Create: `docs/package.json`
- Create: `docs/astro.config.mjs`
- Create: `docs/src/content/docs/index.md`
- Create: `docs/src/content/docs/sample.md`
- Create: `docs/src/content.config.ts`

**Interfaces:**
- Consumes: `nebari()` from `@nebari/starlight` (Task 1).
- Produces: a buildable demo at `docs/` whose `dist/` is the assertion target for Tasks 4-8.

- [ ] **Step 1: Create the demo site files**

```json
// docs/package.json
{
  "name": "@nebari/starlight-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/starlight": "^0.30.0",
    "@nebari/starlight": "workspace:*",
    "astro": "^5.0.0"
  }
}
```

```js
// docs/astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Nebari Starlight',
      plugins: [nebari()],
    }),
  ],
});
```

```ts
// docs/src/content.config.ts
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
```

```md
<!-- docs/src/content/docs/index.md -->
---
title: Nebari Starlight
description: Shared Starlight theme for Nebari docs.
---

This is the demo site for the `@nebari/starlight` theme plugin. It exists to
prove the plugin renders the Nebari look and to serve as the package's own docs.

See the [sample page](/sample/) for searchable content.
```

```md
<!-- docs/src/content/docs/sample.md -->
---
title: Sample content
description: A content page used for search and accessibility checks.
---

## Searchable heading

This page contains a unique searchable token: `pagefind-probe-token`. The build
test and the end-to-end search test both look for this string.
```

- [ ] **Step 2: Install and run the build to verify the baseline**

Run: `bun install && bun run --filter '@nebari/starlight' build && cd docs && bun run build`
Expected: exit 0; `docs/dist/index.html` exists; `docs/dist/pagefind/pagefind.js` exists (Starlight runs Pagefind by default).

- [ ] **Step 3: Commit**

```bash
git add docs bun.lock
git commit -m "feat: add demo Starlight site consuming @nebari/starlight"
```

**Advances journeys:** 7 (demo builds and produces a Pagefind index), 8 (a separate workspace project consumes the package and builds).

---

### Task 3: Vendor nebari-design tokens + sync-tokens script

**Files:**
- Create: `packages/starlight/src/styles/nebari-tokens.css`
- Create: `packages/starlight/scripts/sync-tokens.ts`
- Test: `packages/starlight/test/sync-tokens.test.ts`

**Interfaces:**
- Produces: `transformTokens(globalsCss: string): string` from `scripts/sync-tokens.ts`. It (a) extracts the `:root {...}` and `.dark {...}` blocks, (b) namespaces every `--foo` custom property to `--nbr-foo`, and (c) rewrites selectors so light tokens land under `:root, :root[data-theme='light']` and dark tokens under `:root[data-theme='dark']`. The dark token names match the light names, so the mapping layer (Task 4) can reference `--nbr-*` once and let the cascade resolve per theme.

- [ ] **Step 1: Write the failing test**

```ts
// packages/starlight/test/sync-tokens.test.ts
import { test, expect } from 'bun:test';
import { transformTokens } from '../scripts/sync-tokens.ts';

const SAMPLE = `
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --primary: oklch(0.5809 0.2683 319.62);
}
.dark {
  --background: oklch(0.1743 0.0105 276.35);
  --primary: oklch(0.6809 0.2483 319.62);
}
`;

test('namespaces custom properties to --nbr-*', () => {
  const out = transformTokens(SAMPLE);
  expect(out).toContain('--nbr-primary: oklch(0.5809 0.2683 319.62)');
  expect(out).not.toMatch(/(^|[^-])--primary:/);
});

test('maps light tokens to :root and dark tokens to data-theme dark', () => {
  const out = transformTokens(SAMPLE);
  expect(out).toMatch(/:root,\s*:root\[data-theme='light'\]\s*\{[^}]*--nbr-background: oklch\(1 0 0\)/);
  expect(out).toMatch(/:root\[data-theme='dark'\]\s*\{[^}]*--nbr-background: oklch\(0\.1743/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/starlight/test/sync-tokens.test.ts`
Expected: FAIL - cannot resolve `../scripts/sync-tokens.ts`.

- [ ] **Step 3: Implement the sync script**

```ts
// packages/starlight/scripts/sync-tokens.ts
const SOURCE_URL =
  'https://raw.githubusercontent.com/nebari-dev/nebari-design/main/registry/nebari/globals.css';
const OUT_PATH = new URL('../src/styles/nebari-tokens.css', import.meta.url);

const PROVENANCE = `/*
 * VENDORED nebari-design tokens. Do not edit by hand.
 * Source: nebari-design registry/nebari/globals.css
 * Refresh: bun run sync-tokens
 *
 * Tokens are namespaced to --nbr-* and re-scoped onto Starlight's theme
 * selectors (light under :root/[data-theme='light'], dark under
 * [data-theme='dark']) so the mapping layer (theme.css) can reference
 * --nbr-* once and let the cascade resolve per theme.
 */
`;

function extractBlock(css: string, selector: string): string {
  // Matches `selector { ... }` capturing the declarations.
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'm');
  const m = css.match(re);
  return m ? m[1].trim() : '';
}

function namespaceDecls(decls: string): string {
  // Rename leading --foo: to --nbr-foo: . Leaves var() references intact;
  // the mapping layer references --nbr-* explicitly, not raw token names.
  return decls.replace(/(^|\n)(\s*)--([a-zA-Z0-9-]+)\s*:/g, '$1$2--nbr-$3:');
}

export function transformTokens(globalsCss: string): string {
  const light = namespaceDecls(extractBlock(globalsCss, ':root'));
  const dark = namespaceDecls(extractBlock(globalsCss, '.dark'));
  return (
    PROVENANCE +
    `\n:root,\n:root[data-theme='light'] {\n${light}\n}\n` +
    `\n:root[data-theme='dark'] {\n${dark}\n}\n`
  );
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch ${SOURCE_URL} failed: ${res.status}`);
  const css = await res.text();
  await Bun.write(OUT_PATH, transformTokens(css));
  console.log(`wrote ${OUT_PATH.pathname}`);
}

// Run as a script (`bun sync-tokens.ts`) but stay importable for tests.
if (import.meta.main) await main();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/starlight/test/sync-tokens.test.ts`
Expected: PASS (2 pass).

- [ ] **Step 5: Generate the real vendored token file**

Run: `bun run sync-tokens`
Expected: writes `packages/starlight/src/styles/nebari-tokens.css`. Open it and confirm it begins with the provenance header and contains `--nbr-primary` under both theme selectors.

> If the network is unavailable, create `packages/starlight/src/styles/nebari-tokens.css` by hand using the proven values below (provenance header on top, then the two blocks). These are the exact values currently in nebari-hugo-theme:
>
> Light (`:root, :root[data-theme='light']`): `--nbr-radius: 0.625rem; --nbr-background: oklch(1 0 0); --nbr-foreground: oklch(0.1743 0.0105 276.35); --nbr-card: oklch(1 0 0); --nbr-popover: oklch(1 0 0); --nbr-primary: oklch(0.5809 0.2683 319.62); --nbr-primary-foreground: oklch(0.985 0 0); --nbr-primary-hover: oklch(0.4793 0.209 318.89); --nbr-secondary: oklch(0.97 0 0); --nbr-muted: oklch(0.97 0 0); --nbr-muted-foreground: oklch(0.556 0 0); --nbr-accent: oklch(0.97 0 0); --nbr-border: oklch(0.922 0 0); --nbr-border-strong: oklch(0.781 0.006 288.8);`
>
> Dark (`:root[data-theme='dark']`): `--nbr-background: oklch(0.1743 0.0105 276.35); --nbr-foreground: oklch(0.985 0 0); --nbr-card: oklch(0.205 0.0105 276.35); --nbr-popover: oklch(0.205 0.0105 276.35); --nbr-primary: oklch(0.6809 0.2483 319.62); --nbr-primary-foreground: oklch(0.1743 0.0105 276.35); --nbr-primary-hover: oklch(0.6009 0.2483 319.62); --nbr-secondary: oklch(0.269 0 0); --nbr-muted: oklch(0.269 0 0); --nbr-muted-foreground: oklch(0.708 0 0); --nbr-accent: oklch(0.269 0 0); --nbr-border: oklch(0.275 0 0); --nbr-border-strong: oklch(1 0 0 / 20%);`

- [ ] **Step 6: Commit**

```bash
git add packages/starlight/scripts/sync-tokens.ts packages/starlight/test/sync-tokens.test.ts packages/starlight/src/styles/nebari-tokens.css
git commit -m "feat: vendor nebari-design tokens + sync-tokens refresh script"
```

**Advances journeys:** 11 (sync-tokens refreshes vendored tokens; provenance recorded in the file header).

---

### Task 4: Token-to-Starlight mapping CSS + wire into the plugin

**Files:**
- Create: `packages/starlight/src/styles/theme.css`
- Modify: `packages/starlight/src/index.ts`
- Modify: `packages/starlight/test/build.test.ts` (created here)

**Interfaces:**
- Consumes: `--nbr-*` tokens (Task 3), `nebari()` plugin (Task 1).
- Produces: the plugin now pushes `@nebari/starlight/styles/nebari-tokens.css` and `@nebari/starlight/styles/theme.css` onto `customCss`. Mapping is theme-agnostic at `:root` because the `--nbr-*` values are already theme-scoped.

- [ ] **Step 1: Write the failing build assertion**

```ts
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
});

test('compiled CSS maps Starlight accent and grays onto nebari tokens', () => {
  const css = allText('.css');
  expect(css).toMatch(/--sl-color-accent:\s*var\(--nbr-primary\)/);
  expect(css).toMatch(/--sl-color-gray-1:/);
  expect(css).toMatch(/--nbr-background:\s*oklch/);
});

test('both light and dark token blocks are present', () => {
  const css = allText('.css');
  expect(css).toContain("data-theme='dark'");
  expect(css).toContain("data-theme='light'");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: FAIL - the mapped variables are not in the build (theme.css not wired yet).

- [ ] **Step 3: Write the mapping CSS**

```css
/* packages/starlight/src/styles/theme.css
 * Maps vendored --nbr-* tokens onto Starlight's --sl-* theme variables.
 * Theme-agnostic at :root because --nbr-* is already scoped per theme in
 * nebari-tokens.css. Gray ramp is derived from the neutral fg/bg with
 * color-mix so it tracks whichever theme is active.
 */
:root {
  --sl-color-accent-low: color-mix(in oklab, var(--nbr-primary), var(--nbr-background) 80%);
  --sl-color-accent: var(--nbr-primary);
  --sl-color-accent-high: color-mix(in oklab, var(--nbr-primary), var(--nbr-foreground) 35%);

  --sl-color-text: var(--nbr-foreground);
  --sl-color-text-accent: var(--nbr-primary);
  --sl-color-bg: var(--nbr-background);
  --sl-color-bg-nav: var(--nbr-card);
  --sl-color-bg-sidebar: var(--nbr-card);

  /* Neutral gray ramp tied to nebari fg/bg. */
  --sl-color-gray-1: color-mix(in oklab, var(--nbr-foreground), var(--nbr-background) 10%);
  --sl-color-gray-2: color-mix(in oklab, var(--nbr-foreground), var(--nbr-background) 30%);
  --sl-color-gray-3: color-mix(in oklab, var(--nbr-foreground), var(--nbr-background) 50%);
  --sl-color-gray-4: var(--nbr-muted-foreground);
  --sl-color-gray-5: color-mix(in oklab, var(--nbr-foreground), var(--nbr-background) 80%);
  --sl-color-gray-6: var(--nbr-border);
  --sl-color-gray-7: color-mix(in oklab, var(--nbr-foreground), var(--nbr-background) 96%);

  --sl-color-hairline: var(--nbr-border);
}
```

- [ ] **Step 4: Wire the styles into the plugin**

```ts
// packages/starlight/src/index.ts  (replace the config:setup body)
'config:setup'({ config, updateConfig }) {
  updateConfig({
    customCss: [
      '@nebari/starlight/styles/nebari-tokens.css',
      '@nebari/starlight/styles/theme.css',
      ...(config.customCss ?? []),
    ],
  });
},
```

- [ ] **Step 5: Run the build assertion to verify it passes**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: PASS (2 pass).

- [ ] **Step 6: Commit**

```bash
git add packages/starlight/src/styles/theme.css packages/starlight/src/index.ts packages/starlight/test/build.test.ts
git commit -m "feat: map nebari OKLCH tokens onto Starlight theme variables"
```

**Advances journeys:** 2 (OKLCH tokens mapped to Starlight accent/gray/text/bg vars for both themes).

---

### Task 5: Self-hosted brand fonts

**Files:**
- Create: `packages/starlight/src/fonts/font-face.css`
- Create: `packages/starlight/src/fonts/*.woff2` (vendored)
- Modify: `packages/starlight/src/styles/theme.css` (add font variables + heading font)
- Modify: `packages/starlight/src/index.ts` (add font-face.css to customCss)
- Modify: `packages/starlight/test/build.test.ts` (add font assertions)

**Interfaces:**
- Consumes: the mapping CSS (Task 4).
- Produces: `--sl-font` = Atkinson Hyperlegible (body), `--sl-font-mono` = Fira Code (code), headings = Poppins. Fonts served from the site's own origin.

- [ ] **Step 1: Add failing font assertions**

```ts
// append to packages/starlight/test/build.test.ts
test('fonts are self-hosted, no external font host', () => {
  const css = allText('.css');
  const html = allText('.html');
  expect(css).toMatch(/Atkinson Hyperlegible/);
  expect(css).toMatch(/Fira Code/);
  expect(css).toMatch(/Poppins/);
  expect(css + html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|cdn/i);
});

test('woff2 files are emitted into the build', () => {
  const fonts: string[] = [];
  const walk = (dir: string) => {
    for (const e of require('node:fs').readdirSync(dir, { withFileTypes: true })) {
      const p = require('node:path').join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.woff2')) fonts.push(p);
    }
  };
  walk(DIST);
  expect(fonts.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: FAIL - font families and woff2 not present yet.

- [ ] **Step 3: Vendor the woff2 files**

Install the fontsource packages as a one-time source, copy the exact weights into the package, then remove the dev dep. These are the same families/weights nebari-hugo-theme self-hosts.

```bash
cd packages/starlight
bun add -d @fontsource/poppins @fontsource/atkinson-hyperlegible @fontsource/fira-code
mkdir -p src/fonts
cp node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2 src/fonts/
cp node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2 src/fonts/
cp node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2 src/fonts/
cp node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2 src/fonts/
cp node_modules/@fontsource/fira-code/files/fira-code-latin-400-normal.woff2 src/fonts/
cp node_modules/@fontsource/fira-code/files/fira-code-latin-500-normal.woff2 src/fonts/
bun remove @fontsource/poppins @fontsource/atkinson-hyperlegible @fontsource/fira-code
cd ../..
```

- [ ] **Step 4: Write the font-face CSS**

```css
/* packages/starlight/src/fonts/font-face.css */
@font-face { font-family: 'Atkinson Hyperlegible'; font-style: normal; font-weight: 400; font-display: swap; src: url('./atkinson-hyperlegible-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Atkinson Hyperlegible'; font-style: normal; font-weight: 700; font-display: swap; src: url('./atkinson-hyperlegible-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Poppins'; font-style: normal; font-weight: 600; font-display: swap; src: url('./poppins-latin-600-normal.woff2') format('woff2'); }
@font-face { font-family: 'Poppins'; font-style: normal; font-weight: 700; font-display: swap; src: url('./poppins-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Fira Code'; font-style: normal; font-weight: 400; font-display: swap; src: url('./fira-code-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'Fira Code'; font-style: normal; font-weight: 500; font-display: swap; src: url('./fira-code-latin-500-normal.woff2') format('woff2'); }
```

- [ ] **Step 5: Add font variables and heading font to theme.css**

```css
/* append to packages/starlight/src/styles/theme.css */
:root {
  --sl-font: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif;
  --sl-font-mono: 'Fira Code', ui-monospace, monospace;
  --nbr-font-heading: 'Poppins', var(--sl-font);
}
h1, h2, h3, h4, h5, h6,
.sl-markdown-content :is(h1, h2, h3, h4, h5, h6) {
  font-family: var(--nbr-font-heading);
  font-weight: 600;
}
```

- [ ] **Step 6: Add font-face.css to the plugin's customCss**

```ts
// packages/starlight/src/index.ts  (update the customCss array)
customCss: [
  '@nebari/starlight/fonts/font-face.css',
  '@nebari/starlight/styles/nebari-tokens.css',
  '@nebari/starlight/styles/theme.css',
  ...(config.customCss ?? []),
],
```

- [ ] **Step 7: Run the build assertions to verify they pass**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: PASS (all font + mapping tests pass).

- [ ] **Step 8: Commit**

```bash
git add packages/starlight/src/fonts packages/starlight/src/styles/theme.css packages/starlight/src/index.ts packages/starlight/test/build.test.ts
git commit -m "feat: self-host Poppins/Atkinson/Fira Code brand fonts"
```

**Advances journeys:** 4 (brand fonts applied, self-hosted, no external font host).

---

### Task 6: Branded components (logo, favicon, footer) + assets

**Files:**
- Create: `packages/starlight/src/assets/nebari-horizontal-light.svg`
- Create: `packages/starlight/src/assets/nebari-horizontal-dark.svg`
- Create: `packages/starlight/src/assets/nebari-symbol.svg`
- Create: `packages/starlight/src/components/SiteTitle.astro`
- Create: `packages/starlight/src/components/Head.astro`
- Create: `packages/starlight/src/components/Footer.astro`
- Modify: `packages/starlight/src/index.ts` (register component overrides)
- Modify: `packages/starlight/test/build.test.ts` (footer + logo assertions)

**Interfaces:**
- Consumes: `nebari()` plugin (Task 1).
- Produces: the plugin sets `components: { SiteTitle, Head, Footer }`. Logo SVGs and favicon ship inside the package and are imported with `?url` so Vite emits them to each consumer's build (no consumer-side asset copying).

- [ ] **Step 1: Fetch the brand assets from nebari-design**

```bash
cd packages/starlight/src/assets
curl -fsSL -o nebari-horizontal-light.svg https://raw.githubusercontent.com/nebari-dev/nebari-design/main/logo-mark/horizontal/Nebari-Logo-Horizontal-Lockup.svg
curl -fsSL -o nebari-horizontal-dark.svg https://raw.githubusercontent.com/nebari-dev/nebari-design/main/logo-mark/horizontal/Nebari-Logo-Horizontal-Lockup-White-text.svg
curl -fsSL -o nebari-symbol.svg https://raw.githubusercontent.com/nebari-dev/nebari-design/main/symbol/Nebari-Symbol.svg
cd ../../../..
```

- [ ] **Step 2: Add failing assertions for footer + logo**

```ts
// append to packages/starlight/test/build.test.ts
test('branded footer marker renders on pages', () => {
  const html = allText('.html');
  expect(html).toContain('data-nebari-footer');
});

test('Nebari logo is rendered in the header', () => {
  const html = allText('.html');
  expect(html).toMatch(/alt="Nebari"/);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: FAIL - footer marker and logo not present.

- [ ] **Step 4: Write the SiteTitle override (logo)**

```astro
---
// packages/starlight/src/components/SiteTitle.astro
import logoLight from '../assets/nebari-horizontal-light.svg?url';
import logoDark from '../assets/nebari-horizontal-dark.svg?url';
const href = Astro.locals.starlightRoute.entry.data.template === 'splash' ? '/' : '/';
---
<a href={href} class="nbr-site-title">
  <img src={logoLight} alt="Nebari" class="nbr-logo nbr-logo--light" height="32" />
  <img src={logoDark} alt="Nebari" class="nbr-logo nbr-logo--dark" height="32" />
</a>
<style>
  .nbr-site-title { display: flex; align-items: center; }
  .nbr-logo { height: 2rem; width: auto; }
  .nbr-logo--dark { display: none; }
  :global(:root[data-theme='dark']) .nbr-logo--light { display: none; }
  :global(:root[data-theme='dark']) .nbr-logo--dark { display: inline; }
</style>
```

- [ ] **Step 5: Write the Head override (favicon)**

```astro
---
// packages/starlight/src/components/Head.astro
import Default from '@astrojs/starlight/components/Head.astro';
import favicon from '../assets/nebari-symbol.svg?url';
---
<Default><slot /></Default>
<link rel="icon" href={favicon} type="image/svg+xml" />
```

- [ ] **Step 6: Write the Footer override**

```astro
---
// packages/starlight/src/components/Footer.astro
import Default from '@astrojs/starlight/components/Footer.astro';
const year = new Date().getFullYear();
---
<Default><slot /></Default>
<div data-nebari-footer class="nbr-footer">
  <span>Built with Nebari - <a href="https://nebari.dev">nebari.dev</a></span>
  <span>&copy; {year} Nebari</span>
</div>
<style>
  .nbr-footer {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 1.5rem; padding-top: 1rem;
    border-top: 1px solid var(--sl-color-hairline);
    color: var(--sl-color-gray-3); font-size: var(--sl-text-sm);
  }
  .nbr-footer a { color: var(--sl-color-text-accent); }
</style>
```

- [ ] **Step 7: Register the overrides in the plugin**

```ts
// packages/starlight/src/index.ts  (add to updateConfig in config:setup)
updateConfig({
  customCss: [/* unchanged from Task 5 */
    '@nebari/starlight/fonts/font-face.css',
    '@nebari/starlight/styles/nebari-tokens.css',
    '@nebari/starlight/styles/theme.css',
    ...(config.customCss ?? []),
  ],
  components: {
    SiteTitle: '@nebari/starlight/components/SiteTitle.astro',
    Head: '@nebari/starlight/components/Head.astro',
    Footer: '@nebari/starlight/components/Footer.astro',
    ...(config.components ?? {}),
  },
  social: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/nebari-dev' },
    ...(config.social ?? []),
  ],
});
```

Add the component path to `package.json` exports so consumers can resolve them:

```json
// packages/starlight/package.json exports - add:
"./components/*": "./src/components/*"
```

- [ ] **Step 8: Run the build assertions to verify they pass**

Run: `bun test packages/starlight/test/build.test.ts`
Expected: PASS (footer marker + logo present).

- [ ] **Step 9: Commit**

```bash
git add packages/starlight/src/assets packages/starlight/src/components packages/starlight/src/index.ts packages/starlight/package.json packages/starlight/test/build.test.ts
git commit -m "feat: add branded SiteTitle, Head (favicon), and Footer overrides"
```

**Advances journeys:** 1 (plugin alone yields the Nebari look), 5 (logo + favicon render), 6 (branded footer on every page).

---

### Task 7: End-to-end checks - theme toggle, search, accessibility

**Files:**
- Create: `docs/playwright.config.ts`
- Create: `docs/e2e/theme-search-a11y.spec.ts`
- Modify: `docs/package.json` (add Playwright + axe dev deps + `e2e` script)

**Interfaces:**
- Consumes: the built/preview demo site.
- Produces: automated coverage for theme toggle, Pagefind search, and axe a11y.

- [ ] **Step 1: Add Playwright config + deps**

```bash
cd docs
bun add -d @playwright/test @axe-core/playwright
bunx playwright install --with-deps chromium
cd ..
```

```ts
// docs/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'bun run build && bun run preview --port 4321',
    url: 'http://localhost:4321/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: { baseURL: 'http://localhost:4321' },
});
```

```json
// docs/package.json - add to scripts:
"e2e": "playwright test"
```

- [ ] **Step 2: Write the e2e spec**

```ts
// docs/e2e/theme-search-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('theme toggle switches data-theme to dark', async ({ page }) => {
  await page.goto('/');
  // Starlight defaults to auto; force light, then toggle to dark via the select.
  const html = page.locator('html');
  const select = page.locator('starlight-theme-select select');
  await select.selectOption('dark');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  // Accent should resolve to the nebari purple token (non-empty).
  const accent = await html.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--sl-color-accent').trim(),
  );
  expect(accent.length).toBeGreaterThan(0);
});

test('search returns the seeded token', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await page.locator('input[type="search"], dialog input').first().fill('pagefind-probe-token');
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
```

- [ ] **Step 3: Run the e2e suite**

Run: `cd docs && bun run e2e`
Expected: PASS (3 passed). If the search selector differs in the installed Starlight version, open the search dialog and inspect the input selector, then update the locator (do not weaken the assertion).

- [ ] **Step 4: Commit**

```bash
git add docs/playwright.config.ts docs/e2e docs/package.json bun.lock
git commit -m "test: e2e coverage for theme toggle, search, and axe a11y"
```

**Advances journeys:** 3 (theme toggle switches token set), 7 (search returns a result), 10 (axe passes on home + content page).

---

### Task 8: Non-root base-path build

**Files:**
- Create: `docs/test/base-path.test.ts`
- Modify: `docs/package.json` (add a `build:base` script)

**Interfaces:**
- Consumes: the demo site + plugin.
- Produces: proof the theme's own assets and links resolve under a non-root `base` (federated Worker subpath readiness).

- [ ] **Step 1: Add a base-path build script**

```json
// docs/package.json - add to scripts:
"build:base": "astro build --base /demo-pack"
```

Astro reads `--base` and prefixes asset and link URLs accordingly. (Confirm against the Astro `base` config docs for the installed version.)

- [ ] **Step 2: Write the failing assertion**

```ts
// docs/test/base-path.test.ts
import { test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

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
```

- [ ] **Step 3: Run to verify it fails, then passes**

Run: `cd docs && bun test test/base-path.test.ts`
Expected: initially FAIL if any theme asset is hard-coded to root; after confirming all plugin assets use Astro/Vite-resolved URLs (they do via `?url` imports and `customCss`), it PASSES. If it fails, find the offending hard-coded `/` path in a plugin component and replace it with an imported asset URL.

- [ ] **Step 4: Commit**

```bash
git add docs/test/base-path.test.ts docs/package.json
git commit -m "test: verify theme renders correctly under a non-root base path"
```

**Advances journeys:** 9 (theme correct under non-root base).

---

### Task 9: README, provenance docs, CI, and EffVer release

**Files:**
- Create: `README.md`
- Create: `.github/workflows/ci.yml`
- Modify: `packages/starlight/package.json` (set the release version)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: published-ready package with docs, CI gate, and an EffVer tag a consumer can pin.

- [ ] **Step 1: Write the README**

Document: what the package is, install (`bun add @nebari/starlight`), the minimal `astro.config.mjs` usage with `plugins: [nebari()]`, the `base: '/<slug>/'` note for Worker subpath deploys, the token provenance + `bun run sync-tokens` refresh workflow, and the EffVer pinning guidance (pin to a macro version). No em dashes.

```md
# @nebari/starlight

Shared Starlight theme plugin for Nebari documentation sites. Adds the Nebari
look (vendored nebari-design OKLCH tokens, Poppins/Atkinson Hyperlegible/Fira
Code, logo, footer) with one line of config.

## Install

    bun add @nebari/starlight

## Use

```js
import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';

export default defineConfig({
  integrations: [starlight({ title: 'My Pack', plugins: [nebari()] })],
});
```

For a pack served under `packs.nebari.dev/<slug>/`, also set `base: '/<slug>/'`
in `astro.config.mjs` so links and assets resolve behind the Worker.

## Tokens

Color tokens are vendored from nebari-design (`registry/nebari/globals.css`).
Refresh them with `bun run sync-tokens`.

## Versioning

This package uses EffVer (`vMACRO.MESO.MICRO`). Pin to a macro version so a
presentation change cannot break your build unexpectedly.
```

- [ ] **Step 2: Write the CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions: { contents: read }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run --filter '@nebari/starlight' build
      - run: bun test packages/starlight/test
      - run: cd docs && bun test
      - run: cd docs && bunx playwright install --with-deps chromium && bun run e2e
```

- [ ] **Step 3: Run the full suite locally**

Run from repo root:
```bash
bun install --frozen-lockfile
bun run --filter '@nebari/starlight' build
bun test packages/starlight/test
cd docs && bun test && bun run e2e && cd ..
```
Expected: all green.

- [ ] **Step 4: Set the release version and tag (EffVer)**

```bash
# Set packages/starlight/package.json "version" to 0.1.0 for the first macro line.
git add README.md .github/workflows/ci.yml packages/starlight/package.json
git commit -m "docs: add README and CI; set initial EffVer version 0.1.0"
git tag v0.1.0
```

- [ ] **Step 5: Commit**

(Tagging in Step 4 is the final action; push tags when ready to publish.)

**Advances journeys:** 11 (provenance + refresh documented), 12 (EffVer tag a consumer can pin to).

---

## Self-Review

**1. Spec coverage:**
- Distribution as a Starlight plugin: Task 1, 4, 6 (the `nebari()` plugin + updateConfig wiring). Covered.
- Tokens + native Astro components (no React): enforced by Global Constraints; Tasks 4-6 use only CSS + `.astro`. Covered.
- Vendored tokens + sync script: Task 3. Covered.
- Theme CSS mapping (accent/gray/text/bg, light+dark): Task 4. Covered.
- Self-hosted fonts: Task 5. Covered.
- Logos + favicon: Task 6. Covered.
- Config defaults (social): set in the plugin's `updateConfig` in Task 6 Step 7 (GitHub link merged ahead of the consumer's `config.social`). Covered.
- Minimal component overrides: Task 6 (SiteTitle/Head/Footer - Head/SiteTitle justified by favicon/logo needs). Covered.
- Subpath/base docs + verification: Task 8 + README (Task 9). Covered.
- Demo site / dogfood: Task 2. Covered.
- EffVer + pinning: Task 9. Covered.
- Deferred items (multisite search merge, pack table, versioning UX): correctly NOT in this plan.

**2. Placeholder scan:** No "TBD/TODO/implement later". The Task 3 Step 5 fallback values and the Task 9 social note are concrete, not placeholders.

**3. Type consistency:** `nebari(options?: NebariThemeOptions)` and `name: '@nebari/starlight'` are consistent across Tasks 1, 4, 6. `transformTokens` signature consistent between Task 3 implementation and test. `customCss` array order is preserved and extended consistently across Tasks 4-6. Component override keys (`SiteTitle`, `Head`, `Footer`) match the files created in Task 6.

**Gap fixed inline:** Task 6 Step 7 now sets the `social` default directly (the spec's config-defaults requirement), and the `nebari()` signature takes no options for v1 (avoids an unused-variable error across tasks under the strict tsconfig).

## Journeys

| # | Item | Proof | Check method | Evidence |
|---|------|-------|--------------|----------|
| 1 | Plugin alone yields Nebari look | A minimal Starlight site whose only theming is `plugins:[nebari()]` builds and renders Nebari branding (colors, fonts, logo, footer) | narrated: demo build + home-page screenshot | *(empty)* |
| 2 | OKLCH tokens mapped to Starlight vars, light+dark | Built CSS defines `--sl-color-accent*`/`--sl-color-gray*`/text/bg from nebari OKLCH values for both `:root` and dark | automated: build smoke test greps compiled CSS for mapped vars in both themes | *(empty)* |
| 3 | Dark/light toggle switches tokens | Toggling theme swaps to the dark token set (background/accent visibly change) | narrated: Playwright toggle + before/after screenshots | *(empty)* |
| 4 | Fonts self-hosted, no CDN | Poppins/Atkinson/Fira Code apply; built HTML/CSS reference only local `/fonts/*`, zero external font hosts | automated: build test asserts no `fonts.googleapis`/CDN refs + local woff2 present | *(empty)* |
| 5 | Logo (light/dark) + favicon | Header shows correct logo per theme; favicon set | narrated: screenshots light + dark | *(empty)* |
| 6 | Branded footer | Nebari footer renders on every page | automated: built HTML contains footer marker | *(empty)* |
| 7 | Demo builds + Pagefind search works | `astro build` exits 0; `dist/pagefind/` exists; a query returns a result | automated: build + Playwright search assertion | *(empty)* |
| 8 | Consumable by a separate project | A throwaway consumer (or the dashboard) installs the package and `astro build` succeeds with `nebari()` active | automated/narrated: install + build transcript | *(empty)* |
| 9 | Correct under non-root `base` | Demo built with `base:'/demo-pack/'`: asset/link URLs include the base; page loads and nav works under it | automated: build with base + URL assertions; narrated load check | *(empty)* |
| 10 | a11y passes (axe) | Built demo home + a content page have no serious/critical axe violations | automated: Playwright + axe run | *(empty)* |
| 11 | Token sync works + documented | Running `sync-tokens` pulls `@nebari/theme` tokens into the vendored CSS; README documents provenance + refresh | narrated: script run transcript + diff | *(empty)* |
| 12 | EffVer tag pinnable | Repo has an EffVer tag (`vMACRO.MESO.MICRO`) and a consumer can pin to it | narrated: `git tag` + consumer pin | *(empty)* |
