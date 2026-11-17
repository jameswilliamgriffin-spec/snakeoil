// Distorted type, two ways:
//   jitterReveal  letters arrive out of order, hopping between offsets with torn edges, then lock in
//   initGlitch    every few seconds a couple of letters in a visible heading smear and snap back
// The tearing is an SVG displacement filter applied per letter and only while it moves, so idle
// text costs nothing. Filters come in sizes because displacement is in px, not em.
import gsap from 'gsap';

const SIZES = [40, 80, 140, 220, 320];
const NS = 'http://www.w3.org/2000/svg';
let svg = null;
let turbulence = [];
let active = 0;
let ticker = 0;
let seed = 1;

function ensureFilters() {
  if (svg) return;
  svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  const make = (id, freq, scale, blur) => {
    const f = document.createElementNS(NS, 'filter');
    f.id = id;
    for (const [k, v] of [['x', '-30%'], ['y', '-30%'], ['width', '160%'], ['height', '160%'], ['color-interpolation-filters', 'sRGB']]) f.setAttribute(k, v);
    const t = document.createElementNS(NS, 'feTurbulence');
    for (const [k, v] of [['type', 'fractalNoise'], ['baseFrequency', freq], ['numOctaves', '2'], ['seed', '1'], ['result', 'n']]) t.setAttribute(k, v);
    const d = document.createElementNS(NS, 'feDisplacementMap');
    for (const [k, v] of [['in', 'SourceGraphic'], ['in2', 'n'], ['scale', scale], ['xChannelSelector', 'R'], ['yChannelSelector', 'G'], ['result', 'd']]) d.setAttribute(k, v);
    f.append(t, d);
    if (blur) {
      const b = document.createElementNS(NS, 'feGaussianBlur');
      b.setAttribute('in', 'd');
      b.setAttribute('stdDeviation', blur);
      f.append(b);
    }
    turbulence.push(t);
    svg.append(f);
  };
  SIZES.forEach((size, i) => {
    make(`fx-rough-${i}`, Math.min(0.9, 45 / size).toFixed(3), (size * 0.05).toFixed(1)); // torn edge
    make(`fx-smear-${i}`, `${Math.min(0.5, 6 / size).toFixed(3)} ${Math.min(0.9, 60 / size).toFixed(3)}`, (size * 0.3).toFixed(1), (size * 0.006).toFixed(2)); // sideways smear
  });
  document.body.append(svg);
}

const bucket = el => {
  const fs = parseFloat(getComputedStyle(el).fontSize);
  let best = 0;
  SIZES.forEach((s, i) => {
    if (Math.abs(s - fs) < Math.abs(SIZES[best] - fs)) best = i;
  });
  return best;
};

// re-roll the noise at ~11fps while anything is distorted, so the tearing looks alive
function hold() {
  if (active++ === 0) ticker = setInterval(() => turbulence.forEach(t => t.setAttribute('seed', String(seed++ % 97))), 90);
}
function release() {
  if (--active <= 0) {
    active = 0;
    clearInterval(ticker);
  }
}

const rand = (a, b) => a + Math.random() * (b - a);

/** Disjointed reveal for a heading already split into `.ch` letters. Returns a paused timeline. */
export function jitterReveal(el, chars) {
  ensureFilters();
  const b = bucket(el);
  const rough = `url(#fx-rough-${b})`;
  const smear = `url(#fx-smear-${b})`;
  gsap.set(chars, { opacity: 0 });
  const tl = gsap.timeline({
    paused: true,
    onStart: hold,
    onComplete: () => {
      release();
      el.dataset.settled = '';
    },
  });
  chars.forEach(ch => {
    const t = rand(0, 0.62);
    const step = (at, y, x, filter) =>
      tl.call(() => {
          ch.style.opacity = '1';
          ch.style.translate = y || x ? `${x.toFixed(1)}% ${y.toFixed(1)}%` : 'none';
          ch.style.filter = filter;
        }, null, at);
    step(t, rand(-42, 42), rand(-12, 12), smear);
    step(t + 0.1, rand(-24, 24), rand(-6, 6), rough);
    step(t + 0.2, rand(-10, 10), 0, rough);
    step(t + 0.3, 0, 0, '');
  });
  tl.to({}, { duration: 0.05 }, 0.95); // pad so onComplete lands after the last step
  return tl;
}

/** Occasional smear on a few letters of a visible, settled heading. */
export function initGlitch({ reduced }) {
  if (reduced) return;
  const targets = [...document.querySelectorAll('[data-glitch]')];
  if (!targets.length || !('IntersectionObserver' in window)) return;
  ensureFilters();
  const visible = new Set();
  const io = new IntersectionObserver(entries => entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))), { threshold: 0.4 });
  targets.forEach(t => io.observe(t));

  const fire = () => {
    setTimeout(fire, rand(2200, 4600));
    if (document.hidden || document.documentElement.classList.contains('menu-open')) return;
    const pool = [...visible].filter(el => 'settled' in el.dataset);
    if (!pool.length) return;
    const el = pool[Math.floor(Math.random() * pool.length)];
    // only letters that are actually on screen (the swap section clips one of its two headings)
    const chars = [...el.querySelectorAll('.ch:not(.ch--sp)')];
    if (!chars.length) return;
    const from = Math.floor(Math.random() * chars.length);
    const picked = chars.slice(from, from + 1 + Math.floor(Math.random() * 3));
    const b = bucket(el);
    hold();
    const frames = [
      [`url(#fx-smear-${b})`, rand(-9, 9), rand(-14, 14)],
      [`url(#fx-rough-${b})`, rand(-5, 5), rand(-8, 8)],
      [`url(#fx-smear-${b})`, rand(-7, 7), rand(-4, 4)],
      [`url(#fx-rough-${b})`, 0, rand(-3, 3)],
      ['', 0, 0],
    ];
    frames.forEach(([filter, x, y], i) =>
      setTimeout(() => {
        picked.forEach(ch => {
          ch.style.filter = filter;
          ch.style.translate = x || y ? `${x.toFixed(1)}% ${y.toFixed(1)}%` : 'none';
        });
        if (i === frames.length - 1) release();
      }, i * 95)
    );
  };
  setTimeout(fire, 3500);
}
