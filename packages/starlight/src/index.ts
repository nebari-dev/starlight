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
        });
      },
    },
  };
}
