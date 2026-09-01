// packages/starlight/test/breadcrumbs.test.ts
import { expect, test } from 'bun:test';
import {
  type BreadcrumbEntry,
  breadcrumbTrail,
} from '../src/utils/breadcrumbs.ts';

const link = (label: string, isCurrent = false): BreadcrumbEntry => ({
  type: 'link',
  label,
  href: `/${label.toLowerCase().replace(/ /g, '-')}/`,
  isCurrent,
});
const group = (label: string, entries: BreadcrumbEntry[]): BreadcrumbEntry => ({
  type: 'group',
  label,
  entries,
});

const SIDEBAR: BreadcrumbEntry[] = [
  group('Getting Started', [link('Introduction'), link('Installation')]),
  group('Guides', [
    link('Authoring Content'),
    group('Deployment', [link('Build', true), link('Deploy')]),
  ]),
  group('Reference', [link('Configuration')]),
];

test('a nested page returns group labels then its own label', () => {
  expect(breadcrumbTrail(SIDEBAR)).toEqual([
    { label: 'Guides', href: '/authoring-content/' },
    { label: 'Deployment', href: '/build/' },
    { label: 'Build' },
  ]);
});

test('the current page carries no href, so it is not rendered as a link', () => {
  const trail = breadcrumbTrail(SIDEBAR);
  expect(trail.at(-1)?.href).toBeUndefined();
});

test('a group resolves to its first descendant link', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Reference', [link('Configuration', true), link('Components')]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([
    { label: 'Reference', href: '/configuration/' },
    { label: 'Configuration' },
  ]);
});

test('a group whose only child is a group reaches through to the deepest link', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Guides', [group('Deployment', [link('Build', true)])]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([
    { label: 'Guides', href: '/build/' },
    { label: 'Deployment', href: '/build/' },
    { label: 'Build' },
  ]);
});

test('a group with no links anywhere yields no href rather than throwing', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Outer', [group('Inner', []), link('Build', true)]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([
    { label: 'Outer', href: '/build/' },
    { label: 'Build' },
  ]);
});

test('a flat top-level page returns a single segment, so the caller suppresses it', () => {
  const sidebar: BreadcrumbEntry[] = [
    link('Introduction', true),
    link('About'),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([{ label: 'Introduction' }]);
});

test('no current link anywhere returns an empty trail', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Guides', [link('Authoring Content'), link('Customizing')]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([]);
});

test('an empty sidebar returns an empty trail', () => {
  expect(breadcrumbTrail([])).toEqual([]);
});

test('an empty group does not swallow a later match', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Empty', []),
    group('Guides', [link('Build', true)]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([
    { label: 'Guides', href: '/build/' },
    { label: 'Build' },
  ]);
});

test('the first current link wins when more than one is marked', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Guides', [link('Build', true)]),
    group('Reference', [link('Configuration', true)]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual([
    { label: 'Guides', href: '/build/' },
    { label: 'Build' },
  ]);
});
