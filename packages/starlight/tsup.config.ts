import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // CSS, fonts, assets, and .astro components are shipped as source via package.json "files",
  // not bundled. Only the plugin entry is compiled.
  external: ['@astrojs/starlight', 'astro'],
});
