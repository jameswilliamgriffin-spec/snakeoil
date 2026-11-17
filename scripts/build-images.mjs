// Builds every optimised image the site uses from the originals in ./images.
// Run: npm run assets:images
import sharp from 'sharp';
import opentype from 'opentype.js';
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(root, 'images');
const OUT = join(root, 'public/media/img');
const FONTS = join(root, 'public/fonts');
mkdirSync(OUT, { recursive: true });
mkdirSync(FONTS, { recursive: true });

// slug -> source file (+ optional treatment)
const photos = {
  fizz: 'Deew3uCjE8h-01.webp', // bright green fizzy drink, vintage glass
  'slick-top': 'Deew3uCjE8h-02.webp', // overhead, olive-oil droplets
  redflag: 'Deew3uCjE8h-06.webp', // ruby drink, nick & nora
  'room-wide': 'Deew3uCjE8h-07.webp', // interior, landscape
  lineup: 'Deew3uCjE8h-08.webp', // all the drinks, green light
  'nightshift-top': 'Deew3uCjE8h-09.webp', // overhead, coffee foam
  'cureall-green': 'Deew3uCjE8h-10.webp', // sour under green light
  booth: { file: 'Deew3uCjE8h-11.webp', duotone: true }, // B&W portrait in booth -> green duotone
  forked: 'Deew3uCjE8h-13.webp', // jalapeño martini
  'room-tall': 'Deew3uCjE8h-14.webp', // interior, portrait, Modelo tap
  regular: 'Deew3uCjE8h-15.webp', // portrait, drinking, sodium light
  slick: 'carousel-01.jpg', // pale coupe, olive-oil droplets
  'redflag-peel': 'carousel-02.jpg', // orange peel over the red drink
  'forked-hand': 'carousel-03.jpg', // hand placing the jalapeño
  nightshift: 'carousel-04.jpg', // espresso-style drink
  cureall: 'carousel-05.jpg', // amber sour
  'regular-green': 'carousel-06.jpg', // portrait with wine glass, green
};

const WIDTHS = [480, 800, 1200, 1440];
const manifest = {};

for (const [slug, def] of Object.entries(photos)) {
  const { file, duotone } = typeof def === 'string' ? { file: def } : def;
  const input = join(SRC, file);
  const meta = await sharp(input).metadata();
  manifest[slug] = { w: meta.width, h: meta.height, widths: WIDTHS.filter(w => w <= meta.width) };
  for (const w of manifest[slug].widths) {
    let img = sharp(input).resize({ width: w });
    // Anything without the green cast gets one, so the set stays consistent.
    if (duotone) {
      // luminance -> green: every channel is the grey value scaled towards the venom tint
      const L = [0.2126, 0.7152, 0.0722];
      const k = [0.52, 0.9, 0.68];
      img = img.recomb(k.map(c => L.map(l => l * c))).linear([1, 1, 1], [-4, 4, 0]);
    }
    await img.clone().avif({ quality: 48, effort: 6 }).toFile(join(OUT, `${slug}-${w}.avif`));
    await img.clone().webp({ quality: 70, effort: 5 }).toFile(join(OUT, `${slug}-${w}.webp`));
  }
  // dominant colour, used as the placeholder behind lazy images
  const { dominant } = await sharp(input).resize(64).stats();
  const k = duotone ? [8, 26, 14] : [dominant.r, dominant.g, dominant.b].map(v => Math.round(v * 0.55));
  manifest[slug].bg = '#' + k.map(v => v.toString(16).padStart(2, '0')).join('');
  console.log('img', slug.padEnd(16), manifest[slug].widths.join(','));
}

// Tiny frames for the preloader's film-leader flicker
const leader = ['fizz', 'slick', 'redflag', 'forked', 'nightshift', 'cureall', 'lineup', 'room-tall'];
for (const slug of leader) {
  const def = photos[slug];
  await sharp(join(SRC, typeof def === 'string' ? def : def.file))
    .resize({ width: 240, height: 320, fit: 'cover', position: 'centre' })
    .webp({ quality: 52 })
    .toFile(join(OUT, `leader-${slug}.webp`));
}
manifest.__leader = leader;

