// Writing pages.
// /writing: the topic chips filter the Everything list.
// Articles: the Copy link button.

import { copyText, scrollBehavior } from './utils.js?v=8c1091ee90';

// ---------- Topic filter ----------
const list = document.querySelector('.wr-list');
const chips = [...document.querySelectorAll('.wr-chip[data-topic]')];
const status = document.querySelector('.wr-list-status');
const total = list ? list.querySelectorAll('.wr-row').length : 0;

function filter(chip) {
  const topic = chip.dataset.topic;
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));

  let shown = 0;
  list.querySelectorAll('.wr-year').forEach((group) => {
    let inGroup = 0;
    group.querySelectorAll('.wr-row').forEach((row) => {
      const match = topic === 'all' || row.dataset.topic === topic;
      row.hidden = !match;
      if (match) inGroup++;
    });
    group.hidden = inGroup === 0; // hide a year with nothing left in it
    shown += inGroup;
  });

  const name = chip.firstChild.textContent.trim();
  status.textContent = topic === 'all'
    ? `${total} articles, newest first`
    : `${name}: ${shown} of ${total} articles`;
}

if (list) {
  chips.forEach((chip) => chip.addEventListener('click', () => {
    filter(chip);
    list.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }));
}

// ---------- Copy link ----------
const copyButton = document.querySelector('.wr-copy');

if (copyButton) {
  let resetTimer;
  copyButton.addEventListener('click', async () => {
    // The clipboard can be blocked, e.g. in some embedded browsers
    copyButton.textContent = (await copyText(location.href.split('#')[0])) ? 'Copied' : 'Copy failed';
    // Back to "Copy link" 2 seconds after the latest click (an earlier click's timer is cancelled)
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { copyButton.textContent = 'Copy link'; }, 2000);
  });
  copyButton.classList.add('is-ready');   // shows the button (writing.css hides it until now)
}
