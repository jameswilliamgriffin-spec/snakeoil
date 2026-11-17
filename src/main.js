import { initRoll } from './js/text.js';
import { initHours } from './js/hours.js';
import { initVideos } from './js/media.js';
import { initDrinks } from './js/tilt.js';
import { initMenu } from './js/menu.js';
import { runPreloader } from './js/preloader.js';
import { initLenis, initReveals, initParallax, initAtmosphere, initSwap, heroIntro, ScrollTrigger } from './js/scroll.js';
import { initGlitch } from './js/distort.js';
import { applyKerning } from './js/kerning.js';
import { KERNING, KERNING_TARGETS } from './kerning.config.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --vw: 1% of the layout width *without* the scrollbar, so edge-to-edge type never overflows
const setVW = () => root.style.setProperty('--vw', `${root.clientWidth / 100}px`);
setVW();
addEventListener('resize', setVW, { passive: true });

// Start scroll animations at the top. The preloader handles deep links after the reveal.
scrollTo({ top: 0, left: 0, behavior: 'instant' });
ScrollTrigger.clearScrollMemory('manual');

initRoll();
initHours();

const lenis = initLenis({ reduced });

function scrollToTarget(hash, { delay = 0 } = {}) {
  const target = hash === '#top' ? document.body : document.querySelector(hash);
  if (!target) return;
  const go = () => {
    if (lenis) lenis.scrollTo(hash === '#top' ? 0 : target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (hash !== '#top') {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  };
  delay ? setTimeout(go, delay * 1000) : go();
}

const hero = initReveals({ reduced });
initParallax({ reduced });
initAtmosphere({ reduced });
initSwap({ reduced });
// per-pair kerning on the display type, once every heading has been split for its animation
applyKerning(KERNING, KERNING_TARGETS);
initGlitch({ reduced });
initDrinks({ reduced });
initMenu({ lenis, scrollTo: scrollToTarget });

// in-page links (frame nav, brand, scroll-to-top)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  if (a.closest('.menu')) return;
  a.addEventListener('click', e => {
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    e.preventDefault();
    scrollToTarget(hash);
  });
});

// click-to-copy email, with "Copied" feedback
const copyLabel = document.querySelector('[data-copy-label]');
document.querySelectorAll('[data-copy]').forEach(btn => {
  let timer = 0;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.classList.add('is-copied');
    if (copyLabel) copyLabel.textContent = 'Copied';
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.classList.remove('is-copied');
      if (copyLabel) copyLabel.textContent = '';
    }, 2200);
  });
});

// the bottom frame labels step aside for the footer wordmark
ScrollTrigger.create({
  trigger: '.footer__big',
  start: 'top bottom-=30',
  onEnter: () => root.classList.add('at-footer'),
  onLeaveBack: () => root.classList.remove('at-footer'),
});

// on small screens they also clear out once the hero has gone (see .past-hero in CSS)
ScrollTrigger.create({
  trigger: '.hero',
  start: 'bottom 60%',
  onEnter: () => root.classList.add('past-hero'),
  onLeaveBack: () => root.classList.remove('past-hero'),
});

lenis?.stop(); // no scrolling under the preloader
runPreloader({
  reduced,
  onReveal: () => {
    lenis?.start();
    heroIntro({ hero, reduced });
    initVideos({ reduced });
    if (location.hash && location.hash.length > 1) scrollToTarget(location.hash, { delay: 0.2 });
  },
});

// layout settles once fonts and images are in
document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
