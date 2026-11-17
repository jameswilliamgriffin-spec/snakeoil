// Kerning audit for the display face (Inter Tight 800).
// For each letter pair it measures the real ink-to-ink gap from the glyph outlines (not the
// bounding boxes) at the site's tracking, and how much of the cap height the two letters run
// side by side at that closest distance. Long contact = the letters read as one fused shape.
//
//   node scripts/kerning-audit.mjs                 audit the pairs used in the site's display copy
//   node scripts/kerning-audit.mjs HE EL LL        audit specific pairs
//
// Gap is in em. Negative = the outlines overlap. The font's own kerning is ignored because the
// display styles set font-kerning: none (and Inter Tight has none for these stem pairs anyway:
// measured in the browser, HE/EL/LL/IL/… are all 0, and LO is -0.028em).
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KERNING } from '../src/kerning.config.js';

const FONT = fileURLToPath(new URL('../node_modules/@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff', import.meta.url));
const TRACKING = -0.08; // .display / .fit / .drink__name / .menu__word
const STROKE = 0.012; // the seam-closing text-stroke, half of it grows each side of each glyph

const buf = readFileSync(FONT);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const upm = font.unitsPerEm;
const capH = font.charToGlyph('H').getBoundingBox().y2;
const ROWS = 96;

// Flatten a glyph outline and record its left/right ink edge on ROWS scanlines (y-up, font units).
const profiles = new Map();
function profile(ch) {
  if (profiles.has(ch)) return profiles.get(ch);
  const g = font.charToGlyph(ch);
  const segs = [];
  let x0 = 0, y0 = 0, sx = 0, sy = 0;
  const line = (x1, y1) => { segs.push([x0, y0, x1, y1]); x0 = x1; y0 = y1; };
  for (const c of g.path.commands) {
    if (c.type === 'M') { x0 = sx = c.x; y0 = sy = c.y; }
    else if (c.type === 'L') line(c.x, c.y);
    else if (c.type === 'Q') { const [ax, ay] = [x0, y0]; for (let t = 1; t <= 12; t++) { const u = t / 12; line((1 - u) ** 2 * ax + 2 * (1 - u) * u * c.x1 + u * u * c.x, (1 - u) ** 2 * ay + 2 * (1 - u) * u * c.y1 + u * u * c.y); } }
    else if (c.type === 'C') { const [ax, ay] = [x0, y0]; for (let t = 1; t <= 16; t++) { const u = t / 16, v = 1 - u; line(v ** 3 * ax + 3 * v * v * u * c.x1 + 3 * v * u * u * c.x2 + u ** 3 * c.x, v ** 3 * ay + 3 * v * v * u * c.y1 + 3 * v * u * u * c.y2 + u ** 3 * c.y); } }
    else if (c.type === 'Z') line(sx, sy);
  }
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const y = ((r + 0.5) / ROWS) * capH;
    let lo = Infinity, hi = -Infinity;
    for (const [ax, ay, bx, by] of segs) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        const x = ax + ((y - ay) / (by - ay)) * (bx - ax);
        lo = Math.min(lo, x); hi = Math.max(hi, x);
      }
    }
    rows.push(lo === Infinity ? null : [lo, hi]);
  }
  const p = { rows, adv: g.advanceWidth, glyph: g };
  profiles.set(ch, p);
  return p;
}

export function measure(pair, extra = 0) {
  const [a, b] = [...pair];
  const A = profile(a), B = profile(b);
  const shift = A.adv / upm + TRACKING + extra; // where B's origin sits, in em, relative to A's
  const gaps = [];
  A.rows.forEach((ra, i) => {
    const rb = B.rows[i];
    if (ra && rb) gaps.push(shift + rb[0] / upm - ra[1] / upm - STROKE);
  });
  if (!gaps.length) return { pair, gap: null, contact: 0 };
  const gap = Math.min(...gaps);
  const contact = gaps.filter(g => g < gap + 0.008).length / ROWS; // share of cap height within 0.008em of touching
  return { pair, gap, contact };
}

// Every adjacent pair in the site's display copy (rendered uppercase), from index.html.
const COPY = [
  'SNAKEOIL', 'SERIOUS', 'DRINKS.', 'THE DRINKS', 'SLICK', 'RED', 'FLAG', 'FORKED', 'TONGUE', 'NIGHT', 'SHIFT',
  'CURE', '-ALL', 'ANTI', 'VENOM', 'AFTER', 'DARK', 'STIFF DRINKS,', 'BAD', 'FIRST ROUNDS ON YOU',
  'BE SOUND', 'TIP YOUR BARTENDER', 'HELLO@SNAKEOILBHX.CO.UK',
  'DRINKS', 'VISIT',
];

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const asked = process.argv.slice(2);
  const pairs = asked.length
    ? asked
    : [...new Set(COPY.flatMap(w => [...w].slice(0, -1).map((c, i) => c + w[i + 1]).filter(p => !p.includes(' '))))];
  const rows = pairs.map(p => ({ ...measure(p), applied: KERNING[p] ?? 0 })).sort((x, y) => (x.gap ?? 9) - (y.gap ?? 9));
  console.log('pair   gap(em)   contact   config   gap-after');
  for (const r of rows) {
    if (r.gap === null) continue;
    const after = r.applied ? measure(r.pair, r.applied).gap : r.gap;
    console.log(
      r.pair.padEnd(6),
      r.gap.toFixed(4).padStart(8),
      `${Math.round(r.contact * 100)}%`.padStart(8),
      (r.applied ? r.applied.toFixed(3) : '-').padStart(8),
      after.toFixed(4).padStart(10)
    );
  }
}
