// packages/starlight/test/breadcrumbs.test.ts
import { expect, test } from 'bun:test';
import {
  type BreadcrumbEntry,
  breadcrumbTrail,
} from '../src/utils/breadcrumbs.ts';

const link = (label: string, isCurrent = false): BreadcrumbEntry => ({
  type: 'link',
  label,
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
  expect(breadcrumbTrail(SIDEBAR)).toEqual(['Guides', 'Deployment', 'Build']);
});

test('a page one level deep returns two segments', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Reference', [link('Configuration', true)]),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual(['Reference', 'Configuration']);
});

test('a flat top-level page returns a single segment, so the caller suppresses it', () => {
  const sidebar: BreadcrumbEntry[] = [
    link('Introduction', true),
    link('About'),
  ];
  expect(breadcrumbTrail(sidebar)).toEqual(['Introduction']);
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
  expect(breadcrumbTrail(sidebar)).toEqual(['Guides', 'Build']);
});

test('the first current link wins when more than one is marked', () => {
  const sidebar: BreadcrumbEntry[] = [
    group('Guides', [link('Build', true)]),
    group('Reference', [link('Configuration', true)]),
  ];
  expect(breadcrumbTrail(SIDEBAR)).toEqual(['Guides', 'Deployment', 'Build']);
  expect(breadcrumbTrail(sidebar)).toEqual(['Guides', 'Build']);
});
