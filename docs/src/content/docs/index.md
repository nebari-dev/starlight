---
title: Nebari Starlight
description: The shared Starlight theme for Nebari documentation sites.
---

`@nebari/starlight` is a Starlight plugin that gives every Nebari documentation
site the same Nebari look - brand colors, fonts, logo, and footer - from one line
of config. Pack maintainers write Markdown; the theme handles presentation.

## Quick start

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';

export default defineConfig({
  integrations: [
    starlight({ title: 'My Pack', plugins: [nebari()] }),
  ],
});
```

## What you get

- **Brand colors** - nebari-design's OKLCH tokens mapped onto Starlight's theme
  variables, in both light and dark mode.
- **Typography** - Poppins for headings, Atkinson Hyperlegible for body text, and
  Fira Code for code, all self-hosted (no CDN).
- **Logo and footer** - the Nebari mark in the header and a branded footer on
  every page.
- **Search** - Starlight's built-in Pagefind, ready for multisite merging.

:::tip
This page is the theme's own demo - the header, sidebar, this callout, the code
block above, and the link colors are all the theme in action. Toggle light and
dark with the control in the top right.
:::

See the [Nebari documentation](https://nebari.dev) for the wider platform, or the
[sample page](/sample/) for more searchable content.
