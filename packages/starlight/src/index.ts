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
