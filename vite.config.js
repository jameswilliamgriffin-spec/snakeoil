import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('./src/media-manifest.json', import.meta.url)));

/**
 * Expands <pic name="slug" alt="…" sizes="…" class="…" eager></pic> in index.html into a
 * <picture> with AVIF + WebP srcsets, intrinsic width/height and lazy loading.
 * Images are produced by scripts/build-images.mjs.
 */
function pictures() {
  const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
  return {
    name: 'snakeoil-pictures',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<pic\s[^>]*><\/pic>/g, tag => {
          const name = attr(tag, 'name');
          const m = manifest[name];
          if (!m) throw new Error(`<pic> unknown image "${name}"`);
          const sizes = attr(tag, 'sizes') || '100vw';
          const cls = attr(tag, 'class');
          const eager = /\seager[\s>]/.test(tag);
          const set = ext => m.widths.map(w => `/media/img/${name}-${w}.${ext} ${w}w`).join(', ');
          return [
            '<picture>',
            `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
            `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
            `<img src="/media/img/${name}-800.webp" alt="${attr(tag, 'alt') ?? ''}" width="${m.w}" height="${m.h}"` +
              (cls ? ` class="${cls}"` : '') +
              (eager ? ' loading="eager" fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"') +
              ` style="background-color:${m.bg}">`,
            '</picture>',
          ].join('');
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [pictures()],
  build: { target: 'es2020', cssMinify: 'lightningcss' },
  server: { host: true },
});
