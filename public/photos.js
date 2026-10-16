// Photos tile: a slideshow that fades to the next photo every few seconds.
// Tapping the tile skips ahead. The ⓘ button shows the current photo's details
// (camera, lens, megapixels, date), read from the data-… attributes on its <figure>.

import { autoplay } from './autoplay.js?v=853d8596bc';

const tile = document.querySelector('.tile--photos');

// "2018-03-15" → "Thursday 15th March 2018"
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day); // local time, so the day never shifts
  const suffix = (day % 10 === 1 && day !== 11) ? 'st'
    : (day % 10 === 2 && day !== 12) ? 'nd'
    : (day % 10 === 3 && day !== 13) ? 'rd'
    : 'th';
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday} ${day}${suffix} ${monthName} ${year}`;
}

if (tile) {
  const slides = [...tile.querySelectorAll('.ph-slide')];
  const dotsBox = tile.querySelector('.ph-dots');
  const infoButton = tile.querySelector('.ph-info-button');
  const info = tile.querySelector('.ph-info');
  let current = 0;
  let infoOpen = false;

  // One dot per photo
  const dots = slides.map(() => dotsBox.appendChild(document.createElement('span')));

  // Put the current photo's details into the panel. Lines with no data are hidden.
  function fillInfo() {
    const { device, lens, mp, date } = slides[current].dataset;
    const lines = {
      '.ph-info-date': date && formatDate(date),
      '.ph-info-device': device,
      '.ph-info-lens': lens,
      '.ph-info-mp': mp && `${mp} MP`,
    };
    for (const [selector, text] of Object.entries(lines)) {
      const el = info.querySelector(selector);
      el.textContent = text || '';
      el.hidden = !text;
    }
    const hasInfo = Boolean(device || lens || mp || date);
    infoButton.hidden = !hasInfo;
    if (!hasInfo) setInfoOpen(false);
  }

  function setInfoOpen(open) {
    infoOpen = open;
    info.hidden = !open;
    infoButton.setAttribute('aria-expanded', open);
    tile.classList.toggle('is-showing-info', open);
  }

  function show(i) {
    current = (i + slides.length) % slides.length; // wraps back to the first photo
    slides.forEach((slide, n) => slide.classList.toggle('is-active', n === current));
    dots.forEach((dot, n) => dot.classList.toggle('is-active', n === current));
    fillInfo();
  }

  tile.querySelector('.ph-next').addEventListener('click', () => show(current + 1));
  infoButton.addEventListener('click', () => setInfoOpen(!infoOpen));
  tile.addEventListener('keydown', event => {
    if (event.key === 'Escape' && infoOpen) {
      setInfoOpen(false);
      infoButton.focus();
    }
  });

  show(0);
  // The slideshow holds still while the details are open, so they stay readable
  if (slides.length > 1) autoplay(tile, () => { if (!infoOpen) show(current + 1); }, 4500);
}
