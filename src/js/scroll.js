// Smooth scroll (Lenis) + every scroll-driven reveal and parallax (GSAP ScrollTrigger).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';
import { wrapLines, splitChars } from './text.js';
import { jitterReveal } from './distort.js';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
ScrollTrigger.config({ ignoreMobileResize: true });
CustomEase.create('snake', '0.6,0.14,0,1'); // the house curve, same as --ease in CSS

export { gsap, ScrollTrigger };

export function initLenis({ reduced }) {
  if (reduced || matchMedia('(pointer: coarse)').matches) return null;
  const lenis = new Lenis({ lerp: 0.095, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

const mobileMotion = () => matchMedia('(max-width: 899px)').matches;
const once = (trigger, start = 'top 88%') => ({
  trigger,
  start: mobileMotion() ? 'top bottom+=80' : start,
  once: true,
});

/** Sets up hidden states + scroll reveals. Returns the pieces the hero intro needs. */
export function initReveals({ reduced }) {
  const mobile = mobileMotion();
  const hero = {
    chars: [],
    lines: [],
    fades: [...document.querySelectorAll('[data-hero-fade]')],
    frame: [...document.querySelectorAll('.frame > *')],
  };

  // hero pieces are revealed by the preloader, not by scroll
  document.querySelectorAll('[data-hero-chars]').forEach(el => hero.chars.push(...splitChars(el)));
  document.querySelectorAll('[data-hero-lines]').forEach(el => hero.lines.push(...wrapLines(el)));

  if (reduced) {
    // simple fades only
    // content fades by opacity only, so it stays in the accessibility tree; the header controls
    // keep visibility:hidden for the moment they are invisible, so they can't take focus unseen
    gsap.set([...hero.chars, ...hero.lines, ...hero.fades], { opacity: 0 });
    gsap.set(hero.frame, { autoAlpha: 0 });
    document.querySelectorAll('[data-reveal]').forEach(el => {
      gsap.from(el, { opacity: 0, duration: 0.6, ease: 'none', scrollTrigger: once(el) });
    });
    return hero;
  }

  gsap.set(hero.chars, { yPercent: 108 });
  gsap.set(hero.lines, { yPercent: 115 });
  gsap.set(hero.fades, { opacity: 0, y: 14 });
  gsap.set(hero.frame, { autoAlpha: 0 });

  // stacked display lines: masked slide-up, staggered
  document.querySelectorAll('[data-reveal="lines"]').forEach(el => {
    const inner = wrapLines(el);
    gsap.set(inner, { yPercent: 115 });
    gsap.to(inner, { yPercent: 0, duration: mobile ? 0.65 : 1.2, ease: 'expo.out', stagger: mobile ? 0.05 : 0.1, scrollTrigger: once(el) });
  });

  // disjointed reveal: letters arrive out of order with torn edges, then lock in (see distort.js)
  document.querySelectorAll('[data-reveal="jitter"]').forEach(el => {
    const chars = splitChars(el).filter(c => !c.classList.contains('ch--sp'));
    const tl = jitterReveal(el, chars);
    if (mobile) tl.timeScale(1.6);
    ScrollTrigger.create({ ...once(el), onEnter: () => tl.play() });
  });
  // headings that only glitch (no reveal of their own) still need letters to glitch
  document.querySelectorAll('[data-glitch]:not([data-reveal]):not([data-hero-chars])').forEach(el => {
    splitChars(el);
    el.dataset.settled = '';
  });

  // edge-to-edge words: per-character slide-up
  document.querySelectorAll('[data-reveal="chars"]').forEach(el => {
    const chars = splitChars(el);
    gsap.set(chars, { yPercent: 108 });
    gsap.to(chars, { yPercent: 0, duration: mobile ? 0.65 : 1.15, ease: 'expo.out', stagger: { each: mobile ? 0.015 : 0.035 }, clearProps: 'transform', onComplete: () => (el.dataset.settled = ''), scrollTrigger: once(el, 'top 92%') });
  });

  // running copy: split into lines (re-split on resize / font load), each line masked
  document.querySelectorAll('[data-reveal="text"]').forEach(el => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      aria: 'none',
      onSplit: self => gsap.from(self.lines, { yPercent: 108, duration: mobile ? 0.6 : 1.05, ease: 'expo.out', stagger: mobile ? 0.035 : 0.07, scrollTrigger: once(el) }),
    });
  });

  document.querySelectorAll('[data-reveal="fade"]').forEach(el => {
    gsap.from(el, { opacity: 0, y: 18, duration: mobile ? 0.6 : 1.1, ease: 'power3.out', scrollTrigger: once(el) });
  });

  // image frames: wipe open from the bottom while the picture settles from a zoom
  document.querySelectorAll('[data-reveal="clip"], .drink__frame').forEach(el => {
    const media = el.matches('.drink__frame') ? el.querySelector('.drink__layer--a') : el.querySelector('picture, video');
    const tl = gsap.timeline({ scrollTrigger: once(el, 'top 90%') });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: mobile ? 0.7 : 1.5, ease: mobile ? 'power3.out' : 'snake', clearProps: 'clipPath' }, 0);
    if (media) tl.fromTo(media, { scale: 1.45 }, { scale: 1, duration: mobile ? 0.9 : 1.9, ease: mobile ? 'power3.out' : 'snake' }, 0);
  });

  return hero;
}

