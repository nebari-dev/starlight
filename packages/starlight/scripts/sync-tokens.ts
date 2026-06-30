// packages/starlight/scripts/sync-tokens.ts
const SOURCE_URL =
  'https://raw.githubusercontent.com/nebari-dev/nebari-design/main/registry/nebari/globals.css';
const OUT_PATH = new URL('../src/styles/nebari-tokens.css', import.meta.url);

const PROVENANCE = `/*
 * VENDORED nebari-design tokens. Do not edit by hand.
 * Source: nebari-design registry/nebari/globals.css
 * Refresh: bun run sync-tokens
 *
 * Tokens are namespaced to --nbr-* and re-scoped onto Starlight's theme
 * selectors (light under :root/[data-theme='light'], dark under
 * [data-theme='dark']) so the mapping layer (theme.css) can reference
 * --nbr-* once and let the cascade resolve per theme.
 */
`;

/**
 * Extract ALL occurrences of `selector { ... }` from css and return their
 * declaration bodies concatenated. Uses a character-by-character brace scan
 * so nested braces (e.g. @layer wrappers) do not confuse the extractor, but
 * for flat top-level blocks a simple regex is used with a fallback.
 *
 * The upstream globals.css has two separate :root blocks (one for primitives,
 * one for semantic tokens), so we must collect all of them.
 */
function extractAllBlocks(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match selector followed by optional whitespace and an opening brace.
  const selectorRe = new RegExp(`(?:^|\\n)(\\s*)${escaped}\\s*\\{`, 'g');
  const parts: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = selectorRe.exec(css)) !== null) {
    // Walk forward from the opening brace to find the matching closing brace.
    const openIdx = match.index + match[0].length - 1; // index of '{'
    let depth = 1;
    let i = openIdx + 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    // The declarations are between openIdx+1 and i-2 (before the closing '}'.
    const body = css.slice(openIdx + 1, i - 1).trim();
    if (body) parts.push(body);
  }

  return parts.join('\n\n');
}

function namespaceDecls(decls: string): string {
  // Rename leading --foo: to --nbr-foo: . Leaves var() references intact;
  // the mapping layer references --nbr-* explicitly, not raw token names.
  return decls.replace(/(^|\n)(\s*)--([a-zA-Z0-9-]+)\s*:/g, '$1$2--nbr-$3:');
}

export function transformTokens(globalsCss: string): string {
  const light = namespaceDecls(extractAllBlocks(globalsCss, ':root'));
  const dark = namespaceDecls(extractAllBlocks(globalsCss, '.dark'));
  return (
    PROVENANCE +
    `\n:root,\n:root[data-theme='light'] {\n${light}\n}\n` +
    `\n:root[data-theme='dark'] {\n${dark}\n}\n`
  );
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch ${SOURCE_URL} failed: ${res.status}`);
  const css = await res.text();
  await Bun.write(OUT_PATH, transformTokens(css));
  console.log(`wrote ${OUT_PATH.pathname}`);
}

// Run as a script (`bun sync-tokens.ts`) but stay importable for tests.
if (import.meta.main) await main();
