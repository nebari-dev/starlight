export interface NavItem {
  label: string;
  href: string;
}

function segments(path: string, base: string): string[] {
  const prefix = base.replace(/\/+$/, '');
  let out = path.trim();
  if (prefix && (out === prefix || out.startsWith(`${prefix}/`))) {
    out = out.slice(prefix.length);
  }
  return out.split('/').filter(Boolean);
}

function sharedDepth(a: string[], b: string[]): number {
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) {
    shared++;
  }
  return shared;
}

export function activeNavHref(
  pathname: string,
  items: NavItem[],
  base = '/',
): string | null {
  const current = segments(pathname, base);
  let match: string | null = null;
  let best = 0;
  let fallback: string | null = null;

  for (const item of items) {
    const candidate = segments(item.href, base);
    if (candidate.length === 0) {
      fallback ??= item.href;
      continue;
    }
    const depth = sharedDepth(current, candidate);
    if (depth > best) {
      best = depth;
      match = item.href;
    }
  }

  return match ?? fallback;
}
