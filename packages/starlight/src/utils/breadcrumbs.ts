export interface BreadcrumbLink {
  type: 'link';
  label: string;
  isCurrent: boolean;
}

export interface BreadcrumbGroup {
  type: 'group';
  label: string;
  entries: BreadcrumbEntry[];
}

export type BreadcrumbEntry = BreadcrumbLink | BreadcrumbGroup;

export function breadcrumbTrail(sidebar: BreadcrumbEntry[]): string[] {
  for (const entry of sidebar) {
    if (entry.type === 'link') {
      if (entry.isCurrent) return [entry.label];
      continue;
    }
    const nested = breadcrumbTrail(entry.entries);
    if (nested.length > 0) return [entry.label, ...nested];
  }
  return [];
}
