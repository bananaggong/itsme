// App switcher tile: works like the macOS app switcher (Cmd+Tab).
// It cycles through the apps by itself; hovering, tapping or tabbing to an app
// selects it and shows that app's panel of link cards above the dock.
// Each dock button is matched to its panel by the data-app attribute.

import { autoplay } from './autoplay.js?v=853d8596bc';

const tile = document.querySelector('.tile--switcher');

if (tile) {
  const apps = [...tile.querySelectorAll('.sw-app')];
  const cardsBox = tile.querySelector('.sw-cards');
  const labelIcon = tile.querySelector('.sw-label-icon');
  const labelName = tile.querySelector('.sw-label-name');
  let current = 0;

  // Points the little triangle under the cards at the selected app
  function moveCaret() {
    const app = apps[current];
    const x = app.offsetLeft + app.offsetWidth / 2 - cardsBox.offsetLeft;
    tile.style.setProperty('--caret-x', `${x}px`);
  }

  function select(i) {
    current = i;
    const app = apps[i];
    apps.forEach(a => {
      a.classList.toggle('is-active', a === app);
      a.setAttribute('aria-pressed', a === app);
    });
    tile.querySelectorAll('.sw-panel').forEach(panel => {
      const isMatch = panel.dataset.app === app.dataset.app;
      panel.classList.toggle('is-active', isMatch);
      if (isMatch) panel.scrollLeft = 0;
    });
    // The label above the cards uses the app's own icon and name from the dock
    labelIcon.src = app.querySelector('img').src;
    labelName.textContent = app.getAttribute('aria-label');
    moveCaret();
  }

  apps.forEach((app, i) => {
    app.addEventListener('mouseenter', () => select(i));
    app.addEventListener('focus', () => select(i));
    app.addEventListener('click', () => select(i));
  });
  window.addEventListener('resize', moveCaret);

  select(0);
  autoplay(tile, () => select((current + 1) % apps.length), 3000);
}
