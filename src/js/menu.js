// Full-screen menu. The panel wipes open with a clip-path inset while the page shifts
// underneath (both in CSS); this file owns state, focus and keyboard navigation.
export function initMenu({ lenis, scrollTo }) {
  const root = document.documentElement;
  const menu = document.getElementById('menu');
  const toggle = document.getElementById('menu-toggle');
  const page = document.getElementById('page');
  const links = [...menu.querySelectorAll('.menu__nav a')];
  const desktop = matchMedia('(min-width: 900px)');
  let open = false;
  let timer = 0;

  menu.querySelectorAll('.menu__nav li').forEach((li, n) => li.style.setProperty('--n', n));
  toggle.setAttribute('aria-label', 'Open menu');

  function setOpen(next, { restoreFocus = true } = {}) {
    if (next === open) return;
    open = next;
    clearTimeout(timer);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    page.inert = open;
    if (open) {
      menu.hidden = false;
      void menu.offsetWidth; // commit the closed state so the wipe transitions
      menu.classList.add('is-open');
      root.classList.add('menu-open');
      lenis ? lenis.stop() : (document.body.style.overflow = 'hidden');
      timer = setTimeout(() => menu.classList.add('is-settled'), 1500);
      links[0].focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open', 'is-settled');
      root.classList.remove('menu-open');
      lenis ? lenis.start() : (document.body.style.overflow = '');
      timer = setTimeout(() => (menu.hidden = true), 1050);
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  desktop.addEventListener('change', ({ matches }) => {
    if (!matches || !open) return;
    setOpen(false, { restoreFocus: false });
    document.querySelector('.frame__nav a')?.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      // trap focus between the toggle (which sits above the panel) and the menu's own links
      const ring = [toggle, ...menu.querySelectorAll('a[href]')];
      const at = ring.indexOf(document.activeElement);
      const to = e.shiftKey ? (at <= 0 ? ring.length - 1 : at - 1) : at === ring.length - 1 ? 0 : at + 1;
      e.preventDefault();
      ring[to].focus();
    }
  });

  links.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      setOpen(false, { restoreFocus: false });
      scrollTo(a.getAttribute('href'), { delay: 0.25 });
    });
  });

  return { close: () => setOpen(false, { restoreFocus: false }) };
}
