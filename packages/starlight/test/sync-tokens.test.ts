// packages/starlight/test/sync-tokens.test.ts
import { test, expect } from 'bun:test';
import { transformTokens } from '../scripts/sync-tokens.ts';

const SAMPLE = `
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --primary: oklch(0.5809 0.2683 319.62);
}
.dark {
  --background: oklch(0.1743 0.0105 276.35);
  --primary: oklch(0.6809 0.2483 319.62);
}
`;

test('namespaces custom properties to --nbr-*', () => {
  const out = transformTokens(SAMPLE);
  expect(out).toContain('--nbr-primary: oklch(0.5809 0.2683 319.62)');
  expect(out).not.toMatch(/(^|[^-])--primary:/);
});

test('maps light tokens to :root and dark tokens to data-theme dark', () => {
  const out = transformTokens(SAMPLE);
  expect(out).toMatch(/:root,\s*:root\[data-theme='light'\]\s*\{[^}]*--nbr-background: oklch\(1 0 0\)/);
  expect(out).toMatch(/:root\[data-theme='dark'\]\s*\{[^}]*--nbr-background: oklch\(0\.1743/);
});

const VAR_CHAIN_SAMPLE = `
:root {
  --zinc-50: oklch(1 0 0);
  --background: var(--zinc-50);
}
.dark {
  --zinc-950: oklch(0.2 0 0);
  --background: var(--zinc-950);
}
`;

test('namespaces var() references so semantic tokens resolve', () => {
  const out = transformTokens(VAR_CHAIN_SAMPLE);
  expect(out).toContain('--nbr-background: var(--nbr-zinc-50)');
  expect(out).toContain('--nbr-background: var(--nbr-zinc-950)');
  expect(out).not.toContain('var(--zinc-50)');
  expect(out).not.toContain('var(--zinc-950)');
});

const ALREADY_NAMESPACED_SAMPLE = `
:root { --nbr-existing: oklch(1 0 0); --background: var(--nbr-existing); }
.dark { --nbr-existing: oklch(0.2 0 0); --background: var(--nbr-existing); }
`;

test('does not double-prefix already-namespaced tokens (idempotent)', () => {
  const out = transformTokens(ALREADY_NAMESPACED_SAMPLE);
  expect(out).toContain('--nbr-existing:');
  expect(out).toContain('var(--nbr-existing)');
  expect(out).not.toContain('--nbr-nbr-existing');
  expect(out).not.toContain('var(--nbr-nbr-existing)');
});
