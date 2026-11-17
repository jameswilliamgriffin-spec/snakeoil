// Lazy video: sources are attached only when a clip nears the viewport, and playback
// stops whenever it leaves. With reduced motion the poster frame is all that shows.
const BASE = '/media/video/';
const touch = matchMedia('(pointer: coarse)').matches;
const webm = ['webm', 'video/webm; codecs="vp9"'];
const mp4 = ['mp4', 'video/mp4'];

/** Attach WebM + MP4 sources to a <video> once. */
export function attach(v, name) {
  if (v.dataset.loaded) return;
  v.dataset.loaded = '1';
  v.muted = true;
  for (const [ext, type] of touch ? [mp4, webm] : [webm, mp4]) {
    const s = document.createElement('source');
    s.src = `${BASE}${name}.${ext}`;
    s.type = type;
    v.appendChild(s);
  }
  v.load();
}

export function initVideos({ reduced }) {
  if (reduced || !('IntersectionObserver' in window)) return;
  const videos = document.querySelectorAll('video[data-video]');
  const hero = document.querySelector('.hero__video');
  const heroMedia = hero?.parentElement;
  const visible = new Set();
  hero?.addEventListener('playing', () => heroMedia.classList.remove('is-poster-fallback'));
  const sync = v => {
    const active = !document.hidden && visible.has(v);
    if (v === hero) heroMedia.classList.toggle('is-in-view', active);
    if (active) {
      attach(v, v.dataset.video);
      v.play().catch(error => {
        if (v === hero && error.name !== 'AbortError') heroMedia.classList.add('is-poster-fallback');
      });
    } else if (!v.paused) {
      v.pause();
    }
  };

  // hover clips: fetched as their card comes near, played by the card on hover (tilt.js)
  const near = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.preload = 'auto';
        attach(e.target, e.target.dataset.hoverVideo);
        near.unobserve(e.target);
      }
    },
    { rootMargin: '60% 0%' }
  );
  document.querySelectorAll('video[data-hover-video]').forEach(v => near.observe(v));

  const io = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) visible.add(v);
        else visible.delete(v);
        sync(v);
      }
    },
    { rootMargin: touch ? '0px' : '25% 25%' }
  );
  videos.forEach(v => io.observe(v));

  document.addEventListener('visibilitychange', () => {
    visible.forEach(sync);
  });
}
