// Contact tile: the Copy button next to the email address.
// Copying needs the Clipboard API, which browsers only offer on https (or localhost).
// Without it the button stays hidden and the address is still a normal mailto link.

import { copyText } from './utils.js?v=8c1091ee90';

const button = document.querySelector('.ct-copy');
const status = document.querySelector('.ct-status');

if (button && navigator.clipboard) {
  button.hidden = false;
  let resetTimer;

  button.addEventListener('click', async () => {
    // If the browser refuses (e.g. permission denied), leave the button as it was
    if (!(await copyText(button.dataset.copy))) return;
    // Swap the copy icon for a tick for a moment, and tell screen readers
    button.classList.add('is-copied');
    status.textContent = 'Email address copied';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.classList.remove('is-copied');
      status.textContent = '';
    }, 1800);
  });
}
