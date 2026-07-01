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
`SiteTitle`/`Head`/`Footer` components, and a default GitHub social link.

### Serving under a subpath

Packs on the Nebari portal are served at `packs.nebari.dev/<slug>/` behind a
Cloudflare Worker. Set Astro's `base` so links and assets resolve there:

```js
export default defineConfig({
  base: '/my-pack/',
  integrations: [starlight({ title: 'My Pack', plugins: [nebari()] })],
});
```

## What you get

- **Brand colors** - nebari-design's OKLCH tokens mapped onto Starlight's theme
  variables in both light and dark mode. Starlight's WCAG-tuned gray scale is
  kept for accessible body and muted text.
- **Typography** - Poppins for headings, Atkinson Hyperlegible for body, Fira
  Code for code, all self-hosted (no external font requests at runtime).
- **Logo, favicon, and footer** - the Nebari mark in the header, an inlined
  symbol favicon, and a branded footer on every page.
- **Search** - Starlight's built-in Pagefind, ready to merge additional pack
  indexes for portal-wide multisite search.

Everything is overridable: your own `customCss`, `components`, and `social`
entries are merged after the theme's, so a consumer always wins.

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
{ "dependencies": { "@nebari/starlight": "^0.1.0" } }
```

Releases are published to npm automatically from GitHub Releases via
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers), with signed
provenance attestations.

## License

[Apache-2.0](./LICENSE)