// Film grain tile: random light/dark specks with random alpha, palette-quantised to stay small.
{
  const S = 128;
  const buf = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    const a = Math.round(Math.pow(Math.random(), 1.6) * 255);
    buf[i * 4] = v; buf[i * 4 + 1] = v; buf[i * 4 + 2] = v; buf[i * 4 + 3] = a;
  }
  await sharp(buf, { raw: { width: S, height: S, channels: 4 } })
    .webp({ quality: 40, alphaQuality: 40, effort: 6 })
    .toFile(join(OUT, 'grain.webp'));
}

// AI-GENERATED background textures (ChatGPT image generation), used sparingly behind sections.
for (const name of ['paper', 'snakeskin', 'concrete']) {
  await sharp(join(root, 'assets-src/ai/textures', `${name}.png`)).resize({ width: 1536 }).webp({ quality: 52, effort: 6 }).toFile(join(OUT, `tex-${name}.webp`));
}

// Favicons from the supplied logo
const icon = join(SRC, 'snakeoil-profile-icon.jpg');
await sharp(icon).resize(48).png().toFile(join(root, 'public/favicon.png'));
await sharp(icon).resize(180, 180, { kernel: 'lanczos3' }).png().toFile(join(root, 'public/apple-touch-icon.png'));

// Self-hosted fonts
const fonts = [
  ['@fontsource/inter-tight/files/inter-tight-latin-500-normal.woff2', 'inter-tight-500.woff2'],
  ['@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff2', 'inter-tight-800.woff2'],
  ['@fontsource/unifrakturcook/files/unifrakturcook-latin-700-normal.woff2', 'unifrakturcook-700.woff2'],
];
for (const [from, to] of fonts) copyFileSync(join(root, 'node_modules', from), join(FONTS, to));

// Open Graph share image, 1200x630: the fizz glass on the right, the wordmark across the bottom.
{
  const W = 1200, H = 630;
  const glass = await sharp(join(SRC, photos.fizz)).resize({ height: 900 }).extract({ left: 40, top: 130, width: 595, height: 630 }).toBuffer();
  const room = await sharp(join(SRC, photos['room-wide'])).resize({ width: 700 }).extract({ left: 60, top: 0, width: 605, height: 460 }).modulate({ brightness: 0.55 }).toBuffer();
  // Text is converted to outlines with opentype.js so it never depends on system fonts.
  const font = file => { const b = readFileSync(join(root, 'node_modules/@fontsource', file)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const grotesk = font('inter-tight/files/inter-tight-latin-800-normal.woff');
  const label = font('inter-tight/files/inter-tight-latin-500-normal.woff');
  const fraktur = font('unifrakturcook/files/unifrakturcook-latin-700-normal.woff');
  // Lay glyphs out by hand (opentype.js chokes on some of Inter Tight's substitution tables).
  const run = (f, str, x, y, size, ls = 0) => {
    const k = size / f.unitsPerEm; let d = ''; let cx = x;
    for (const ch of str) { const g = f.charToGlyph(ch); d += g.getPath(cx, y, size).toPathData(2); cx += g.advanceWidth * k + ls * size; }
    return { d, width: cx - x - ls * size };
  };
  const size = (100 * 1124) / run(grotesk, 'SNAKEOIL', 0, 0, 100, -0.08).width;
  const word = run(grotesk, 'SNAKEOIL', 38, H - 44, size, -0.08).d;
  const tag = run(label, 'COCKTAILS & DIVE BAR — KINGS HEATH, BIRMINGHAM', 46, 62, 19, 0.08).d;
  const mark = run(fraktur, 'So', 40, 190, 130).d;
  const layers = [
    { input: room, left: 0, top: 0 },
    { input: glass, left: 605, top: 0 },
    { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#070a06" stop-opacity="0"/><stop offset="1" stop-color="#070a06" stop-opacity="0.94"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><path d="${tag}" fill="#eee8d5"/><path d="${mark}" fill="#1fe97a"/><path d="${word}" fill="#eee8d5"/></svg>`), left: 0, top: 0 },
  ];
  await sharp({ create: { width: W, height: H, channels: 3, background: '#070a06' } })
    .composite(layers)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(root, 'public/og.jpg'));
}

writeFileSync(join(root, 'src/media-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('done');
