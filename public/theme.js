// Light/dark switch (top-left button on wide screens, inside the nav pill on phones).
// The small script in <head> has already applied the saved theme, or the
// device's setting, before the page appeared. This file handles the button:
// it flips the theme and remembers the choice for next time.

import { lessMotion, readStorage, writeStorage } from './utils.js?v=8c1091ee90';

const root = document.documentElement;
const button = document.querySelector('.theme-toggle');
const deviceDark = window.matchMedia('(prefers-color-scheme: dark)');

const savedTheme = () => readStorage('theme');

// The colour fade uses the browser's View Transitions: it takes a picture of the page, switches
// the theme instantly underneath, then cross-fades from the picture to the new look. (It used to
// fade every element's colours one by one, and a quick second click could leave parts of a page,
// like the About note, stuck in the other theme.) Browsers without it just switch instantly.
let fade = null;
let fading = false;

function apply(theme, { animate = false } = {}) {
  const change = () => {
    root.dataset.theme = theme;
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };
  if (animate && !lessMotion() && document.startViewTransition) {
    fade?.skipTransition();   // clicked again mid-fade: finish that one straight away
    fade = document.startViewTransition(change);
    fading = true;
    const thisFade = fade;
    thisFade.finished.finally(() => { if (fade === thisFade) fading = false; });
  } else {
    change();
  }
}

function toggle() {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  writeStorage('theme', next);   // if storage is blocked it still switches, just isn't remembered
  apply(next, { animate: true });
}

if (button) {
  button.addEventListener('click', toggle);

  // While the fade is playing, the browser sends clicks to the page itself rather than to the
  // button under the pointer. So a click that lands on the button's spot mid-fade counts too:
  // pressing the switch quickly several times always ends on the theme you'd expect.
  document.addEventListener('click', event => {
    if (!fading || event.target.closest?.('.theme-toggle')) return;
    const box = button.getBoundingClientRect();
    if (event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom) toggle();
  });

  // Until the visitor picks a theme, follow the device if it changes (e.g. automatic dark mode at sunset)
  deviceDark.addEventListener('change', event => {
    if (!savedTheme()) apply(event.matches ? 'dark' : 'light', { animate: true });
  });

  apply(root.dataset.theme || 'light');

  // On phones there isn't room for a separate button beside a centred nav, so the
  // button moves inside the nav pill (styled by `.nav .theme-toggle` in styles.css),
  // and back out to its own corner if the window is widened.
  const nav = document.querySelector('.nav');
  const phone = window.matchMedia('(max-width: 640px)');
  const place = () => {
    if (phone.matches) nav.prepend(button);
    else nav.after(button);
  };
  if (nav) {
    place();
    phone.addEventListener('change', place);
  }
}
