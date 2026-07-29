/**
 * Sticky header state + mobile navigation drawer.
 */

const SCROLL_THRESHOLD = 40;

/**
 * Toggles `.is-scrolled` on the header.
 *
 * The read is deferred into a requestAnimationFrame callback so the scroll
 * listener itself never touches layout, and the class is only written when the
 * value actually changes — the previous implementation wrote on every single
 * scroll event.
 *
 * @param {HTMLElement} header
 */
function initStickyHeader(header) {
  let scrolled = null;
  let ticking = false;

  const sync = () => {
    ticking = false;
    const next = window.scrollY > SCROLL_THRESHOLD;
    if (next === scrolled) return;
    scrolled = next;
    header.classList.toggle('is-scrolled', next);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true }
  );

  sync();
}

/**
 * Mobile drawer.
 *
 * Accessibility contract:
 *  - `inert` on the closed drawer keeps its links out of the tab order and out
 *    of the accessibility tree. `opacity: 0` alone does neither.
 *  - `inert` on the page regions behind the open drawer is a native focus trap,
 *    so no key-by-key focus cycling code is needed.
 *  - Escape closes, and focus returns to the button that opened it.
 *
 * @param {HTMLButtonElement} toggle
 * @param {HTMLElement} drawer
 */
function initDrawer(toggle, drawer) {
  // Everything the open drawer covers. The header itself stays interactive so
  // the close button remains reachable, but its own links must not be — `inert`
  // is inherited and cannot be undone on a child, so the header is opted out
  // piece by piece rather than as a whole.
  const behind = document.querySelectorAll('main, footer, .site-header .brand, .nav-cta');
  const root = document.documentElement;
  let open = false;

  const setOpen = (next) => {
    if (next === open) return;
    open = next;

    drawer.classList.toggle('is-open', open);
    drawer.inert = !open;
    root.classList.toggle('is-locked', open);

    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

    behind.forEach((el) => {
      el.inert = open;
    });

    if (open) {
      drawer.querySelector('a')?.focus();
    } else {
      toggle.focus();
    }
  };

  // Start closed and authoritative, whatever the markup said.
  drawer.inert = true;
  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', () => setOpen(!open));

  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  // Reaching a desktop width while the drawer is open would otherwise leave the
  // page scroll-locked behind a hidden panel.
  const desktop = window.matchMedia('(min-width: 64rem)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

export function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-menu');

  if (header) initStickyHeader(header);
  if (toggle && drawer) initDrawer(toggle, drawer);
}
