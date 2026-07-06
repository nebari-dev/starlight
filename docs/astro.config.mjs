import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Nebari Starlight',
      plugins: [nebari()],
      sidebar: [
        {
          label: 'Documentation',
          items: [
            { label: 'Quickstart', link: '/sample/' },
            { label: 'Installation', link: '/installation/' },
            { label: 'Configuration', link: '/configuration/' },
          ],
        },
      ],
    }),
  ],
});
