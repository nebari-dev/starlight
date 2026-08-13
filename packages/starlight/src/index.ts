import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ExpressiveCodeTheme,
  StarlightExpressiveCodeOptions,
} from '@astrojs/starlight/expressive-code';
import type { StarlightPlugin } from '@astrojs/starlight/types';
import type { AstroIntegration } from 'astro';
import { customizeTheme } from './code-theme';

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

/**
 * Make Markdown tables keyboard-reachable.
 *
 * `components.css` renders tables as `overflow-x: auto` blocks so that a token
 * too long to wrap — a URL, a filesystem path — scrolls instead of pushing the
 * whole page sideways. A scrollable region has to be focusable or keyboard users
 * cannot reach the hidden columns (axe `scrollable-region-focusable`, WCAG 2.1.1),
 * and `tabindex` is not expressible in CSS.
 *
 * Done here rather than with a rehype plugin because Astro 7 deprecated
 * `markdown.rehypePlugins`: the legacy path needs `@astrojs/markdown-remark`
 * installed directly and still logs a deprecation warning. This reuses the
 * rewriter that already runs over every emitted page. Like `withBasePrefix`, it
 * is build-only — `astro dev` serves tables without the attribute.
 */
export function withFocusableTables(html: string): string {
  return html.replace(
    /<table(?![^>]*\stabindex=)([^>]*)>/g,
    '<table$1 tabindex="0">',
  );
}

export interface NebariThemeOptions {
  /**
   * URL the header logo links to. Defaults to the site's own base
   * (`import.meta.env.BASE_URL`). Set it to the portal root so the logo
   * returns users to `packs.nebari.dev/`.
   */
  logoHref?: string;
  nav?: Array<{ label: string; href: string }>;
}

interface ResolvedOptions {
  logoHref: string | null;
  nav: Array<{ label: string; href: string }> | null;
}

/** Astro integration that exposes the theme config to components via a virtual module. */
function nebariConfigIntegration(resolved: ResolvedOptions): AstroIntegration {
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
                    return Object.entries(resolved)
                      .map(
                        ([key, value]) =>
                          `export const ${key} = ${JSON.stringify(value)};`,
                      )
                      .join('\n');
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
              const next = withFocusableTables(withBasePrefix(html, base));
              if (next !== html) writeFileSync(path, next);
            }
          }
        };
        rewrite(outDir);
      },
    },
  };
}

function nebariExpressiveCode(
  consumer: StarlightExpressiveCodeOptions,
): StarlightExpressiveCodeOptions {
  const { styleOverrides, ...rest } = consumer;
  const { frames, ...otherStyleOverrides } = styleOverrides ?? {};
  return {
    themes: ['github-dark', 'github-light'],
    ...rest,
    customizeTheme: (theme: ExpressiveCodeTheme) => {
      const themed = customizeTheme(theme);
      return consumer.customizeTheme ? consumer.customizeTheme(themed) : themed;
    },
    styleOverrides: {
      borderRadius: 'var(--nbr-radius-sm)',
      borderColor: 'var(--nbr-border)',
      codeLineHeight: '1.375rem',
      ...otherStyleOverrides,
      frames: {
        editorBackground: 'var(--nbr-background)',
        terminalBackground: 'var(--nbr-background)',
        editorActiveTabBackground: 'var(--nbr-background)',
        editorTabBarBackground: 'var(--nbr-muted)',
        terminalTitlebarBackground: 'var(--nbr-muted)',
        terminalTitlebarForeground: 'var(--nbr-foreground)',
        frameBoxShadowCssValue: 'none',
        editorActiveTabIndicatorTopColor: 'transparent',
        editorActiveTabIndicatorBottomColor: 'var(--nbr-primary)',
        editorActiveTabIndicatorHeight: '2px',
        editorActiveTabBorderColor: 'var(--nbr-border)',
        editorTabBarBorderColor: 'var(--nbr-border)',
        editorTabBarBorderBottomColor: 'var(--nbr-border)',
        terminalTitlebarBorderBottomColor: 'var(--nbr-border)',
        terminalTitlebarDotsForeground: 'var(--nbr-border)',
        terminalTitlebarDotsOpacity: '1',
        inlineButtonForeground: 'var(--nbr-foreground)',
        ...frames,
      },
    },
  };
}

export function nebari(options: NebariThemeOptions = {}): StarlightPlugin {
  const resolved: ResolvedOptions = {
    logoHref: options.logoHref ?? null,
    nav: options.nav ?? null,
  };
  return {
    name: '@nebari/starlight',
    hooks: {
      'i18n:setup'({ injectTranslations }) {
        injectTranslations({
          en: {
            'search.label': 'Search docs…',
            'nebari.navLabel': 'Site',
            'nebari.breadcrumbLabel': 'Breadcrumb',
            'nebari.updated': 'Updated',
            'nebari.readTime': '{{minutes}} min read',
          },
        });
      },
      'config:setup'({ config, updateConfig, addIntegration }) {
        updateConfig({
          customCss: [
            '@nebari/starlight/fonts/font-face.css',
            '@nebari/starlight/styles/nebari-tokens.css',
            '@nebari/starlight/styles/theme.css',
            '@nebari/starlight/styles/chrome.css',
            '@nebari/starlight/styles/components.css',
            ...(config.customCss ?? []),
          ],
          components: {
            SiteTitle: '@nebari/starlight/components/SiteTitle.astro',
            Head: '@nebari/starlight/components/Head.astro',
            Footer: '@nebari/starlight/components/Footer.astro',
            Sidebar: '@nebari/starlight/components/Sidebar.astro',
            ThemeSelect: '@nebari/starlight/components/ThemeSelect.astro',
            PageTitle: '@nebari/starlight/components/PageTitle.astro',
            LastUpdated: '@nebari/starlight/components/LastUpdated.astro',
            MarkdownContent:
              '@nebari/starlight/components/MarkdownContent.astro',
            ...(config.components ?? {}),
          },
          lastUpdated: config.lastUpdated ?? true,
          social: [
            {
              icon: 'github',
              label: 'GitHub',
              href: 'https://github.com/nebari-dev',
            },
            ...(config.social ?? []),
          ],
          expressiveCode:
            config.expressiveCode === false
              ? false
              : nebariExpressiveCode(
                  config.expressiveCode === true || !config.expressiveCode
                    ? {}
                    : config.expressiveCode,
                ),
        });
        addIntegration(nebariConfigIntegration(resolved));
      },
    },
  };
}
