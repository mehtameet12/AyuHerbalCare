/**
 * Reviews carousel.
 *
 * The track itself is a CSS scroll-snap container, so swiping, trackpad
 * scrolling and the arrow keys already work with this file absent. All this
 * module adds is the two arrow buttons and keeping their state in sync with
 * the ends of the scroll range.
 */

export function initCarousel() {
  const track = document.querySelector('.reviews-track');
  const buttons = document.querySelectorAll('.carousel-btn');
  if (!track || !buttons.length) return;

  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';

  // One card plus one gap, measured rather than hard-coded so it stays correct
  // across the 1 / 2 / 3-per-view breakpoints without duplicating the CSS.
  const step = () => {
    const [first, second] = track.children;
    return second ? second.offsetLeft - first.offsetLeft : track.clientWidth;
  };

  // Same deferred-read pattern as the sticky header: the scroll handler itself
  // never touches layout.
  let ticking = false;
  const sync = () => {
    ticking = false;
    const max = track.scrollWidth - track.clientWidth;
    buttons.forEach((btn) => {
      const atEnd =
        Number(btn.dataset.dir) < 0 ? track.scrollLeft <= 1 : track.scrollLeft >= max - 1;
      btn.setAttribute('aria-disabled', String(atEnd));
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior });
    });
  });

  track.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true }
  );

  window.addEventListener('resize', sync, { passive: true });

  sync();
}
