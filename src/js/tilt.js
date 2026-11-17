// Drink cards. Fine pointers get a perspective tilt that chases the cursor with an eased
// lerp, a slight scale, a counter-shift of the image inside its frame, and a moving sheen.
// Hover, focus or a tap swaps to the alternate frame: a second photo, or a clip that starts
// on the photo's own frame so the picture comes alive.
import { attach } from './media.js';

const lerp = (a, b, t) => a + (b - a) * t;

function initMobileCycle(card, media, clip) {
  let inView = !('IntersectionObserver' in window);
  let paused = false;
  let autoplayBlocked = false;
  let timer;

  const showPhoto = () => {
    card.classList.remove('is-alt');
    clip.pause();
  };

  const playClip = async photoTimer => {
    attach(clip, clip.dataset.hoverVideo);
    clip.currentTime = 0;
    try {
      await clip.play();
    } catch (error) {
      if (timer === photoTimer) {
        autoplayBlocked = error.name === 'NotAllowedError';
        setPaused(true);
      }
      return;
    }
    if (timer !== photoTimer) return;
    autoplayBlocked = false;
    card.classList.add('is-alt');
    timer = setTimeout(scheduleClip, 4000);
  };

  const scheduleClip = () => {
    showPhoto();
    const photoTimer = setTimeout(() => playClip(photoTimer), 2000);
    timer = photoTimer;
  };

  const sync = () => {
    if (inView && !paused && !document.hidden) {
      if (timer === undefined) scheduleClip();
    } else {
      clearTimeout(timer);
      timer = undefined;
      showPhoto();
    }
  };

  const setPaused = value => {
    paused = value;
    media.setAttribute('aria-label', paused ? 'Resume the cocktail loop' : 'Pause the cocktail loop');
    sync();
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(media);
  }
  document.addEventListener('visibilitychange', sync);
  media.removeAttribute('aria-pressed');
  media.addEventListener('click', () => {
    const retry = autoplayBlocked && paused;
    setPaused(!paused);
    if (retry && timer !== undefined) {
      // A browser that rejects autoplay needs play() within the tap handler.
      clearTimeout(timer);
      playClip(timer);
    }
  });
  setPaused(false);
}

export function initDrinks({ reduced }) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('[data-drink]').forEach(card => {
    const media = card.querySelector('.drink__media');
    const frame = card.querySelector('.drink__frame');
    const shifts = card.querySelectorAll('.drink__shift');
    const sheen = card.querySelector('.drink__sheen');
    let pinned = false;
    let hover = false;

    const clip = card.querySelector('video[data-hover-video]');
    if (clip && !fine && !reduced && card.hasAttribute('data-mobile-cycle')) {
      initMobileCycle(card, media, clip);
      return;
    }

    const isButton = media.matches('button');
    const videoDefault = card.hasAttribute('data-video-default');
    const stillLabel = media.getAttribute('aria-label');
    let inView = !('IntersectionObserver' in window);
    let autoplayBlocked = false;

    const sync = () => {
      const alt = pinned || hover;
      if (clip && reduced) return; // no moving clips with reduced motion; the photo stays
      card.classList.toggle('is-alt', alt);
      if (isButton) media.setAttribute('aria-pressed', String(pinned));
      if (clip) {
        // the clip opens on the same frame as the photo, so the picture simply comes alive
        if (videoDefault ? !alt && inView && !document.hidden : alt) {
          attach(clip, clip.dataset.hoverVideo);
          if (!videoDefault) clip.currentTime = 0;
          clip.play().catch(error => {
            if (videoDefault && !fine && error.name === 'NotAllowedError') {
              autoplayBlocked = true;
              media.setAttribute('aria-label', 'Play the cocktail clip');
            }
          });
        } else {
          clip.pause();
        }
      }
    };

    if (clip && videoDefault && !reduced) {
      clip.addEventListener('playing', () => {
        if (autoplayBlocked) {
          autoplayBlocked = false;
          media.setAttribute('aria-label', stillLabel);
        }
        card.classList.add('is-video-playing');
      });
      clip.addEventListener('pause', () => card.classList.remove('is-video-playing'));
      clip.addEventListener('error', () => card.classList.remove('is-video-playing'));
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          sync();
        }, { rootMargin: fine ? '25% 0%' : '0px' });
        observer.observe(media);
      }
      document.addEventListener('visibilitychange', sync);
      sync();
    }

    if (isButton) {
      media.addEventListener('click', () => {
        pinned = autoplayBlocked ? false : !pinned;
        sync();
      });
    }

    if (!fine) return;

    const s = { x: 0, y: 0, tx: 0, ty: 0, k: 1, tk: 1, raf: 0 };
    const tick = () => {
      s.x = lerp(s.x, s.tx, 0.085);
      s.y = lerp(s.y, s.ty, 0.085);
      s.k = lerp(s.k, s.tk, 0.085);
      frame.style.transform = `rotateX(${(-s.y * 7).toFixed(3)}deg) rotateY(${(s.x * 9).toFixed(3)}deg) scale(${s.k.toFixed(4)})`;
      const shift = `translate3d(${(-s.x * 5).toFixed(2)}%, ${(-s.y * 5).toFixed(2)}%, 0)`;
      shifts.forEach(el => (el.style.transform = shift));
      const moving = Math.abs(s.x - s.tx) > 0.001 || Math.abs(s.y - s.ty) > 0.001 || Math.abs(s.k - s.tk) > 0.0005;
      s.raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    media.addEventListener('pointerenter', () => {
      hover = true;
      card.classList.add('is-hover');
      if (!reduced) s.tk = 1.035;
      sync();
      kick();
    });
    media.addEventListener('pointermove', e => {
      if (reduced) return;
      const r = media.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      s.tx = (px - 0.5) * 2;
      s.ty = (py - 0.5) * 2;
      sheen.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      sheen.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      kick();
    });
    media.addEventListener('pointerleave', () => {
      hover = false;
      card.classList.remove('is-hover');
      s.tx = s.ty = 0;
      s.tk = 1;
      sync();
      kick();
    });
    media.addEventListener('focus', () => {
      if (media.matches(':focus-visible')) {
        hover = true;
        sync();
      }
    });
    media.addEventListener('blur', () => {
      hover = false;
      sync();
    });
  });
}
