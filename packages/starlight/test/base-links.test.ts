// packages/starlight/test/base-links.test.ts
import { expect, test } from 'bun:test';
import { withBasePrefix } from '../src/index.ts';

test('prefixes root-absolute content links with the base', () => {
  const html = '<a href="/getting-started/installation/">Get started</a>';
  expect(withBasePrefix(html, '/starlight/')).toBe(
    '<a href="/starlight/getting-started/installation/">Get started</a>',
  );
});

test('accepts a base with or without a trailing slash', () => {
  const html = '<a href="/guides/">g</a>';
  expect(withBasePrefix(html, '/starlight')).toBe(
    '<a href="/starlight/guides/">g</a>',
  );
});

test('is a no-op when the site is served from root', () => {
  const html = '<a href="/guides/">g</a>';
  expect(withBasePrefix(html, '/')).toBe(html);
});

test('leaves already-prefixed links (Astro nav, bundled assets) untouched', () => {
  const html =
    '<a href="/starlight/reference/">r</a>' +
    '<link href="/starlight/_astro/app.css">' +
    '<a href="/starlight">home</a>';
  expect(withBasePrefix(html, '/starlight/')).toBe(html);
});

test('leaves external and protocol-relative URLs untouched', () => {
  const html =
    '<a href="https://nebari.dev">x</a>' +
    '<a href="//cdn.example.com/a.js">y</a>' +
    '<a href="#section">z</a>';
  expect(withBasePrefix(html, '/starlight/')).toBe(html);
});

test('rewrites src attributes and a bare root link too', () => {
  const html = '<img src="/logo.png"><a href="/">home</a>';
  expect(withBasePrefix(html, '/starlight/')).toBe(
    '<img src="/starlight/logo.png"><a href="/starlight/">home</a>',
  );
});
