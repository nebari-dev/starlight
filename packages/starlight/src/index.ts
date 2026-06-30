import type { StarlightPlugin } from '@astrojs/starlight/types';

export function nebari(): StarlightPlugin {
  return {
    name: '@nebari/starlight',
    hooks: {
      'config:setup'({ config, updateConfig }) {
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
      },
    },
  };
}
