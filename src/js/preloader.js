// Preloader: blackletter mark over a film-leader flicker of the drinks, then an upward wipe.
import { gsap } from './scroll.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

export function runPreloader({ reduced, onReveal }) {
  const root = document.documentElement;
  const el = document.getElementById('preloader');
  const frames = [...document.querySelectorAll('#leader img')];
  const done = () => {
    root.classList.remove('is-loading');
    root.classList.add('is-ready');
    performance.mark?.('preloader-done');
    el.remove();
  };

  // what we actually wait for: fonts and the hero poster (capped so a slow network never traps anyone)
  const poster = new Image();
  poster.src = '/media/video/hero-glass-poster.webp';
  const ready = Promise.race([Promise.all([document.fonts?.ready, poster.decode?.().catch(() => {})]), wait(3500)]);

  let i = 0;
  frames[0]?.classList.add('is-on');
  const flicker = reduced
    ? 0
    : setInterval(() => {
        frames[i].classList.remove('is-on');
        i = (i + 1) % frames.length;
        frames[i].classList.add('is-on');
      }, 115);

  return Promise.all([wait(reduced ? 500 : 1500), ready]).then(async () => {
    clearInterval(flicker);
    frames.forEach((f, n) => f.classList.toggle('is-on', n === 0));
    await wait(reduced ? 0 : 180);
    onReveal?.();
    if (reduced) {
      await gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'none' });
      return done();
    }
    gsap.to('.preloader__mark, .preloader__leader', { y: '-12vh', duration: 1.1, ease: 'snake' });
    gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'snake', onComplete: done });
  });
}
