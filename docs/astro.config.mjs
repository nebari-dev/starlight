import starlight from '@astrojs/starlight';
import { nebari } from '@nebari/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Nebari Starlight',
      description: 'Shared Starlight theme for Nebari documentation sites.',
      plugins: [
        nebari({
          nav: [
            { label: 'Docs', href: '/' },
            { label: 'Guides', href: '/guides/authoring-content/' },
            { label: 'Reference', href: '/reference/configuration/' },
          ],
        }),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Quickstart', link: '/getting-started/quickstart/' },
            {
              label: 'Configuration',
              link: '/getting-started/configuration/',
            },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Authoring Content',
              link: '/guides/authoring-content/',
            },
            {
              label: 'Customizing the Theme',
              link: '/guides/customizing/',
            },
            {
              label: 'Deployment',
              collapsed: true,
              items: [
                {
                  label: 'Build & Preview',
                  link: '/guides/deployment/build/',
                },
                {
                  label: 'Deploy to Production',
                  link: '/guides/deployment/deploy/',
                },
              ],
            },
          ],
        },
        {
          label: 'Reference',
          collapsed: true,
          items: [
            {
              label: 'Configuration Options',
              link: '/reference/configuration/',
            },
            { label: 'Components', link: '/reference/components/' },
          ],
        },
      ],
    }),
  ],
});
