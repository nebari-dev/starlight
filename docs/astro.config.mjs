import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Nebari Starlight',
      plugins: [nebari({ logoHref: 'https://nebari.dev/' })],
    }),
  ],
});
