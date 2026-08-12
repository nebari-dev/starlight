// packages/starlight/test/reading-time.test.ts
import { expect, test } from 'bun:test';
import { countWords, readingTimeMinutes } from '../src/utils/reading-time.ts';

test('counts plain prose', () => {
  expect(countWords('one two three four five')).toBe(5);
});

test('ignores fenced code blocks', () => {
  const source = [
    'two words',
    '',
    '```js',
    'const a = 1;',
    'const b = 2;',
    '```',
    '',
    'three more words',
  ].join('\n');
  expect(countWords(source)).toBe(5);
});

test('ignores tilde-fenced blocks too', () => {
  const source = ['before text', '~~~py', 'x = 1', '~~~', 'after text'].join(
    '\n',
  );
  expect(countWords(source)).toBe(4);
});

test('drops MDX import and export lines', () => {
  const source = [
    "import { Card } from '@astrojs/starlight/components';",
    'export const foo = 1;',
    '',
    'Actual prose here.',
  ].join('\n');
  expect(countWords(source)).toBe(3);
});

test('drops JSX and HTML tags but keeps their text', () => {
  expect(countWords('<Card title="Ignored">visible words</Card>')).toBe(2);
});

test('keeps link text and drops the target', () => {
  expect(countWords('see [the guide](https://example.com/a/b) now')).toBe(4);
});

test('drops images entirely', () => {
  expect(countWords('![a screenshot of things](/img/x.png) caption')).toBe(1);
});

test('keeps inline code as prose', () => {
  expect(countWords('run `bun test` now')).toBe(4);
});

test('does not count punctuation-only tokens as words', () => {
  expect(countWords('# Heading\n\n---\n\n* item one')).toBe(3);
});

test('reading time rounds to the nearest minute with a floor of one', () => {
  expect(readingTimeMinutes('a few words')).toBe(1);
  expect(readingTimeMinutes('')).toBe(1);
  expect(
    readingTimeMinutes(Array.from({ length: 500 }, () => 'word').join(' ')),
  ).toBe(3);
});
