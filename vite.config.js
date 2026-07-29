import { defineConfig } from 'vite';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

/**
 * Lightning CSS is used instead of the default esbuild CSS pipeline because it gives us
 * three things for one dependency:
 *   1. `@custom-media` support  -> breakpoints live in tokens.css, not as magic numbers
 *      repeated in every media query.
 *   2. Automatic vendor prefixing + syntax lowering driven by the `browserslist` field in
 *      package.json (e.g. `-webkit-backdrop-filter` for iOS Safari) with no manual prefixes.
 *   3. Faster + smaller CSS minification than the default.
 */
// `browserslist()` with no argument reads the `browserslist` field from package.json,
// so the supported-browser list is declared in exactly one place.
const targets = browserslistToTargets(browserslist());

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets,
      drafts: { customMedia: true },
    },
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    // Inline anything under 4 KB (the SVG favicon) to save a request.
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
  },
  server: {
    open: true,
    host: true, // expose on the LAN so you can open the dev server on a real phone
  },
});
