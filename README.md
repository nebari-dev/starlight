# @nebari/starlight

The shared [Starlight](https://starlight.astro.build) theme for Nebari
documentation sites. Add one plugin and every pack's docs get the same Nebari
identity - brand colors, fonts, logo, and footer - so maintainers write Markdown
and the theme handles presentation.

| Light | Dark |
| --- | --- |
| ![Nebari Starlight, light mode](https://raw.githubusercontent.com/nebari-dev/starlight/main/.github/screenshots/light.png) | ![Nebari Starlight, dark mode](https://raw.githubusercontent.com/nebari-dev/starlight/main/.github/screenshots/dark.png) |

## Install

```sh
bun add @nebari/starlight
```

`astro` (>=5) and `@astrojs/starlight` (>=0.33) are peer dependencies - install
them if your project does not already have them.

## Use

Add `nebari()` to your Starlight plugins:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Pack',
      plugins: [nebari()],
      // ...your sidebar, etc.
    }),
  ],
});
```

That's it - the plugin wires in the theme CSS, self-hosted fonts, the branded
header, splash footer, and a default GitHub social link. Pass `nav` if you want
top-level Docs / Guides / Reference tabs.

### Serving under a subpath

Packs on the Nebari portal are served at `packs.nebari.dev/<slug>/` behind a
Cloudflare Worker. Set Astro's `base` so links and assets resolve there:

```js
export default defineConfig({
  base: '/my-pack/',
  integrations: [starlight({ title: 'My Pack', plugins: [nebari()] })],
});
```

### Pointing the logo at the portal

By default the header logo links to the site's own base. On the Nebari portal,
point it at the portal root so it returns users to the pack catalog:

```js
starlight({ plugins: [nebari({ logoHref: 'https://packs.nebari.dev/' })] })
```

### Pointing the GitHub icon at your repo

The header's GitHub icon links to the Nebari org by default. Point it at the
pack's own repository instead:

```js
starlight({
  plugins: [nebari({ githubHref: 'https://github.com/nebari-dev/my-pack' })],
})
```

### Using your own logo

The header renders the bundled Nebari mark by default. Pass `logo` to replace
it — each value is used as the `<img src>` verbatim, so point it at a file in
your site's `public/` dir (root-absolute paths get the site base prefixed at
build time) or an absolute URL:

```js
starlight({
  plugins: [
    nebari({
      logo: {
        light: '/my-pack-light.svg', // shown in light mode
        dark: '/my-pack-dark.svg', // shown in dark mode
        alt: 'My Pack', // defaults to "Nebari"
      },
    }),
  ],
})
```

A variant that is omitted falls back to the other one, so a single-image logo
only needs `light`.

## What you get

- **Brand colors** - nebari-design's OKLCH tokens mapped onto Starlight's theme
  variables in both light and dark mode. Starlight's WCAG-tuned gray scale is
  kept for accessible body and muted text.
- **Typography** - Geist for body and headings, IBM Plex Mono for code, both
  self-hosted (no external font requests at runtime).
- **Logo, favicon, and footer** - the Nebari mark in the header, an inlined
  symbol favicon, and a branded multi-column footer on splash pages (home, 404).
  Doc pages with a sidebar end at their content.
- **Nav tabs** - optional `nav` items render as header tabs and in the mobile
  drawer. Omit the option and the header stays stock Starlight.
- **Search** - Starlight's built-in Pagefind, styled to the Docs theme, ready to
  merge additional pack indexes for portal-wide multisite search.

Everything is overridable: your own `customCss`, `components`, and `social`
entries are merged after the theme's, so a consumer always wins.

## Local development

This repo is a [Bun](https://bun.sh) workspace monorepo: the `@nebari/starlight`
theme lives in `packages/starlight`, and `docs/` is an example Starlight site
that consumes it for previewing changes.

The example docs are deployed to GitHub Pages on every push to `main` and can be
viewed at **<https://nebari-dev.github.io/starlight/>**.

Install dependencies for every workspace from the repo root:

```sh
bun install
```

Preview the theme against the docs site with hot reload:

```sh
bun run dev
```

Build the theme package (compiles `src/` to `dist/` with tsup):

```sh
bun run build
```

Run the test suite (builds the package and docs, then runs the tests):

```sh
bun test
```

The root `test` script covers `packages/starlight/test` and `docs/test` (the
`--base /demo-pack` build). End-to-end checks live in `docs/`:

```sh
cd docs && bun run e2e
```

Regenerate the README screenshots (out of CI, 1440×900):

```sh
cd docs && bun run screenshots
```

### Linting and formatting

[Biome](https://biomejs.dev) handles both formatting and linting (including
import sorting) from a single `biome.json` at the repo root:

```sh
bun run check        # lint + format check, no writes
bun run check:fix    # lint + format and apply safe fixes
bun run lint         # lint only
bun run lint:fix     # lint and apply safe fixes
bun run format       # format check only, no writes
bun run format:fix   # format and write changes in place
bun run ci           # biome ci — what CI runs
```

CI runs `bun run ci` (`biome ci`) and fails the build on any violation, so run
`bun run check` before pushing.

For editor integration, install the
[Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
and set it as the default formatter with format-on-save:

```jsonc
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  }
}
```

## Tokens

Color tokens are vendored from nebari-design's `registry/nebari/globals.css`
(namespaced to `--nbr-*`) so the theme needs no build step or network fetch at
runtime. Refresh them when the design system changes:

```sh
bun run sync-tokens
```

## Versioning

This package follows [EffVer](https://jacobtomlinson.dev/effver/)
(`vMACRO.MESO.MICRO`). Pin to a macro line so a presentation change cannot break
your build unexpectedly:

```jsonc
{ "dependencies": { "@nebari/starlight": "^1.0.0" } }
```

### 1.0.0

EffVer macro. Four behaviours change without an opt-in:

1. The footer no longer renders on doc pages — splash pages only.
2. `lastUpdated` defaults to `true`, so a date appears on pages that had none.
3. Nav tabs appear only if `nav` is set; absent, the header is byte-identical.
4. Tables scroll rather than wrap. Long values scroll inside the cell or the
   table instead of breaking across lines. With JavaScript disabled, a wide
   table can overflow the page.

## Releasing

Releases are published to npm automatically from GitHub Releases via
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no npm
token), with signed provenance attestations. The `.github/workflows/release.yml`
workflow runs on every published release.

To cut a release:

1. Bump the `version` in `packages/starlight/package.json` (following
   [EffVer](https://jacobtomlinson.dev/effver/)) and merge it to `main`.
2. Create a GitHub Release with a tag that matches the new version, prefixed
   with `v` — e.g. version `0.2.0` → tag `v0.2.0`. The workflow verifies the
   tag matches `packages/starlight/package.json` and fails the publish if they
   diverge.
3. Publishing the release triggers the workflow, which installs dependencies,
   builds the package via the `prepublishOnly` hook, and runs `npm publish`
   from `packages/starlight`.

## License

[Apache-2.0](./LICENSE)
