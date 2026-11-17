// Samples dominant tones from the source photos (used to confirm the CSS palette).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../images/', import.meta.url));
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; } h = (h * 60 + 360) % 360; return [h, mx ? d / mx : 0, mx / 255]; }
for (const f of readdirSync(dir).filter(f => /\.(webp|jpg)$/.test(f))) {
  const { data } = await sharp(dir + f).resize(160).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = []; for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);
  const avg = a => a.length ? hex(...[0, 1, 2].map(c => a.reduce((s, p) => s + p[c], 0) / a.length)) : '-';
  const lum = p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  const dark = sorted.slice(0, Math.floor(px.length * 0.25));
  const vivid = px.map(p => [p, hsv(...p)]).filter(([, h]) => h[1] > 0.55 && h[2] > 0.55).sort((a, b) => b[1][1] * b[1][2] - a[1][1] * a[1][2]).slice(0, 200).map(x => x[0]);
  const hues = px.map(p => hsv(...p)).filter(h => h[1] > 0.4 && h[2] > 0.4).map(h => h[0]).sort((a, b) => a - b);
  console.log(f.padEnd(26), 'dark', avg(dark), 'vivid', avg(vivid), 'n', String(vivid.length).padStart(3), 'medHue', hues.length ? Math.round(hues[hues.length >> 1]) : '-');
}
