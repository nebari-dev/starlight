export interface NavItem {
  label: string;
  href: string;
}

/**
 * Whether a nav `href` points off-site — an absolute URL (`https://…`,
 * `mailto:…`) or a protocol-relative one (`//host/path`). External entries are
 * rendered verbatim and never take the active-tab state, since no page of this
 * site can match them.
 */
export function isExternalNavHref(href: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href.trim());
}

/**
 * Resolve a nav `href` for rendering: internal entries get the site `base`
 * prefixed (`/guides/` → `/starlight/guides/`), external ones are left alone.
 */
export function navHref(href: string, base = '/'): string {
  if (isExternalNavHref(href)) return href;
  const prefix = base.replace(/\/+$/, '');
  return `${prefix}/${href.replace(/^\/+/, '')}`;
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
    if (isExternalNavHref(item.href)) continue;
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
