// Open Graph / link-preview image, 1200x630: the hero fizz glass, centred on black, with the So mark over it.
// Run: npm run assets:og   (optional: node scripts/build-og.mjs <out-path>)
import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2] || join(root, 'public/og.jpg');

const W = 1200, H = 630;
const BG = '#0f170e'; // sampled from the dark surround of the photo
const VENOM = '#1fe97a'; // --venom, the site's logo green

// The glass: scale the portrait shot so the glass fills most of the height, crop a 630px band around it.
const PH = 760; // scaled photo height
const photo = sharp(join(root, 'images/Deew3uCjE8h-01.webp')).resize({ height: PH });
const { width: PW } = await photo.clone().metadata().then(m => ({ width: Math.round((m.width * PH) / m.height) }));
const cropTop = 118;
const glass = await photo.extract({ left: 0, top: cropTop, width: PW, height: H }).toBuffer();
const gx = Math.round((W - PW) / 2);

// Feather the photo's left/right edges into the background so it reads as one frame, not a pasted rectangle.
const fade = Buffer.from(`<svg width="${PW}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.22" stop-color="#fff"/><stop offset="0.78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.1" stop-color="#fff"/><stop offset="0.9" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="m"><rect width="${PW}" height="${H}" fill="url(#v)"/></mask></defs>
  <rect width="${PW}" height="${H}" fill="url(#h)" mask="url(#m)"/></svg>`);
const feathered = await sharp(glass).composite([{ input: await sharp(fade).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();

// The So mark, converted to outlines so it never depends on system fonts.
const b = readFileSync(join(root, 'node_modules/@fontsource/unifrakturcook/files/unifrakturcook-latin-700-normal.woff'));
const fraktur = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const markPath = (str, size) => {
  const k = size / fraktur.unitsPerEm; let d = ''; let x = 0;
  for (const ch of str) { const g = fraktur.charToGlyph(ch); d += g.getPath(x, 0, size).toPathData(2); x += g.advanceWidth * k; }
  return d;
};
const size = 300;
const d = markPath('So', size);
// Bounding box of the mark, to centre it optically on the glass bowl.
const bbox = (() => { let x = 0; const k = size / fraktur.unitsPerEm; let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const ch of 'So') { const g = fraktur.charToGlyph(ch); const bb = g.getPath(x, 0, size).getBoundingBox(); x1 = Math.min(x1, bb.x1); y1 = Math.min(y1, bb.y1); x2 = Math.max(x2, bb.x2); y2 = Math.max(y2, bb.y2); x += g.advanceWidth * k; }
  return { x1, y1, x2, y2 }; })();
const cx = W / 2, cy = 268; // centre of the bowl in the cropped frame
const tx = cx - (bbox.x1 + bbox.x2) / 2, ty = cy - (bbox.y1 + bbox.y2) / 2;

const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs>
  <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter></defs>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <path d="${d}" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})" fill="#000" opacity="0.8" filter="url(#sh)"/>
  <path d="${d}" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})" fill="${VENOM}"/></svg>`);

await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
  .composite([{ input: feathered, left: gx, top: 0 }, { input: overlay, left: 0, top: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(out);
console.log('og ->', out);
