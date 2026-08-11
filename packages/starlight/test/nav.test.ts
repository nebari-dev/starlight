// packages/starlight/test/nav.test.ts
import { expect, test } from 'bun:test';
import { nebari } from '../src/index.ts';
import { activeNavHref, type NavItem } from '../src/utils/nav.ts';

const NAV: NavItem[] = [
  { label: 'Docs', href: '/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'Reference', href: '/reference/' },
];

test('a nested page lights its section tab, not the root', () => {
  expect(activeNavHref('/guides/deployment/build/', NAV)).toBe('/guides/');
});

test('a tab pointing at a leaf page still lights across its section', () => {
  // The demo config points Guides at a real page because /guides/ does not
  // exist yet, so segment matching has to carry the whole section.
  const leafNav: NavItem[] = [
    { label: 'Docs', href: '/' },
    { label: 'Guides', href: '/guides/authoring-content/' },
    { label: 'Reference', href: '/reference/configuration/' },
  ];
  expect(activeNavHref('/guides/deployment/build/', leafNav)).toBe(
    '/guides/authoring-content/',
  );
  expect(activeNavHref('/reference/components/', leafNav)).toBe(
    '/reference/configuration/',
  );
});

test('the root tab is a fallback, not a catch-all prefix', () => {
  // It must lose to any section tab that matches, and win when none does.
  expect(activeNavHref('/getting-started/installation/', NAV)).toBe('/');
  expect(activeNavHref('/guides/deployment/', NAV)).toBe('/guides/');
});

test('the deeper of two tabs sharing a segment wins', () => {
  const nested: NavItem[] = [
    { label: 'Guides', href: '/docs/guides/' },
    { label: 'Reference', href: '/docs/reference/' },
  ];
  expect(activeNavHref('/docs/guides/deploy/', nested)).toBe('/docs/guides/');
});

test('the root path matches the root tab', () => {
  expect(activeNavHref('/', NAV)).toBe('/');
});

test('a top-level section page matches its own tab', () => {
  expect(activeNavHref('/reference/configuration/', NAV)).toBe('/reference/');
});

test('the site base is stripped before matching', () => {
  expect(
    activeNavHref('/demo-pack/guides/deployment/build/', NAV, '/demo-pack/'),
  ).toBe('/guides/');
  expect(activeNavHref('/demo-pack/', NAV, '/demo-pack')).toBe('/');
});

test('missing trailing slashes still match', () => {
  expect(activeNavHref('/guides', [{ label: 'Guides', href: 'guides' }])).toBe(
    'guides',
  );
});

test('no tab matches when the path is outside every tab', () => {
  const tabs: NavItem[] = [{ label: 'Guides', href: '/guides/' }];
  expect(activeNavHref('/reference/components/', tabs)).toBeNull();
});

test('an empty nav never matches', () => {
  expect(activeNavHref('/guides/', [])).toBeNull();
});

test('a partial segment is not treated as a prefix match', () => {
  const tabs: NavItem[] = [{ label: 'Guides', href: '/guide/' }];
  expect(activeNavHref('/guides/authoring/', tabs)).toBeNull();
});

/**
 * The upgrade guard for every existing pack: with `nav` unset the virtual module
 * must export null, so NavTabs renders nothing and the header markup is
 * byte-identical to before this option existed.
 */
function loadVirtualConfig(options?: Parameters<typeof nebari>[0]): string {
  const plugin = nebari(options);
  let integration: { hooks: Record<string, unknown> } | undefined;
  const setup = plugin.hooks['config:setup'];
  if (!setup) throw new Error('plugin is missing its config:setup hook');
  (setup as (params: unknown) => void)({
    config: {},
    updateConfig() {},
    addIntegration(added: { hooks: Record<string, unknown> }) {
      integration = added;
    },
  });

  let load: ((id: string) => string | undefined) | undefined;
  const astroSetup = integration?.hooks['astro:config:setup'] as
    | ((params: unknown) => void)
    | undefined;
  if (!astroSetup) throw new Error('integration is missing astro:config:setup');
  astroSetup({
    config: { base: '/' },
    updateConfig(next: { vite: { plugins: Array<Record<string, unknown>> } }) {
      const vitePlugin = next.vite.plugins[0];
      load = vitePlugin?.load as (id: string) => string | undefined;
    },
  });

  const source = load?.('\0virtual:nebari/config');
  if (!source) throw new Error('virtual module produced no source');
  return source;
}

test('nav defaults to null so an upgrade grows no header nav', () => {
  expect(loadVirtualConfig()).toContain('export const nav = null;');
});

test('the virtual module emits one export per resolved option', () => {
  const source = loadVirtualConfig({
    logoHref: 'https://packs.nebari.dev/',
    nav: [{ label: 'Docs', href: '/' }],
  });
  expect(source).toContain(
    'export const logoHref = "https://packs.nebari.dev/";',
  );
  expect(source).toContain('export const nav = [{"label":"Docs","href":"/"}];');
});