export function initParallax({ reduced }) {
  if (reduced) return;

  // hero: glass drifts back, wordmark leaves faster
  const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__media-in', { yPercent: 14, scale: 1.12, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__foot', { yPercent: -28, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero__meta', { yPercent: -60, opacity: 0, ease: 'none', scrollTrigger: { ...heroST, end: '55% top' } });

  // image inside its frame
  document.querySelectorAll('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { yPercent: -6.5 }, { yPercent: 6.5, ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // whole blocks at different speeds
  document.querySelectorAll('[data-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { y: () => speed * innerHeight }, { y: () => -speed * innerHeight, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  // drink cards: both layers slide inside the frame, alternate cards drift
  document.querySelectorAll('[data-drink]').forEach((card, i) => {
    const st = { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo(card.querySelectorAll('.drink__layer'), { yPercent: -4.5 }, { yPercent: 4.5, ease: 'none', scrollTrigger: st });
    if (i % 2 && matchMedia('(min-width: 900px)').matches) gsap.fromTo(card, { y: 70 }, { y: -70, ease: 'none', scrollTrigger: st });
  });
}

/**
 * Drink swap: a tall wrapper with a sticky full-screen stage holding two layers in the same
 * spot — The Pours on brand green, Night Shift on black. The black layer is clipped to
 * a line that travels up the screen at scroll speed, so it reads as the next section sliding
 * over the first while the photo in the middle changes drink where the line crosses it.
 */
export function initSwap({ reduced }) {
  const swap = document.querySelector('[data-swap]');
  if (!swap || reduced) return;
  const root = document.documentElement;
  const stage = swap.querySelector('.swap__stage');
  const layer = swap.querySelector('.swap__layer--b');
  swap.classList.add('swap--live');
  const update = () => {
    const vh = stage.clientHeight;
    const rect = swap.getBoundingClientRect();
    const p = gsap.utils.clamp(0, 1, (-rect.top - vh * 0.18) / vh);
    layer.style.setProperty('--p', p.toFixed(4));
    // the fixed header and footer labels turn dark while they sit on the green
    const line = rect.top > 0 ? Infinity : vh * (1 - p);
    const inView = rect.bottom > 0 && rect.top < vh;
    root.classList.toggle('green-top', inView && rect.top <= 36 && line > 60);
    root.classList.toggle('green-bottom', inView && rect.top <= vh - 40 && line > vh - 20 && rect.bottom > vh - 20);
  };
  ScrollTrigger.create({ trigger: swap, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: update, onLeave: update, onLeaveBack: update });
  update();
}

/** Atmosphere: the section is tall, its content is sticky, vertical scroll slides the track sideways. */
export function initAtmosphere({ reduced }) {
  const section = document.querySelector('.atmos');
  const track = document.getElementById('atmos-track');
  if (!section || !track) return;
  const lines = wrapLines(section.querySelector('.atmos__h'));

  if (reduced) {
    section.style.setProperty('--len', '0px');
    return;
  }

  const stage = section.querySelector('.atmos__sticky');
  const mobile = mobileMotion();
  const len = () => Math.max(0, track.getBoundingClientRect().width - stage.clientWidth);
  // Keep the last panel in place briefly before the sticky stage releases on mobile.
  const setLen = () => section.style.setProperty('--len', `${len() + (mobileMotion() ? stage.clientHeight * 0.25 : 0)}px`);
  setLen();
  ScrollTrigger.addEventListener('refreshInit', setLen);

  const slide = gsap.to(track, {
    x: () => -len(),
    ease: 'none',
    // Match actual horizontal travel, independent of the browser's expanding toolbar.
    scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${len()}`, scrub: true, invalidateOnRefresh: true },
  });

  // ignoreMobileResize avoids toolbar jitter, but real changes to the track's layout
  // (viewport units, orientation or fonts) still need fresh distances and reveal positions.
  let layout = '';
  let refreshTimer;
  const observer = new ResizeObserver(() => {
    const next = `${track.getBoundingClientRect().width}:${stage.clientWidth}:${stage.clientHeight}`;
    if (next === layout) return;
    layout = next;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  observer.observe(track);
  observer.observe(stage);

  gsap.set(lines, { yPercent: 115 });
  gsap.to(lines, { yPercent: 0, duration: mobile ? 0.7 : 1.3, ease: 'expo.out', stagger: mobile ? 0.06 : 0.12, scrollTrigger: once(section, 'top 55%') });

  track.querySelectorAll('.atmos__item').forEach(item => {
    const inner = item.querySelector('[data-hpar]');
    if (inner) {
      gsap.fromTo(inner, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: item, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } });
    }
    gsap.fromTo(item.querySelector('.frame-img'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: mobile ? 0.65 : 1.4, ease: mobile ? 'power3.out' : 'snake', scrollTrigger: { trigger: item, containerAnimation: slide, start: mobile ? 'left right+=80' : 'left 96%', once: true } });
  });

  section.querySelectorAll('.atmos__panel--quote .stack, .atmos__panel--end .rules').forEach(el => {
    const targets = el.matches('.rules') ? el.children : wrapLines(el);
    gsap.from(targets, { yPercent: 115, opacity: el.matches('.rules') ? 0 : 1, duration: mobile ? 0.65 : 1.2, ease: 'expo.out', stagger: mobile ? 0.05 : 0.1, scrollTrigger: { trigger: el, containerAnimation: slide, start: mobile ? 'left right+=80' : 'left 85%', once: true } });
  });
}

export function heroIntro({ hero, reduced }) {
  if (reduced) {
    gsap.to([...hero.chars, ...hero.lines, ...hero.fades], { opacity: 1, duration: 0.6, ease: 'none', clearProps: 'opacity' });
    gsap.to(hero.frame, { autoAlpha: 1, duration: 0.6, ease: 'none', clearProps: 'opacity,visibility' });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero__video', { scale: 1.4 }, { scale: 1, duration: 2.6, ease: 'snake' }, 0)
    .to(hero.chars, { yPercent: 0, duration: 1.4, stagger: 0.055, clearProps: 'transform', onComplete: () => document.querySelectorAll('[data-hero-chars]').forEach(el => (el.dataset.settled = '')) }, 0.35)
    .to(hero.lines, { yPercent: 0, duration: 1.2, stagger: 0.09 }, 0.65)
    .to(hero.fades, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out' }, 0.9)
    .to(hero.frame, { autoAlpha: 1, duration: 0.9, stagger: 0.07, ease: 'power2.out', clearProps: 'opacity,visibility' }, 0.8);
  return tl;
}
