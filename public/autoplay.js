// Shared by the Photos and App switcher tiles: runs `step` every `delay`
// milliseconds, pausing while the mouse is over the tile or keyboard focus is
// inside it. It never auto-plays for people who've turned on "reduce motion".
// It also rests while the tile is scrolled off screen or the tab is in the
// background, so nobody's battery is spent on a slideshow they can't see.

import { lessMotion } from './utils.js?v=8c1091ee90';

export function autoplay(tile, step, delay) {
  let timer = null;
  let hovered = false;
  let focused = false;
  // Assume off screen until the observer reports (it does straight away); without one, assume on
  let onScreen = !('IntersectionObserver' in window);

  function start() {
    clearInterval(timer);
    if (lessMotion() || hovered || focused || !onScreen || document.hidden) return;
    timer = setInterval(step, delay);
  }

  tile.addEventListener('mouseenter', () => { hovered = true; start(); });
  tile.addEventListener('mouseleave', () => { hovered = false; start(); });
  tile.addEventListener('focusin', () => { focused = true; start(); });
  tile.addEventListener('focusout', event => {
    if (tile.contains(event.relatedTarget)) return; // focus just moved within the tile
    focused = false;
    start();
  });
  document.addEventListener('visibilitychange', start);

  if (!onScreen) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    }).observe(tile);
  }

  start();
}
