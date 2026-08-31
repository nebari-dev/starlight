// packages/starlight/test/options.test.ts
import { expect, test } from 'bun:test';
import { nebari } from '../src/index.ts';

// Run the plugin's config:setup hook with a stub context and capture what it
// passes to updateConfig/addIntegration, so option handling is testable
// without a full Astro build.
// biome-ignore lint/suspicious/noExplicitAny: stubbed Starlight hook context
function runConfigSetup(plugin: ReturnType<typeof nebari>, config: any = {}) {
  // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
  let updated: any;
  // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
  let integration: any;
  // biome-ignore lint/suspicious/noExplicitAny: stubbed Starlight hook context
  (plugin.hooks['config:setup'] as any)({
    config,
    // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
    updateConfig(next: any) {
      updated = next;
    },
    // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
    addIntegration(i: any) {
      integration = i;
    },
  });
  return { updated, integration };
}

/** Resolve the virtual:nebari/config module source the integration serves. */
// biome-ignore lint/suspicious/noExplicitAny: stubbed Astro hook context
function virtualConfigSource(integration: any): string {
  // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
  let vitePlugin: any;
  integration.hooks['astro:config:setup']({
    config: { base: '/' },
    // biome-ignore lint/suspicious/noExplicitAny: captured hook outputs
    updateConfig(next: any) {
      vitePlugin = next.vite.plugins[0];
    },
  });
  return vitePlugin.load('\0virtual:nebari/config');
}

test('GitHub social link defaults to the Nebari org', () => {
  const { updated } = runConfigSetup(nebari());
  expect(updated.social[0]).toEqual({
    icon: 'github',
    label: 'GitHub',
    href: 'https://github.com/nebari-dev',
  });
});

test('githubHref points the GitHub social link at the given repo', () => {
  const { updated } = runConfigSetup(
    nebari({ githubHref: 'https://github.com/nebari-dev/my-pack' }),
  );
  expect(updated.social[0].href).toBe('https://github.com/nebari-dev/my-pack');
  expect(updated.social).toHaveLength(1);
});

test('consumer social entries are kept after the GitHub link', () => {
  const { updated } = runConfigSetup(
    nebari({ githubHref: 'https://github.com/nebari-dev/my-pack' }),
    { social: [{ icon: 'discord', label: 'Discord', href: 'https://d' }] },
  );
  expect(updated.social).toHaveLength(2);
  expect(updated.social[1].icon).toBe('discord');
});

test('logo defaults to null (bundled Nebari mark)', () => {
  const { integration } = runConfigSetup(nebari());
  expect(virtualConfigSource(integration)).toContain(
    'export const logo = null;',
  );
});

test('logo variants cross-fall back and alt defaults to Nebari', () => {
  const { integration } = runConfigSetup(
    nebari({ logo: { light: '/logo.svg' } }),
  );
  const source = virtualConfigSource(integration);
  expect(source).toContain(
    'export const logo = {"light":"/logo.svg","dark":"/logo.svg","alt":"Nebari"};',
  );
});

test('logo passes through explicit variants and alt', () => {
  const { integration } = runConfigSetup(
    nebari({ logo: { light: '/l.svg', dark: '/d.svg', alt: 'My Pack' } }),
  );
  const source = virtualConfigSource(integration);
  expect(source).toContain(
    'export const logo = {"light":"/l.svg","dark":"/d.svg","alt":"My Pack"};',
  );
});

test('logoHref still reaches the virtual module', () => {
  const { integration } = runConfigSetup(
    nebari({ logoHref: 'https://packs.nebari.dev/' }),
  );
  expect(virtualConfigSource(integration)).toContain(
    'export const logoHref = "https://packs.nebari.dev/";',
  );
});
