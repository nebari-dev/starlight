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
