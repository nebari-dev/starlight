import type { StarlightPlugin } from '@astrojs/starlight/types';
import type { AstroIntegration } from 'astro';

/// <reference path="./virtual.d.ts" />

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
  return {
    name: '@nebari/starlight/config',
    hooks: {
      'astro:config:setup'({ updateConfig }) {
        updateConfig({
          vite: {
            plugins: [
              {
                name: '@nebari/starlight/virtual-config',
                resolveId(id: string) {
                  if (id === 'virtual:nebari/config') return '\0virtual:nebari/config';
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
        addIntegration(nebariConfigIntegration(logoHref));
      },
    },
  };
}
