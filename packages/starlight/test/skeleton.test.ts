// packages/starlight/test/skeleton.test.ts
import { test, expect } from 'bun:test';
import { nebari } from '../src/index.ts';

test('nebari() returns a Starlight plugin object', () => {
  const plugin = nebari();
  expect(plugin.name).toBe('@nebari/starlight');
  expect(typeof plugin.hooks['config:setup']).toBe('function');
});
