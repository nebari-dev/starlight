import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StarlightPlugin } from '@astrojs/starlight/types';
import type { AstroIntegration } from 'astro';

/// <reference path="./virtual.d.ts" />

/**
 * Prepend the site's `base` to root-absolute `href`/`src` attributes in a chunk
 * of built HTML (e.g. `/reference/configuration/` → `/starlight/reference/...`).
 *
 * Astro only rewrites the links it generates itself (sidebar, pagination, and
 * bundled assets); links authored in content — Markdown links, `<LinkCard>`
 * hrefs, hero `actions` — are emitted verbatim and 404 under a base path. This
 * makes the documented "use root-relative links" convention hold for every pack
 * regardless of the Markdown processor. A no-op when the site has no base (local
 * dev/preview serve from `/`).
 */
export function withBasePrefix(html: string, base: string): string {
  // Astro normalizes base with a trailing slash ("/starlight/"); drop it so we
  // can concatenate cleanly. An empty result means "served from root" — skip.
  const prefix = base.replace(/\/+$/, '');
  if (!prefix) return html;
  return html.replace(
    /(\s(?:href|src)=)(["'])(\/[^"']*)\2/g,
    (match, attr: string, quote: string, url: string) => {
      // Leave protocol-relative URLs (//host) and already-prefixed links
      // (Astro-generated nav and `/starlight/_astro/...` bundles) untouched.
      if (
        url.startsWith('//') ||
        url === prefix ||
        url.startsWith(`${prefix}/`)
      ) {
        return match;
      }
      return `${attr}${quote}${prefix}${url}${quote}`;
    },
  );
}

export interface NebariThemeOptions {
  /**
   * URL the header logo links to. Defaults to the site's own base
   * (`import.meta.env.BASE_URL`). Set it to the portal root so the logo
   * returns users to `packs.nebari.dev/`.
   */
  logoHref?: string;
}

/** Astro integration that exposes the theme config to components via a virtual module. */
function nebariConfigIntegration(logoHref: string | null): AstroIntegration {
  // Captured in config:setup, consumed in build:done to prefix content links.
  let base = '/';
  return {
    name: '@nebari/starlight/config',
    hooks: {
      'astro:config:setup'({ config, updateConfig }) {
        base = config.base;
        updateConfig({
          vite: {
            plugins: [
              {
                name: '@nebari/starlight/virtual-config',
                resolveId(id: string) {
                  if (id === 'virtual:nebari/config')
                    return '\0virtual:nebari/config';
                  return undefined;
                },
                load(id: string) {
                  if (id === '\0virtual:nebari/config') {
                    return `export const logoHref = ${JSON.stringify(logoHref)};`;
                  }
                  return undefined;
                },
              },
            ],
          },
        });
      },
      // Prefix root-absolute links authored in content with the site base.
      // Runs only at build time; dev/preview serve from `/` (a no-op prefix).
      'astro:build:done'({ dir }) {
        const outDir = fileURLToPath(dir);
        const rewrite = (target: string) => {
          for (const entry of readdirSync(target, { withFileTypes: true })) {
            const path = join(target, entry.name);
            if (entry.isDirectory()) {
              rewrite(path);
            } else if (entry.name.endsWith('.html')) {
              const html = readFileSync(path, 'utf8');
              const next = withBasePrefix(html, base);
              if (next !== html) writeFileSync(path, next);
            }
          }
        };
        rewrite(outDir);
      },
    },
  };
}

export function nebari(options: NebariThemeOptions = {}): StarlightPlugin {
  const logoHref = options.logoHref ?? null;
  return {
    name: '@nebari/starlight',
    hooks: {
      'config:setup'({ config, updateConfig, addIntegration }) {
        updateConfig({
          customCss: [
            '@nebari/starlight/fonts/font-face.css',
            '@nebari/starlight/styles/nebari-tokens.css',
            '@nebari/starlight/styles/theme.css',
            '@nebari/starlight/styles/components.css',
            ...(config.customCss ?? []),
          ],
          components: {
            SiteTitle: '@nebari/starlight/components/SiteTitle.astro',
            Head: '@nebari/starlight/components/Head.astro',
            Footer: '@nebari/starlight/components/Footer.astro',
            ThemeSelect: '@nebari/starlight/components/ThemeSelect.astro',
            ...(config.components ?? {}),
          },
          social: [
            {
              icon: 'github',
              label: 'GitHub',
              href: 'https://github.com/nebari-dev',
            },
            ...(config.social ?? []),
          ],
        });
        addIntegration(nebariConfigIntegration(logoHref));
      },
    },
  };
}
