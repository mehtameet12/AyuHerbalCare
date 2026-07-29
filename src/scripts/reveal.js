/**
 * Scroll-triggered reveal.
 *
 * `.reveal` elements are only hidden while `html.js` is present (set by an
 * inline script in <head>), so a JS failure can never leave the page blank.
 * This module additionally reveals everything up front when IntersectionObserver
 * is unavailable or the user prefers reduced motion.
 */

export function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const revealAll = () => targets.forEach((el) => el.classList.add('is-in'));

  if (
    !('IntersectionObserver' in window) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}
