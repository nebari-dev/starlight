export interface BreadcrumbLink {
  type: 'link';
  label: string;
  href: string;
  isCurrent: boolean;
}

export interface BreadcrumbGroup {
  type: 'group';
  label: string;
  entries: BreadcrumbEntry[];
}

export type BreadcrumbEntry = BreadcrumbLink | BreadcrumbGroup;

export interface Breadcrumb {
  label: string;
  href?: string;
}

function firstHref(entries: BreadcrumbEntry[]): string | undefined {
  for (const entry of entries) {
    if (entry.type === 'link') return entry.href;
    const nested = firstHref(entry.entries);
    if (nested) return nested;
  }
  return undefined;
}

export function breadcrumbTrail(sidebar: BreadcrumbEntry[]): Breadcrumb[] {
  for (const entry of sidebar) {
    if (entry.type === 'link') {
      if (entry.isCurrent) return [{ label: entry.label }];
      continue;
    }
    const nested = breadcrumbTrail(entry.entries);
    if (nested.length > 0) {
      return [
        { label: entry.label, href: firstHref(entry.entries) },
        ...nested,
      ];
    }
  }
  return [];
}
