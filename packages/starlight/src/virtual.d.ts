declare module 'virtual:nebari/config' {
  export const logoHref: string | null;
  export const nav: Array<{ label: string; href: string }> | null;
  export const logo: { light: string; dark: string; alt: string } | null;
}
