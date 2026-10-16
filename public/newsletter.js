// Newsletter tile, styled as the macOS Mail app.
// The first time the tile scrolls into view, the newest issue (.ml-new) arrives at the
// top of the inbox, pushing the older ones down. Skipped if the page loaded hidden or
// motion is reduced, so without this script every email simply shows.

import { lessMotion } from './utils.js?v=8c1091ee90';

const tile = document.querySelector('.tile--newsletter');

if (tile && !lessMotion() && document.visibilityState === 'visible' && 'IntersectionObserver' in window) {
  // How far the older emails start nudged up: the gap from the first email to the second
  const [first, second] = tile.querySelectorAll('.ml-item');
  if (first && second) tile.style.setProperty('--ml-shift', `${second.offsetTop - first.offsetTop}px`);
  tile.classList.add('ml-intro');
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    setTimeout(() => tile.classList.add('is-revealed'), 600); // a beat, so the arrival is noticed
    observer.disconnect();
  }, { threshold: 0.5 });
  observer.observe(tile);
}
